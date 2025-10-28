const express = require('express');
const router = express.Router();
const Item = require('../../models/Item');
const CategoryImage = require('../../models/CategoryImage');

// Helper function for async route handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v2/letters/
 * List all letters with item counts and categories
 * This is the foundation for cross-category letter browsing
 */
router.get('/', asyncHandler(async (req, res) => {
  const stats = await Item.getLetterStats();

  // Calculate totals
  const totalItems = stats.reduce((sum, letter) => sum + letter.count, 0);
  const lettersWithItems = stats.filter(letter => letter.count > 0).length;

  res.json({
    count: 26,
    results: stats,
    meta: {
      total_items: totalItems,
      letters_with_items: lettersWithItems,
      completion_percentage: Math.round((lettersWithItems / 26) * 100),
      most_popular_letter: stats.reduce((max, letter) =>
        letter.count > max.count ? letter : max, { count: 0 }
      ),
      query_time: new Date().toISOString()
    }
  });
}));

/**
 * GET /api/v2/letters/:letter/
 * Get details for a specific letter including statistics and categories
 */
router.get('/:letter', asyncHandler(async (req, res) => {
  const { letter } = req.params;

  // Validate letter
  if (!/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      error: 'Invalid letter',
      details: 'Letter must be a single character A-Z',
      code: 'INVALID_LETTER'
    });
  }

  const upperLetter = letter.toUpperCase();

  // Get letter statistics
  const [letterStats] = await Item.aggregate([
    { $match: { letter: upperLetter, status: 'published' } },
    {
      $group: {
        _id: '$letter',
        total_items: { $sum: 1 },
        categories: {
          $addToSet: {
            id: '$categoryId',
            name: '$categoryName',
            icon: '$categoryIcon',
            color: '$categoryColor'
          }
        },
        avg_difficulty: { $avg: '$difficulty' },
        most_popular: {
          $max: {
            item: {
              id: '$id',
              name: '$name',
              popularity: '$metadata.popularityScore'
            }
          }
        }
      }
    }
  ]);

  if (!letterStats) {
    return res.status(404).json({
      error: 'Letter not found',
      details: `No items found starting with letter ${upperLetter}`,
      letter: upperLetter
    });
  }

  // Get category breakdown with item counts
  const categoryBreakdown = await Item.aggregate([
    { $match: { letter: upperLetter, status: 'published' } },
    {
      $group: {
        _id: {
          categoryId: '$categoryId',
          categoryName: '$categoryName',
          categoryIcon: '$categoryIcon',
          categoryColor: '$categoryColor'
        },
        item_count: { $sum: 1 },
        items: {
          $push: {
            id: '$id',
            name: '$name',
            difficulty: '$difficulty'
          }
        }
      }
    },
    { $sort: { item_count: -1 } }
  ]);

  res.json({
    letter: upperLetter,
    stats: {
      total_items: letterStats.total_items,
      category_count: letterStats.categories.length,
      average_difficulty: Math.round(letterStats.avg_difficulty * 10) / 10,
      most_popular_item: letterStats.most_popular?.item || null
    },
    categories: categoryBreakdown.map(cat => ({
      id: cat._id.categoryId,
      name: cat._id.categoryName,
      icon: cat._id.categoryIcon,
      color: cat._id.categoryColor,
      item_count: cat.item_count,
      sample_items: cat.items.slice(0, 3) // Show first 3 items as preview
    })),
    phonics: {
      sounds: getLetterSounds(upperLetter),
      example_words: categoryBreakdown
        .slice(0, 3)
        .map(cat => cat.items[0]?.name)
        .filter(Boolean),
      learning_tips: getLetterLearningTips(upperLetter)
    },
    meta: {
      query_time: new Date().toISOString(),
      alphabet_position: upperLetter.charCodeAt(0) - 64,
      is_vowel: 'AEIOU'.includes(upperLetter),
      difficulty_for_children: getLetterDifficulty(upperLetter)
    }
  });
}));

/**
 * GET /api/v2/letters/:letter/items/
 * Get all items starting with specific letter (CORE FEATURE)
 * This enables cross-category alphabet learning
 */
router.get('/:letter/items', asyncHandler(async (req, res) => {
  const { letter } = req.params;
  const {
    categories,
    difficulty,
    sort = 'category',
    limit = 20,
    offset = 0,
    status = 'published'
  } = req.query;

  // Validate letter
  if (!/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      error: 'Invalid letter',
      details: 'Letter must be a single character A-Z'
    });
  }

  const upperLetter = letter.toUpperCase();

  // Use the optimized letter browsing method
  const options = {
    categories: categories ? categories.split(',') : undefined,
    difficulty: difficulty ? parseInt(difficulty) : undefined,
    sort,
    limit: parseInt(limit),
    offset: parseInt(offset),
    status
  };

  // Build query to match categories endpoint approach
  const query = { letter: upperLetter, status };

  if (options.categories && options.categories.length > 0) {
    query.categoryId = { $in: options.categories };
  }
  if (options.difficulty) {
    query.difficulty = { $lte: parseInt(options.difficulty) };
  }

  // Build sort option
  let sortOption = {};
  switch (options.sort) {
    case 'name': sortOption = { name: 1 }; break;
    case 'difficulty': sortOption = { difficulty: 1, name: 1 }; break;
    case 'category':
    default: sortOption = { categoryName: 1, name: 1 };
  }

  // Get items with only essential fields (matching categories endpoint)
  const items = await Item.find(query)
    .select('id name letter difficulty status categoryId categoryName')
    .sort(sortOption)
    .skip(parseInt(options.offset))
    .limit(parseInt(options.limit))
    .lean();

  const total = await Item.countDocuments(query);

  const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

  // Get random images for all items in one query for efficiency (matching categories endpoint)
  const itemIds = items.map(item => item.id);
  const CategoryImage = require('../../models/CategoryImage');

  const randomImages = await Promise.all(
    itemIds.map(async (itemId) => {
      // Get a random image for this item
      const randomImage = await CategoryImage.aggregate([
        {
          $match: {
            itemId: itemId,
            status: 'approved'
          }
        },
        { $sample: { size: 1 } },
        {
          $project: {
            itemId: 1,
            filePath: 1
          }
        }
      ]);

      return {
        itemId,
        image: randomImage[0] || null
      };
    })
  );

  // Create lookup map for images
  const imageMap = randomImages.reduce((acc, item) => {
    acc[item.itemId] = item.image;
    return acc;
  }, {});

  // Transform to lightweight format with parent category context
  const lightweightItems = items.map(item => ({
    id: item.id,
    name: item.name,
    letter: item.letter,
    difficulty: item.difficulty,
    category_id: item.categoryId,
    category_name: item.categoryName,
    category_url: `${baseUrl}/categories/${item.categoryId}/`,
    image_url: imageMap[item.id] ? imageMap[item.id].filePath : null,
    url: `${baseUrl}/items/${item.id}/`
  }));

  // Group by category for additional context
  const itemsByCategory = lightweightItems.reduce((acc, item) => {
    const categoryName = items.find(i => i.id === item.id)?.categoryName || 'Unknown';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(item);
    return acc;
  }, {});

  // Build pagination URLs (matching categories endpoint)
  const nextOffset = parseInt(options.offset) + parseInt(options.limit);
  const prevOffset = Math.max(0, parseInt(options.offset) - parseInt(options.limit));
  const hasNext = nextOffset < total;
  const hasPrev = parseInt(options.offset) > 0;

  res.json({
    count: total,
    format: 'list',
    next: hasNext ? `${baseUrl}/letters/${upperLetter}/items?offset=${nextOffset}&limit=${options.limit}` : null,
    previous: hasPrev ? `${baseUrl}/letters/${upperLetter}/items?offset=${prevOffset}&limit=${options.limit}` : null,
    items: lightweightItems,
    grouped_by_category: itemsByCategory,
    meta: {
      response_size: 'lightweight with direct URLs + random images',
      performance_gain: 'Minimal fields + rich linking + images ready for grid display',
      letter: upperLetter,
      filters: { categories, difficulty, sort },
      total_categories: Object.keys(itemsByCategory).length,
      alphabet_navigation: {
        previous: letter === 'A' ? null : String.fromCharCode(letter.charCodeAt(0) - 1),
        next: letter === 'Z' ? null : String.fromCharCode(letter.charCodeAt(0) + 1)
      }
    }
  });
}));

/**
 * GET /api/v2/letters/:letter/categories/
 * Get categories that have items for specific letter
 */
router.get('/:letter/categories', asyncHandler(async (req, res) => {
  const { letter } = req.params;

  if (!/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      error: 'Invalid letter',
      details: 'Letter must be a single character A-Z'
    });
  }

  const upperLetter = letter.toUpperCase();

  const categories = await Item.aggregate([
    { $match: { letter: upperLetter, status: 'published' } },
    {
      $group: {
        _id: {
          id: '$categoryId',
          name: '$categoryName',
          icon: '$categoryIcon',
          color: '$categoryColor'
        },
        item_count: { $sum: 1 },
        sample_items: {
          $push: {
            id: '$id',
            name: '$name'
          }
        }
      }
    },
    { $sort: { item_count: -1 } },
    {
      $project: {
        id: '$_id.id',
        name: '$_id.name',
        icon: '$_id.icon',
        color: '$_id.color',
        item_count: 1,
        sample_items: { $slice: ['$sample_items', 3] }
      }
    }
  ]);

  res.json({
    count: categories.length,
    results: categories,
    meta: {
      letter: upperLetter,
      total_items: categories.reduce((sum, cat) => sum + cat.item_count, 0)
    }
  });
}));

/**
 * GET /api/v2/letters/:letter/images/
 * Get all images for items starting with specific letter
 */
router.get('/:letter/images', asyncHandler(async (req, res) => {
  const { letter } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  if (!/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      error: 'Invalid letter'
    });
  }

  const upperLetter = letter.toUpperCase();

  const images = await CategoryImage.findByLetter(upperLetter)
    .skip(parseInt(offset))
    .limit(parseInt(limit));

  const total = await CategoryImage.countDocuments({
    letter: upperLetter,
    status: 'approved'
  });

  res.json({
    count: total,
    results: images,
    meta: {
      letter: upperLetter,
      image_types: 'All approved images for items starting with this letter'
    }
  });
}));

/**
 * GET /api/v2/letters/:letter/random/
 * Get random item starting with specific letter
 */
router.get('/:letter/random', asyncHandler(async (req, res) => {
  const { letter } = req.params;

  if (!/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      error: 'Invalid letter'
    });
  }

  const upperLetter = letter.toUpperCase();

  const [randomItem] = await Item.getRandom({ letter: upperLetter });

  if (!randomItem) {
    return res.status(404).json({
      error: 'No items found',
      details: `No items found starting with letter ${upperLetter}`
    });
  }

  res.json(randomItem);
}));

// Helper functions
function getLetterSounds(letter) {
  const letterSounds = {
    'A': ['/eɪ/', '/æ/', '/ə/'],
    'B': ['/b/'],
    'C': ['/k/', '/s/'],
    'D': ['/d/'],
    'E': ['/i/', '/ɛ/', '/ə/'],
    'F': ['/f/'],
    'G': ['/g/', '/dʒ/'],
    'H': ['/h/'],
    'I': ['/aɪ/', '/ɪ/', '/ə/'],
    'J': ['/dʒ/'],
    'K': ['/k/'],
    'L': ['/l/'],
    'M': ['/m/'],
    'N': ['/n/'],
    'O': ['/oʊ/', '/ɒ/', '/ə/'],
    'P': ['/p/'],
    'Q': ['/kw/'],
    'R': ['/r/'],
    'S': ['/s/', '/z/'],
    'T': ['/t/'],
    'U': ['/ju/', '/ʌ/', '/ə/'],
    'V': ['/v/'],
    'W': ['/w/'],
    'X': ['/ks/', '/z/'],
    'Y': ['/j/', '/aɪ/', '/ɪ/'],
    'Z': ['/z/']
  };
  return letterSounds[letter] || [`/${letter.toLowerCase()}/`];
}

function getLetterLearningTips(letter) {
  const tips = {
    'A': 'Practice with short /æ/ sound in "ant" and long /eɪ/ sound in "ape"',
    'B': 'Use lips together, then release with voice - "buh" sound',
    'C': 'Can be hard /k/ like "cat" or soft /s/ like "city"',
    'D': 'Tongue touches roof of mouth behind teeth - "duh" sound',
    'E': 'Practice short /ɛ/ in "egg" and long /i/ in "eagle"',
    'F': 'Gentle bite lower lip with top teeth - "fff" sound',
    'G': 'Can be hard /g/ like "go" or soft /dʒ/ like "giraffe"',
    'H': 'Breathe out gently - silent in some words like "hour"',
    'I': 'Practice short /ɪ/ in "igloo" and long /aɪ/ in "ice"',
    'J': 'Same sound as soft G - "juh" sound',
    'K': 'Same sound as hard C - "kuh" sound',
    'L': 'Tongue tip touches roof of mouth - "luh" sound',
    'M': 'Lips together, hum - "mmm" sound',
    'N': 'Tongue tip touches roof of mouth, nose sound - "nnn"',
    'O': 'Practice short /ɒ/ in "octopus" and long /oʊ/ in "ocean"',
    'P': 'Like B but without voice - "puh" sound',
    'Q': 'Always followed by U, makes /kw/ sound like "queen"',
    'R': 'Tongue curled up, don\'t touch roof - "rrr" sound',
    'S': 'Snake sound - "sss", can also be /z/ like "has"',
    'T': 'Tongue touches roof behind teeth - "tuh" sound',
    'U': 'Practice short /ʌ/ in "umbrella" and long /ju/ in "unicorn"',
    'V': 'Like F but with voice - "vvv" sound',
    'W': 'Round lips like whistling - "wuh" sound',
    'X': 'Usually makes /ks/ sound like "box"',
    'Y': 'Can be consonant /j/ like "yes" or vowel like "my"',
    'Z': 'Like S but with voice - "zzz" sound'
  };
  return tips[letter] || `Practice the ${letter} sound in various words`;
}

function getLetterDifficulty(letter) {
  const difficulties = {
    'A': 'easy', 'E': 'easy', 'I': 'easy', 'O': 'easy', 'U': 'easy',
    'B': 'easy', 'D': 'easy', 'F': 'easy', 'K': 'easy', 'L': 'easy',
    'M': 'easy', 'N': 'easy', 'P': 'easy', 'S': 'easy', 'T': 'easy',
    'C': 'medium', 'G': 'medium', 'H': 'medium', 'J': 'medium',
    'R': 'medium', 'V': 'medium', 'W': 'medium', 'Y': 'medium',
    'Q': 'hard', 'X': 'hard', 'Z': 'hard'
  };
  return difficulties[letter] || 'medium';
}

module.exports = router;