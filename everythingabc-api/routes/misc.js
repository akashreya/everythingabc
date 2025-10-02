const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const Category = require('../models/Category');
const logger = require('winston');

/**
 * Miscellaneous Routes
 * AI generation, client stats, activity feeds, and other utilities
 */

// @desc    Generate images using AI
// @route   POST /api/v1/generate/images
// @access  Admin
router.post('/generate/images', asyncHandler(async (req, res) => {
  try {
    const { itemName, category, options = {} } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({
        success: false,
        error: 'Item name and category are required'
      });
    }

    // For now, return a placeholder response
    // In a full implementation, this would integrate with OpenAI DALL-E, Midjourney, etc.
    const mockGeneratedImages = [
      {
        id: `generated_${Date.now()}_1`,
        url: `https://example.com/generated/${category}/${itemName.toLowerCase().replace(/\s+/g, '_')}_1.jpg`,
        thumbnailUrl: `https://example.com/generated/thumbs/${category}/${itemName.toLowerCase().replace(/\s+/g, '_')}_1_thumb.jpg`,
        source: 'ai_generated',
        generator: options.generator || 'dall-e-3',
        prompt: `High-quality photo of ${itemName} for ${category} category`,
        status: 'pending',
        qualityScore: Math.floor(Math.random() * 3) + 7, // 7-10 range
        createdAt: new Date()
      },
      {
        id: `generated_${Date.now()}_2`,
        url: `https://example.com/generated/${category}/${itemName.toLowerCase().replace(/\s+/g, '_')}_2.jpg`,
        thumbnailUrl: `https://example.com/generated/thumbs/${category}/${itemName.toLowerCase().replace(/\s+/g, '_')}_2_thumb.jpg`,
        source: 'ai_generated',
        generator: options.generator || 'dall-e-3',
        prompt: `Professional studio photo of ${itemName}`,
        status: 'pending',
        qualityScore: Math.floor(Math.random() * 3) + 7,
        createdAt: new Date()
      }
    ];

    logger.info(`Generated ${mockGeneratedImages.length} AI images for ${itemName} in ${category}`);

    res.json({
      success: true,
      message: `Generated ${mockGeneratedImages.length} images for ${itemName}`,
      data: {
        itemName,
        category,
        generator: options.generator || 'dall-e-3',
        images: mockGeneratedImages,
        generatedCount: mockGeneratedImages.length
      }
    });

  } catch (error) {
    logger.error('Failed to generate images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate images'
    });
  }
}));

// @desc    Get client statistics and system info
// @route   GET /api/v1/clients
// @access  Admin
router.get('/clients', asyncHandler(async (req, res) => {
  try {
    // Mock client data - in a real implementation this might track API usage, user sessions, etc.
    const clientStats = {
      totalClients: 1,
      activeClients: 1,
      clients: [
        {
          id: 'ics-dashboard',
          name: 'ICS Dashboard',
          type: 'web_app',
          status: 'active',
          lastSeen: new Date(),
          requests: {
            total: Math.floor(Math.random() * 10000) + 1000,
            today: Math.floor(Math.random() * 100) + 10,
            lastHour: Math.floor(Math.random() * 10) + 1
          },
          endpoints: [
            '/api/v1/categories',
            '/api/v1/collection',
            '/admin/categories',
            '/admin/dashboard'
          ]
        }
      ],
      systemStats: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.json({
      success: true,
      data: clientStats
    });

  } catch (error) {
    logger.error('Failed to get client stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve client statistics'
    });
  }
}));

// @desc    Get activity feed
// @route   GET /api/v1/dashboard/activity-feed
// @access  Admin
router.get('/dashboard/activity-feed', asyncHandler(async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent categories and items for activity feed
    const recentCategories = await Category.find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .limit(5);

    // Mock activity data - in a real implementation this might come from an audit log
    const activities = [];

    recentCategories.forEach(category => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let itemCount = 0;

      alphabet.split('').forEach(letter => {
        if (category.items[letter]) {
          itemCount += category.items[letter].length;
        }
      });

      activities.push({
        id: `activity_${category.id}_${Date.now()}`,
        type: 'category_update',
        title: `Category "${category.name}" updated`,
        description: `Category has ${itemCount} items across ${category.completeness || 0} letters`,
        category: {
          id: category.id,
          name: category.name,
          icon: category.icon
        },
        metadata: {
          itemCount,
          completeness: category.completeness || 0
        },
        timestamp: category.updatedAt,
        severity: 'info'
      });
    });

    // Add some mock system activities
    activities.push(
      {
        id: `activity_system_${Date.now()}`,
        type: 'system',
        title: 'System Health Check',
        description: 'All services running normally',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        severity: 'success'
      },
      {
        id: `activity_collection_${Date.now()}`,
        type: 'collection',
        title: 'Image Collection Status',
        description: 'Background collection processes active',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        severity: 'info'
      }
    );

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities,
      count: limitedActivities.length
    });

  } catch (error) {
    logger.error('Failed to get activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity feed'
    });
  }
}));

// @desc    Get comprehensive system status
// @route   GET /api/v1/status
// @access  Public
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const categoriesCount = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ status: 'active' });

    const systemStatus = {
      status: 'operational',
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        totalCategories: categoriesCount,
        activeCategories: activeCategories
      },
      services: {
        imageCollection: 'available',
        enhancedCollection: 'available',
        adminInterface: 'available',
        aiGeneration: 'mock' // Indicates this is a placeholder implementation
      },
      memory: process.memoryUsage(),
      lastHealthCheck: new Date()
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    logger.error('Failed to get system status:', error);
    res.status(503).json({
      success: false,
      error: 'System status unavailable'
    });
  }
}));

module.exports = router;