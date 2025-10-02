const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../../utils/logger');

class ImageProcessor {
  constructor() {
    this.initialized = false;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'];

    // Default configuration (can be overridden)
    this.config = {
      imageProcessing: {
        formats: {
          output: 'webp',
          quality: 85
        },
        sizes: {
          thumbnail: { width: 150, height: 150 },
          small: { width: 400, height: 400 },
          medium: { width: 800, height: 800 },
          large: { width: 1200, height: 1200 },
          original: null // Keep original size
        },
        optimization: {
          progressive: true,
          mozjpeg: true,
          webp: {
            effort: 4
          }
        }
      },
      storage: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        basePath: process.cwd(),
        structure: {
          temp: 'temp'
        }
      }
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Test Sharp.js functionality
      const testBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      }).webp().toBuffer();

      if (!testBuffer || testBuffer.length === 0) {
        throw new Error('Sharp.js test failed');
      }

      this.initialized = true;
      logger.info('ImageProcessor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ImageProcessor', error);
      throw error;
    }
  }

  async processImage(inputPath, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      category,
      letter,
      itemName,
      sourceData = {},
      outputFormat = this.config.imageProcessing.formats.output,
      quality = this.config.imageProcessing.formats.quality
    } = options;

    const startTime = Date.now();

    try {
      logger.debug(`Processing image: ${path.basename(inputPath)}`);

      // Validate input file
      await this.validateInputFile(inputPath);

      // Load and analyze original image
      const originalMetadata = await sharp(inputPath).metadata();
      logger.debug('Original image metadata', {
        width: originalMetadata.width,
        height: originalMetadata.height,
        format: originalMetadata.format,
        size: originalMetadata.size
      });

      // Create temporary processing directory
      const tempDir = path.join(
        this.config.storage.basePath,
        this.config.storage.structure.temp,
        `processing_${Date.now()}`
      );
      await fs.ensureDir(tempDir);

      // Generate all required sizes
      const processedSizes = await this.generateImageSizes(
        inputPath,
        tempDir,
        outputFormat,
        quality
      );

      // Select the best primary image (usually large or original)
      const primaryImage = processedSizes.find(size => size.name === 'large') ||
                          processedSizes.find(size => size.name === 'original') ||
                          processedSizes[0];

      const result = {
        success: true,
        processedPath: primaryImage.path,
        originalPath: inputPath,
        metadata: {
          width: primaryImage.width,
          height: primaryImage.height,
          format: primaryImage.format,
          size: primaryImage.fileSize,
          space: originalMetadata.space,
          channels: originalMetadata.channels,
          hasAlpha: originalMetadata.hasAlpha,
          density: originalMetadata.density
        },
        sizes: processedSizes,
        processing: {
          inputFormat: originalMetadata.format,
          outputFormat,
          quality,
          processingTime: Date.now() - startTime,
          originalSize: originalMetadata.size,
          finalSize: primaryImage.fileSize,
          compressionRatio: originalMetadata.size ?
            Math.round((1 - primaryImage.fileSize / originalMetadata.size) * 100) : 0
        },
        tempDir
      };

      logger.debug('Image processing completed', {
        file: path.basename(inputPath),
        sizes: processedSizes.length,
        processingTime: result.processing.processingTime,
        compression: `${result.processing.compressionRatio}%`
      });

      return result;
    } catch (error) {
      logger.error('Image processing failed', {
        inputPath,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  async processImageFromBuffer(imageBuffer, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      outputFormat = this.config.imageProcessing.formats.output,
      quality = this.config.imageProcessing.formats.quality
    } = options;

    const startTime = Date.now();

    try {
      logger.debug('Processing image from buffer', {
        bufferSize: imageBuffer.length
      });

      // Validate buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid or empty image buffer');
      }

      // Analyze original image from buffer
      const originalMetadata = await sharp(imageBuffer).metadata();

      // Validate dimensions
      if (!originalMetadata.width || !originalMetadata.height) {
        throw new Error('Invalid image dimensions');
      }

      if (originalMetadata.width < 100 || originalMetadata.height < 100) {
        throw new Error(`Image too small: ${originalMetadata.width}x${originalMetadata.height}`);
      }

      logger.debug('Buffer image metadata', {
        width: originalMetadata.width,
        height: originalMetadata.height,
        format: originalMetadata.format,
        size: imageBuffer.length
      });

      // Generate all required sizes in memory
      const processedSizes = await this.generateImageSizesFromBuffer(
        imageBuffer,
        outputFormat,
        quality
      );

      // Select the best primary buffer (usually large or original)
      const primaryBuffer = processedSizes.find(size => size.name === 'large') ||
                           processedSizes.find(size => size.name === 'original') ||
                           processedSizes[0];

      const result = {
        success: true,
        buffer: primaryBuffer.buffer,
        metadata: {
          width: primaryBuffer.width,
          height: primaryBuffer.height,
          format: primaryBuffer.format,
          size: primaryBuffer.fileSize,
          space: originalMetadata.space,
          channels: originalMetadata.channels,
          hasAlpha: originalMetadata.hasAlpha,
          density: originalMetadata.density
        },
        sizes: processedSizes,
        processing: {
          inputFormat: originalMetadata.format,
          outputFormat,
          quality,
          processingTime: Date.now() - startTime,
          originalSize: imageBuffer.length,
          finalSize: primaryBuffer.fileSize,
          compressionRatio: Math.round((1 - primaryBuffer.fileSize / imageBuffer.length) * 100)
        }
      };

      logger.debug('Buffer image processing completed', {
        sizes: processedSizes.length,
        processingTime: result.processing.processingTime,
        compression: `${result.processing.compressionRatio}%`
      });

      return result;
    } catch (error) {
      logger.error('Buffer image processing failed', {
        bufferSize: imageBuffer?.length || 0,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  async generateImageSizesFromBuffer(inputBuffer, format, quality) {
    const sizes = [];
    const sizeConfigs = this.config.imageProcessing.sizes;

    for (const [sizeName, sizeConfig] of Object.entries(sizeConfigs)) {
      try {
        const processed = await this.generateSingleSizeFromBuffer(
          inputBuffer,
          sizeName,
          sizeConfig,
          format,
          quality
        );

        if (processed) {
          sizes.push(processed);
        }
      } catch (error) {
        logger.warn(`Failed to generate ${sizeName} size from buffer`, {
          error: error.message
        });
      }
    }

    if (sizes.length === 0) {
      throw new Error('Failed to generate any image sizes from buffer');
    }

    return sizes.sort((a, b) => b.width * b.height - a.width * a.height); // Sort by size desc
  }

  async generateSingleSizeFromBuffer(inputBuffer, sizeName, sizeConfig, format, quality) {
    let sharpInstance = sharp(inputBuffer);

    // Apply size transformation
    if (sizeConfig && (sizeConfig.width || sizeConfig.height)) {
      sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }

    // Apply format-specific optimizations
    switch (format.toLowerCase()) {
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: this.config.imageProcessing.optimization.webp.effort || 4,
          progressive: this.config.imageProcessing.optimization.progressive
        });
        break;

      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: this.config.imageProcessing.optimization.progressive,
          mozjpeg: this.config.imageProcessing.optimization.mozjpeg
        });
        break;

      case 'png':
        sharpInstance = sharpInstance.png({
          quality,
          progressive: this.config.imageProcessing.optimization.progressive,
          compressionLevel: 8
        });
        break;

      default:
        logger.warn(`Unsupported output format: ${format}, using JPEG`);
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
    }

    // Process to buffer
    const buffer = await sharpInstance.toBuffer();

    // Get metadata of processed buffer
    const metadata = await sharp(buffer).metadata();

    return {
      name: sizeName,
      buffer: buffer,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      fileSize: buffer.length,
      config: sizeConfig
    };
  }

  async validateInputFile(inputPath) {
    // Check if file exists
    if (!(await fs.pathExists(inputPath))) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    // Check file size
    const stats = await fs.stat(inputPath);
    if (stats.size === 0) {
      throw new Error('Input file is empty');
    }

    if (stats.size > this.config.storage.maxFileSize) {
      throw new Error(`Input file too large: ${Math.round(stats.size / 1024 / 1024)}MB`);
    }

    // Validate image format
    try {
      const metadata = await sharp(inputPath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      if (metadata.width < 100 || metadata.height < 100) {
        throw new Error(`Image too small: ${metadata.width}x${metadata.height}`);
      }
    } catch (error) {
      throw new Error(`Invalid image file: ${error.message}`);
    }
  }

  async generateImageSizes(inputPath, outputDir, format, quality) {
    const sizes = [];
    const sizeConfigs = this.config.imageProcessing.sizes;

    for (const [sizeName, sizeConfig] of Object.entries(sizeConfigs)) {
      try {
        const processed = await this.generateSingleSize(
          inputPath,
          outputDir,
          sizeName,
          sizeConfig,
          format,
          quality
        );

        if (processed) {
          sizes.push(processed);
        }
      } catch (error) {
        logger.warn(`Failed to generate ${sizeName} size`, {
          error: error.message,
          inputPath
        });
      }
    }

    if (sizes.length === 0) {
      throw new Error('Failed to generate any image sizes');
    }

    return sizes.sort((a, b) => b.width * b.height - a.width * a.height); // Sort by size desc
  }

  async generateSingleSize(inputPath, outputDir, sizeName, sizeConfig, format, quality) {
    const outputFileName = `${sizeName}.${format}`;
    const outputPath = path.join(outputDir, outputFileName);

    let sharpInstance = sharp(inputPath);

    // Apply size transformation
    if (sizeConfig && (sizeConfig.width || sizeConfig.height)) {
      sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }

    // Apply format-specific optimizations
    switch (format.toLowerCase()) {
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: this.config.imageProcessing.optimization.webp.effort || 4,
          progressive: this.config.imageProcessing.optimization.progressive
        });
        break;

      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: this.config.imageProcessing.optimization.progressive,
          mozjpeg: this.config.imageProcessing.optimization.mozjpeg
        });
        break;

      case 'png':
        sharpInstance = sharpInstance.png({
          quality,
          progressive: this.config.imageProcessing.optimization.progressive,
          compressionLevel: 8
        });
        break;

      default:
        logger.warn(`Unsupported output format: ${format}, using JPEG`);
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
    }

    // Process and save
    const buffer = await sharpInstance.toBuffer();
    await fs.writeFile(outputPath, buffer);

    // Get metadata of processed image
    const metadata = await sharp(outputPath).metadata();

    return {
      name: sizeName,
      path: outputPath,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      fileSize: buffer.length,
      config: sizeConfig
    };
  }

  async optimizeForWeb(inputPath, options = {}) {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 85,
      format = 'webp',
      progressive = true
    } = options;

    try {
      let sharpInstance = sharp(inputPath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });

      // Apply web optimizations
      switch (format.toLowerCase()) {
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality,
            effort: 4,
            progressive
          });
          break;

        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({
            quality,
            progressive,
            mozjpeg: true
          });
          break;

        case 'png':
          sharpInstance = sharpInstance.png({
            quality,
            progressive,
            compressionLevel: 8
          });
          break;
      }

      const buffer = await sharpInstance.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      logger.error('Web optimization failed', {
        inputPath,
        error: error.message
      });
      throw error;
    }
  }

  async generateThumbnails(inputPath, options = {}) {
    const {
      sizes = [150, 300, 600],
      format = 'webp',
      quality = 85
    } = options;

    const thumbnails = [];

    for (const size of sizes) {
      try {
        const buffer = await sharp(inputPath)
          .resize(size, size, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality })
          .toBuffer();

        const metadata = await sharp(buffer).metadata();

        thumbnails.push({
          size,
          buffer,
          width: metadata.width,
          height: metadata.height,
          fileSize: buffer.length,
          format: metadata.format
        });
      } catch (error) {
        logger.warn(`Failed to generate ${size}px thumbnail`, {
          error: error.message,
          inputPath
        });
      }
    }

    return thumbnails;
  }

  async extractColors(imagePath, options = {}) {
    const { sampleSize = 64 } = options;

    try {
      // Resize image for color analysis
      const { data, info } = await sharp(imagePath)
        .resize(sampleSize, sampleSize, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Analyze color distribution (simplified)
      const colorStats = {
        dominantColors: [],
        averageColor: { r: 0, g: 0, b: 0 },
        brightness: 0,
        contrast: 0
      };

      const pixels = info.width * info.height;
      const channels = info.channels;

      let totalR = 0, totalG = 0, totalB = 0;

      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalR += r;
        totalG += g;
        totalB += b;
      }

      colorStats.averageColor = {
        r: Math.round(totalR / pixels),
        g: Math.round(totalG / pixels),
        b: Math.round(totalB / pixels)
      };

      // Calculate brightness (0-255)
      colorStats.brightness = Math.round(
        (colorStats.averageColor.r + colorStats.averageColor.g + colorStats.averageColor.b) / 3
      );

      return colorStats;
    } catch (error) {
      logger.error('Color extraction failed', {
        imagePath,
        error: error.message
      });
      throw error;
    }
  }

  async addWatermark(inputPath, watermarkOptions = {}) {
    const {
      text = 'EverythingABC',
      opacity = 0.3,
      position = 'bottom-right',
      fontSize = 20,
      color = 'white'
    } = watermarkOptions;

    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // Create watermark SVG
      const watermarkSvg = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="${metadata.width - 10}" y="${metadata.height - 10}"
                font-family="Arial" font-size="${fontSize}" fill="${color}"
                opacity="${opacity}" text-anchor="end" dominant-baseline="bottom">
            ${text}
          </text>
        </svg>
      `;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      const result = await image
        .composite([{
          input: watermarkBuffer,
          blend: 'over'
        }])
        .toBuffer();

      return result;
    } catch (error) {
      logger.error('Watermark addition failed', {
        inputPath,
        error: error.message
      });
      throw error;
    }
  }

  async enhanceImage(inputPath, options = {}) {
    const {
      brightness = 0,    // -100 to 100
      contrast = 0,      // -100 to 100
      saturation = 1.0,  // 0 to 2.0
      sharpen = false,
      noise = false
    } = options;

    try {
      let sharpInstance = sharp(inputPath);

      // Apply brightness/contrast adjustments
      if (brightness !== 0 || contrast !== 0) {
        sharpInstance = sharpInstance.linear(
          1 + (contrast / 100),      // a (contrast multiplier)
          brightness * 255 / 100     // b (brightness offset)
        );
      }

      // Apply saturation
      if (saturation !== 1.0) {
        sharpInstance = sharpInstance.modulate({
          saturation: saturation
        });
      }

      // Apply sharpening
      if (sharpen) {
        sharpInstance = sharpInstance.sharpen({
          sigma: 1,
          m1: 1,
          m2: 2,
          x1: 2,
          y2: 10,
          y3: 20
        });
      }

      // Apply noise reduction
      if (noise) {
        sharpInstance = sharpInstance.median(3);
      }

      const buffer = await sharpInstance.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        },
        enhancements: {
          brightness,
          contrast,
          saturation,
          sharpen,
          noise
        }
      };
    } catch (error) {
      logger.error('Image enhancement failed', {
        inputPath,
        options,
        error: error.message
      });
      throw error;
    }
  }

  async convertFormat(inputPath, targetFormat, options = {}) {
    const { quality = 85 } = options;

    try {
      let sharpInstance = sharp(inputPath);

      switch (targetFormat.toLowerCase()) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png();
          break;
        case 'tiff':
          sharpInstance = sharpInstance.tiff();
          break;
        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      const buffer = await sharpInstance.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        },
        conversion: {
          fromFormat: (await sharp(inputPath).metadata()).format,
          toFormat: targetFormat,
          quality
        }
      };
    } catch (error) {
      logger.error('Format conversion failed', {
        inputPath,
        targetFormat,
        error: error.message
      });
      throw error;
    }
  }

  async getImageInfo(inputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      const stats = await fs.stat(inputPath);

      return {
        path: inputPath,
        filename: path.basename(inputPath),
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        },
        format: metadata.format,
        colorSpace: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        isAnimated: metadata.pages > 1,
        pages: metadata.pages,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error('Failed to get image info', {
        inputPath,
        error: error.message
      });
      throw error;
    }
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async cleanup(tempDir) {
    try {
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
        logger.debug(`Cleaned up temporary directory: ${tempDir}`);
      }
    } catch (error) {
      logger.warn('Failed to cleanup temporary directory', {
        tempDir,
        error: error.message
      });
    }
  }

  // Method to update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = ImageProcessor;