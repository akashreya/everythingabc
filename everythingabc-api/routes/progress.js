const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
const Item = require('../models/Item');
const logger = require('winston');

/**
 * Progress Tracking Routes
 * For monitoring collection progress across categories and items
 */

// @desc    Get collection progress with filters
// @route   GET /api/v1/progress
// @access  Admin
router.get('/', asyncHandler(async (req, res) => {
  try {
    const {
      category,
      status,
      page = 1,
      limit = 100,
      sortBy = 'progress',
      sortOrder = 'desc'
    } = req.query;

    // Build query for Item model
    const query = { status: 'published' };

    // Add category filter if provided (support both single category and multi-category items)
    if (category) {
      query.$or = [
        { categoryId: category },
        { categoryIds: { $in: [category] } }
      ];
    }

    // Add status filter if provided - map to collectionStatus
    if (status) {
      switch (status) {
        case 'completed':
          query.collectionStatus = 'complete';
          break;
        case 'pending':
          query.collectionStatus = 'pending';
          break;
        case 'in_progress':
          // For now, treat as pending since we only have complete/pending
          query.collectionStatus = 'pending';
          break;
      }
    }

    // Get items from database
    const items = await Item.find(query).sort({ categoryId: 1, letter: 1, name: 1 });

    // Transform to progress format
    const progressData = items.map(item => {
      // Calculate progress based on actual data
      const hasImages = item.imageIds && item.imageIds.length > 0;
      const imageCount = item.metadata?.imageCount || item.imageIds?.length || 0;

      // Map collectionStatus to old status format
      let itemStatus = 'pending';
      if (item.collectionStatus === 'complete') {
        itemStatus = 'completed';
      } else if (imageCount > 0 && imageCount < 3) {
        itemStatus = 'in_progress';
      }

      const targetCount = 3; // Standard target
      const approvedCount = item.collectionStatus === 'complete' ? Math.min(imageCount, targetCount) : imageCount;
      const completionPercent = targetCount > 0 ? Math.round((approvedCount / targetCount) * 100) : 0;

      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        letter: item.letter,
        itemId: item.id,
        itemName: item.name,
        status: itemStatus,
        targetCount,
        collectedCount: imageCount,
        approvedCount,
        completionPercent: Math.min(completionPercent, 100), // Cap at 100%
        lastAttempt: item.updatedAt,
        nextAttempt: null,
        difficulty: item.difficulty || 1,
        averageQualityScore: 0, // We don't track this currently
        searchAttempts: 0, // We don't track this currently
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

    // Sort the data
    const sortField = sortBy === 'progress' ? 'completionPercent' : sortBy;
    progressData.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = progressData.slice(startIndex, endIndex);

    // Calculate summary stats
    const totalItems = progressData.length;
    const completedItems = progressData.filter(item => item.status === 'completed').length;
    const inProgressItems = progressData.filter(item => item.status === 'in_progress').length;
    const pendingItems = progressData.filter(item => item.status === 'pending').length;
    const averageCompletion = totalItems > 0
      ? Math.round(progressData.reduce((sum, item) => sum + item.completionPercent, 0) / totalItems)
      : 0;

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems,
        itemsPerPage: parseInt(limit)
      },
      summary: {
        totalItems,
        completedItems,
        inProgressItems,
        pendingItems,
        averageCompletion
      }
    });

  } catch (error) {
    logger.error('Failed to get progress data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve progress data'
    });
  }
}));

// @desc    Get progress summary by category
// @route   GET /api/v1/progress/summary
// @access  Admin
router.get('/summary', asyncHandler(async (req, res) => {
  try {
    // Get all items from database
    const items = await Item.find({ status: 'published' });

    // Get unique categories (include multi-category items)
    const categoryMap = new Map();

    items.forEach(item => {
      // Handle both single and multi-category items
      const categories = item.categoryIds && item.categoryIds.length > 0
        ? item.categoryIds
        : [item.categoryId];

      categories.forEach(categoryId => {
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryId,
            categoryName: item.categoryName,
            categoryIcon: item.categoryIcon || '📁',
            categoryColor: item.categoryColor || '#6B7280',
            totalItems: 0,
            completedItems: 0,
            inProgressItems: 0,
            pendingItems: 0,
            totalImages: 0,
            approvedImages: 0,
            lastUpdated: item.updatedAt
          });
        }

        const cat = categoryMap.get(categoryId);
        cat.totalItems++;

        const imageCount = item.metadata?.imageCount || item.imageIds?.length || 0;
        cat.totalImages += imageCount;

        // Map collectionStatus to progress status
        if (item.collectionStatus === 'complete') {
          cat.completedItems++;
          cat.approvedImages += imageCount; // All images are considered approved when complete
        } else if (imageCount > 0 && imageCount < 3) {
          cat.inProgressItems++;
          cat.approvedImages += imageCount; // Partial progress
        } else {
          cat.pendingItems++;
        }

        // Update last updated timestamp
        if (item.updatedAt > cat.lastUpdated) {
          cat.lastUpdated = item.updatedAt;
        }
      });
    });

    // Convert to array and calculate percentages
    const summary = Array.from(categoryMap.values()).map(cat => {
      const completionPercent = cat.totalItems > 0
        ? Math.round((cat.completedItems / cat.totalItems) * 100)
        : 0;

      const imageApprovalRate = cat.totalImages > 0
        ? Math.round((cat.approvedImages / cat.totalImages) * 100)
        : 0;

      return {
        ...cat,
        completionPercent,
        imageApprovalRate
      };
    });

    // Sort by completion percentage
    summary.sort((a, b) => b.completionPercent - a.completionPercent);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Failed to get progress summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve progress summary'
    });
  }
}));

// @desc    Get detailed progress for a specific category
// @route   GET /api/v1/progress/category/:categoryId
// @access  Admin
router.get('/category/:categoryId', asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Get items for this category (support multi-category items)
    const items = await Item.find({
      $or: [
        { categoryId: categoryId },
        { categoryIds: { $in: [categoryId] } }
      ],
      status: 'published'
    }).sort({ letter: 1, name: 1 });

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or has no items'
      });
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterProgress = {};

    // Initialize all letters
    alphabet.split('').forEach(letter => {
      letterProgress[letter] = {
        letter,
        totalItems: 0,
        completedItems: 0,
        inProgressItems: 0,
        pendingItems: 0,
        items: []
      };
    });

    // Process items by letter
    items.forEach(item => {
      const letter = item.letter;
      if (!letterProgress[letter]) return; // Skip invalid letters

      letterProgress[letter].totalItems++;

      const imageCount = item.metadata?.imageCount || item.imageIds?.length || 0;

      // Map collectionStatus to progress status
      let itemStatus = 'pending';
      if (item.collectionStatus === 'complete') {
        itemStatus = 'completed';
        letterProgress[letter].completedItems++;
      } else if (imageCount > 0 && imageCount < 3) {
        itemStatus = 'in_progress';
        letterProgress[letter].inProgressItems++;
      } else {
        letterProgress[letter].pendingItems++;
      }

      const targetCount = 3;
      const approvedCount = item.collectionStatus === 'complete' ? Math.min(imageCount, targetCount) : imageCount;
      const completionPercent = targetCount > 0 ? Math.round((approvedCount / targetCount) * 100) : 0;

      letterProgress[letter].items.push({
        itemId: item.id,
        itemName: item.name,
        status: itemStatus,
        targetCount,
        approvedCount,
        completionPercent: Math.min(completionPercent, 100),
        lastAttempt: item.updatedAt,
        difficulty: item.difficulty || 1
      });
    });

    // Calculate letter completion percentages
    Object.keys(letterProgress).forEach(letter => {
      const letterData = letterProgress[letter];
      letterData.completionPercent = letterData.totalItems > 0
        ? Math.round((letterData.completedItems / letterData.totalItems) * 100)
        : 0;
    });

    // Get category name from first item
    const categoryName = items[0].categoryName || categoryId;

    res.json({
      success: true,
      data: {
        categoryId,
        categoryName,
        letterProgress
      }
    });

  } catch (error) {
    logger.error(`Failed to get category progress for ${req.params.categoryId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category progress'
    });
  }
}));

module.exports = router;