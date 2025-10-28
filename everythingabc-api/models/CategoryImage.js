const mongoose = require('mongoose');

/**
 * CategoryImage Model - Separated Image Collection
 *
 * This model extracts images from the embedded Category structure
 * to enable:
 * - 80% reduction in category document size
 * - Efficient image management and querying
 * - Better performance for image-related operations
 * - Scalable image storage architecture
 */

const CategoryImageSchema = new mongoose.Schema({
  // Reference fields for relationships
  itemId: {
    type: String,
    required: true,
    index: true,
    description: 'Links to items collection'
  },
  categoryId: {
    type: String,
    required: true,
    index: true,
    description: 'Category this image belongs to'
  },
  letter: {
    type: String,
    required: true,
    index: true,
    match: /^[A-Z]$/,
    description: 'First letter of the item name for efficient letter browsing'
  },

  // File information
  filePath: {
    type: String,
    required: true,
    description: 'Path to the image file (e.g., /images/animals/ant/primary.webp)'
  },
  fileName: {
    type: String,
    required: true,
    description: 'Original filename'
  },
  altText: {
    type: String,
    required: true,
    description: 'Alternative text for accessibility'
  },

  // Display priority
  isPrimary: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Whether this is the primary/main image for the item'
  },

  // Image status
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected', 'manual_review', 'processing'],
    default: 'approved',
    index: true,
    description: 'Approval status of the image'
  },

  // Source information
  source: {
    provider: {
      type: String,
      required: true,
      enum: ['unsplash', 'pixabay', 'pexels', 'wikimedia', 'dalle', 'google-ai', 'midjourney', 'stable-diffusion', 'manual', 'stock', 'cc0'],
      description: 'Image source provider'
    },
    sourceId: {
      type: String,
      description: 'External provider ID'
    },
    sourceUrl: {
      type: String,
      description: 'Original URL if from external source'
    },
    license: {
      type: String,
      required: true,
      enum: ['unsplash', 'pixabay', 'pexels', 'cc0', 'generated', 'purchased', 'proprietary'],
      description: 'License type'
    },
    attribution: {
      type: String,
      description: 'Attribution text (e.g., "Photo by John Doe on Unsplash")'
    },
    commercial: {
      type: Boolean,
      default: true,
      description: 'Whether commercial use is allowed'
    }
  },

  // Technical metadata
  metadata: {
    width: {
      type: Number,
      required: true,
      description: 'Image width in pixels'
    },
    height: {
      type: Number,
      required: true,
      description: 'Image height in pixels'
    },
    fileSize: {
      type: Number,
      required: true,
      description: 'File size in bytes'
    },
    format: {
      type: String,
      required: true,
      enum: ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'],
      description: 'Image format'
    },
    colorSpace: {
      type: String,
      enum: ['sRGB', 'Adobe RGB', 'CMYK'],
      description: 'Color space'
    },
    hasAlpha: {
      type: Boolean,
      default: false,
      description: 'Whether image has transparency'
    },
    orientation: {
      type: Number,
      min: 1,
      max: 8,
      description: 'EXIF orientation value'
    }
  },

  // Quality assessment (from ICS system)
  qualityScore: {
    overall: {
      type: Number,
      min: 0,
      max: 10,
      index: true,
      description: 'Overall quality score (0-10)'
    },
    breakdown: {
      technical: {
        type: Number,
        min: 0,
        max: 10,
        description: 'Technical quality (resolution, clarity, etc.)'
      },
      relevance: {
        type: Number,
        min: 0,
        max: 10,
        description: 'How well it represents the item'
      },
      aesthetic: {
        type: Number,
        min: 0,
        max: 10,
        description: 'Visual appeal'
      },
      usability: {
        type: Number,
        min: 0,
        max: 10,
        description: 'Clarity for learning'
      }
    }
  },

  // Processed versions (for responsive images)
  processedSizes: [{
    size: {
      type: String,
      enum: ['original', 'large', 'medium', 'small', 'thumbnail'],
      required: true
    },
    path: {
      type: String,
      required: true
    },
    width: Number,
    height: Number,
    fileSize: Number
  }],

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    description: 'Number of times this image has been viewed'
  },
  lastUsed: {
    type: Date,
    description: 'Last time this image was accessed'
  },

  // Approval workflow
  approvedAt: {
    type: Date,
    description: 'When the image was approved'
  },
  approvedBy: {
    type: String,
    description: 'User ID who approved the image'
  },
  rejectionReason: {
    type: String,
    description: 'Reason for rejection if status is rejected'
  },
  rejectionDetails: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Additional details about rejection'
  },

  // Content management
  createdBy: {
    type: String,
    default: 'migration',
    description: 'User ID or system that created this record'
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
  collection: 'categoryImages'
});

// Compound indexes for optimal query performance
CategoryImageSchema.index({ itemId: 1, isPrimary: -1, status: 1 });
CategoryImageSchema.index({ categoryId: 1, letter: 1, status: 1 });
CategoryImageSchema.index({ status: 1, 'qualityScore.overall': -1 });
CategoryImageSchema.index({ 'source.provider': 1, status: 1 });
CategoryImageSchema.index({ createdBy: 1, status: 1 });

// Pre-save middleware to update timestamps
CategoryImageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for getting full image URL (if using CDN)
CategoryImageSchema.virtual('fullUrl').get(function() {
  const baseUrl = process.env.IMAGE_CDN_URL || '';
  return `${baseUrl}${this.filePath}`;
});

// Instance methods
CategoryImageSchema.methods.updateUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

CategoryImageSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

CategoryImageSchema.methods.reject = function(reason, details = null) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.rejectionDetails = details;
  return this.save();
};

// Static methods
CategoryImageSchema.statics.findByItem = function(itemId) {
  return this.find({ itemId, status: 'approved' }).sort({ isPrimary: -1, 'qualityScore.overall': -1 });
};

CategoryImageSchema.statics.findPrimaryImage = function(itemId) {
  return this.findOne({ itemId, isPrimary: true, status: 'approved' });
};

CategoryImageSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = { categoryId, status: 'approved' };
  if (options.letter) {
    query.letter = options.letter.toUpperCase();
  }
  return this.find(query).sort({ isPrimary: -1, 'qualityScore.overall': -1 });
};

CategoryImageSchema.statics.findByLetter = function(letter, options = {}) {
  const query = {
    letter: letter.toUpperCase(),
    status: 'approved'
  };
  if (options.categoryId) {
    query.categoryId = options.categoryId;
  }
  return this.find(query).sort({ 'qualityScore.overall': -1 });
};

CategoryImageSchema.statics.getHighQualityImages = function(minScore = 8.0) {
  return this.find({
    status: 'approved',
    'qualityScore.overall': { $gte: minScore }
  }).sort({ 'qualityScore.overall': -1 });
};

CategoryImageSchema.statics.getStatsByProvider = async function() {
  return this.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id: '$source.provider',
        count: { $sum: 1 },
        avgQuality: { $avg: '$qualityScore.overall' },
        totalFileSize: { $sum: '$metadata.fileSize' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('CategoryImage', CategoryImageSchema);
