const mongoose = require('mongoose');

// Image metadata schema from ICS
const ImageMetadataSchema = new mongoose.Schema({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  fileSize: { type: Number, required: true },
  format: { type: String, required: true },
  colorSpace: String,
  hasAlpha: Boolean,
  orientation: Number
}, { _id: false });

// Quality score schema from ICS
const QualityScoreSchema = new mongoose.Schema({
  overall: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  breakdown: {
    technical: { type: Number, min: 0, max: 10 },
    relevance: { type: Number, min: 0, max: 10 },
    aesthetic: { type: Number, min: 0, max: 10 },
    usability: { type: Number, min: 0, max: 10 }
  }
}, { _id: false });

// Enhanced image schema combining both systems
const ImageSchema = new mongoose.Schema({
  // ICS source information
  sourceUrl: String,
  sourceProvider: {
    type: String,
    enum: ['unsplash', 'pixabay', 'pexels', 'wikimedia', 'dalle', 'google-ai', 'midjourney', 'stable-diffusion', 'manual'],
    required: true
  },
  sourceId: { type: String, required: true },

  // File information
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },

  // Image metadata
  metadata: ImageMetadataSchema,

  // Quality assessment
  qualityScore: QualityScoreSchema,

  // Status and approval
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'manual_review'],
    default: 'approved',
    index: true
  },

  // Display priority
  isPrimary: {
    type: Boolean,
    default: false
  },

  // License information
  license: {
    type: {
      type: String,
      required: true,
      enum: ['unsplash', 'pixabay', 'pexels', 'cc0', 'generated', 'purchased']
    },
    attribution: String,
    commercial: { type: Boolean, default: true },
    url: String
  },

  // Usage tracking
  usageCount: { type: Number, default: 0 },
  lastUsed: Date,

  // Processing information
  processedSizes: [{
    size: {
      type: String,
      enum: ['original', 'large', 'medium', 'small', 'thumbnail']
    },
    path: String,
    width: Number,
    height: Number,
    fileSize: Number
  }],

  // Approval workflow
  approvedAt: Date,
  approvedBy: String,
  rejectionReason: String,
  rejectionDetails: mongoose.Schema.Types.Mixed,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Collection progress schema for each item
const CollectionProgressSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'collecting', 'completed', 'failed', 'paused'],
    default: 'pending'
  },

  // Target and actual counts
  targetCount: { type: Number, default: 3 },
  collectedCount: { type: Number, default: 0 },
  approvedCount: { type: Number, default: 0 },
  rejectedCount: { type: Number, default: 0 },

  // Collection attempts
  searchAttempts: { type: Number, default: 0 },
  lastSearchTerms: [String],

  // Difficulty assessment
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'very_hard'],
    default: 'medium'
  },

  // Source breakdown
  sources: {
    unsplash: {
      found: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      lastSearched: Date
    },
    pixabay: {
      found: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      lastSearched: Date
    },
    pexels: {
      found: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      lastSearched: Date
    },
    wikimedia: {
      found: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      lastSearched: Date
    },
    dalle: {
      generated: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      lastGenerated: Date
    }
  },

  // Quality metrics
  averageQualityScore: { type: Number, min: 0, max: 10 },
  bestQualityScore: { type: Number, min: 0, max: 10 },

  // Error tracking
  errors: [{
    timestamp: { type: Date, default: Date.now },
    source: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],

  // Timestamps
  startedAt: Date,
  completedAt: Date,
  lastAttempt: Date,
  nextAttempt: Date
}, { _id: false });

// Enhanced item schema combining EverythingABC and ICS
const ItemSchema = new mongoose.Schema({
  // Existing EverythingABC fields
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },

  // Legacy single image field (for backward compatibility)
  image: String,
  imageAlt: String,

  // New multi-image system
  images: [ImageSchema],

  // Existing metadata
  difficulty: { type: Number, min: 1, max: 5, default: 1 },
  pronunciation: String,
  description: { type: String, required: true, trim: true },
  facts: [String],
  tags: [String],

  // Category-specific metadata (preserved)
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

  // New collection management
  collectionProgress: CollectionProgressSchema,

  // Two-track status system for CMS
  collectionStatus: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending'
  },
  publishingStatus: {
    type: String,
    enum: ['draft', 'review', 'published'],
    default: 'draft'
  },

  // Legacy status fields (backward compatibility)
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },

  // Admin tracking
  createdBy: String,
  lastModifiedBy: String,
  approvedBy: String,
  approvedAt: Date,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Image collection strategy schema
const ImageCollectionStrategySchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  prioritySources: {
    type: [String],
    default: ['unsplash', 'pixabay', 'pexels']
  },
  excludeSources: [String],
  useAiGeneration: { type: Boolean, default: true },
  minQualityThreshold: { type: Number, default: 7.0 },
  targetImagesPerItem: { type: Number, default: 3 },
  autoApprovalThreshold: { type: Number, default: 8.5 },
  maxSearchAttempts: { type: Number, default: 5 },
  retryInterval: { type: Number, default: 24 }, // hours
  customSearchTerms: [String]
}, { _id: false });

// Collection progress summary for category level
const CategoryCollectionProgressSchema = new mongoose.Schema({
  totalItems: { type: Number, default: 0 },
  completedItems: { type: Number, default: 0 },
  pendingItems: { type: Number, default: 0 },
  collectingItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },

  totalImages: { type: Number, default: 0 },
  approvedImages: { type: Number, default: 0 },
  pendingImages: { type: Number, default: 0 },

  avgQualityScore: { type: Number, min: 0, max: 10 },

  lastCollectionRun: Date,
  nextScheduledRun: Date,

  // Collection statistics
  totalCollectionAttempts: { type: Number, default: 0 },
  successfulCollections: { type: Number, default: 0 },
  avgCollectionTime: Number, // milliseconds

  // Source performance
  sourceStats: {
    unsplash: {
      totalSearches: { type: Number, default: 0 },
      successfulFinds: { type: Number, default: 0 },
      approvedImages: { type: Number, default: 0 }
    },
    pixabay: {
      totalSearches: { type: Number, default: 0 },
      successfulFinds: { type: Number, default: 0 },
      approvedImages: { type: Number, default: 0 }
    },
    pexels: {
      totalSearches: { type: Number, default: 0 },
      successfulFinds: { type: Number, default: 0 },
      approvedImages: { type: Number, default: 0 }
    }
  }
}, { _id: false });

// Main enhanced category schema
const CategorySchema = new mongoose.Schema({
  // Existing EverythingABC fields (preserved)
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Easy'
  },
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  completeness: { type: Number, min: 0, max: 26, default: 0 },
  priority: { type: Number, min: 1, max: 100, default: 50 },
  group: {
    type: String,
    enum: ['educational', 'nature', 'everyday', 'professional'],
    default: 'educational'
  },
  tags: [String],
  ageRange: String,
  learningObjectives: [String],

  // Enhanced items with image collection
  items: {
    A: [ItemSchema], B: [ItemSchema], C: [ItemSchema],
    D: [ItemSchema], E: [ItemSchema], F: [ItemSchema],
    G: [ItemSchema], H: [ItemSchema], I: [ItemSchema],
    J: [ItemSchema], K: [ItemSchema], L: [ItemSchema],
    M: [ItemSchema], N: [ItemSchema], O: [ItemSchema],
    P: [ItemSchema], Q: [ItemSchema], R: [ItemSchema],
    S: [ItemSchema], T: [ItemSchema], U: [ItemSchema],
    V: [ItemSchema], W: [ItemSchema], X: [ItemSchema],
    Y: [ItemSchema], Z: [ItemSchema]
  },

  // New image collection management
  imageCollection: {
    strategy: ImageCollectionStrategySchema,
    progress: CategoryCollectionProgressSchema,
    enabled: { type: Boolean, default: true },
    lastConfigUpdate: Date
  },

  // Existing metadata (preserved)
  metadata: {
    totalItems: { type: Number, default: 0 },
    completedItems: { type: Number, default: 0 },
    publishedItems: { type: Number, default: 0 },
    pendingItems: { type: Number, default: 0 },
    draftItems: { type: Number, default: 0 },
    reviewItems: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 0 },
    avgSessionTime: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },

  // Admin fields (preserved)
  createdBy: String,
  lastModifiedBy: String,
  publishedBy: String,
  publishedAt: Date
}, {
  timestamps: true,
  collection: 'categories'
});

// Indexes for performance (preserved and enhanced)
CategorySchema.index({ id: 1 }, { unique: true });
CategorySchema.index({ name: 1 });
CategorySchema.index({ status: 1 });
CategorySchema.index({ difficulty: 1 });
CategorySchema.index({ tags: 1 });

// New indexes for image collection
CategorySchema.index({ 'imageCollection.progress.nextScheduledRun': 1 });
CategorySchema.index({ 'items.A.images.status': 1 });
CategorySchema.index({ 'items.A.images.qualityScore.overall': -1 });

// Text search index (preserved and enhanced)
CategorySchema.index({
  'name': 'text',
  'description': 'text',
  'items.A.name': 'text', 'items.B.name': 'text', 'items.C.name': 'text',
  'items.D.name': 'text', 'items.E.name': 'text', 'items.F.name': 'text',
  'items.G.name': 'text', 'items.H.name': 'text', 'items.I.name': 'text',
  'items.J.name': 'text', 'items.K.name': 'text', 'items.L.name': 'text',
  'items.M.name': 'text', 'items.N.name': 'text', 'items.O.name': 'text',
  'items.P.name': 'text', 'items.Q.name': 'text', 'items.R.name': 'text',
  'items.S.name': 'text', 'items.T.name': 'text', 'items.U.name': 'text',
  'items.V.name': 'text', 'items.W.name': 'text', 'items.X.name': 'text',
  'items.Y.name': 'text', 'items.Z.name': 'text'
});

// Virtual for primary image (backward compatibility)
ItemSchema.virtual('primaryImage').get(function() {
  const primaryImg = this.images.find(img => img.isPrimary && img.status === 'approved');
  if (primaryImg) return primaryImg.filePath;

  const approvedImg = this.images.find(img => img.status === 'approved');
  if (approvedImg) return approvedImg.filePath;

  return this.image || '/images/placeholder.webp';
});

// Virtual for collection completion percentage
ItemSchema.virtual('collectionCompletionPercent').get(function() {
  if (!this.collectionProgress) return 0;
  const { approvedCount, targetCount } = this.collectionProgress;
  return Math.round((approvedCount / Math.max(targetCount, 1)) * 100);
});

// Enhanced middleware to update category-level progress
CategorySchema.pre('save', function(next) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let totalItems = 0;
  let completedItems = 0;
  let pendingItems = 0;
  let collectingItems = 0;
  let failedItems = 0;
  let totalImages = 0;
  let approvedImages = 0;
  let pendingImages = 0;
  let qualityScores = [];

  // Calculate completeness and collection progress
  for (const letter of alphabet) {
    if (this.items[letter] && this.items[letter].length > 0) {
      this.completeness = Math.max(this.completeness, alphabet.indexOf(letter) + 1);

      for (const item of this.items[letter]) {
        totalItems++;

        if (item.collectionProgress) {
          switch (item.collectionProgress.status) {
            case 'completed': completedItems++; break;
            case 'collecting': collectingItems++; break;
            case 'failed': failedItems++; break;
            default: pendingItems++; break;
          }
        } else {
          pendingItems++;
        }

        if (item.images) {
          for (const image of item.images) {
            totalImages++;
            if (image.status === 'approved') {
              approvedImages++;
              if (image.qualityScore && image.qualityScore.overall) {
                qualityScores.push(image.qualityScore.overall);
              }
            } else if (image.status === 'pending') {
              pendingImages++;
            }
          }
        }
      }
    }
  }

  // Update metadata
  this.metadata.totalItems = totalItems;
  this.metadata.lastUpdated = new Date();

  // Update collection progress
  if (this.imageCollection && this.imageCollection.progress) {
    this.imageCollection.progress.totalItems = totalItems;
    this.imageCollection.progress.completedItems = completedItems;
    this.imageCollection.progress.pendingItems = pendingItems;
    this.imageCollection.progress.collectingItems = collectingItems;
    this.imageCollection.progress.failedItems = failedItems;
    this.imageCollection.progress.totalImages = totalImages;
    this.imageCollection.progress.approvedImages = approvedImages;
    this.imageCollection.progress.pendingImages = pendingImages;

    if (qualityScores.length > 0) {
      this.imageCollection.progress.avgQualityScore =
        qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    }
  }

  next();
});

// Instance methods (preserved and enhanced)
CategorySchema.methods.getLettersWithItems = function() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet.split('').filter(letter =>
    this.items[letter] && this.items[letter].length > 0
  );
};

CategorySchema.methods.getItemsByLetter = function(letter) {
  const upperLetter = letter.toUpperCase();
  return this.items[upperLetter] || [];
};

CategorySchema.methods.addItem = function(letter, item) {
  const upperLetter = letter.toUpperCase();
  if (!this.items[upperLetter]) {
    this.items[upperLetter] = [];
  }

  item.createdAt = new Date();
  item.updatedAt = new Date();

  // Initialize collection progress for new items
  if (!item.collectionProgress) {
    item.collectionProgress = {
      status: 'pending',
      targetCount: this.imageCollection?.strategy?.targetImagesPerItem || 3,
      collectedCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };
  }

  this.items[upperLetter].push(item);
  return this.save();
};

CategorySchema.methods.removeItem = function(letter, itemId) {
  const upperLetter = letter.toUpperCase();
  if (this.items[upperLetter]) {
    this.items[upperLetter] = this.items[upperLetter].filter(
      item => item.id !== itemId
    );
  }

  return this.save();
};

// New methods for image collection management
CategorySchema.methods.startImageCollection = function() {
  if (!this.imageCollection) {
    this.imageCollection = {
      strategy: {},
      progress: {},
      enabled: true
    };
  }

  this.imageCollection.progress.lastCollectionRun = new Date();
  return this.save();
};

CategorySchema.methods.getPendingCollectionItems = function() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pendingItems = [];

  for (const letter of alphabet) {
    if (this.items[letter]) {
      for (const item of this.items[letter]) {
        if (item.collectionProgress &&
            ['pending', 'collecting'].includes(item.collectionProgress.status) &&
            item.collectionProgress.approvedCount < item.collectionProgress.targetCount) {
          pendingItems.push({
            letter,
            item: item,
            priority: this.calculateCollectionPriority(item)
          });
        }
      }
    }
  }

  return pendingItems.sort((a, b) => b.priority - a.priority);
};

CategorySchema.methods.calculateCollectionPriority = function(item) {
  let priority = 100;

  // Higher priority for items with no images
  if (!item.images || item.images.length === 0) priority += 50;

  // Lower priority for items that have failed multiple times
  if (item.collectionProgress && item.collectionProgress.searchAttempts > 3) {
    priority -= item.collectionProgress.searchAttempts * 10;
  }

  // Higher priority for easier items
  if (item.difficulty === 1) priority += 20;
  else if (item.difficulty === 3) priority -= 20;

  return Math.max(priority, 0);
};

// Static methods (preserved and enhanced)
CategorySchema.statics.findByIdWithStats = async function(categoryId) {
  const category = await this.findOne({ id: categoryId });
  if (!category) return null;

  // Update view count
  category.metadata.viewCount += 1;
  await category.save();

  return category;
};

CategorySchema.statics.searchItems = async function(query) {
  return this.find(
    {
      $text: { $search: query },
      status: 'active'
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

CategorySchema.statics.getActiveCategories = function() {
  return this.find({ status: 'active' }).sort({ completeness: -1, name: 1 });
};

// New static methods for image collection management
CategorySchema.statics.getCategoriesNeedingCollection = function() {
  return this.find({
    status: 'active',
    'imageCollection.enabled': true,
    $or: [
      { 'imageCollection.progress.pendingItems': { $gt: 0 } },
      { 'imageCollection.progress.collectingItems': { $gt: 0 } },
      { 'imageCollection.progress.nextScheduledRun': { $lte: new Date() } }
    ]
  }).sort({ 'imageCollection.progress.nextScheduledRun': 1 });
};

CategorySchema.statics.getCollectionStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        totalItems: { $sum: '$imageCollection.progress.totalItems' },
        completedItems: { $sum: '$imageCollection.progress.completedItems' },
        pendingItems: { $sum: '$imageCollection.progress.pendingItems' },
        totalImages: { $sum: '$imageCollection.progress.totalImages' },
        approvedImages: { $sum: '$imageCollection.progress.approvedImages' },
        avgQuality: { $avg: '$imageCollection.progress.avgQualityScore' }
      }
    }
  ]);
};

module.exports = mongoose.model('Category', CategorySchema);