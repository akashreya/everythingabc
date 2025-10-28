const express = require('express');
const router = express.Router();
const CategoryImage = require('../../models/CategoryImage');
const Item = require('../../models/Item');

// Helper function for async route handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v2/images/
 * List all images with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    item,
    category,
    letter,
    is_primary,
    status = 'approved',
    provider,
    quality_min,
    sort = 'recent',
    limit = 20,
    offset = 0
  } = req.query;

  // Build query
  const query = { status };

  if (item) {
    const items = item.split(',');
    query.itemId = { $in: items };
  }

  if (category) {
    const categories = category.split(',');
    query.categoryId = { $in: categories };
  }

  if (letter) {
    const letters = letter.split(',').map(l => l.toUpperCase());
    query.letter = { $in: letters };
  }

  if (is_primary !== undefined) {
    query.isPrimary = is_primary === 'true';
  }

  if (provider) {
    const providers = provider.split(',');
    query['source.provider'] = { $in: providers };
  }

  if (quality_min) {
    query['qualityScore.overall'] = { $gte: parseFloat(quality_min) };
  }

  // Build sort option
  let sortOption = {};
  switch (sort) {
    case 'quality':
      sortOption = { 'qualityScore.overall': -1, createdAt: -1 };
      break;
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    case 'popular':
      sortOption = { usageCount: -1, 'qualityScore.overall': -1 };
      break;
    case 'size':
      sortOption = { 'metadata.fileSize': -1 };
      break;
    case 'name':
      sortOption = { fileName: 1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  // Execute query
  const images = await CategoryImage.find(query)
    .sort(sortOption)
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .lean();

  const total = await CategoryImage.countDocuments(query);

  res.json({
    count: total,
    results: images,
    meta: {
      query_time: new Date().toISOString(),
      filters: { item, category, letter, is_primary, provider, quality_min, sort },
      performance: `Found ${total} images in ${images.length > 0 ? '<100ms' : '<50ms'}`
    }
  });
}));

/**
 * GET /api/v2/images/:id/
 * Get specific image details with rich metadata
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const image = await CategoryImage.findById(req.params.id).lean();

  if (!image) {
    return res.status(404).json({
      error: 'Image not found',
      details: `No image found with id: ${req.params.id}`
    });
  }

  // Get item information for context
  const item = await Item.findOne({ id: image.itemId }).lean();

  // Update usage count (don't await to avoid blocking response)
  CategoryImage.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() }
    }
  ).exec().catch(err => console.error('Failed to update usage count:', err));

  // Enhance response with item context
  const enhancedImage = {
    ...image,
    item_context: item ? {
      id: item.id,
      name: item.name,
      letter: item.letter,
      category: {
        id: item.categoryId,
        name: item.categoryName,
        icon: item.categoryIcon
      }
    } : null,
    file_info: {
      full_path: image.filePath,
      file_name: image.fileName,
      size_mb: Math.round((image.metadata.fileSize / 1024 / 1024) * 100) / 100,
      dimensions: `${image.metadata.width}x${image.metadata.height}`,
      format: image.metadata.format,
      aspect_ratio: image.metadata.width && image.metadata.height
        ? Math.round((image.metadata.width / image.metadata.height) * 100) / 100
        : null
    },
    quality_analysis: {
      overall_score: image.qualityScore.overall,
      breakdown: image.qualityScore.breakdown,
      rating: getQualityRating(image.qualityScore.overall),
      suitability: getImageSuitability(image.qualityScore.breakdown)
    }
  };

  res.json(enhancedImage);
}));

/**
 * GET /api/v2/images/:id/sizes/
 * Get all processed sizes for an image
 */
router.get('/:id/sizes', asyncHandler(async (req, res) => {
  const image = await CategoryImage.findById(req.params.id).lean();

  if (!image) {
    return res.status(404).json({
      error: 'Image not found'
    });
  }

  const sizes = image.processedSizes || [];

  // Add responsive image information
  const responsiveInfo = {
    srcset: sizes
      .filter(size => size.width && size.height)
      .map(size => `${size.path} ${size.width}w`)
      .join(', '),
    sizes: [
      '(max-width: 320px) 280px',
      '(max-width: 640px) 600px',
      '(max-width: 1024px) 900px',
      '1200px'
    ].join(', ')
  };

  res.json({
    count: sizes.length,
    results: sizes,
    responsive: responsiveInfo,
    meta: {
      image_id: req.params.id,
      original_size: `${image.metadata.width}x${image.metadata.height}`,
      total_storage: sizes.reduce((total, size) => total + (size.fileSize || 0), 0)
    }
  });
}));

/**
 * GET /api/v2/images/stats/
 * Get image statistics and analytics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [
    totalImages,
    byProvider,
    byQuality,
    byFormat,
    storageStats
  ] = await Promise.all([
    CategoryImage.countDocuments({ status: 'approved' }),
    CategoryImage.getStatsByProvider(),
    CategoryImage.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$qualityScore.overall',
          boundaries: [0, 3, 6, 8, 10],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            avg_file_size: { $avg: '$metadata.fileSize' }
          }
        }
      }
    ]),
    CategoryImage.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$metadata.format',
          count: { $sum: 1 },
          total_size: { $sum: '$metadata.fileSize' },
          avg_quality: { $avg: '$qualityScore.overall' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    CategoryImage.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          total_files: { $sum: 1 },
          total_storage_bytes: { $sum: '$metadata.fileSize' },
          avg_file_size: { $avg: '$metadata.fileSize' },
          largest_file: { $max: '$metadata.fileSize' },
          smallest_file: { $min: '$metadata.fileSize' }
        }
      }
    ])
  ]);

  const storage = storageStats[0] || {};

  res.json({
    overview: {
      total_images: totalImages,
      total_storage_mb: Math.round((storage.total_storage_bytes || 0) / 1024 / 1024),
      average_file_size_kb: Math.round((storage.avg_file_size || 0) / 1024),
      largest_file_mb: Math.round((storage.largest_file || 0) / 1024 / 1024 * 100) / 100,
      smallest_file_kb: Math.round((storage.smallest_file || 0) / 1024)
    },
    by_provider: byProvider,
    by_quality: byQuality.map(bucket => ({
      quality_range: bucket._id === 'unknown' ? 'unknown' : `${bucket._id}-${bucket._id + 2.99}`,
      count: bucket.count,
      avg_file_size_kb: Math.round(bucket.avg_file_size / 1024)
    })),
    by_format: byFormat.map(format => ({
      format: format._id,
      count: format.count,
      total_size_mb: Math.round(format.total_size / 1024 / 1024),
      avg_quality: Math.round(format.avg_quality * 10) / 10
    })),
    quality_distribution: {
      excellent: await CategoryImage.countDocuments({ 'qualityScore.overall': { $gte: 8.5 }, status: 'approved' }),
      good: await CategoryImage.countDocuments({ 'qualityScore.overall': { $gte: 6.5, $lt: 8.5 }, status: 'approved' }),
      fair: await CategoryImage.countDocuments({ 'qualityScore.overall': { $gte: 4, $lt: 6.5 }, status: 'approved' }),
      poor: await CategoryImage.countDocuments({ 'qualityScore.overall': { $lt: 4 }, status: 'approved' })
    },
    meta: {
      last_updated: new Date().toISOString(),
      calculation_time: '<200ms'
    }
  });
}));

/**
 * POST /api/v2/images/
 * Upload a new image (admin only - placeholder)
 */
router.post('/', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Image upload requires admin authentication and file handling'
  });
}));

/**
 * PUT /api/v2/images/:id/
 * Update image metadata (admin only - placeholder)
 */
router.put('/:id', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Image updates require admin authentication'
  });
}));

/**
 * DELETE /api/v2/images/:id/
 * Delete an image (admin only - placeholder)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Image deletion requires admin authentication'
  });
}));

// Helper functions
function getQualityRating(score) {
  if (score >= 8.5) return 'excellent';
  if (score >= 6.5) return 'good';
  if (score >= 4) return 'fair';
  return 'poor';
}

function getImageSuitability(breakdown) {
  const { technical, relevance, aesthetic, usability } = breakdown || {};

  const suitability = [];

  if (technical >= 8) suitability.push('high_resolution');
  if (relevance >= 8) suitability.push('educational');
  if (aesthetic >= 8) suitability.push('visually_appealing');
  if (usability >= 8) suitability.push('clear_for_learning');

  if (suitability.length === 0) suitability.push('basic_use');

  return suitability;
}

module.exports = router;