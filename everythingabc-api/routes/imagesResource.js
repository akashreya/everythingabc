const express = require('express');
const router = express.Router();
const CategoryImage = require('../models/CategoryImage');
const Item = require('../models/Item');

/**
 * Images Resource Routes
 *
 * Provides access to image resources across all categories and items
 *
 * Endpoints:
 * - GET /api/v1/images/ - List all images with filtering
 * - GET /api/v1/images/:id - Get specific image details
 * - GET /api/v1/images/stats/providers - Get statistics by image provider
 * - GET /api/v1/images/stats/quality - Get quality distribution statistics
 */

// Helper function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v1/images/
 *
 * List all images with advanced filtering and pagination
 *
 * Query parameters:
 * - item: Filter by item ID
 * - category: Filter by category ID
 * - letter: Filter by letter
 * - is_primary: Filter primary/secondary images (true/false)
 * - status: Filter by approval status (approved, pending, rejected)
 * - quality_min: Minimum quality score (0-10)
 * - provider: Filter by source provider
 * - sort: Sort order (quality, recent, popularity)
 * - limit: Number of images per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    item,
    category,
    letter,
    is_primary,
    status = 'approved',
    quality_min,
    provider,
    sort = 'quality',
    limit = 20,
    offset = 0
  } = req.query;

  const startTime = Date.now();

  try {
    // Build query
    const query = { status };

    if (item) {
      query.itemId = item;
    }

    if (category) {
      query.categoryId = category;
    }

    if (letter) {
      query.letter = letter.toUpperCase();
    }

    if (is_primary !== undefined) {
      query.isPrimary = is_primary === 'true';
    }

    if (quality_min) {
      query['qualityScore.overall'] = { $gte: parseFloat(quality_min) };
    }

    if (provider) {
      query['source.provider'] = provider;
    }

    // Build sort option
    let sortOption = {};
    switch (sort) {
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      case 'popularity':
        sortOption = { usageCount: -1 };
        break;
      case 'quality':
      default:
        sortOption = { 'qualityScore.overall': -1, isPrimary: -1 };
    }

    // Parse pagination parameters
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    // Execute query
    const images = await CategoryImage.find(query)
      .sort(sortOption)
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    // Get total count for pagination
    const totalCount = await CategoryImage.countDocuments(query);

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: images,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + parsedLimit < totalCount,
        nextOffset: parsedOffset + parsedLimit < totalCount ? parsedOffset + parsedLimit : null,
        previousOffset: parsedOffset > 0 ? Math.max(0, parsedOffset - parsedLimit) : null
      },
      meta: {
        filters: {
          item,
          category,
          letter,
          is_primary,
          status,
          quality_min,
          provider,
          sort
        },
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/images/:id
 *
 * Get detailed information about a specific image
 *
 * Includes:
 * - Full image metadata
 * - Source information
 * - Quality assessment
 * - Associated item details
 * - Usage statistics
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const image = await CategoryImage.findById(id).lean();

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: `No image found with ID: ${id}`
      });
    }

    // Get associated item information
    const item = await Item.findOne({ id: image.itemId })
      .select('id name categoryName letter')
      .lean();

    // Update usage count (async, don't wait)
    CategoryImage.findByIdAndUpdate(
      id,
      {
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      }
    ).exec();

    // Add related resource URLs
    image.relatedResources = {
      item: `/api/v1/items/${image.itemId}`,
      category: `/api/v1/categories/${image.categoryId}`,
      sameItem: `/api/v1/images?item=${image.itemId}`,
      sameCategory: `/api/v1/images?category=${image.categoryId}`,
      sameLetter: `/api/v1/images?letter=${image.letter}`,
      sameProvider: `/api/v1/images?provider=${image.source.provider}`
    };

    res.json({
      success: true,
      data: {
        ...image,
        associatedItem: item
      }
    });
  } catch (error) {
    console.error(`Error fetching image ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch image',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/images/stats/providers
 *
 * Get statistics grouped by image provider
 */
router.get('/stats/providers', asyncHandler(async (req, res) => {
  try {
    const providerStats = await CategoryImage.getStatsByProvider();

    // Calculate totals
    const totals = providerStats.reduce(
      (acc, stat) => {
        acc.totalImages += stat.count;
        acc.totalFileSize += stat.totalFileSize;
        return acc;
      },
      { totalImages: 0, totalFileSize: 0 }
    );

    // Calculate average quality across all providers
    const avgQuality = providerStats.reduce((sum, stat) => sum + (stat.avgQuality || 0), 0) / providerStats.length;

    res.json({
      success: true,
      data: providerStats,
      summary: {
        totalProviders: providerStats.length,
        totalImages: totals.totalImages,
        totalFileSizeMB: (totals.totalFileSize / (1024 * 1024)).toFixed(2),
        averageQuality: avgQuality.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching provider statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider statistics',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/images/stats/quality
 *
 * Get quality distribution statistics
 */
router.get('/stats/quality', asyncHandler(async (req, res) => {
  try {
    const qualityDistribution = await CategoryImage.aggregate([
      {
        $match: { status: 'approved' }
      },
      {
        $bucket: {
          groupBy: '$qualityScore.overall',
          boundaries: [0, 2, 4, 6, 8, 10],
          default: 'Unknown',
          output: {
            count: { $sum: 1 },
            avgTechnical: { $avg: '$qualityScore.breakdown.technical' },
            avgRelevance: { $avg: '$qualityScore.breakdown.relevance' },
            avgAesthetic: { $avg: '$qualityScore.breakdown.aesthetic' },
            avgUsability: { $avg: '$qualityScore.breakdown.usability' }
          }
        }
      }
    ]);

    // Calculate overall statistics
    const overallStats = await CategoryImage.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          totalImages: { $sum: 1 },
          avgOverallQuality: { $avg: '$qualityScore.overall' },
          avgTechnical: { $avg: '$qualityScore.breakdown.technical' },
          avgRelevance: { $avg: '$qualityScore.breakdown.relevance' },
          avgAesthetic: { $avg: '$qualityScore.breakdown.aesthetic' },
          avgUsability: { $avg: '$qualityScore.breakdown.usability' },
          minQuality: { $min: '$qualityScore.overall' },
          maxQuality: { $max: '$qualityScore.overall' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        distribution: qualityDistribution,
        overall: overallStats[0] || {}
      }
    });
  } catch (error) {
    console.error('Error fetching quality statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quality statistics',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/images/stats/overview
 *
 * Get comprehensive image platform statistics
 */
router.get('/stats/overview', asyncHandler(async (req, res) => {
  try {
    const [
      totalImages,
      approvedImages,
      pendingImages,
      primaryImages,
      avgQualityResult,
      topCategories,
      topProviders
    ] = await Promise.all([
      CategoryImage.countDocuments({}),
      CategoryImage.countDocuments({ status: 'approved' }),
      CategoryImage.countDocuments({ status: 'pending' }),
      CategoryImage.countDocuments({ isPrimary: true, status: 'approved' }),
      CategoryImage.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avgQuality: { $avg: '$qualityScore.overall' } } }
      ]),
      CategoryImage.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      CategoryImage.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$source.provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          allImages: totalImages,
          approved: approvedImages,
          pending: pendingImages,
          primaryImages
        },
        quality: {
          average: avgQualityResult[0]?.avgQuality.toFixed(2) || 0
        },
        topCategories: topCategories.map(cat => ({
          categoryId: cat._id,
          imageCount: cat.count
        })),
        topProviders: topProviders.map(prov => ({
          provider: prov._id,
          imageCount: prov.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching image overview statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview statistics',
      message: error.message
    });
  }
}));

/**
 * GET /api/v1/images/high-quality
 *
 * Get high-quality images (score >= 8.0)
 */
router.get('/high-quality', asyncHandler(async (req, res) => {
  const { limit = 20, category, letter } = req.query;

  try {
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);

    const query = {
      status: 'approved',
      'qualityScore.overall': { $gte: 8.0 }
    };

    if (category) {
      query.categoryId = category;
    }

    if (letter) {
      query.letter = letter.toUpperCase();
    }

    const highQualityImages = await CategoryImage.find(query)
      .sort({ 'qualityScore.overall': -1 })
      .limit(parsedLimit)
      .lean();

    res.json({
      success: true,
      data: highQualityImages,
      meta: {
        limit: parsedLimit,
        filters: { category, letter }
      }
    });
  } catch (error) {
    console.error('Error fetching high-quality images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high-quality images',
      message: error.message
    });
  }
}));

module.exports = router;
