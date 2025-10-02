const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
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

    // Build match criteria
    const matchCriteria = { status: 'active' };
    if (category) matchCriteria.id = category;

    const categories = await Category.find(matchCriteria);

    const progressData = [];

    categories.forEach(cat => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      alphabet.split('').forEach(letter => {
        if (cat.items[letter] && cat.items[letter].length > 0) {
          cat.items[letter].forEach(item => {
            const progress = item.collectionProgress || {
              status: 'pending',
              targetCount: 3,
              collectedCount: 0,
              approvedCount: 0
            };

            // Filter by status if provided
            if (status && progress.status !== status) return;

            const completionPercent = progress.targetCount > 0
              ? Math.round((progress.approvedCount / progress.targetCount) * 100)
              : 0;

            progressData.push({
              categoryId: cat.id,
              categoryName: cat.name,
              letter,
              itemId: item.id,
              itemName: item.name,
              status: progress.status,
              targetCount: progress.targetCount,
              collectedCount: progress.collectedCount || 0,
              approvedCount: progress.approvedCount || 0,
              completionPercent,
              lastAttempt: progress.lastAttempt,
              nextAttempt: progress.nextAttempt,
              difficulty: progress.difficulty || 'medium',
              averageQualityScore: progress.averageQualityScore || 0,
              searchAttempts: progress.searchAttempts || 0,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            });
          });
        }
      });
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
    const categories = await Category.find({ status: 'active' });

    const summary = categories.map(cat => {
      let totalItems = 0;
      let completedItems = 0;
      let inProgressItems = 0;
      let pendingItems = 0;
      let totalImages = 0;
      let approvedImages = 0;

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      alphabet.split('').forEach(letter => {
        if (cat.items[letter] && cat.items[letter].length > 0) {
          cat.items[letter].forEach(item => {
            totalItems++;

            const progress = item.collectionProgress || { status: 'pending' };

            switch (progress.status) {
              case 'completed':
                completedItems++;
                break;
              case 'in_progress':
              case 'collecting':
                inProgressItems++;
                break;
              default:
                pendingItems++;
            }

            if (item.images && item.images.length > 0) {
              totalImages += item.images.length;
              approvedImages += item.images.filter(img => img.status === 'approved').length;
            }
          });
        }
      });

      const completionPercent = totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
        : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        totalItems,
        completedItems,
        inProgressItems,
        pendingItems,
        completionPercent,
        totalImages,
        approvedImages,
        imageApprovalRate: totalImages > 0
          ? Math.round((approvedImages / totalImages) * 100)
          : 0,
        lastUpdated: cat.updatedAt
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

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterProgress = {};

    alphabet.split('').forEach(letter => {
      const items = category.items[letter] || [];

      letterProgress[letter] = {
        letter,
        totalItems: items.length,
        completedItems: 0,
        inProgressItems: 0,
        pendingItems: 0,
        items: []
      };

      items.forEach(item => {
        const progress = item.collectionProgress || { status: 'pending' };

        switch (progress.status) {
          case 'completed':
            letterProgress[letter].completedItems++;
            break;
          case 'in_progress':
          case 'collecting':
            letterProgress[letter].inProgressItems++;
            break;
          default:
            letterProgress[letter].pendingItems++;
        }

        letterProgress[letter].items.push({
          itemId: item.id,
          itemName: item.name,
          status: progress.status,
          targetCount: progress.targetCount || 3,
          approvedCount: progress.approvedCount || 0,
          completionPercent: progress.targetCount > 0
            ? Math.round((progress.approvedCount / progress.targetCount) * 100)
            : 0,
          lastAttempt: progress.lastAttempt,
          difficulty: progress.difficulty || 'medium'
        });
      });

      // Calculate letter completion percentage
      letterProgress[letter].completionPercent = letterProgress[letter].totalItems > 0
        ? Math.round((letterProgress[letter].completedItems / letterProgress[letter].totalItems) * 100)
        : 0;
    });

    res.json({
      success: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
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