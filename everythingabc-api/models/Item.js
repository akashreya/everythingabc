const mongoose = require('mongoose');

/**
 * Item Model - Separated Items Collection
 *
 * This model extracts items from the embedded Category structure
 * to enable:
 * - Cross-category letter browsing (core feature)
 * - Efficient queries: db.items.find({ letter: 'A' }) in <200ms
 * - Global search across all vocabulary
 * - Scalable architecture for millions of items
 */

const ItemSchema = new mongoose.Schema({
  // Unique identifier (must be unique across ALL categories)
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    description: 'Unique identifier for the item (e.g., "ant", "apple")'
  },

  // Display name
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Display name of the item'
  },

  // KEY FIELDS for letter browsing
  letter: {
    type: String,
    required: true,
    match: /^[A-Z]$/,
    index: true,
    uppercase: true,
    description: 'First letter for cross-category letter queries - CRITICAL for performance'
  },

  categoryId: {
    type: String,
    required: true,
    index: true,
    description: 'Category this item belongs to'
  },

  // Optional multi-category support
  categoryIds: {
    type: [String],
    index: true,
    description: 'For items that belong to multiple categories (e.g., Turkey in both animals and birds)'
  },

  // Denormalized category data for efficient sorting/display (avoids joins)
  categoryName: {
    type: String,
    required: true,
    index: true,
    description: 'Category name for sorting in letter view'
  },
  categoryIcon: {
    type: String,
    description: 'Category icon for display in letter view'
  },
  categoryColor: {
    type: String,
    description: 'Category color for theming in letter view'
  },

  // Content fields
  description: {
    type: String,
    required: true,
    trim: true,
    description: 'Description of the item'
  },
  pronunciation: {
    type: String,
    description: 'Phonetic pronunciation (e.g., "/ænt/")'
  },
  facts: {
    type: [String],
    default: [],
    description: 'Educational facts about the item'
  },
  tags: {
    type: [String],
    default: [],
    index: true,
    description: 'Tags for categorization and search'
  },

  // Learning attributes
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 1,
    index: true,
    description: 'Difficulty level (1-5 scale)'
  },
  ageRange: {
    type: String,
    enum: ['3-6', '7-12', '13+', '3-12', 'All Ages'],
    description: 'Target age range'
  },
  learningLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Learning level classification'
  },

  // Status and workflow
  status: {
    type: String,
    enum: ['published', 'draft', 'archived', 'review'],
    default: 'published',
    index: true,
    description: 'Publishing status'
  },
  collectionStatus: {
    type: String,
    enum: ['pending', 'complete', 'failed'],
    default: 'pending',
    index: true,
    description: 'Image collection status - whether images have been collected for this item'
  },


  // Image references (links to images collection)
  primaryImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoryImage',
    description: 'Quick access to main image'
  },
  imageIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoryImage',
    description: 'All associated images'
  }],

  // Legacy single image field (for backward compatibility)
  image: {
    type: String,
    description: 'Legacy image path for backward compatibility'
  },
  imageAlt: {
    type: String,
    description: 'Legacy alt text for backward compatibility'
  },

  // Category-specific metadata (preserved from original schema)
  nutritionFacts: {
    vitamins: [String],
    minerals: [String],
    benefits: [String]
  },
  technicalFacts: {
    speed: String,
    environment: String,
    passengers: String
  },
  colorInfo: {
    hex: String,
    rgb: String,
    family: String,
    mood: String
  },
  roomLocation: String,
  uses: [String],

  // Search optimization
  searchKeywords: {
    type: [String],
    index: true,
    description: 'Generated keywords for enhanced search'
  },

  // Analytics and metadata
  metadata: {
    viewCount: {
      type: Number,
      default: 0,
      description: 'User engagement tracking'
    },
    imageCount: {
      type: Number,
      default: 0,
      description: 'Number of associated images'
    },
    lastViewed: {
      type: Date,
      description: 'Last user interaction'
    },
    popularityScore: {
      type: Number,
      default: 0,
      index: true,
      description: 'Calculated engagement score'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Content management
  createdBy: {
    type: String,
    default: 'migration',
    description: 'User ID or system that created this record'
  },
  approvedBy: {
    type: String,
    description: 'User ID who approved the item'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'items'
});

// ========================================
// CRITICAL INDEXES for LETTER BROWSING
// ========================================

// Index 1: Letter browsing with category grouping and sorting
// Query: db.items.find({ letter: 'A', status: 'published' }).sort({ categoryName: 1, name: 1 })
// Performance: <50ms for thousands of items
ItemSchema.index({
  letter: 1,
  status: 1,
  categoryName: 1,
  name: 1
}, { name: 'letter_browsing_sorted' });

// Index 2: Multi-category letter browsing with category filtering
// Query: db.items.find({ letter: 'A', categoryIds: { $in: ['animals', 'fruits'] }, status: 'published' })
// Performance: <30ms
ItemSchema.index({
  letter: 1,
  categoryIds: 1,
  status: 1
}, { name: 'letter_multicategory_filter' });

// Index 3: Multi-category browsing (maintain existing performance)
// Query: db.items.find({ categoryIds: { $in: ['animals'] }, status: 'published' }).sort({ letter: 1, name: 1 })
// Performance: <50ms
ItemSchema.index({
  categoryIds: 1,
  status: 1,
  letter: 1,
  name: 1
}, { name: 'multicategory_browsing_sorted' });

// Index 3b: Primary category browsing for default display
// Query: db.items.find({ primaryCategoryId: 'animals', status: 'published' }).sort({ letter: 1, name: 1 })
ItemSchema.index({
  primaryCategoryId: 1,
  status: 1,
  letter: 1,
  name: 1
}, { name: 'primary_category_browsing' });

// Index 4: Full text search
ItemSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  searchKeywords: 'text'
}, { name: 'full_text_search' });

// Index 5: Admin and analytics
ItemSchema.index({ status: 1, updatedAt: -1 });
ItemSchema.index({ createdBy: 1, status: 1 });
ItemSchema.index({ 'metadata.popularityScore': -1 });

// ========================================
// MIDDLEWARE
// ========================================

// Pre-save middleware to update timestamps and metadata
ItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.metadata.lastUpdated = new Date();

  // Ensure letter is uppercase
  if (this.letter) {
    this.letter = this.letter.toUpperCase();
  }

  // Update image count
  if (this.imageIds) {
    this.metadata.imageCount = this.imageIds.length;
  }

  next();
});

// ========================================
// VIRTUAL FIELDS
// ========================================

// Virtual for getting primary image path (for backward compatibility)
ItemSchema.virtual('primaryImage').get(function() {
  // Will be populated via primaryImageId reference
  return this.image || '/images/placeholder.webp';
});

// Virtual for category URL
ItemSchema.virtual('categoryUrl').get(function() {
  return `/api/v1/categories/${this.categoryId}`;
});

// Virtual for item URL
ItemSchema.virtual('itemUrl').get(function() {
  return `/api/v1/items/${this.id}`;
});

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Update view count and last viewed timestamp
 */
ItemSchema.methods.updateViews = function() {
  this.metadata.viewCount += 1;
  this.metadata.lastViewed = new Date();
  return this.save();
};

/**
 * Calculate popularity score based on views, images, and content
 */
ItemSchema.methods.calculatePopularityScore = function() {
  const viewScore = (this.metadata.viewCount || 0) * 0.1;
  const imageScore = (this.metadata.imageCount || 0) * 2;
  const descriptionScore = this.description ? 10 : 0;
  const factsScore = (this.facts?.length || 0) * 5;
  const tagsScore = (this.tags?.length || 0) * 2;

  this.metadata.popularityScore = viewScore + imageScore + descriptionScore + factsScore + tagsScore;
  return this.metadata.popularityScore;
};

/**
 * Add a new image reference
 */
ItemSchema.methods.addImage = function(imageId, isPrimary = false) {
  if (!this.imageIds.includes(imageId)) {
    this.imageIds.push(imageId);
  }
  if (isPrimary) {
    this.primaryImageId = imageId;
  }
  this.metadata.imageCount = this.imageIds.length;
  return this.save();
};

/**
 * Remove an image reference
 */
ItemSchema.methods.removeImage = function(imageId) {
  this.imageIds = this.imageIds.filter(id => !id.equals(imageId));
  if (this.primaryImageId && this.primaryImageId.equals(imageId)) {
    this.primaryImageId = this.imageIds[0] || null;
  }
  this.metadata.imageCount = this.imageIds.length;
  return this.save();
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find all items starting with a specific letter
 * This is the CORE letter browsing query
 */
ItemSchema.statics.findByLetter = function(letter, options = {}) {
  const query = {
    letter: letter.toUpperCase(),
    status: options.status || 'published'
  };

  // Add category filter if provided
  if (options.categories && options.categories.length > 0) {
    query.categoryId = { $in: options.categories };
  }

  // Add difficulty filter if provided
  if (options.difficulty) {
    query.difficulty = { $lte: parseInt(options.difficulty) };
  }

  // Build sort option
  let sortOption = {};
  switch (options.sort) {
    case 'name':
      sortOption = { name: 1 };
      break;
    case 'difficulty':
      sortOption = { difficulty: 1, name: 1 };
      break;
    case 'popular':
      sortOption = { 'metadata.popularityScore': -1 };
      break;
    case 'category':
    default:
      sortOption = { categoryName: 1, name: 1 };
  }

  return this.find(query)
    .sort(sortOption)
    .limit(options.limit || 20)
    .skip(options.offset || 0)
    .populate('primaryImageId');
};

/**
 * Find items by category (MULTI-CATEGORY SUPPORT)
 * Items can belong to multiple categories
 */
ItemSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = {
    categoryIds: { $in: [categoryId] },
    status: options.status || 'published'
  };

  if (options.letter) {
    query.letter = options.letter.toUpperCase();
  }

  return this.find(query)
    .sort({ letter: 1, name: 1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0)
    .populate('primaryImageId');
};

/**
 * Find items by primary category only
 * For cases where you want items where this is their main category
 */
ItemSchema.statics.findByPrimaryCategory = function(categoryId, options = {}) {
  const query = {
    primaryCategoryId: categoryId,
    status: options.status || 'published'
  };

  if (options.letter) {
    query.letter = options.letter.toUpperCase();
  }

  return this.find(query)
    .sort({ letter: 1, name: 1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0)
    .populate('primaryImageId');
};

/**
 * Find items by category (LEGACY - single category support)
 * Maintains backward compatibility during migration
 */
ItemSchema.statics.findByCategoryLegacy = function(categoryId, options = {}) {
  const query = {
    categoryId,
    status: options.status || 'published'
  };

  if (options.letter) {
    query.letter = options.letter.toUpperCase();
  }

  return this.find(query)
    .sort({ letter: 1, name: 1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0)
    .populate('primaryImageId');
};

/**
 * Global search across all items
 */
ItemSchema.statics.searchItems = function(searchQuery, options = {}) {
  const query = {
    $text: { $search: searchQuery },
    status: options.status || 'published'
  };

  if (options.categories && options.categories.length > 0) {
    query.categoryId = { $in: options.categories };
  }

  if (options.letters && options.letters.length > 0) {
    query.letter = { $in: options.letters.map(l => l.toUpperCase()) };
  }

  if (options.difficulty) {
    query.difficulty = { $lte: parseInt(options.difficulty) };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20)
    .skip(options.offset || 0)
    .populate('primaryImageId');
};

/**
 * Get letter statistics
 * Returns count of items for each letter
 */
ItemSchema.statics.getLetterStats = async function(options = {}) {
  const matchQuery = { status: options.status || 'published' };

  if (options.categoryId) {
    matchQuery.categoryId = options.categoryId;
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$letter',
        count: { $sum: 1 },
        categories: { $addToSet: { id: '$categoryId', name: '$categoryName' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Create full alphabet result with 0 counts for missing letters
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return alphabet.map(letter => {
    const letterStat = stats.find(s => s._id === letter);
    return {
      letter,
      count: letterStat?.count || 0,
      categories: letterStat?.categories || []
    };
  });
};

/**
 * Get popular items
 */
ItemSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'metadata.popularityScore': -1 })
    .limit(limit)
    .populate('primaryImageId');
};

/**
 * Get random item
 */
ItemSchema.statics.getRandom = function(options = {}) {
  const matchQuery = { status: 'published' };

  if (options.categoryId) {
    matchQuery.categoryId = options.categoryId;
  }

  if (options.letter) {
    matchQuery.letter = options.letter.toUpperCase();
  }

  return this.aggregate([
    { $match: matchQuery },
    { $sample: { size: 1 } }
  ]);
};

/**
 * Generate search keywords for an item
 */
ItemSchema.statics.generateSearchKeywords = function(item, category) {
  const keywords = new Set();

  // Add item name variations
  const itemName = item.name || '';
  keywords.add(itemName.toLowerCase());
  keywords.add(itemName.toLowerCase().replace(/\s+/g, ''));

  // Add category name
  if (category && category.name) {
    keywords.add(category.name.toLowerCase());
  }

  // Add description words
  if (item.description) {
    item.description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
  }

  // Add tags
  if (item.tags && Array.isArray(item.tags)) {
    item.tags.forEach(tag => keywords.add(tag.toLowerCase()));
  }

  // Add facts keywords
  if (item.facts && Array.isArray(item.facts)) {
    item.facts.forEach(fact => {
      fact.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    });
  }

  return Array.from(keywords);
};

module.exports = mongoose.model('Item', ItemSchema);
