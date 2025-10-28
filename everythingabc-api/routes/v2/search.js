const express = require('express');
const router = express.Router();
const Item = require('../../models/Item');
const Category = require('../../models/Category');
const CategoryImage = require('../../models/CategoryImage');

// Helper function for async route handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v2/search/
 * Global search across all content with rich filtering
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    q,
    type = 'items',
    categories,
    letters,
    difficulty,
    limit = 20,
    offset = 0,
    sort = 'relevance'
  } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Search query required',
      details: 'Search query (q) must be at least 2 characters long',
      code: 'INVALID_SEARCH_QUERY'
    });
  }

  const searchTerm = q.trim();
  const searchTypes = type.split(',');
  const results = {};

  // Search items - LIGHTWEIGHT with rich linking
  if (searchTypes.includes('items') || searchTypes.includes('all')) {
    const queryConditions = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ],
      status: 'published'
    };

    // Apply filters
    if (categories) {
      queryConditions.categoryId = { $in: categories.split(',') };
    }
    if (letters) {
      queryConditions.letter = { $in: letters.split(',').map(l => l.toUpperCase()) };
    }
    if (difficulty) {
      queryConditions.difficulty = { $lte: parseInt(difficulty) };
    }

    // Get lightweight items with minimal fields
    const items = await Item.find(queryConditions)
      .select('id name letter difficulty categoryId categoryName categoryIcon')
      .sort({ name: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const itemCount = await Item.countDocuments(queryConditions);

    // Get random images for all items
    const itemIds = items.map(item => item.id);
    const randomImages = await Promise.all(
      itemIds.map(async (itemId) => {
        const randomImage = await CategoryImage.aggregate([
          { $match: { itemId: itemId, status: 'approved' } },
          { $sample: { size: 1 } },
          { $project: { filePath: 1 } }
        ]);
        return { itemId, image: randomImage[0] || null };
      })
    );

    const imageMap = randomImages.reduce((acc, item) => {
      acc[item.itemId] = item.image;
      return acc;
    }, {});

    // Transform to lightweight rich-linked format
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;
    const lightweightItems = items.map(item => ({
      id: item.id,
      name: item.name,
      letter: item.letter,
      difficulty: item.difficulty,
      category: {
        id: item.categoryId,
        name: item.categoryName,
        icon: item.categoryIcon
      },
      image_url: imageMap[item.id] ? imageMap[item.id].filePath : null,
      url: `${baseUrl}/items/${item.id}/`
    }));

    results.items = {
      count: itemCount,
      results: lightweightItems
    };
  }

  // Search categories - LIGHTWEIGHT with rich linking
  if (searchTypes.includes('categories') || searchTypes.includes('all')) {
    const categoryQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $regex: searchTerm, $options: 'i' } }
      ],
      status: 'active'
    };

    const categories = await Category.find(categoryQuery)
      .select('id name icon color completeness')
      .limit(parseInt(limit))
      .lean();

    const categoryCount = await Category.countDocuments(categoryQuery);

    // Transform to lightweight rich-linked format
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;
    const lightweightCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      completeness: category.completeness,
      url: `${baseUrl}/categories/${category.id}/`
    }));

    results.categories = {
      count: categoryCount,
      results: lightweightCategories
    };
  }

  // Search images - LIGHTWEIGHT with rich linking
  if (searchTypes.includes('images')) {
    const imageQuery = {
      $or: [
        { altText: { $regex: searchTerm, $options: 'i' } },
        { fileName: { $regex: searchTerm, $options: 'i' } }
      ],
      status: 'approved'
    };

    const images = await CategoryImage.find(imageQuery)
      .select('itemId categoryId letter filePath altText qualityScore.overall')
      .limit(parseInt(limit))
      .lean();

    const imageCount = await CategoryImage.countDocuments(imageQuery);

    // Transform to lightweight rich-linked format
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;
    const lightweightImages = images.map(image => ({
      item_id: image.itemId,
      category_id: image.categoryId,
      letter: image.letter,
      file_path: image.filePath,
      alt_text: image.altText,
      quality_score: image.qualityScore?.overall || 0,
      url: `${baseUrl}/images/${image._id}/`
    }));

    results.images = {
      count: imageCount,
      results: lightweightImages
    };
  }

  // Calculate total results
  const totalResults = Object.values(results).reduce((sum, result) => sum + result.count, 0);

  // Build pagination URLs (primarily for items search)
  const nextOffset = parseInt(offset) + parseInt(limit);
  const prevOffset = Math.max(0, parseInt(offset) - parseInt(limit));
  const hasNext = results.items && nextOffset < results.items.count;
  const hasPrev = parseInt(offset) > 0;

  const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;
  const searchParams = new URLSearchParams({ q: searchTerm, type, limit, ...(categories && { categories }), ...(letters && { letters }), ...(difficulty && { difficulty }) });

  res.json({
    query: searchTerm,
    total_results: totalResults,
    search_types: searchTypes,
    next: hasNext ? `${baseUrl}/search/?${searchParams}&offset=${nextOffset}` : null,
    previous: hasPrev ? `${baseUrl}/search/?${searchParams}&offset=${prevOffset}` : null,
    results,
    suggestions: await generateSearchSuggestions(searchTerm),
    related_resources: {
      search_suggestions: `${baseUrl}/search/suggestions/?q=${encodeURIComponent(searchTerm)}`,
      search_filters: `${baseUrl}/search/filters/`,
      popular_searches: `${baseUrl}/search/popular/`,
      all_categories: `${baseUrl}/categories/`,
      global_stats: `${baseUrl}/stats/`
    },
    meta: {
      response_size: 'lightweight with direct URLs + random images',
      performance_gain: 'Minimal fields + rich linking vs bloated V1',
      search_time: new Date().toISOString(),
      filters: { categories, letters, difficulty, type, sort },
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
      tips: {
        refine_search: 'Use categories or letters filters to narrow results',
        wildcard_search: 'Try partial words or related terms',
        filter_by_difficulty: 'Use difficulty=1-5 to find age-appropriate content'
      }
    }
  });
}));

/**
 * GET /api/v2/search/suggestions/
 * Get search suggestions and autocomplete
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      suggestions: [],
      meta: { message: 'Provide at least 2 characters for suggestions' }
    });
  }

  const searchTerm = q.toLowerCase();

  // Get suggestions from item names, categories, and common tags
  const [itemSuggestions, categorySuggestions, tagSuggestions] = await Promise.all([
    // Item name suggestions
    Item.find({
      name: { $regex: `^${searchTerm}`, $options: 'i' },
      status: 'published'
    })
      .select('name')
      .limit(5)
      .lean(),

    // Category suggestions
    Category.find({
      name: { $regex: `^${searchTerm}`, $options: 'i' },
      status: 'active'
    })
      .select('name')
      .limit(3)
      .lean(),

    // Tag suggestions
    Item.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: `^${searchTerm}`, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ])
  ]);

  const suggestions = [
    ...itemSuggestions.map(item => ({
      text: item.name,
      type: 'item',
      category: 'Items'
    })),
    ...categorySuggestions.map(cat => ({
      text: cat.name,
      type: 'category',
      category: 'Categories'
    })),
    ...tagSuggestions.map(tag => ({
      text: tag._id,
      type: 'tag',
      category: 'Tags'
    }))
  ].slice(0, parseInt(limit));

  res.json({
    query: q,
    suggestions,
    meta: {
      count: suggestions.length,
      response_time: new Date().toISOString()
    }
  });
}));

/**
 * GET /api/v2/search/popular/
 * Get popular search terms and trending content
 */
router.get('/popular', asyncHandler(async (req, res) => {
  // For now, return static popular terms
  // In production, this would come from search analytics
  const popularSearches = [
    { term: 'animals', count: 1245, category: 'General' },
    { term: 'colors', count: 892, category: 'General' },
    { term: 'fruits', count: 756, category: 'Food' },
    { term: 'transportation', count: 623, category: 'General' },
    { term: 'insects', count: 445, category: 'Animals' },
    { term: 'mammals', count: 398, category: 'Animals' },
    { term: 'birds', count: 367, category: 'Animals' },
    { term: 'vegetables', count: 334, category: 'Food' },
    { term: 'shapes', count: 289, category: 'General' },
    { term: 'ocean', count: 256, category: 'Nature' }
  ];

  // Get trending items (most viewed in last 7 days)
  const trendingItems = await Item.find({
    status: 'published',
    'metadata.lastViewed': {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  })
    .sort({ 'metadata.viewCount': -1 })
    .limit(10)
    .select('id name categoryName metadata.viewCount')
    .lean();

  res.json({
    popular_searches: popularSearches,
    trending_items: trendingItems,
    meta: {
      period: 'Last 30 days',
      last_updated: new Date().toISOString(),
      note: 'Search analytics coming soon'
    }
  });
}));

/**
 * GET /api/v2/search/filters/
 * Get available filter options for search
 */
router.get('/filters', asyncHandler(async (req, res) => {
  const [categories, letters, difficulties, tags] = await Promise.all([
    // Available categories
    Category.find({ status: 'active' })
      .select('id name icon')
      .sort({ name: 1 })
      .lean(),

    // Letters with content
    Item.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$letter',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Available difficulty levels
    Item.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Popular tags
    Item.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ])
  ]);

  res.json({
    categories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon
    })),
    letters: letters.map(letter => ({
      letter: letter._id,
      count: letter.count
    })),
    difficulties: difficulties.map(diff => ({
      level: diff._id,
      count: diff.count,
      label: getDifficultyLabel(diff._id)
    })),
    tags: tags.map(tag => ({
      name: tag._id,
      count: tag.count
    })),
    meta: {
      total_categories: categories.length,
      total_letters_with_content: letters.length,
      total_difficulty_levels: difficulties.length,
      total_tags: tags.length
    }
  });
}));

// Helper functions
async function generateSearchSuggestions(searchTerm) {
  // Simple suggestion algorithm
  // In production, this would be more sophisticated
  const suggestions = [];

  // Related categories
  const relatedCategories = await Category.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ],
    status: 'active'
  })
    .select('name')
    .limit(3)
    .lean();

  suggestions.push(...relatedCategories.map(cat => `category:${cat.name}`));

  // Letter suggestions if searching for single character
  if (searchTerm.length === 1 && /[a-zA-Z]/.test(searchTerm)) {
    suggestions.push(`letter:${searchTerm.toUpperCase()}`);
  }

  return suggestions.slice(0, 5);
}

function getDifficultyLabel(level) {
  const labels = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Medium',
    4: 'Hard',
    5: 'Very Hard'
  };
  return labels[level] || `Level ${level}`;
}

module.exports = router;