const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
const logger = require('winston');

/**
 * Data Seeding Routes
 * For populating and managing category data
 */

// @desc    Seed categories from JSON data
// @route   POST /api/v1/seed/categories
// @access  Admin
router.post('/categories', asyncHandler(async (req, res) => {
  try {
    const { categories, options = {} } = req.body;

    if (!categories) {
      return res.status(400).json({
        success: false,
        error: 'Categories data is required'
      });
    }

    const results = {
      totalCategories: 0,
      totalItems: 0,
      created: [],
      updated: [],
      errors: []
    };

    // Handle both object format {categoryId: data} and array format
    const categoriesData = Array.isArray(categories) ? categories : Object.entries(categories);

    for (const [categoryId, categoryData] of categoriesData) {
      try {
        const existingCategory = await Category.findOne({
          id: typeof categoryId === 'string' ? categoryId : categoryData.id
        });

        const categoryDoc = {
          id: categoryData.id || categoryId,
          name: categoryData.name,
          icon: categoryData.icon,
          color: categoryData.color,
          difficulty: categoryData.difficulty || 'Easy',
          description: categoryData.description,
          status: categoryData.status || 'active',
          tags: categoryData.tags || [],
          items: categoryData.items || {},
          metadata: {
            totalItems: 0,
            viewCount: 0,
            lastUpdated: new Date()
          }
        };

        // Count items
        if (categoryData.items) {
          Object.values(categoryData.items).forEach(letterItems => {
            if (Array.isArray(letterItems)) {
              categoryDoc.metadata.totalItems += letterItems.length;
              results.totalItems += letterItems.length;
            }
          });
        }

        if (existingCategory) {
          if (options.overwrite) {
            Object.assign(existingCategory, categoryDoc);
            await existingCategory.save();
            results.updated.push(categoryDoc.id);
          } else {
            results.errors.push(`Category ${categoryDoc.id} already exists`);
            continue;
          }
        } else {
          await Category.create(categoryDoc);
          results.created.push(categoryDoc.id);
        }

        results.totalCategories++;

      } catch (error) {
        results.errors.push(`Failed to process category ${categoryId}: ${error.message}`);
        logger.error(`Failed to seed category ${categoryId}:`, error);
      }
    }

    logger.info(`Seeded ${results.totalCategories} categories with ${results.totalItems} total items`);

    res.json({
      success: true,
      message: `Seeded ${results.totalCategories} categories successfully`,
      result: results
    });

  } catch (error) {
    logger.error('Failed to seed categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed categories'
    });
  }
}));

// @desc    Clear categories (delete all or specific category)
// @route   DELETE /api/v1/seed/categories
// @access  Admin
router.delete('/categories', asyncHandler(async (req, res) => {
  try {
    const { category } = req.body;

    let deleteResult;
    let message;

    if (category) {
      // Delete specific category
      deleteResult = await Category.deleteOne({ id: category });
      message = `Deleted category: ${category}`;
    } else {
      // Delete all categories
      deleteResult = await Category.deleteMany({});
      message = `Deleted all ${deleteResult.deletedCount} categories`;
    }

    logger.info(message);

    res.json({
      success: true,
      message: message,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    logger.error('Failed to clear categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear categories'
    });
  }
}));

// @desc    Get seeding statistics
// @route   GET /api/v1/seed/stats
// @access  Admin
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ status: 'active' });

    // Get item count across all categories
    const categories = await Category.find({}, 'items metadata');
    let totalItems = 0;

    categories.forEach(category => {
      if (category.metadata?.totalItems) {
        totalItems += category.metadata.totalItems;
      } else {
        // Calculate if not stored in metadata
        Object.values(category.items || {}).forEach(letterItems => {
          if (Array.isArray(letterItems)) {
            totalItems += letterItems.length;
          }
        });
      }
    });

    res.json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        totalItems,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('Failed to get seeding stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve seeding statistics'
    });
  }
}));

module.exports = router;