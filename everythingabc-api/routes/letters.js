const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Category = require('../models/Category');

/**
 * Letter Browsing Routes
 *
 * Core feature: Enable cross-category letter browsing
 * Performance requirement: <200ms response time
 *
 * Endpoints:
 * - GET /api/v1/letters/ - List all letters with counts
 * - GET /api/v1/letters/:letter - Get letter details
 * - GET /api/v1/letters/:letter/items - Get items for specific letter (MAIN FEATURE)
 */

// Helper function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware for letter parameter
const validateLetter = (req, res, next) => {
  const { letter } = req.params;
  if (!letter || !/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid letter parameter',
      message: 'Letter must be a single character from A-Z'
    });
  }
  // Ensure uppercase
  req.params.letter = letter.toUpperCase();
  next();
};

/**
 * GET /api/v1/letters/
 *
 * List all letters with item counts and category breakdown
 *
 * Response format:
 * {
 *   success: true,
 *   data: [
 *     {
 *       letter: "A",
 *       count: 187,
 *       categories: [
 *         { id: "animals", name: "Animals", count: 12 },
 *         { id: "fruits", name: "Fruits", count: 8 }
 *       ]
 *     }
 *   ],
 *   meta: {
 *     totalLetters: 26,
 *     totalItems: 3847,
 *     lettersWithContent: 24
 *   }
 * }
 */
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    // Get letter statistics using the optimized static method
    const letterStats = await Item.getLetterStats({
      status: 'published'
    });

    // Calculate metadata
    const totalItems = letterStats.reduce((sum, stat) => sum + stat.count, 0);
    const lettersWithContent = letterStats.filter(stat => stat.count > 0).length;

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: letterStats,
      meta: {
        totalLetters: 26,
        totalItems,
        lettersWithContent,
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('Error fetching letter statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch letter statistics',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/letters/:letter
 *
 * Get detailed information about a specific letter
 *
 * Response includes:
 * - Letter statistics
 * - Category breakdown with item counts
 * - Related resource URLs
 * - Optional phonics information
 */
router.get('/:letter', validateLetter, asyncHandler(async (req, res) => {
  const { letter } = req.params;
  const startTime = Date.now();

  try {
    // Get total count for this letter
    const totalCount = await Item.countDocuments({
      letter,
      status: 'published'
    });

    // Get category breakdown
    const categoryBreakdown = await Item.aggregate([
      {
        $match: {
          letter,
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            categoryId: '$categoryId',
            categoryName: '$categoryName',
            categoryIcon: '$categoryIcon',
            categoryColor: '$categoryColor'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id.categoryId',
          categoryName: '$_id.categoryName',
          categoryIcon: '$_id.categoryIcon',
          categoryColor: '$_id.categoryColor',
          count: 1,
          itemsUrl: {
            $concat: ['/api/v1/letters/', letter, '/items?categories=', '$_id.categoryId']
          }
        }
      }
    ]);

    // Get average difficulty
    const avgDifficultyResult = await Item.aggregate([
      { $match: { letter, status: 'published' } },
      { $group: { _id: null, avgDifficulty: { $avg: '$difficulty' } } }
    ]);
    const avgDifficulty = avgDifficultyResult[0]?.avgDifficulty || 0;

    // Get most popular item for this letter
    const mostPopularItem = await Item.findOne({
      letter,
      status: 'published'
    })
      .sort({ 'metadata.popularityScore': -1 })
      .select('id name categoryName metadata.popularityScore')
      .lean();

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        letter,
        stats: {
          totalItems: totalCount,
          categoryCount: categoryBreakdown.length,
          averageDifficulty: parseFloat(avgDifficulty.toFixed(2)),
          mostPopularItem: mostPopularItem ? {
            id: mostPopularItem.id,
            name: mostPopularItem.name,
            category: mostPopularItem.categoryName,
            url: `/api/v1/items/${mostPopularItem.id}`
          } : null
        },
        categories: categoryBreakdown,
        relatedResources: {
          items: `/api/v1/letters/${letter}/items`,
          images: `/api/v1/images?letter=${letter}`,
          randomItem: `/api/v1/letters/${letter}/random`,
          previousLetter: letter === 'A' ? '/api/v1/letters/Z' : `/api/v1/letters/${String.fromCharCode(letter.charCodeAt(0) - 1)}`,
          nextLetter: letter === 'Z' ? '/api/v1/letters/A' : `/api/v1/letters/${String.fromCharCode(letter.charCodeAt(0) + 1)}`
        },
        // Optional: Add phonics information for educational purposes
        phonics: getPhonicsInfo(letter)
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error(`Error fetching letter ${letter} details:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch letter details',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/letters/:letter/items
 *
 * Get items starting with a specific letter (CORE FEATURE)
 *
 * Query parameters:
 * - categories: Comma-separated category IDs to filter by
 * - difficulty: Maximum difficulty level (1-5)
 * - limit: Number of items per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - sort: Sort order (category, name, difficulty, popular)
 *
 * Performance requirement: <200ms
 *
 * Example:
 * GET /api/v1/letters/A/items?categories=animals,fruits&difficulty=3&sort=category&limit=20
 */
router.get('/:letter/items', validateLetter, asyncHandler(async (req, res) => {
  const { letter } = req.params;
  const {
    categories,
    difficulty,
    limit = 20,
    offset = 0,
    sort = 'category'
  } = req.query;

  const startTime = Date.now();

  try {
    // Parse and validate parameters
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    // Build options object for the Item.findByLetter static method
    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      sort: sort,
      status: 'published'
    };

    // Add category filter if provided
    if (categories) {
      options.categories = categories.split(',').map(c => c.trim());
    }

    // Add difficulty filter if provided
    if (difficulty) {
      options.difficulty = parseInt(difficulty);
    }

    // Execute optimized query using the letter_browsing_sorted index
    const items = await Item.findByLetter(letter, options);

    // Get total count for pagination
    const countQuery = {
      letter,
      status: 'published'
    };

    if (options.categories) {
      countQuery.categoryId = { $in: options.categories };
    }

    if (options.difficulty) {
      countQuery.difficulty = { $lte: options.difficulty };
    }

    const totalCount = await Item.countDocuments(countQuery);

    const responseTime = Date.now() - startTime;

    // Format response
    res.json({
      success: true,
      data: items,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + parsedLimit < totalCount,
        nextOffset: parsedOffset + parsedLimit < totalCount ? parsedOffset + parsedLimit : null,
        previousOffset: parsedOffset > 0 ? Math.max(0, parsedOffset - parsedLimit) : null
      },
      meta: {
        letter,
        filters: {
          categories: options.categories,
          difficulty: options.difficulty,
          sort
        },
        responseTime: `${responseTime}ms`,
        performance: responseTime < 200 ? 'excellent' : responseTime < 500 ? 'good' : 'needs optimization'
      }
    });
  } catch (error) {
    console.error(`Error fetching items for letter ${letter}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch letter items',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/letters/:letter/random
 *
 * Get a random item starting with the specified letter
 *
 * Query parameters:
 * - category: Filter by category ID (optional)
 */
router.get('/:letter/random', validateLetter, asyncHandler(async (req, res) => {
  const { letter } = req.params;
  const { category } = req.query;

  try {
    const options = { letter };
    if (category) {
      options.categoryId = category;
    }

    const randomItems = await Item.getRandom(options);

    if (!randomItems || randomItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No items found',
        message: `No items found starting with letter ${letter}`
      });
    }

    // Populate primary image
    const item = randomItems[0];
    if (item.primaryImageId) {
      const populatedItem = await Item.findById(item._id).populate('primaryImageId');
      return res.json({
        success: true,
        data: populatedItem
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error(`Error fetching random item for letter ${letter}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch random item',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/letters/:letter/categories
 *
 * Get all categories that have items starting with the specified letter
 */
router.get('/:letter/categories', validateLetter, asyncHandler(async (req, res) => {
  const { letter } = req.params;

  try {
    const categories = await Item.aggregate([
      {
        $match: {
          letter,
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            categoryId: '$categoryId',
            categoryName: '$categoryName',
            categoryIcon: '$categoryIcon',
            categoryColor: '$categoryColor'
          },
          itemCount: { $sum: 1 }
        }
      },
      {
        $sort: { itemCount: -1 }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id.categoryId',
          categoryName: '$_id.categoryName',
          categoryIcon: '$_id.categoryIcon',
          categoryColor: '$_id.categoryColor',
          itemCount: 1,
          categoryUrl: { $concat: ['/api/v1/categories/', '$_id.categoryId'] },
          itemsUrl: { $concat: ['/api/v1/letters/', letter, '/items?categories=', '$_id.categoryId'] }
        }
      }
    ]);

    res.json({
      success: true,
      data: categories,
      meta: {
        letter,
        totalCategories: categories.length
      }
    });
  } catch (error) {
    console.error(`Error fetching categories for letter ${letter}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
}));

/**
 * Helper function: Get phonics information for a letter
 * This can be expanded with more detailed phonics rules
 */
function getPhonicsInfo(letter) {
  const phonicsMap = {
    A: { sounds: ['/eɪ/', '/æ/', '/ə/'], examples: ['Ant', 'Apple', 'About'] },
    B: { sounds: ['/b/'], examples: ['Ball', 'Bear', 'Book'] },
    C: { sounds: ['/k/', '/s/'], examples: ['Cat', 'Cent', 'Cake'] },
    D: { sounds: ['/d/'], examples: ['Dog', 'Door', 'Day'] },
    E: { sounds: ['/iː/', '/ɛ/', '/ə/'], examples: ['Elephant', 'Egg', 'The'] },
    F: { sounds: ['/f/'], examples: ['Fish', 'Frog', 'Fun'] },
    G: { sounds: ['/g/', '/dʒ/'], examples: ['Goat', 'Gem', 'Go'] },
    H: { sounds: ['/h/'], examples: ['Hat', 'House', 'Happy'] },
    I: { sounds: ['/aɪ/', '/ɪ/'], examples: ['Ice', 'Insect', 'Igloo'] },
    J: { sounds: ['/dʒ/'], examples: ['Jar', 'Jump', 'Joy'] },
    K: { sounds: ['/k/'], examples: ['Kite', 'King', 'Key'] },
    L: { sounds: ['/l/'], examples: ['Lion', 'Lamp', 'Love'] },
    M: { sounds: ['/m/'], examples: ['Monkey', 'Moon', 'Mom'] },
    N: { sounds: ['/n/'], examples: ['Nest', 'Nose', 'New'] },
    O: { sounds: ['/oʊ/', '/ɒ/', '/ə/'], examples: ['Orange', 'Octopus', 'Of'] },
    P: { sounds: ['/p/'], examples: ['Pig', 'Pen', 'Play'] },
    Q: { sounds: ['/kw/'], examples: ['Queen', 'Quick', 'Quiet'] },
    R: { sounds: ['/r/'], examples: ['Rabbit', 'Red', 'Run'] },
    S: { sounds: ['/s/', '/z/'], examples: ['Sun', 'Snake', 'Sea'] },
    T: { sounds: ['/t/'], examples: ['Tiger', 'Tree', 'Top'] },
    U: { sounds: ['/juː/', '/ʌ/'], examples: ['Umbrella', 'Under', 'Up'] },
    V: { sounds: ['/v/'], examples: ['Van', 'Violin', 'Very'] },
    W: { sounds: ['/w/'], examples: ['Water', 'Wolf', 'Win'] },
    X: { sounds: ['/ks/', '/z/'], examples: ['Box', 'Xylophone', 'X-ray'] },
    Y: { sounds: ['/j/', '/aɪ/'], examples: ['Yellow', 'Yes', 'Why'] },
    Z: { sounds: ['/z/'], examples: ['Zebra', 'Zoo', 'Zero'] }
  };

  return phonicsMap[letter] || { sounds: [], examples: [] };
}

module.exports = router;
