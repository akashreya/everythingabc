const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
const logger = require('winston');

/**
 * Image Management Routes
 * For managing images across categories and items
 */

// @desc    Get images with filtering and pagination
// @route   GET /api/v1/images
// @access  Admin
router.get('/', asyncHandler(async (req, res) => {
  try {
    const {
      status,
      category,
      letter,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build match criteria
    const matchCriteria = {};
    if (category) matchCriteria.id = category;
    if (status !== undefined) matchCriteria.status = { $ne: 'deleted' };

    // Aggregation pipeline to get all images
    const pipeline = [
      { $match: matchCriteria },
      { $unwind: '$items' },
      { $unwind: '$items' },
      { $match: letter ? { 'items.letter': letter.toUpperCase() } : {} },
      { $unwind: { path: '$items.images', preserveNullAndEmptyArrays: true } },
      { $match: status ? { 'items.images.status': status } : {} },
      {
        $project: {
          _id: 0,
          categoryId: '$id',
          categoryName: '$name',
          letter: '$items.letter',
          itemId: '$items.id',
          itemName: '$items.name',
          image: '$items.images',
          sortField: `$items.images.${sortBy === 'createdAt' ? 'createdAt' : 'updatedAt'}`
        }
      },
      { $sort: { sortField: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ];

    const images = await Category.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [
      { $match: matchCriteria },
      { $unwind: '$items' },
      { $unwind: '$items' },
      { $match: letter ? { 'items.letter': letter.toUpperCase() } : {} },
      { $unwind: { path: '$items.images', preserveNullAndEmptyArrays: true } },
      { $match: status ? { 'items.images.status': status } : {} },
      { $count: 'total' }
    ];

    const countResult = await Category.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: images,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images'
    });
  }
}));

// @desc    Update image status (approve, reject, etc.)
// @route   PATCH /api/v1/images/:imageId/status
// @access  Admin
router.patch('/:imageId/status', asyncHandler(async (req, res) => {
  try {
    const { imageId } = req.params;
    const { status, reason, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'manual_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the image across all categories
    const categories = await Category.find({
      'items.A.images.sourceId': imageId,
      'items.B.images.sourceId': imageId,
      'items.C.images.sourceId': imageId,
      'items.D.images.sourceId': imageId,
      'items.E.images.sourceId': imageId,
      'items.F.images.sourceId': imageId,
      'items.G.images.sourceId': imageId,
      'items.H.images.sourceId': imageId,
      'items.I.images.sourceId': imageId,
      'items.J.images.sourceId': imageId,
      'items.K.images.sourceId': imageId,
      'items.L.images.sourceId': imageId,
      'items.M.images.sourceId': imageId,
      'items.N.images.sourceId': imageId,
      'items.O.images.sourceId': imageId,
      'items.P.images.sourceId': imageId,
      'items.Q.images.sourceId': imageId,
      'items.R.images.sourceId': imageId,
      'items.S.images.sourceId': imageId,
      'items.T.images.sourceId': imageId,
      'items.U.images.sourceId': imageId,
      'items.V.images.sourceId': imageId,
      'items.W.images.sourceId': imageId,
      'items.X.images.sourceId': imageId,
      'items.Y.images.sourceId': imageId,
      'items.Z.images.sourceId': imageId
    });

    // Alternative approach: search through all categories
    const allCategories = await Category.find({});
    let foundImage = null;
    let foundCategory = null;
    let foundLetter = null;
    let foundItem = null;

    for (const category of allCategories) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (const letter of alphabet) {
        if (category.items[letter]) {
          for (const item of category.items[letter]) {
            if (item.images) {
              const image = item.images.find(img => img.sourceId === imageId);
              if (image) {
                foundImage = image;
                foundCategory = category;
                foundLetter = letter;
                foundItem = item;
                break;
              }
            }
          }
          if (foundImage) break;
        }
      }
      if (foundImage) break;
    }

    if (!foundImage) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Update image status
    foundImage.status = status;
    foundImage.updatedAt = new Date();

    if (status === 'approved') {
      foundImage.approvedAt = new Date();
      foundImage.approvedBy = req.user?.id || 'admin';
    } else if (status === 'rejected') {
      foundImage.rejectedAt = new Date();
      foundImage.rejectedBy = req.user?.id || 'admin';
      foundImage.rejectionReason = reason;
    }

    if (notes) {
      foundImage.notes = notes;
    }

    // Update item collection progress
    if (foundItem.collectionProgress) {
      const approvedCount = foundItem.images.filter(img => img.status === 'approved').length;
      foundItem.collectionProgress.approvedCount = approvedCount;

      if (approvedCount >= foundItem.collectionProgress.targetCount) {
        foundItem.collectionProgress.status = 'completed';
        foundItem.collectionProgress.completedAt = new Date();
      }
    }

    foundCategory.markModified('items');
    await foundCategory.save();

    logger.info(`Updated image ${imageId} status to ${status}`);

    res.json({
      success: true,
      message: `Image status updated to ${status}`,
      data: {
        imageId,
        newStatus: status,
        categoryId: foundCategory.id,
        letter: foundLetter,
        itemId: foundItem.id,
        collectionStatus: foundItem.collectionProgress?.status
      }
    });

  } catch (error) {
    logger.error('Failed to update image status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update image status'
    });
  }
}));

// @desc    Get image statistics
// @route   GET /api/v1/images/stats
// @access  Admin
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const pipeline = [
      { $unwind: '$items' },
      { $unwind: '$items' },
      { $unwind: { path: '$items.images', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.images.status',
          count: { $sum: 1 }
        }
      }
    ];

    const statusCounts = await Category.aggregate(pipeline);

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      manual_review: 0
    };

    statusCounts.forEach(item => {
      if (item._id) {
        stats[item._id] = item.count;
        stats.total += item.count;
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get image stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve image statistics'
    });
  }
}));

module.exports = router;