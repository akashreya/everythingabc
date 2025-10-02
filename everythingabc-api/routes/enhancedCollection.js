const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const ImageCollector = require('../services/collection/ImageCollector');
const S3ImageUploadService = require('../services/cloud/S3ImageUploadService');
const { queueManager } = require('../services/queue/QueueManager');
const Category = require('../models/Category');
const logger = require('../utils/logger');

// Initialize services
const imageCollector = new ImageCollector();
const s3Service = new S3ImageUploadService();

/**
 * Enhanced Image Collection API Routes
 *
 * These endpoints provide cloud-native image collection with S3/CloudFront integration
 */

// @desc    Start enhanced collection for a category
// @route   POST /api/v1/enhanced-collection/categories/:categoryId/start
// @access  Admin
router.post('/categories/:categoryId/start', asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      priority = 'normal',
      maxItems = null,
      uploadToCloud = true,
      useQueue = true
    } = req.body;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Initialize services
    if (!imageCollector.isInitialized) {
      await imageCollector.initialize();
    }

    if (uploadToCloud && !s3Service.isAvailable()) {
      await s3Service.initialize();
    }

    if (useQueue && !queueManager.initialized) {
      await queueManager.initialize();
    }

    // Get pending items for this category
    const pendingItems = category.getPendingCollectionItems();

    if (pendingItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items need collection in this category'
      });
    }

    // Limit items if specified
    const itemsToProcess = maxItems ? pendingItems.slice(0, maxItems) : pendingItems;

    const jobs = [];

    if (useQueue) {
      // Queue collection jobs
      for (const { letter, item } of itemsToProcess) {
        const job = await queueManager.addImageCollectionJob({
          categoryId: category.id,
          letter,
          itemId: item.id,
          itemName: item.name,
          priority,
          strategy: category.imageCollection.strategy,
          uploadToCloud
        }, {
          priority: priority === 'high' ? 10 : (priority === 'low' ? 1 : 5),
          attempts: 3,
          backoff: 'exponential'
        });

        jobs.push({
          id: job.id,
          itemName: item.name,
          letter,
          priority: job.opts.priority
        });
      }
    } else {
      // Process immediately (synchronous)
      for (const { letter, item } of itemsToProcess) {
        try {
          const result = await imageCollector.collectImagesForItem(
            category.id,
            letter,
            item.name,
            {
              targetCount: category.imageCollection?.strategy?.targetImagesPerItem || 3,
              uploadToCloud
            }
          );

          jobs.push({
            itemName: item.name,
            letter,
            result,
            status: 'completed'
          });
        } catch (error) {
          jobs.push({
            itemName: item.name,
            letter,
            error: error.message,
            status: 'failed'
          });
        }
      }
    }

    // Update category collection status
    await category.startImageCollection();

    logger.info(`Started enhanced collection for ${itemsToProcess.length} items in category ${categoryId}`, {
      uploadToCloud,
      useQueue
    });

    res.json({
      success: true,
      message: `Started enhanced collection for ${itemsToProcess.length} items`,
      data: {
        categoryId,
        itemsQueued: itemsToProcess.length,
        totalPending: pendingItems.length,
        uploadToCloud,
        useQueue,
        jobs: useQueue ? jobs : jobs.slice(0, 5) // Limit sync results
      }
    });

  } catch (error) {
    logger.error(`Failed to start enhanced collection for category ${req.params.categoryId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start enhanced collection'
    });
  }
}));

// @desc    Get cloud storage stats
// @route   GET /api/v1/enhanced-collection/cloud/stats
// @access  Admin
router.get('/cloud/stats', asyncHandler(async (req, res) => {
  try {
    if (!s3Service.isAvailable()) {
      await s3Service.initialize();
    }

    const stats = await s3Service.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get cloud storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cloud storage statistics'
    });
  }
}));

// @desc    Get queue status
// @route   GET /api/v1/enhanced-collection/queue/status
// @access  Admin
router.get('/queue/status', asyncHandler(async (req, res) => {
  try {
    if (!queueManager.initialized) {
      await queueManager.initialize();
    }

    const stats = await queueManager.getQueueStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queue status'
    });
  }
}));

// @desc    Upload image directly to cloud
// @route   POST /api/v1/enhanced-collection/cloud/upload
// @access  Admin
router.post('/cloud/upload', asyncHandler(async (req, res) => {
  try {
    const { imagePath, metadata } = req.body;

    if (!imagePath || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Image path and metadata are required'
      });
    }

    if (!s3Service.isAvailable()) {
      await s3Service.initialize();
    }

    // Queue upload job
    const job = await queueManager.addCloudUploadJob({
      imagePath,
      metadata,
      deleteAfterUpload: req.body.deleteAfterUpload || false
    });

    res.json({
      success: true,
      message: 'Upload job queued successfully',
      data: {
        jobId: job.id,
        imagePath,
        metadata
      }
    });

  } catch (error) {
    logger.error('Failed to queue cloud upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue cloud upload'
    });
  }
}));

// @desc    Warm CDN cache for specific URLs
// @route   POST /api/v1/enhanced-collection/cdn/warm
// @access  Admin
router.post('/cdn/warm', asyncHandler(async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    if (!s3Service.isAvailable()) {
      await s3Service.initialize();
    }

    await s3Service.warmCDNCache(urls);

    res.json({
      success: true,
      message: `CDN cache warmed for ${urls.length} URLs`,
      data: { urls: urls.length }
    });

  } catch (error) {
    logger.error('Failed to warm CDN cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm CDN cache'
    });
  }
}));

// @desc    Invalidate CDN cache for specific keys
// @route   POST /api/v1/enhanced-collection/cdn/invalidate
// @access  Admin
router.post('/cdn/invalidate', asyncHandler(async (req, res) => {
  try {
    const { s3Keys } = req.body;

    if (!s3Keys || !Array.isArray(s3Keys)) {
      return res.status(400).json({
        success: false,
        error: 'S3 keys array is required'
      });
    }

    if (!s3Service.isAvailable()) {
      await s3Service.initialize();
    }

    const invalidationId = await s3Service.invalidateCDNCache(s3Keys);

    res.json({
      success: true,
      message: `CDN cache invalidated for ${s3Keys.length} keys`,
      data: {
        invalidationId,
        keys: s3Keys.length
      }
    });

  } catch (error) {
    logger.error('Failed to invalidate CDN cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate CDN cache'
    });
  }
}));

// @desc    Get comprehensive service status
// @route   GET /api/v1/enhanced-collection/status
// @access  Admin
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const status = {
      imageCollector: {
        initialized: imageCollector.isInitialized,
        available: true
      },
      s3Service: {
        initialized: s3Service.initialized,
        available: s3Service.isAvailable(),
        bucket: s3Service.bucket,
        cdnDomain: s3Service.config.cdnDomain
      },
      queueManager: {
        initialized: queueManager.initialized,
        available: queueManager.initialized
      },
      timestamp: new Date()
    };

    // Get detailed stats if services are available
    if (queueManager.initialized) {
      status.queues = await queueManager.getQueueStats();
    }

    if (s3Service.isAvailable()) {
      status.cloudStorage = await s3Service.getStorageStats();
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service status'
    });
  }
}));

module.exports = router;