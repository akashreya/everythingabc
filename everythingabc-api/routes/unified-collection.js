const express = require('express');
const asyncHandler = require('express-async-handler');

const Category = require('../models/Category');
const ImageCollectionService = require('../services/ImageCollectionService');
const QualityAssessmentService = require('../services/QualityAssessmentService');

const router = express.Router();

/**
 * Unified Image Collection API Routes
 *
 * These routes provide the automated workflow that eliminates manual download/upload:
 * 1. Trigger image collection for categories/items
 * 2. Monitor collection progress
 * 3. Approve/reject images
 * 4. Manage collection queue and settings
 */

// Initialize services (will be created in next step)
const imageCollectionService = new ImageCollectionService();
const qualityService = new QualityAssessmentService();

/**
 * @route   POST /api/v1/collection/categories/:categoryId/collect
 * @desc    Start image collection for a specific category
 * @access  Admin
 */
router.post('/categories/:categoryId/collect', asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const {
    priority = 'normal',
    forceRestart = false,
    specificItems = null,
    settings = {}
  } = req.body;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Start collection process
    const collectionJob = await imageCollectionService.startCategoryCollection({
      category,
      priority,
      forceRestart,
      specificItems,
      settings
    });

    // Update category collection status
    await category.startImageCollection();

    res.json({
      success: true,
      message: `Image collection started for ${category.name}`,
      data: {
        jobId: collectionJob.id,
        categoryId: category.id,
        status: 'started',
        estimatedItems: category.imageCollection.progress.pendingItems,
        expectedDuration: collectionJob.estimatedDuration
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/collection/items/:categoryId/:letter/:itemId/collect
 * @desc    Start image collection for a specific item
 * @access  Admin
 */
router.post('/items/:categoryId/:letter/:itemId/collect', asyncHandler(async (req, res) => {
  const { categoryId, letter, itemId } = req.params;
  const { priority = 'high', settings = {} } = req.body;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const items = category.getItemsByLetter(letter);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Start collection for specific item
    const collectionJob = await imageCollectionService.startItemCollection({
      category,
      letter,
      item,
      priority,
      settings
    });

    res.json({
      success: true,
      message: `Image collection started for ${item.name}`,
      data: {
        jobId: collectionJob.id,
        categoryId: category.id,
        letter,
        itemId: item.id,
        status: 'started',
        targetImages: item.collectionProgress.targetCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/v1/collection/status/:categoryId
 * @desc    Get collection status for a category
 * @access  Public
 */
router.get('/status/:categoryId', asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Get active collection jobs
    const activeJobs = await imageCollectionService.getActiveCategoryJobs(categoryId);

    // Get detailed progress
    const progress = category.imageCollection.progress;
    const pendingItems = category.getPendingCollectionItems();

    res.json({
      success: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
        enabled: category.imageCollection.enabled,

        progress: {
          totalItems: progress.totalItems,
          completedItems: progress.completedItems,
          pendingItems: progress.pendingItems,
          collectingItems: progress.collectingItems,
          failedItems: progress.failedItems,

          totalImages: progress.totalImages,
          approvedImages: progress.approvedImages,
          pendingImages: progress.pendingImages,

          avgQualityScore: progress.avgQualityScore,
          completionPercentage: Math.round((progress.completedItems / Math.max(progress.totalItems, 1)) * 100)
        },

        activeJobs: activeJobs.map(job => ({
          id: job.id,
          status: job.status,
          progress: job.progress,
          startedAt: job.startedAt,
          estimatedCompletion: job.estimatedCompletion
        })),

        pendingItems: pendingItems.slice(0, 10).map(item => ({
          letter: item.letter,
          name: item.item.name,
          priority: item.priority,
          attempts: item.item.collectionProgress.searchAttempts,
          lastAttempt: item.item.collectionProgress.lastAttempt
        })),

        lastCollectionRun: progress.lastCollectionRun,
        nextScheduledRun: progress.nextScheduledRun
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/v1/collection/queue
 * @desc    Get current collection queue across all categories
 * @access  Admin
 */
router.get('/queue', asyncHandler(async (req, res) => {
  const {
    status = 'all',
    priority = 'all',
    limit = 50,
    offset = 0
  } = req.query;

  try {
    // Get queue status from service
    const queue = await imageCollectionService.getQueueStatus({
      status,
      priority,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get categories needing collection
    const categoriesNeedingCollection = await Category.getCategoriesNeedingCollection();

    res.json({
      success: true,
      data: {
        queue: {
          active: queue.active,
          waiting: queue.waiting,
          completed: queue.completed,
          failed: queue.failed,
          total: queue.total
        },

        jobs: queue.jobs.map(job => ({
          id: job.id,
          type: job.type,
          categoryId: job.data.categoryId,
          categoryName: job.data.categoryName,
          status: job.status,
          priority: job.priority,
          progress: job.progress,
          startedAt: job.startedAt,
          estimatedCompletion: job.estimatedCompletion,
          attempts: job.attempts,
          error: job.error
        })),

        categoriesNeedingCollection: categoriesNeedingCollection.map(cat => ({
          id: cat.id,
          name: cat.name,
          pendingItems: cat.imageCollection.progress.pendingItems,
          lastRun: cat.imageCollection.progress.lastCollectionRun,
          nextScheduled: cat.imageCollection.progress.nextScheduledRun
        })),

        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: queue.total,
          hasMore: (parseInt(offset) + parseInt(limit)) < queue.total
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/collection/process
 * @desc    Process pending collections (trigger the automated workflow)
 * @access  Admin
 */
router.post('/process', asyncHandler(async (req, res) => {
  const {
    maxJobs = 5,
    categories = null,
    priority = 'normal'
  } = req.body;

  try {
    // Start automated processing
    const processingResult = await imageCollectionService.processQueue({
      maxJobs,
      categories,
      priority
    });

    res.json({
      success: true,
      message: 'Collection processing started',
      data: {
        jobsStarted: processingResult.jobsStarted,
        categoriesProcessed: processingResult.categoriesProcessed,
        estimatedCompletionTime: processingResult.estimatedCompletionTime,
        queueStatus: processingResult.queueStatus
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/collection/images/:categoryId/:letter/:itemId/approve
 * @desc    Approve an image for an item
 * @access  Admin
 */
router.post('/images/:categoryId/:letter/:itemId/approve', asyncHandler(async (req, res) => {
  const { categoryId, letter, itemId } = req.params;
  const { imageId, setPrimary = false } = req.body;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const items = category.getItemsByLetter(letter);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const image = item.images.find(img => img._id.toString() === imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Approve the image
    image.status = 'approved';
    image.approvedAt = new Date();
    image.approvedBy = req.user?.id || 'admin'; // Assuming auth middleware

    // Set as primary if requested
    if (setPrimary) {
      // Remove primary flag from other images
      item.images.forEach(img => img.isPrimary = false);
      image.isPrimary = true;

      // Update legacy image field
      item.image = image.filePath;
      item.imageAlt = `A ${item.name.toLowerCase()}`;
    }

    // Update collection progress
    item.collectionProgress.approvedCount = item.images.filter(img => img.status === 'approved').length;

    // Check if collection is complete
    if (item.collectionProgress.approvedCount >= item.collectionProgress.targetCount) {
      item.collectionProgress.status = 'completed';
      item.collectionProgress.completedAt = new Date();
    }

    category.markModified('items');
    await category.save();

    res.json({
      success: true,
      message: 'Image approved successfully',
      data: {
        imageId,
        itemId: item.id,
        isPrimary: image.isPrimary,
        collectionStatus: item.collectionProgress.status,
        approvedCount: item.collectionProgress.approvedCount,
        targetCount: item.collectionProgress.targetCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/collection/images/:categoryId/:letter/:itemId/reject
 * @desc    Reject an image for an item
 * @access  Admin
 */
router.post('/images/:categoryId/:letter/:itemId/reject', asyncHandler(async (req, res) => {
  const { categoryId, letter, itemId } = req.params;
  const { imageId, reason, deleteImage = false } = req.body;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const items = category.getItemsByLetter(letter);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const imageIndex = item.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const image = item.images[imageIndex];

    if (deleteImage) {
      // Remove image entirely
      item.images.splice(imageIndex, 1);
    } else {
      // Mark as rejected
      image.status = 'rejected';
      image.rejectionReason = reason;
      image.rejectionDetails = { rejectedAt: new Date(), rejectedBy: req.user?.id || 'admin' };
    }

    // Update collection progress
    const approvedCount = item.images.filter(img => img.status === 'approved').length;
    const rejectedCount = item.images.filter(img => img.status === 'rejected').length;

    item.collectionProgress.approvedCount = approvedCount;
    item.collectionProgress.rejectedCount = rejectedCount;

    // If we don't have enough approved images, mark as pending again
    if (approvedCount < item.collectionProgress.targetCount) {
      item.collectionProgress.status = 'pending';
      item.collectionProgress.completedAt = null;
    }

    category.markModified('items');
    await category.save();

    res.json({
      success: true,
      message: deleteImage ? 'Image deleted successfully' : 'Image rejected successfully',
      data: {
        imageId,
        itemId: item.id,
        deleted: deleteImage,
        collectionStatus: item.collectionProgress.status,
        approvedCount: item.collectionProgress.approvedCount,
        rejectedCount: item.collectionProgress.rejectedCount,
        targetCount: item.collectionProgress.targetCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/v1/collection/stats
 * @desc    Get overall collection statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get category-level stats
    const categoryStats = await Category.getCollectionStats();
    const overallStats = categoryStats[0] || {};

    // Get queue stats
    const queueStats = await imageCollectionService.getQueueStats();

    // Get recent activity
    const recentJobs = await imageCollectionService.getRecentJobs(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalCategories: overallStats.totalCategories || 0,
          totalItems: overallStats.totalItems || 0,
          completedItems: overallStats.completedItems || 0,
          pendingItems: overallStats.pendingItems || 0,
          totalImages: overallStats.totalImages || 0,
          approvedImages: overallStats.approvedImages || 0,
          avgQualityScore: overallStats.avgQuality || 0,
          completionPercentage: overallStats.totalItems > 0
            ? Math.round((overallStats.completedItems / overallStats.totalItems) * 100)
            : 0
        },

        queue: {
          active: queueStats.active,
          waiting: queueStats.waiting,
          completed: queueStats.completed,
          failed: queueStats.failed,
          totalProcessed: queueStats.totalProcessed
        },

        recentActivity: recentJobs.map(job => ({
          id: job.id,
          type: job.type,
          categoryName: job.data.categoryName,
          status: job.status,
          completedAt: job.completedAt,
          duration: job.duration,
          itemsProcessed: job.data.itemsProcessed || 0
        }))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   PUT /api/v1/collection/settings/:categoryId
 * @desc    Update collection settings for a category
 * @access  Admin
 */
router.put('/settings/:categoryId', asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { strategy, enabled } = req.body;

  try {
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Update collection settings
    if (strategy) {
      Object.assign(category.imageCollection.strategy, strategy);
    }

    if (typeof enabled === 'boolean') {
      category.imageCollection.enabled = enabled;
    }

    category.imageCollection.lastConfigUpdate = new Date();
    category.markModified('imageCollection');
    await category.save();

    res.json({
      success: true,
      message: 'Collection settings updated successfully',
      data: {
        categoryId: category.id,
        enabled: category.imageCollection.enabled,
        strategy: category.imageCollection.strategy,
        lastUpdate: category.imageCollection.lastConfigUpdate
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/v1/collection/jobs/:jobId/cancel
 * @desc    Cancel a specific collection job
 * @access  Admin
 */
router.post('/jobs/:jobId/cancel', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const result = await imageCollectionService.cancelJob(jobId);

    res.json({
      success: true,
      message: 'Collection job cancelled successfully',
      data: {
        jobId,
        status: result.status,
        cancelledAt: result.cancelledAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;