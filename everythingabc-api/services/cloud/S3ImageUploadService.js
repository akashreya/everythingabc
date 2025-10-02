const AWS = require('aws-sdk');
const sharp = require('sharp');
const logger = require('../../utils/logger');

class S3ImageUploadService {
  constructor() {
    this.initialized = false;
    this.s3 = null;
    this.cloudfront = null;

    // Configuration (can be overridden)
    this.config = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.S3_IMAGES_BUCKET || 'everythingabc-images',
      cdnDomain: process.env.CLOUDFRONT_DOMAIN || 'cdn.everythingabc.com',
      distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID
    };

    // Image size configurations
    this.imageSizes = {
      thumbnail: { width: 150, height: 150, fit: 'cover' },
      small: { width: 400, height: 400, fit: 'inside' },
      medium: { width: 800, height: 800, fit: 'inside' },
      large: { width: 1200, height: 1200, fit: 'inside' },
      original: null // Keep original
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check if AWS credentials are configured
      if (!this.config.accessKeyId || !this.config.secretAccessKey) {
        logger.warn('AWS credentials not configured, S3 upload service disabled');
        return;
      }

      // Configure AWS SDK
      AWS.config.update({
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      });

      this.s3 = new AWS.S3({
        region: this.config.region
      });

      this.cloudfront = new AWS.CloudFront({
        region: 'us-east-1' // CloudFront is global but API is in us-east-1
      });

      // Test S3 connection
      await this.testS3Connection();

      this.initialized = true;
      logger.info('S3ImageUploadService initialized successfully', {
        bucket: this.config.bucket,
        region: this.config.region,
        cdnDomain: this.config.cdnDomain
      });
    } catch (error) {
      logger.error('Failed to initialize S3ImageUploadService', error);
      throw error;
    }
  }

  async testS3Connection() {
    try {
      // Test by listing bucket (or attempting to)
      await this.s3.headBucket({ Bucket: this.config.bucket }).promise();
      logger.debug('S3 bucket connection test successful');
    } catch (error) {
      if (error.code === 'NotFound') {
        logger.warn(`S3 bucket ${this.config.bucket} not found, service may not work properly`);
      } else {
        throw error;
      }
    }
  }

  async uploadImageWithMultipleSizes(imageBuffer, metadata) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.s3) {
      throw new Error('S3 service not initialized - check AWS credentials');
    }

    try {
      console.log(`🔄 Processing image for ${metadata.category}/${metadata.letter}/${metadata.itemName}`);

      // Generate multiple sizes
      const sizes = await this.generateMultipleSizes(imageBuffer);

      // Upload all sizes to S3
      const uploadResults = {};

      for (const [sizeName, processedBuffer] of Object.entries(sizes)) {
        const s3Key = this.generateS3Key(metadata, sizeName);

        const uploadResult = await this.s3.upload({
          Bucket: this.config.bucket,
          Key: s3Key,
          Body: processedBuffer,
          ContentType: this.getContentType(sizeName),
          CacheControl: 'max-age=31536000', // 1 year cache
          Metadata: {
            category: metadata.category,
            letter: metadata.letter,
            itemName: metadata.itemName,
            purpose: metadata.purpose || 'primary',
            uploadedBy: 'everythingabc-api',
            timestamp: new Date().toISOString(),
            sourceProvider: metadata.sourceProvider || 'unknown',
            sourceId: metadata.sourceId || ''
          }
        }).promise();

        const imageMetadata = await sharp(processedBuffer).metadata();

        uploadResults[sizeName] = {
          s3Key: s3Key,
          s3Url: uploadResult.Location,
          cdnUrl: `https://${this.config.cdnDomain}/${s3Key}`,
          width: imageMetadata.width,
          height: imageMetadata.height,
          fileSize: processedBuffer.length,
          format: imageMetadata.format,
          eTag: uploadResult.ETag
        };

        console.log(`  ✅ Uploaded ${sizeName}: ${s3Key}`);
      }

      // Warm CDN cache for primary sizes
      await this.warmCDNCache([
        uploadResults.thumbnail?.cdnUrl,
        uploadResults.small?.cdnUrl,
        uploadResults.medium?.cdnUrl
      ]);

      console.log(`✅ Image upload completed for ${metadata.itemName}`);
      return uploadResults;

    } catch (error) {
      console.error(`❌ Image upload failed for ${metadata.itemName}:`, error);
      throw error;
    }
  }

  async generateMultipleSizes(inputBuffer) {
    const results = {};

    for (const [sizeName, config] of Object.entries(this.imageSizes)) {
      if (config === null) {
        // Keep original
        results[sizeName] = inputBuffer;
      } else {
        // Generate specific size
        const processed = await sharp(inputBuffer)
          .resize(config.width, config.height, {
            fit: config.fit,
            withoutEnlargement: true
          })
          .webp({ quality: 85 })
          .toBuffer();

        results[sizeName] = processed;
      }
    }

    return results;
  }

  generateS3Key(metadata, sizeName) {
    const { category, letter, itemName, sourceProvider = 'unknown', sourceId = 'unknown' } = metadata;
    const timestamp = Date.now();
    const extension = sizeName === 'original' ? 'jpg' : 'webp';

    // Clean item name for filename (replace spaces and special chars with underscores)
    const cleanItemName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Generate filename matching ICS pattern: {itemName}_{source}_{sourceId}_{timestamp}_{size}.{ext}
    const filename = `${cleanItemName}_${sourceProvider}_${sourceId}_${timestamp}_${sizeName}.${extension}`;

    // Match ICS folder structure: categories/{category}/{LETTER}/{itemName}/{size}/{filename}
    return `categories/${category.toLowerCase()}/${letter.toUpperCase()}/${cleanItemName}/${sizeName}/${filename}`;
  }

  getContentType(sizeName) {
    return sizeName === 'original' ? 'image/jpeg' : 'image/webp';
  }

  async warmCDNCache(urls) {
    if (!urls || urls.length === 0) return;

    try {
      // Simple cache warming by making HEAD requests
      const warmPromises = urls.filter(Boolean).map(url =>
        fetch(url, { method: 'HEAD' }).catch(() => {})
      );

      await Promise.all(warmPromises);
      console.log(`🔥 CDN cache warmed for ${urls.length} URLs`);
    } catch (error) {
      console.warn('CDN cache warming failed:', error.message);
    }
  }

  async invalidateCDNCache(s3Keys) {
    if (!this.config.distributionId || !s3Keys.length) return;

    try {
      const params = {
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: s3Keys.length,
            Items: s3Keys.map(key => `/${key}`)
          },
          CallerReference: `invalidation-${Date.now()}`
        }
      };

      const result = await this.cloudfront.createInvalidation(params).promise();
      console.log(`🔄 CDN cache invalidated: ${result.Invalidation.Id}`);

      return result.Invalidation.Id;
    } catch (error) {
      console.warn('CDN cache invalidation failed:', error.message);
    }
  }

  async deleteImage(s3Key) {
    if (!this.initialized || !this.s3) {
      throw new Error('S3 service not initialized');
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: s3Key
      }).promise();

      logger.info(`Deleted image from S3: ${s3Key}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete image from S3: ${s3Key}`, error);
      throw error;
    }
  }

  async getImageInfo(s3Key) {
    if (!this.initialized || !this.s3) {
      throw new Error('S3 service not initialized');
    }

    try {
      const result = await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: s3Key
      }).promise();

      return {
        s3Key,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        eTag: result.ETag,
        metadata: result.Metadata || {},
        cdnUrl: `https://${this.config.cdnDomain}/${s3Key}`
      };
    } catch (error) {
      logger.error(`Failed to get image info for S3 key: ${s3Key}`, error);
      throw error;
    }
  }

  async listImages(prefix = '', maxKeys = 1000) {
    if (!this.initialized || !this.s3) {
      throw new Error('S3 service not initialized');
    }

    try {
      const result = await this.s3.listObjectsV2({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      }).promise();

      return {
        images: result.Contents.map(obj => ({
          s3Key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          eTag: obj.ETag,
          cdnUrl: `https://${this.config.cdnDomain}/${obj.Key}`
        })),
        truncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };
    } catch (error) {
      logger.error(`Failed to list images with prefix: ${prefix}`, error);
      throw error;
    }
  }

  async getStorageStats() {
    if (!this.initialized || !this.s3) {
      return {
        enabled: false,
        error: 'S3 service not initialized'
      };
    }

    try {
      // Get basic bucket info
      const listResult = await this.s3.listObjectsV2({
        Bucket: this.config.bucket,
        MaxKeys: 1000
      }).promise();

      const totalObjects = listResult.KeyCount;
      const totalSize = listResult.Contents.reduce((sum, obj) => sum + obj.Size, 0);

      return {
        enabled: true,
        bucket: this.config.bucket,
        region: this.config.region,
        cdnDomain: this.config.cdnDomain,
        totalObjects,
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      return {
        enabled: true,
        error: error.message
      };
    }
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Configuration update method
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Reset initialization if config changes
    if (this.initialized) {
      this.initialized = false;
      this.s3 = null;
      this.cloudfront = null;
    }
  }

  // Helper method to get CDN URL from S3 key
  getCDNUrl(s3Key) {
    return `https://${this.config.cdnDomain}/${s3Key}`;
  }

  // Check if service is available
  isAvailable() {
    return this.initialized && this.s3 !== null;
  }

  // Get bucket name
  get bucket() {
    return this.config.bucket;
  }

  // Get distribution ID
  get distributionId() {
    return this.config.distributionId;
  }
}

module.exports = S3ImageUploadService;