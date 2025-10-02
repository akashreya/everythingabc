const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
const ImageCollectionService = require('../services/ImageCollectionService');
const QualityAssessmentService = require('../services/QualityAssessmentService');
const logger = require('../utils/logger');

// Initialize services
const imageCollectionService = new ImageCollectionService();
const qualityService = new QualityAssessmentService();

/**
 * Image Collection API Routes
 *
 * These endpoints provide the unified image collection workflow,
 * eliminating the need for manual download/upload processes.
 */

// @desc    Get collection statistics
// @route   GET /api/v1/collection/stats
// @access  Admin
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await Category.getCollectionStats();

    res.json({
      success: true,
      data: stats[0] || {
        totalCategories: 0,
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        totalImages: 0,
        approvedImages: 0,
        avgQuality: 0
      }
    });
  } catch (error) {
    logger.error('Failed to get collection stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve collection statistics'
    });
  }
}));

// @desc    Get categories needing collection
// @route   GET /api/v1/collection/pending
// @access  Admin
router.get('/pending', asyncHandler(async (req, res) => {
  try {
    const categories = await Category.getCategoriesNeedingCollection();

    const pendingData = categories.map(category => ({
      id: category.id,
      name: category.name,
      pendingItems: category.imageCollection.progress.pendingItems,
      collectingItems: category.imageCollection.progress.collectingItems,
      totalItems: category.imageCollection.progress.totalItems,
      completionPercent: Math.round(
        (category.imageCollection.progress.completedItems /
         Math.max(category.imageCollection.progress.totalItems, 1)) * 100
      ),
      nextScheduledRun: category.imageCollection.progress.nextScheduledRun,
      priority: category.imageCollection.progress.pendingItems +
                category.imageCollection.progress.collectingItems
    }));

    res.json({
      success: true,
      data: pendingData
    });
  } catch (error) {
    logger.error('Failed to get pending collections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending collections'
    });
  }
}));

// @desc    Start collection for a specific category
// @route   POST /api/v1/collection/categories/:categoryId/start
// @access  Admin
router.post('/categories/:categoryId/start', asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { priority = 'normal', maxItems = null } = req.body;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Initialize image collection service if needed
    if (!imageCollectionService.initialized) {
      await imageCollectionService.initialize();
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

    // Queue collection jobs
    const jobs = [];
    for (const { letter, item } of itemsToProcess) {
      const job = await imageCollectionService.collectionQueue.add('item-collection', {
        categoryId: category.id,
        letter,
        itemId: item.id,
        itemName: item.name,
        priority,
        strategy: category.imageCollection.strategy
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

    // Update category collection status
    await category.startImageCollection();

    logger.info(`Started collection for ${itemsToProcess.length} items in category ${categoryId}`);

    res.json({
      success: true,
      message: `Started collection for ${itemsToProcess.length} items`,
      data: {
        categoryId,
        itemsQueued: itemsToProcess.length,
        totalPending: pendingItems.length,
        jobs
      }
    });

  } catch (error) {
    logger.error(`Failed to start collection for category ${req.params.categoryId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start collection'
    });
  }
}));

// @desc    Start collection for a specific item
// @route   POST /api/v1/collection/categories/:categoryId/items/:letter/:itemId/start
// @access  Admin
router.post('/categories/:categoryId/items/:letter/:itemId/start', asyncHandler(async (req, res) => {
  try {
    const { categoryId, letter, itemId } = req.params;
    const { priority = 'normal', forceRestart = false } = req.body;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const item = category.items[letter.toUpperCase()]?.find(item => item.id === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Check if collection is needed
    if (!forceRestart &&
        item.collectionProgress?.status === 'completed' &&
        item.collectionProgress?.approvedCount >= item.collectionProgress?.targetCount) {
      return res.status(400).json({
        success: false,
        error: 'Item already has sufficient approved images'
      });
    }

    // Initialize service if needed
    if (!imageCollectionService.initialized) {
      await imageCollectionService.initialize();
    }

    // Queue collection job
    const job = await imageCollectionService.collectionQueue.add('item-collection', {
      categoryId: category.id,
      letter: letter.toUpperCase(),
      itemId: item.id,
      itemName: item.name,
      priority,
      strategy: category.imageCollection.strategy,
      forceRestart
    }, {
      priority: priority === 'high' ? 10 : (priority === 'low' ? 1 : 5),
      attempts: 3,
      backoff: 'exponential'
    });

    logger.info(`Started collection for item ${item.name} in category ${categoryId}`);

    res.json({
      success: true,
      message: `Started collection for item: ${item.name}`,
      data: {
        jobId: job.id,
        categoryId,
        letter: letter.toUpperCase(),
        itemId,
        itemName: item.name,
        currentStatus: item.collectionProgress?.status,
        targetCount: item.collectionProgress?.targetCount,
        currentCount: item.collectionProgress?.approvedCount
      }
    });

  } catch (error) {
    logger.error(`Failed to start collection for item ${req.params.itemId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start item collection'
    });
  }
}));

// @desc    Get collection status for a category
// @route   GET /api/v1/collection/categories/:categoryId/status
// @access  Admin
router.get('/categories/:categoryId/status', asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Get active jobs for this category
    const activeJobs = await imageCollectionService.collectionQueue.getJobs(['active', 'waiting']);
    const categoryJobs = activeJobs.filter(job => job.data.categoryId === categoryId);

    // Calculate detailed progress
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const itemProgress = [];

    for (const letter of alphabet) {
      if (category.items[letter]) {
        for (const item of category.items[letter]) {
          const activeJob = categoryJobs.find(job =>
            job.data.letter === letter && job.data.itemId === item.id
          );

          itemProgress.push({
            letter,
            itemId: item.id,
            itemName: item.name,
            status: item.collectionProgress?.status || 'pending',
            targetCount: item.collectionProgress?.targetCount || 3,
            approvedCount: item.collectionProgress?.approvedCount || 0,
            collectedCount: item.collectionProgress?.collectedCount || 0,
            searchAttempts: item.collectionProgress?.searchAttempts || 0,
            difficulty: item.collectionProgress?.difficulty || 'medium',
            avgQuality: item.collectionProgress?.averageQualityScore || 0,
            hasActiveJob: !!activeJob,
            jobId: activeJob?.id,
            lastAttempt: item.collectionProgress?.lastAttempt,
            nextAttempt: item.collectionProgress?.nextAttempt
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        categoryId,
        categoryName: category.name,
        overview: category.imageCollection.progress,
        itemProgress,
        activeJobs: categoryJobs.length,
        lastCollectionRun: category.imageCollection.progress.lastCollectionRun,
        nextScheduledRun: category.imageCollection.progress.nextScheduledRun
      }
    });

  } catch (error) {
    logger.error(`Failed to get collection status for category ${req.params.categoryId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve collection status'
    });
  }
}));

// @desc    Get images for manual review
// @route   GET /api/v1/collection/review/pending
// @access  Admin
router.get('/review/pending', asyncHandler(async (req, res) => {
  try {
    const { limit = 20, category = null } = req.query;

    const matchStage = {
      status: 'active',
      'items.A.images': { $exists: true }
    };

    if (category) {
      matchStage.id = category;
    }

    const categories = await Category.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      { $unwind: '$items' },
      { $unwind: '$items.images' },
      { $match: { 'items.images.status': { $in: ['pending', 'manual_review'] } } },
      {
        $project: {
          categoryId: '$id',
          categoryName: '$name',
          letter: '$items.letter',
          itemId: '$items.id',
          itemName: '$items.name',
          image: '$items.images',
          _id: 0
        }
      },
      { $sort: { 'image.createdAt': 1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Failed to get pending review images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images for review'
    });
  }
}));

// @desc    Approve or reject an image
// @route   POST /api/v1/collection/review/:categoryId/:letter/:itemId/:imageId
// @access  Admin
router.post('/review/:categoryId/:letter/:itemId/:imageId', asyncHandler(async (req, res) => {
  try {
    const { categoryId, letter, itemId, imageId } = req.params;
    const { action, reason = '', setPrimary = false } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "approve" or "reject"'
      });
    }

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const item = category.items[letter.toUpperCase()]?.find(item => item.id === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const image = item.images.find(img => img.sourceId === imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Update image status
    if (action === 'approve') {
      image.status = 'approved';
      image.approvedAt = new Date();
      image.approvedBy = req.user?.id || 'admin';

      // Set as primary if requested or if it's the first approved image
      if (setPrimary || !item.images.some(img => img.isPrimary && img.status === 'approved')) {
        // Remove primary flag from other images
        item.images.forEach(img => img.isPrimary = false);
        image.isPrimary = true;
        item.image = image.filePath; // Update legacy image field
      }

      // Update collection progress
      if (item.collectionProgress) {
        item.collectionProgress.approvedCount = item.images.filter(img => img.status === 'approved').length;

        if (item.collectionProgress.approvedCount >= item.collectionProgress.targetCount) {
          item.collectionProgress.status = 'completed';
          item.collectionProgress.completedAt = new Date();
        }
      }

    } else {
      image.status = 'rejected';
      image.rejectionReason = reason;
      image.rejectedAt = new Date();
      image.rejectedBy = req.user?.id || 'admin';
    }

    // Save changes
    category.markModified('items');
    await category.save();

    logger.info(`Image ${action}ed: ${categoryId}/${letter}/${itemId}/${imageId}`);

    res.json({
      success: true,
      message: `Image ${action}ed successfully`,
      data: {
        categoryId,
        letter: letter.toUpperCase(),
        itemId,
        imageId,
        action,
        newStatus: image.status,
        isPrimary: image.isPrimary,
        collectionStatus: item.collectionProgress?.status
      }
    });

  } catch (error) {
    logger.error(`Failed to ${req.body.action} image:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.body.action} image`
    });
  }
}));

// @desc    Update collection strategy for a category
// @route   PUT /api/v1/collection/categories/:categoryId/strategy
// @access  Admin
router.put('/categories/:categoryId/strategy', asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;
    const strategy = req.body;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Validate strategy fields
    const validFields = [
      'enabled', 'prioritySources', 'excludeSources', 'useAiGeneration',
      'minQualityThreshold', 'targetImagesPerItem', 'autoApprovalThreshold',
      'maxSearchAttempts', 'retryInterval', 'customSearchTerms'
    ];

    const updates = {};
    for (const [key, value] of Object.entries(strategy)) {
      if (validFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid strategy fields provided'
      });
    }

    // Update strategy
    Object.assign(category.imageCollection.strategy, updates);
    category.imageCollection.lastConfigUpdate = new Date();

    category.markModified('imageCollection');
    await category.save();

    logger.info(`Updated collection strategy for category ${categoryId}`, updates);

    res.json({
      success: true,
      message: 'Collection strategy updated successfully',
      data: {
        categoryId,
        strategy: category.imageCollection.strategy
      }
    });

  } catch (error) {
    logger.error(`Failed to update strategy for category ${req.params.categoryId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update collection strategy'
    });
  }
}));

// @desc    Get queue status and job information
// @route   GET /api/v1/collection/queue/status
// @access  Admin
router.get('/queue/status', asyncHandler(async (req, res) => {
  try {
    if (!imageCollectionService.initialized) {
      return res.status(503).json({
        success: false,
        error: 'Image collection service not initialized'
      });
    }

    const [
      activeJobs,
      waitingJobs,
      completedJobs,
      failedJobs
    ] = await Promise.all([
      imageCollectionService.collectionQueue.getJobs(['active']),
      imageCollectionService.collectionQueue.getJobs(['waiting']),
      imageCollectionService.collectionQueue.getJobs(['completed'], 0, 10),
      imageCollectionService.collectionQueue.getJobs(['failed'], 0, 10)
    ]);

    const queueStatus = {
      active: activeJobs.length,
      waiting: waitingJobs.length,
      completed: completedJobs.length,
      failed: failedJobs.length,
      jobs: {
        active: activeJobs.map(job => ({
          id: job.id,
          data: job.data,
          progress: job.progress(),
          processedOn: job.processedOn,
          delay: job.delay
        })),
        waiting: waitingJobs.slice(0, 5).map(job => ({
          id: job.id,
          data: job.data,
          delay: job.delay,
          priority: job.opts.priority
        })),
        recentCompleted: completedJobs.map(job => ({
          id: job.id,
          data: job.data,
          finishedOn: job.finishedOn,
          returnvalue: job.returnvalue
        })),
        recentFailed: failedJobs.map(job => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          finishedOn: job.finishedOn
        }))
      }
    };

    res.json({
      success: true,
      data: queueStatus
    });

  } catch (error) {
    logger.error('Failed to get queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queue status'
    });
  }
}));

module.exports = router;