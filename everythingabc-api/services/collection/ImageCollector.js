const fs = require('fs-extra');
const path = require('path');
const { apiClientManager } = require('../apiClients');
const QualityAnalyzer = require('../analysis/QualityAnalyzer');
const ImageProcessor = require('../processing/ImageProcessor');
const FileOrganizer = require('../storage/FileOrganizer');
const S3ImageUploadService = require('../cloud/S3ImageUploadService');
const Category = require('../../models/Category');
const logger = require('../../utils/logger');

class ImageCollector {
  constructor() {
    this.qualityAnalyzer = new QualityAnalyzer();
    this.imageProcessor = new ImageProcessor();
    this.fileOrganizer = new FileOrganizer();
    this.s3Service = new S3ImageUploadService();
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.isInitialized) return;

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Start initialization
    this.initializationPromise = this._doInitialize();

    try {
      await this.initializationPromise;
    } catch (error) {
      // Reset promise on failure so retry is possible
      this.initializationPromise = null;
      throw error;
    }
  }

  async _doInitialize() {
    try {
      logger.info('Starting ImageCollector initialization...');

      // Initialize dependencies in sequence to avoid race conditions
      await apiClientManager.initialize();
      logger.debug('API client manager initialized');

      await this.qualityAnalyzer.initialize();
      logger.debug('Quality analyzer initialized');

      await this.imageProcessor.initialize();
      logger.debug('Image processor initialized');

      await this.fileOrganizer.initialize();
      logger.debug('File organizer initialized');

      await this.s3Service.initialize();
      logger.debug('S3 service initialized');

      this.isInitialized = true;
      this.initializationPromise = null;
      logger.info('ImageCollector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ImageCollector', error);
      throw error;
    }
  }

  async collectImagesForItem(category, letter, itemName, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      targetCount = 3,
      maxRetries = 3,
      sources = null, // null means use all available sources
      minQualityScore = 7.0,
      useAiGeneration = true,
      uploadToCloud = true
    } = options;

    logger.info(`Starting collection for ${category}/${letter}/${itemName}`, {
      targetCount,
      maxRetries,
      sources: sources || 'all',
      minQualityScore,
      useAiGeneration,
      uploadToCloud
    });

    // Get category document for progress tracking
    const categoryDoc = await Category.findOne({ id: category });
    if (!categoryDoc) {
      throw new Error(`Category not found: ${category}`);
    }

    // Find the item in the category
    const item = categoryDoc.items[letter.toUpperCase()]?.find(item => item.id === itemName || item.name === itemName);
    if (!item) {
      throw new Error(`Item not found: ${itemName} in ${category}/${letter}`);
    }

    // Initialize collection progress if needed
    if (!item.collectionProgress) {
      item.collectionProgress = {
        status: 'collecting',
        targetCount,
        collectedCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        searchAttempts: 0,
        difficulty: 'medium',
        sources: {},
        errors: [],
        startedAt: new Date(),
        lastAttempt: new Date()
      };
    } else {
      item.collectionProgress.status = 'collecting';
      item.collectionProgress.lastAttempt = new Date();
    }

    try {
      const result = await this.performCollection(categoryDoc, letter, item, options);

      if (result.approvedCount >= targetCount) {
        item.collectionProgress.status = 'completed';
        item.collectionProgress.completedAt = new Date();
        logger.info(`Collection completed for ${itemName}`, {
          collected: result.collectedCount,
          approved: result.approvedCount,
          rejected: result.rejectedCount
        });
      } else {
        item.collectionProgress.status = 'pending';
        logger.warn(`Collection incomplete for ${itemName}`, {
          collected: result.collectedCount,
          approved: result.approvedCount,
          target: targetCount
        });
      }

      // Save category with updated progress
      categoryDoc.markModified('items');
      await categoryDoc.save();

      return result;
    } catch (error) {
      item.collectionProgress.status = 'failed';
      item.collectionProgress.errors.push({
        timestamp: new Date(),
        source: 'collection',
        message: error.message,
        details: { options }
      });

      categoryDoc.markModified('items');
      await categoryDoc.save();

      logger.error(`Collection failed for ${itemName}`, error);
      throw error;
    }
  }

  async performCollection(categoryDoc, letter, item, options) {
    const { category, itemName } = { category: categoryDoc.id, itemName: item.name };
    const results = {
      collectedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      images: [],
      errors: []
    };

    // Phase 1: Search and collect from free APIs
    logger.info(`Phase 1: Searching free APIs for ${itemName}`);
    const searchResults = await this.searchAllSources(itemName, category, options);

    logger.info(`Found ${searchResults.totalImages} potential images from ${searchResults.successfulSources.length} sources`);

    // Phase 2: Download, process and quality check
    for (const imageData of searchResults.images) {
      try {
        if (results.approvedCount >= item.collectionProgress.targetCount) {
          logger.info(`Target count reached for ${itemName}`);
          break;
        }

        const processedImage = await this.processImageCandidate(
          imageData,
          category,
          letter,
          itemName,
          options
        );

        if (processedImage) {
          // Add to item's images array in database
          if (!item.images) {
            item.images = [];
          }
          item.images.push(processedImage);

          results.images.push(processedImage);
          results.collectedCount++;

          if (processedImage.status === 'approved') {
            results.approvedCount++;
            logger.info(`Image approved for ${itemName}`, {
              source: processedImage.sourceProvider,
              qualityScore: processedImage.qualityScore.overall
            });
          } else {
            results.rejectedCount++;
          }

          // Update source stats
          this.updateSourceStats(item.collectionProgress, imageData.source, 1, processedImage.status === 'approved' ? 1 : 0);
        }
      } catch (error) {
        results.errors.push({
          imageId: imageData.id,
          source: imageData.source,
          error: error.message
        });

        this.addError(item.collectionProgress, imageData.source, error.message, imageData);
        logger.error(`Failed to process image ${imageData.id}`, error);
      }
    }

    // Phase 3: AI Generation (if needed and enabled)
    if (
      results.approvedCount < item.collectionProgress.targetCount &&
      options.useAiGeneration !== false
    ) {
      logger.info(`Phase 3: AI generation for ${itemName} (need ${item.collectionProgress.targetCount - results.approvedCount} more)`);

      try {
        const aiResults = await this.generateMissingImages(
          itemName,
          category,
          letter,
          item.collectionProgress.targetCount - results.approvedCount,
          options
        );

        // Add AI generated images to item
        for (const aiImage of aiResults.images) {
          if (!item.images) {
            item.images = [];
          }
          item.images.push(aiImage);
        }

        results.images.push(...aiResults.images);
        results.collectedCount += aiResults.images.length;
        results.approvedCount += aiResults.approved;
        results.rejectedCount += aiResults.rejected;

        // Update progress for AI generation
        this.updateSourceStats(item.collectionProgress, 'dalle', aiResults.images.length, aiResults.approved);
      } catch (error) {
        logger.error(`AI generation failed for ${itemName}`, error);
        this.addError(item.collectionProgress, 'dalle', error.message, { itemName, category });
      }
    }

    // Phase 4: Update collection progress
    if (results.images.length > 0) {
      const qualityScores = results.images
        .filter(img => img.status === 'approved')
        .map(img => img.qualityScore.overall);

      if (qualityScores.length > 0) {
        item.collectionProgress.averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        item.collectionProgress.bestQualityScore = Math.max(...qualityScores);
      }
    }

    // Update main counters
    item.collectionProgress.collectedCount = results.collectedCount;
    item.collectionProgress.approvedCount = results.approvedCount;
    item.collectionProgress.rejectedCount = results.rejectedCount;
    item.collectionProgress.searchAttempts += 1;

    logger.info(`Collection progress updated for ${itemName}`, {
      collected: results.collectedCount,
      approved: results.approvedCount,
      rejected: results.rejectedCount
    });

    return results;
  }

  async searchAllSources(itemName, category, options = {}) {
    const {
      maxResultsPerSource = 15,
      sources = null,
      timeout = 30000
    } = options;

    try {
      const searchOptions = {
        maxResultsPerSource,
        timeout,
        excludeSources: [],
        prioritySources: sources || []
      };

      return await apiClientManager.enhancedSearchAllSources(
        itemName,
        category,
        searchOptions
      );
    } catch (error) {
      logger.error('Multi-source search failed', {
        itemName,
        category,
        error: error.message
      });
      throw error;
    }
  }

  async processImageCandidate(imageData, category, letter, itemName, options = {}) {
    const startTime = Date.now();

    try {
      // Download image to memory buffer (no disk I/O)
      logger.debug(`Downloading image ${imageData.id} from ${imageData.source}`);
      const downloadResult = await this.downloadImage(imageData);

      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.error}`);
      }

      // Process image from buffer (no disk I/O)
      const processingResult = await this.imageProcessor.processImageFromBuffer(
        downloadResult.buffer,
        {
          outputFormat: 'webp',
          quality: 85
        }
      );

      // Analyze quality - create temporary file only for analysis
      let qualityResult;
      const tempQualityPath = path.join(process.cwd(), 'temp', `quality_${Date.now()}.webp`);
      try {
        await fs.ensureDir(path.dirname(tempQualityPath));
        await fs.writeFile(tempQualityPath, processingResult.buffer);
        qualityResult = await this.qualityAnalyzer.analyzeImage(
          tempQualityPath,
          itemName,
          category,
          imageData
        );
        await fs.remove(tempQualityPath);
      } catch (qualityError) {
        logger.warn(`Quality analysis failed for ${imageData.id}, using default score`, qualityError);
        qualityResult = { overall: 7.0, breakdown: {} };
        try { await fs.remove(tempQualityPath); } catch {}
      }

      let cloudUploadResult = null;
      let finalPaths = null;

      // Cloud upload (if enabled) - directly from buffer
      if (options.uploadToCloud !== false) {
        try {
          cloudUploadResult = await this.s3Service.uploadImageWithMultipleSizes(
            downloadResult.buffer,
            {
              category,
              letter,
              itemName,
              purpose: imageData.purpose || 'primary',
              sourceProvider: imageData.source,
              sourceId: imageData.id
            }
          );

          logger.debug(`Cloud upload completed for ${imageData.id}`, {
            sizes: Object.keys(cloudUploadResult).length,
            primaryCDN: cloudUploadResult.medium?.cdnUrl
          });
        } catch (cloudError) {
          logger.warn(`Cloud upload failed for ${imageData.id}, falling back to local storage`, cloudError);
        }
      }

      // Fallback to local storage if cloud upload failed
      if (!cloudUploadResult && processingResult.sizes) {
        try {
          // Save processed sizes to disk as fallback
          const tempDir = path.join(process.cwd(), 'temp', `fallback_${Date.now()}`);
          await fs.ensureDir(tempDir);

          const savedSizes = [];
          for (const sizeData of processingResult.sizes) {
            const savePath = path.join(tempDir, `${sizeData.name}.webp`);
            await fs.writeFile(savePath, sizeData.buffer);
            savedSizes.push({
              name: sizeData.name,
              path: savePath,
              width: sizeData.width,
              height: sizeData.height,
              fileSize: sizeData.fileSize
            });
          }

          const primarySize = savedSizes.find(s => s.name === 'large') || savedSizes[0];
          const organizationResult = await this.fileOrganizer.organizeImage(
            primarySize.path,
            savedSizes,
            category,
            letter,
            itemName,
            imageData.source,
            imageData.id
          );
          finalPaths = organizationResult;

          // Clean up temp fallback directory
          await fs.remove(tempDir);
        } catch (fallbackError) {
          logger.error(`Local fallback storage failed for ${imageData.id}`, fallbackError);
        }
      }

      // Create image record for database
      const imageRecord = {
        sourceUrl: imageData.url,
        sourceProvider: imageData.source,
        sourceId: imageData.id || imageData.sourceId,
        filePath: cloudUploadResult ? cloudUploadResult.medium?.cdnUrl || cloudUploadResult.large?.cdnUrl : finalPaths?.primaryPath,
        fileName: `${itemName}_${imageData.source}_${imageData.id}`,
        metadata: {
          width: processingResult.metadata.width,
          height: processingResult.metadata.height,
          fileSize: processingResult.metadata.size,
          format: processingResult.metadata.format,
          colorSpace: processingResult.metadata.space,
          hasAlpha: processingResult.metadata.hasAlpha
        },
        qualityScore: {
          overall: qualityResult.overall,
          breakdown: qualityResult.breakdown
        },
        license: {
          type: imageData.license?.type || imageData.source,
          attribution: imageData.license?.attribution || '',
          commercial: imageData.license?.commercial !== false,
          url: imageData.license?.url || ''
        },
        processedAt: new Date(),
        createdAt: new Date()
      };

      // Add cloud storage info if uploaded
      if (cloudUploadResult) {
        imageRecord.files = cloudUploadResult;
        imageRecord.cloud = {
          s3Bucket: this.s3Service.bucket,
          cdnDistribution: this.s3Service.distributionId,
          uploadedAt: new Date(),
          uploadStatus: 'completed'
        };
      } else if (finalPaths) {
        imageRecord.processedSizes = finalPaths.sizes.map(size => ({
          size: size.name,
          path: size.path,
          width: size.width,
          height: size.height,
          fileSize: size.fileSize
        }));
      }

      // Auto-approve or reject based on quality
      if (options.manuallySelected) {
        imageRecord.status = 'approved';
        imageRecord.approvedAt = new Date();
        imageRecord.reviewNotes = 'Manually selected by user';
      } else if (qualityResult.overall >= 8.5) {
        imageRecord.status = 'approved';
        imageRecord.approvedAt = new Date();
      } else if (qualityResult.overall < 5.0) {
        imageRecord.status = 'rejected';
        imageRecord.rejectionReason = 'Quality score too low';
      } else {
        imageRecord.status = 'manual_review';
        imageRecord.reviewNotes = 'Quality score in manual review range';
      }

      const processingTime = Date.now() - startTime;
      logger.info(`Image processed successfully: ${imageData.id}`, {
        processingTime: `${processingTime}ms`,
        qualityScore: qualityResult.overall,
        status: imageRecord.status,
        cloudUpload: !!cloudUploadResult,
        method: 'direct-to-cloud'
      });

      return imageRecord;
    } catch (error) {
      logger.error(`Image processing failed: ${imageData.id}`, {
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  async downloadImage(imageData) {
    try {
      // Get appropriate client
      const client = apiClientManager.getClient(imageData.source);

      // Download image
      const downloadResult = await client.downloadImage(imageData);

      // Convert stream to buffer in memory (no disk I/O)
      const chunks = [];

      await new Promise((resolve, reject) => {
        downloadResult.stream.on('data', (chunk) => chunks.push(chunk));
        downloadResult.stream.on('end', resolve);
        downloadResult.stream.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);

      // Verify buffer has content
      if (buffer.length === 0) {
        throw new Error('Downloaded image buffer is empty');
      }

      logger.debug(`Downloaded image to memory: ${imageData.id}`, {
        source: imageData.source,
        size: buffer.length
      });

      return {
        success: true,
        buffer,
        size: buffer.length,
        headers: downloadResult.headers
      };
    } catch (error) {
      logger.error(`Image download failed: ${imageData.id}`, {
        source: imageData.source,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        buffer: null
      };
    }
  }

  async generateMissingImages(itemName, category, letter, count, options = {}) {
    const AIGenerator = require('../generation/AIGenerator');
    const aiGenerator = new AIGenerator();

    try {
      if (!aiGenerator.isAvailable()) {
        logger.warn('AI generation not available', {
          itemName,
          category,
          reason: 'AI client not configured'
        });

        return {
          images: [],
          approved: 0,
          rejected: 0,
          generated: 0,
          error: 'AI generation not available'
        };
      }

      logger.info(`Starting AI generation for ${itemName}`, {
        category,
        letter,
        count
      });

      const result = await aiGenerator.generateImagesForItem(
        itemName,
        category,
        letter,
        count,
        {
          minQualityScore: options.minQualityScore || 7.0,
          style: options.style || 'photographic',
          maxAttempts: Math.min(count * 2, 5),
          uploadToCloud: options.uploadToCloud
        }
      );

      logger.info(`AI generation completed for ${itemName}`, {
        generated: result.generated,
        approved: result.approved,
        rejected: result.rejected,
        totalCost: `$${(result.totalCost || 0).toFixed(4)}`
      });

      return {
        images: result.images,
        approved: result.approved,
        rejected: result.rejected,
        generated: result.generated,
        totalCost: result.totalCost,
        errors: result.errors
      };
    } catch (error) {
      logger.error(`AI generation failed for ${itemName}`, {
        category,
        letter,
        count,
        error: error.message
      });

      return {
        images: [],
        approved: 0,
        rejected: 0,
        generated: 0,
        error: error.message
      };
    }
  }

  // Helper methods for collection progress management
  updateSourceStats(collectionProgress, source, found, approved) {
    if (!collectionProgress.sources[source]) {
      collectionProgress.sources[source] = {
        found: 0,
        approved: 0,
        lastSearched: new Date()
      };
    }

    collectionProgress.sources[source].found += found;
    collectionProgress.sources[source].approved += approved;
    collectionProgress.sources[source].lastSearched = new Date();
  }

  addError(collectionProgress, source, message, details) {
    collectionProgress.errors.push({
      timestamp: new Date(),
      source,
      message,
      details
    });

    // Keep only last 10 errors
    if (collectionProgress.errors.length > 10) {
      collectionProgress.errors = collectionProgress.errors.slice(-10);
    }
  }

  async getCollectionStats() {
    const stats = await Category.getCollectionStats();
    const apiStats = await apiClientManager.getClientStats();

    return {
      categories: stats[0] || {},
      apis: apiStats,
      timestamp: new Date()
    };
  }
}

module.exports = ImageCollector;