const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const CategoryImage = require('../models/CategoryImage');

/**
 * Items Resource Routes
 *
 * Provides access to individual vocabulary items across all categories
 *
 * Endpoints:
 * - GET /api/v1/items/ - List all items with filtering
 * - GET /api/v1/items/:id - Get specific item details
 * - GET /api/v1/items/:id/images - Get all images for an item
 * - GET /api/v1/items/:id/related - Get related items
 */

// Helper function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v1/items/
 *
 * List all items with advanced filtering and pagination
 *
 * Query parameters:
 * - category: Filter by category ID
 * - letter: Filter by starting letter
 * - difficulty: Filter by maximum difficulty (1-5)
 * - tags: Comma-separated tags to filter by
 * - search: Text search in name/description
 * - sort: Sort order (name, difficulty, popularity, recent, random)
 * - has_images: Filter items with/without images (true/false)
 * - status: Filter by status (published, draft, archived)
 * - limit: Number of items per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    category,
    letter,
    difficulty,
    tags,
    search,
    sort = 'name',
    has_images,
    status = 'published',
    limit = 20,
    offset = 0
  } = req.query;

  const startTime = Date.now();

  try {
    // Build query
    const query = { status };

    if (category) {
      query.categoryId = category;
    }

    if (letter) {
      query.letter = letter.toUpperCase();
    }

    if (difficulty) {
      query.difficulty = { $lte: parseInt(difficulty) };
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    if (has_images !== undefined) {
      if (has_images === 'true') {
        query.primaryImageId = { $exists: true, $ne: null };
      } else if (has_images === 'false') {
        query.primaryImageId = { $exists: false };
      }
    }

    // Build sort option
    let sortOption = {};
    switch (sort) {
      case 'difficulty':
        sortOption = { difficulty: 1, name: 1 };
        break;
      case 'popularity':
        sortOption = { 'metadata.popularityScore': -1 };
        break;
      case 'recent':
        sortOption = { updatedAt: -1 };
        break;
      case 'random':
        // Random sort will be handled differently
        break;
      case 'name':
      default:
        sortOption = { name: 1 };
    }

    // Parse pagination parameters
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    // Execute query
    let items;
    if (sort === 'random') {
      // For random sort, use aggregation
      items = await Item.aggregate([
        { $match: query },
        { $sample: { size: parsedLimit } }
      ]);
    } else if (search) {
      // Use text search
      items = await Item.searchItems(search, {
        limit: parsedLimit,
        offset: parsedOffset,
        status,
        categories: category ? [category] : undefined,
        letters: letter ? [letter] : undefined,
        difficulty: difficulty ? parseInt(difficulty) : undefined
      });
    } else {
      // Regular query
      items = await Item.find(query)
        .sort(sortOption)
        .skip(parsedOffset)
        .limit(parsedLimit)
        .populate('primaryImageId')
        .lean();
    }

    // Get total count for pagination
    const totalCount = await Item.countDocuments(query);

    const responseTime = Date.now() - startTime;

    res.json({
      count: totalCount,
      next: parsedOffset + parsedLimit < totalCount ? `/api/v1/items?limit=${parsedLimit}&offset=${parsedOffset + parsedLimit}` : null,
      previous: parsedOffset > 0 ? `/api/v1/items?limit=${parsedLimit}&offset=${Math.max(0, parsedOffset - parsedLimit)}` : null,
      results: items,
      meta: {
        filters: {
          category,
          letter,
          difficulty,
          tags,
          search,
          sort,
          has_images,
          status
        },
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/random
 *
 * Get a random item (optionally filtered by category or letter)
 */
router.get('/random', asyncHandler(async (req, res) => {
  const { category, letter } = req.query;

  try {
    const options = {};
    if (category) {
      options.categoryId = category;
    }
    if (letter) {
      options.letter = letter.toUpperCase();
    }

    const randomItems = await Item.getRandom(options);

    if (!randomItems || randomItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No items found',
        message: 'No items match the specified criteria'
      });
    }

    // Populate primary image
    const item = randomItems[0];
    const populatedItem = await Item.findById(item._id).populate('primaryImageId');

    res.json(populatedItem);
  } catch (error) {
    console.error('Error fetching random item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch random item',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/stats/popular
 *
 * Get most popular items across the platform
 */
router.get('/stats/popular', asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;

  try {
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    const query = { status: 'published' };
    if (category) {
      query.categoryId = category;
    }

    const popularItems = await Item.find(query)
      .sort({ 'metadata.popularityScore': -1 })
      .limit(parsedLimit)
      .populate('primaryImageId')
      .lean();

    res.json({
      count: popularItems.length,
      results: popularItems,
      meta: {
        category: category || 'all',
        limit: parsedLimit
      }
    });
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular items',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/stats/recent
 *
 * Get recently added or updated items
 */
router.get('/stats/recent', asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;

  try {
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    const query = { status: 'published' };
    if (category) {
      query.categoryId = category;
    }

    const recentItems = await Item.find(query)
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .populate('primaryImageId')
      .lean();

    res.json({
      count: recentItems.length,
      results: recentItems,
      meta: {
        category: category || 'all',
        limit: parsedLimit
      }
    });
  } catch (error) {
    console.error('Error fetching recent items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent items',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/:id
 *
 * Get detailed information about a specific item
 *
 * Includes:
 * - Full item data
 * - All associated images
 * - Related resource URLs
 * - Category information
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const item = await Item.findOne({ id, status: { $ne: 'archived' } })
      .populate('primaryImageId')
      .populate('imageIds')
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        message: `No item found with ID: ${id}`
      });
    }

    // Update view count (async, don't wait)
    Item.updateOne(
      { id },
      {
        $inc: { 'metadata.viewCount': 1 },
        $set: { 'metadata.lastViewed': new Date() }
      }
    ).exec();

    res.json(item);
  } catch (error) {
    console.error(`Error fetching item ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/:id/images
 *
 * Get all images associated with an item
 */
router.get('/:id/images', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Verify item exists
    const item = await Item.findOne({ id });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        message: `No item found with ID: ${id}`
      });
    }

    // Get all images for this item
    const images = await CategoryImage.findByItem(id);

    res.json({
      count: images.length,
      results: images,
      meta: {
        itemId: id,
        itemName: item.name,
        primaryImage: images.find(img => img.isPrimary)?._id || null
      }
    });
  } catch (error) {
    console.error(`Error fetching images for item ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/items/:id/related
 *
 * Get related items based on:
 * - Same category
 * - Similar difficulty
 * - Matching tags
 * - Same letter
 */
router.get('/:id/related', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;

  try {
    // Get the source item
    const sourceItem = await Item.findOne({ id, status: 'published' });
    if (!sourceItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    // Find related items using a scoring system
    const relatedItems = await Item.aggregate([
      {
        $match: {
          id: { $ne: id },
          status: 'published'
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Same category = 50 points
              { $cond: [{ $eq: ['$categoryId', sourceItem.categoryId] }, 50, 0] },
              // Same letter = 30 points
              { $cond: [{ $eq: ['$letter', sourceItem.letter] }, 30, 0] },
              // Similar difficulty (within 1 level) = 20 points
              {
                $cond: [
                  { $lte: [{ $abs: { $subtract: ['$difficulty', sourceItem.difficulty] } }, 1] },
                  20,
                  0
                ]
              },
              // Matching tags = 10 points per tag
              {
                $multiply: [
                  { $size: { $setIntersection: ['$tags', sourceItem.tags] } },
                  10
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          relevanceScore: { $gt: 0 }
        }
      },
      {
        $sort: { relevanceScore: -1, 'metadata.popularityScore': -1 }
      },
      {
        $limit: parsedLimit
      }
    ]);

    // Populate primary images
    await Item.populate(relatedItems, { path: 'primaryImageId' });

    res.json({
      count: relatedItems.length,
      results: relatedItems,
      meta: {
        sourceItemId: id,
        sourceItemName: sourceItem.name
      }
    });
  } catch (error) {
    console.error(`Error fetching related items for ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related items',
      message: error.message
    });
  }
}));

module.exports = router;
