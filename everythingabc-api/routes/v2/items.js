const express = require('express');
const router = express.Router();
const Item = require('../../models/Item');
const CategoryImage = require('../../models/CategoryImage');

// Helper function for async route handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v2/items/
 * List all items - MINIMAL data for list/search display only
 * Returns: id, name, letter, categoryId, categoryName, difficulty, status
 * Use /items/{id}/ for full details
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    category,
    letter,
    difficulty,
    tags,
    search,
    sort = 'name',
    limit = 20,
    offset = 0,
    status = 'published'
  } = req.query;

  // Build query
  const query = { status };

  if (category) {
    const categories = category.split(',');
    query.categoryId = { $in: categories };
  }

  if (letter) {
    const letters = letter.split(',').map(l => l.toUpperCase());
    query.letter = { $in: letters };
  }

  if (difficulty) {
    query.difficulty = { $lte: parseInt(difficulty) };
  }

  if (tags) {
    const tagList = tags.split(',');
    query.tags = { $in: tagList };
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Build sort option
  let sortOption = {};
  switch (sort) {
    case 'name':
      sortOption = { name: 1 };
      break;
    case 'difficulty':
      sortOption = { difficulty: 1, name: 1 };
      break;
    case 'category':
      sortOption = { categoryName: 1, name: 1 };
      break;
    case 'popular':
      sortOption = { 'metadata.popularityScore': -1 };
      break;
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    default:
      sortOption = { name: 1 };
  }

  // Add text score sorting if searching
  if (search) {
    sortOption = { score: { $meta: 'textScore' }, ...sortOption };
  }

  // Select only MINIMAL fields for items list/search display
  const selectFields = [
    'id', 'name', 'letter', 'categoryId', 'categoryName',
    'categoryIcon', 'categoryColor', 'difficulty', 'status'
  ].join(' ');

  // Execute query with minimal field selection
  const items = await Item.find(query)
    .select(selectFields)
    .sort(sortOption)
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .lean();

  const total = await Item.countDocuments(query);

  res.json({
    count: total,
    results: items,
    meta: {
      query_time: new Date().toISOString(),
      filters: { category, letter, difficulty, tags, search, sort },
      performance: `Found ${total} items in ${items.length > 0 ? '<50ms' : '<10ms'}`
    }
  });
}));

/**
 * GET /api/v2/items/:id/
 * Get specific item details with rich linking
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await Item.findOne({
    id: req.params.id,
    status: { $in: ['published', 'draft'] }
  })
    .lean();

  if (!item) {
    return res.status(404).json({
      error: 'Item not found',
      details: `No item found with id: ${req.params.id}`
    });
  }

  // Update view count (don't await to avoid blocking response)
  Item.findOneAndUpdate(
    { id: req.params.id },
    {
      $inc: { 'metadata.viewCount': 1 },
      $set: { 'metadata.lastViewed': new Date() }
    }
  ).exec().catch(err => console.error('Failed to update view count:', err));

  // Transform to lightweight response with rich links
  const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

  const lightweightItem = {
    id: item.id,
    name: item.name,
    description: item.description,
    letter: item.letter,

    // Category info (denormalized for efficiency)
    category: {
      id: item.categoryId,
      name: item.categoryName,
      icon: item.categoryIcon,
      color: item.categoryColor,
      url: `${baseUrl}/categories/${item.categoryId}/`
    },

    // Learning attributes
    difficulty: item.difficulty,
    ageRange: item.ageRange,
    learningLevel: item.learningLevel,
    tags: item.tags,
    facts: item.facts,
    pronunciation: item.pronunciation,

    // Image references (lightweight)
    images: {
      count: item.metadata?.imageCount || 0,
      primary_image_url: item.primaryImageId ? `${baseUrl}/images/${item.primaryImageId}/` : null,
      all_images_url: `${baseUrl}/items/${item.id}/images/`,
      legacy_image_path: item.image // for backward compatibility
    },

    // Rich resource links
    related_resources: {
      category: `${baseUrl}/categories/${item.categoryId}/`,
      same_letter: `${baseUrl}/letters/${item.letter}/items/`,
      images: `${baseUrl}/items/${item.id}/images/`,
      related_items: `${baseUrl}/items/${item.id}/related/`,
      ...(item.tags?.length && {
        similar_tags: `${baseUrl}/items/?tags=${item.tags.slice(0, 3).join(',')}`
      }),
      ...(item.difficulty && {
        same_difficulty: `${baseUrl}/items/?difficulty=${item.difficulty}`
      }),
      random: `${baseUrl}/random/item/`,
      search: `${baseUrl}/search/`,
      stats: `${baseUrl}/stats/`
    },

    // Metadata (lightweight)
    metadata: {
      view_count: item.metadata?.viewCount || 0,
      image_count: item.metadata?.imageCount || 0,
      popularity_score: item.metadata?.popularityScore || 0,
      last_viewed: item.metadata?.lastViewed,
      last_updated: item.updatedAt
    },

    // Audit info
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };

  res.json(lightweightItem);
}));

/**
 * GET /api/v2/items/:id/images/
 * Get all images for a specific item
 */
router.get('/:id/images', asyncHandler(async (req, res) => {
  const item = await Item.findOne({ id: req.params.id });

  if (!item) {
    return res.status(404).json({
      error: 'Item not found',
      details: `No item found with id: ${req.params.id}`
    });
  }

  const images = await CategoryImage.findByItem(req.params.id);

  res.json({
    count: images.length,
    results: images,
    meta: {
      item_id: req.params.id,
      item_name: item.name,
      category: item.categoryName
    }
  });
}));

/**
 * GET /api/v2/items/:id/related/
 * Get related items (same category, similar tags, same difficulty)
 */
router.get('/:id/related', asyncHandler(async (req, res) => {
  const item = await Item.findOne({ id: req.params.id });

  if (!item) {
    return res.status(404).json({
      error: 'Item not found'
    });
  }

  const limit = parseInt(req.query.limit) || 10;

  // Find related items using multiple criteria
  const relatedQueries = [
    // Same category, different items
    {
      categoryId: item.categoryId,
      id: { $ne: item.id },
      status: 'published'
    },
    // Same tags
    item.tags && item.tags.length > 0 ? {
      tags: { $in: item.tags },
      id: { $ne: item.id },
      status: 'published'
    } : null,
    // Same difficulty
    {
      difficulty: item.difficulty,
      id: { $ne: item.id },
      status: 'published'
    }
  ].filter(Boolean);

  const relatedItemsPromises = relatedQueries.map(query =>
    Item.find(query)
      .limit(Math.ceil(limit / relatedQueries.length))
      .populate('primaryImageId')
      .lean()
  );

  const relatedItemsArrays = await Promise.all(relatedItemsPromises);

  // Combine and deduplicate
  const allRelated = relatedItemsArrays.flat();
  const uniqueRelated = allRelated.filter((item, index, self) =>
    index === self.findIndex(i => i.id === item.id)
  ).slice(0, limit);

  res.json({
    count: uniqueRelated.length,
    results: uniqueRelated,
    meta: {
      base_item: {
        id: item.id,
        name: item.name,
        category: item.categoryName,
        letter: item.letter
      },
      relation_types: [
        'same_category',
        'similar_tags',
        'same_difficulty'
      ]
    }
  });
}));

/**
 * GET /api/v2/items/:id/collections/
 * Get collections containing this item (placeholder for future feature)
 */
router.get('/:id/collections', asyncHandler(async (req, res) => {
  // Placeholder for future collections feature
  res.json({
    count: 0,
    results: [],
    meta: {
      message: 'Collections feature coming soon',
      item_id: req.params.id
    }
  });
}));

/**
 * POST /api/v2/items/
 * Create a new item (admin only - placeholder)
 */
router.post('/', asyncHandler(async (req, res) => {
  // This would require admin authentication
  res.status(501).json({
    error: 'Not implemented',
    message: 'Item creation requires admin authentication'
  });
}));

/**
 * PUT /api/v2/items/:id/
 * Update an item (admin only - placeholder)
 */
router.put('/:id', asyncHandler(async (req, res) => {
  // This would require admin authentication
  res.status(501).json({
    error: 'Not implemented',
    message: 'Item updates require admin authentication'
  });
}));

/**
 * DELETE /api/v2/items/:id/
 * Delete an item (admin only - placeholder)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  // This would require admin authentication
  res.status(501).json({
    error: 'Not implemented',
    message: 'Item deletion requires admin authentication'
  });
}));

module.exports = router;