const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Helper function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to format category response
const formatCategoryResponse = (category) => {
  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    difficulty: category.difficulty,
    description: category.description,
    status: category.status,
    completeness: category.completeness,
    tags: category.tags,
    ageRange: category.ageRange,
    learningObjectives: category.learningObjectives,
    items: category.items,
    metadata: category.metadata,
    lettersWithItems: category.getLettersWithItems(),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  };
};

// GET /api/v1/categories - Get all active categories
router.get('/', asyncHandler(async (req, res) => {
  const { status = 'active', sort = 'name' } = req.query;

  const query = {};
  if (status) query.status = status;

  let sortOption = {};
  switch (sort) {
    case 'completeness':
      sortOption = { completeness: -1, name: 1 };
      break;
    case 'difficulty':
      sortOption = { difficulty: 1, name: 1 };
      break;
    case 'recent':
      sortOption = { updatedAt: -1 };
      break;
    default:
      sortOption = { name: 1 };
  }

  const categories = await Category.find(query).sort(sortOption);

  const formattedCategories = categories.map(category => {
    // Collect all images from the category for preview
    const allImages = [];
    if (category.items) {
      Object.values(category.items).forEach(letterItems => {
        if (Array.isArray(letterItems)) {
          letterItems.forEach(item => {
            if (item && item.image) {
              allImages.push(item.image);
            }
          });
        }
      });
    }

    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      difficulty: category.difficulty,
      description: category.description,
      completeness: category.completeness,
      tags: category.tags,
      metadata: {
        totalItems: category.metadata.totalItems,
        viewCount: category.metadata.viewCount
      },
      lettersWithItems: category.getLettersWithItems(),
      sampleImages: allImages // Include all images for slideshow
    };
  });

  res.json({
    count: formattedCategories.length,
    results: formattedCategories
  });
}));

// GET /api/v1/categories/:id - Get specific category with all items
router.get('/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByIdWithStats(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  res.json(formatCategoryResponse(category));
}));

// GET /api/v1/categories/:id/letters/:letter - Get items for specific letter
router.get('/:id/letters/:letter', asyncHandler(async (req, res) => {
  const { id, letter } = req.params;
  const upperLetter = letter.toUpperCase();

  if (!/^[A-Z]$/.test(upperLetter)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid letter. Must be A-Z.'
    });
  }

  const category = await Category.findOne({ id });

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  const items = category.getItemsByLetter(upperLetter);

  res.json({
    categoryId: category.id,
    categoryName: category.name,
    letter: upperLetter,
    count: items.length,
    results: items
  });
}));

// POST /api/v1/categories/:id/letters/:letter - Add item to specific letter
router.post('/:id/letters/:letter', asyncHandler(async (req, res) => {
  const { id, letter } = req.params;
  const upperLetter = letter.toUpperCase();

  if (!/^[A-Z]$/.test(upperLetter)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid letter. Must be A-Z.'
    });
  }

  const category = await Category.findOne({ id });

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Validate required fields
  const { name, image, description } = req.body;
  if (!name || !image || !description) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, image, description'
    });
  }

  const newItem = {
    id: req.body.id || name.toLowerCase().replace(/\s+/g, '-'),
    name,
    image,
    imageAlt: req.body.imageAlt || name,
    difficulty: req.body.difficulty || 1,
    pronunciation: req.body.pronunciation,
    description,
    facts: req.body.facts || [],
    tags: req.body.tags || [],
    ...req.body // Include any category-specific fields
  };

  await category.addItem(upperLetter, newItem);

  res.status(201).json({
    success: true,
    message: 'Item added successfully',
    data: {
      categoryId: category.id,
      letter: upperLetter,
      item: newItem
    }
  });
}));

// DELETE /api/v1/categories/:id/letters/:letter/items/:itemId - Remove item from letter
router.delete('/:id/letters/:letter/items/:itemId', asyncHandler(async (req, res) => {
  const { id, letter, itemId } = req.params;
  const upperLetter = letter.toUpperCase();

  if (!/^[A-Z]$/.test(upperLetter)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid letter. Must be A-Z.'
    });
  }

  const category = await Category.findOne({ id });

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  await category.removeItem(upperLetter, itemId);

  res.json({
    success: true,
    message: 'Item removed successfully'
  });
}));

// GET /api/v1/categories/search/:query - Search items across all categories
router.get('/search/:query', asyncHandler(async (req, res) => {
  const { query } = req.params;
  const { limit = 20 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 2 characters long'
    });
  }

  const categories = await Category.searchItems(query).limit(parseInt(limit));

  // Extract matching items from categories
  const results = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  categories.forEach(category => {
    alphabet.split('').forEach(letter => {
      if (category.items[letter]) {
        category.items[letter].forEach(item => {
          const searchTerm = query.toLowerCase();
          if (item.name.toLowerCase().includes(searchTerm) ||
              item.description.toLowerCase().includes(searchTerm) ||
              item.tags.some(tag => tag.includes(searchTerm))) {
            results.push({
              ...item.toObject(),
              categoryId: category.id,
              categoryName: category.name,
              letter: letter
            });
          }
        });
      }
    });
  });

  res.json({
    count: results.length,
    query: query,
    results: results
  });
}));

// POST /api/v1/categories - Create new category (admin function)
router.post('/', asyncHandler(async (req, res) => {
  const categoryData = {
    id: req.body.id || req.body.name.toLowerCase().replace(/\s+/g, '-'),
    name: req.body.name,
    icon: req.body.icon,
    color: req.body.color,
    difficulty: req.body.difficulty || 'Easy',
    description: req.body.description,
    status: req.body.status || 'active',
    tags: req.body.tags || [],
    ageRange: req.body.ageRange,
    learningObjectives: req.body.learningObjectives || [],
    items: req.body.items || {}
  };

  const category = new Category(categoryData);
  await category.save();

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: formatCategoryResponse(category)
  });
}));

// PUT /api/v1/categories/:id - Update category (admin function)
router.put('/:id', asyncHandler(async (req, res) => {
  const category = await Category.findOne({ id: req.params.id });

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['name', 'icon', 'color', 'difficulty', 'description', 'status', 'tags', 'ageRange', 'learningObjectives'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  });

  await category.save();

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: formatCategoryResponse(category)
  });
}));

// GET /api/v1/categories/stats/overview - Get platform statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const totalCategories = await Category.countDocuments({ status: 'active' });
  const categories = await Category.find({ status: 'active' });

  let totalItems = 0;
  let totalLettersComplete = 0;
  let avgCompleteness = 0;

  categories.forEach(category => {
    totalItems += category.metadata.totalItems;
    totalLettersComplete += category.completeness;
  });

  if (categories.length > 0) {
    avgCompleteness = Math.round(totalLettersComplete / categories.length);
  }

  res.json({
    totalCategories,
    totalItems,
    totalLettersComplete,
    avgCompleteness,
    categoriesWithFullAlphabet: categories.filter(c => c.completeness === 26).length
  });
}));

module.exports = router;