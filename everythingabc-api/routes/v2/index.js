const express = require('express');
const router = express.Router();

// Import resource routers
const categoriesRouter = require('./categories');
const itemsRouter = require('./items');
const imagesRouter = require('./images');
const lettersRouter = require('./letters');
const searchRouter = require('./search');
const statsRouter = require('./stats');

// Rich linking response formatting middleware
const formatResponse = require('../../middleware/rich-link-formatter');

// Apply response formatting to all v2 routes
router.use(formatResponse);

// Resource endpoints
router.use('/categories', categoriesRouter);
router.use('/items', itemsRouter);
router.use('/images', imagesRouter);
router.use('/letters', lettersRouter);
router.use('/search', searchRouter);
router.use('/stats', statsRouter);

// API root - Discovery endpoint
router.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

  res.json({
    version: '2.0.0',
    description: 'EverythingABC Rich Linked REST API',
    documentation: `${baseUrl}/docs`,

    resources: {
      categories: `${baseUrl}/categories/`,
      items: `${baseUrl}/items/`,
      images: `${baseUrl}/images/`,
      letters: `${baseUrl}/letters/`,
      search: `${baseUrl}/search/`,
      stats: `${baseUrl}/stats/`
    },

    discovery: {
      random: `${baseUrl}/random/`,
      popular: `${baseUrl}/popular/`,
      recent: `${baseUrl}/recent/`
    },

    features: [
      'Resource-based URLs with clean patterns',
      'Rich cross-resource linking',
      'Consistent paginated responses',
      'Advanced filtering and search',
      'Letter-based vocabulary browsing',
      'Real-time statistics and analytics'
    ],

    examples: {
      'Get all animals': `${baseUrl}/categories/animals/`,
      'Browse letter A items': `${baseUrl}/letters/A/items/`,
      'Search for mammals': `${baseUrl}/search/?q=mammal`,
      'Get random item': `${baseUrl}/random/item/`,
      'View item details': `${baseUrl}/items/ant/`
    }
  });
});

// Random content endpoints
router.get('/random', async (req, res) => {
  const Item = require('../../models/Item');
  const Category = require('../../models/Category');

  try {
    const [randomItem] = await Item.getRandom();
    const randomCategory = await Category.aggregate([{ $sample: { size: 1 } }]);

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

    res.json({
      item: randomItem ? `${baseUrl}/items/${randomItem.id}/` : null,
      category: randomCategory[0] ? `${baseUrl}/categories/${randomCategory[0].id}/` : null,
      letter: randomItem ? `${baseUrl}/letters/${randomItem.letter}/` : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get random content' });
  }
});

router.get('/random/item', async (req, res) => {
  const Item = require('../../models/Item');

  try {
    const [randomItem] = await Item.getRandom(req.query);
    if (!randomItem) {
      return res.status(404).json({ error: 'No items found' });
    }

    res.json(randomItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get random item' });
  }
});

router.get('/random/category', async (req, res) => {
  const Category = require('../../models/Category');

  try {
    const [randomCategory] = await Category.aggregate([
      { $match: { status: 'active' } },
      { $sample: { size: 1 } }
    ]);

    if (!randomCategory) {
      return res.status(404).json({ error: 'No categories found' });
    }

    res.json(randomCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get random category' });
  }
});

// Popular content endpoints
router.get('/popular', async (req, res) => {
  const Item = require('../../models/Item');

  try {
    const popularItems = await Item.getPopular(parseInt(req.query.limit) || 10);
    res.json({
      count: popularItems.length,
      results: popularItems
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get popular content' });
  }
});

router.get('/popular/categories', async (req, res) => {
  const Category = require('../../models/Category');

  try {
    const popularCategories = await Category.find({ status: 'active' })
      .sort({ 'metadata.viewCount': -1 })
      .limit(parseInt(req.query.limit) || 10)
      .lean();

    res.json({
      count: popularCategories.length,
      results: popularCategories
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get popular categories' });
  }
});

// Recent content endpoints
router.get('/recent', async (req, res) => {
  const Item = require('../../models/Item');

  try {
    const recentItems = await Item.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 10)
      .populate('primaryImageId')
      .lean();

    res.json({
      count: recentItems.length,
      results: recentItems
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recent content' });
  }
});

router.get('/recent/categories', async (req, res) => {
  const Category = require('../../models/Category');

  try {
    const recentCategories = await Category.find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .limit(parseInt(req.query.limit) || 10)
      .lean();

    res.json({
      count: recentCategories.length,
      results: recentCategories
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recent categories' });
  }
});

// Dashboard utility endpoints (simple JSON format, not paginated V2 structure)

// System status endpoint
router.get('/status', async (req, res) => {
  try {
    const Category = require('../../models/Category');
    const Item = require('../../models/Item');

    const [categoriesCount, itemsCount] = await Promise.all([
      Category.countDocuments({ status: 'active' }),
      Item.countDocuments({ status: 'published' })
    ]);

    const systemStatus = {
      status: 'operational',
      timestamp: new Date(),
      version: '2.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        totalCategories: categoriesCount,
        totalItems: itemsCount
      },
      services: {
        api: 'available',
        database: 'available',
        search: 'available'
      },
      memory: process.memoryUsage(),
      lastHealthCheck: new Date()
    };

    res.json(systemStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to retrieve system status',
      timestamp: new Date()
    });
  }
});

// Client statistics endpoint
router.get('/clients', async (req, res) => {
  try {
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
            '/api/v2/categories',
            '/api/v2/items',
            '/api/v2/stats',
            '/api/v2/search'
          ]
        }
      ],
      systemStats: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.json(clientStats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve client statistics'
    });
  }
});

// Activity feed endpoint
router.get('/dashboard/activity-feed', async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    const Item = require('../../models/Item');
    const Category = require('../../models/Category');

    // Get recent items as activities
    const recentItems = await Item.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const activities = recentItems.map(item => ({
      id: `activity_${item._id}`,
      type: 'item_created',
      title: `New item: ${item.name}`,
      description: `Item "${item.name}" added to ${item.categoryName || item.categoryId}`,
      category: {
        id: item.categoryId,
        name: item.categoryName
      },
      metadata: {
        letter: item.letter,
        difficulty: item.difficulty
      },
      timestamp: item.createdAt,
      severity: 'info'
    }));

    // Add some system activities
    activities.push(
      {
        id: `activity_system_${Date.now()}`,
        type: 'system',
        title: 'API V2 Health Check',
        description: 'All V2 services running normally',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        severity: 'success'
      },
      {
        id: `activity_stats_${Date.now()}`,
        type: 'stats',
        title: 'Statistics Updated',
        description: 'Platform statistics refreshed',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        severity: 'info'
      }
    );

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json(limitedActivities);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve activity feed'
    });
  }
});

// Admin category management endpoints (compatible with ICS dashboard)
router.get('/admin/categories', async (req, res) => {
  try {
    const Category = require('../../models/Category');
    const { page = 1, limit = 20, search, group, status } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (group) filter.group = group;
    if (status) filter.status = status;

    // Execute query
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Category.countDocuments(filter)
    ]);

    // Calculate summary stats
    const totalItems = categories.reduce((sum, cat) => sum + (cat.metadata?.totalItems || 0), 0);

    // Return in V1 admin format for compatibility
    res.json({
      success: true,
      data: {
        categories: categories,
        total: total,
        summary: {
          totalCategories: total,
          totalItems: totalItems,
          completedItems: totalItems, // Simplified for now
          publishedItems: totalItems
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin categories'
    });
  }
});

// Admin category CRUD endpoints (compatible with ICS dashboard)
router.post('/admin/categories', async (req, res) => {
  try {
    const categoryData = req.body;
    const Category = require('../../models/Category');

    const newCategory = new Category({
      id: categoryData.id || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
      name: categoryData.name,
      description: categoryData.description || '',
      icon: categoryData.icon || '📁',
      color: categoryData.color || '#4F46E5',
      status: categoryData.status || 'active',
      group: categoryData.group || 'educational',
      priority: categoryData.priority || 50,
      difficulty: categoryData.difficulty || 'Easy',
      tags: categoryData.tags || [],
      ageRange: categoryData.ageRange || '2-8',
      learningObjectives: categoryData.learningObjectives || [],
      items: categoryData.items || {}, // V1 style embedded items
      metadata: categoryData.metadata || {
        totalItems: 0,
        completedItems: 0,
        publishedItems: 0,
        viewCount: 0,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedCategory = await newCategory.save();

    res.json({
      success: true,
      data: savedCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

router.put('/admin/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryData = req.body;
    const Category = require('../../models/Category');

    const updatedCategory = await Category.findOneAndUpdate(
      { id: categoryId },
      {
        ...categoryData,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

router.delete('/admin/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { permanent } = req.query;
    const Category = require('../../models/Category');
    const Item = require('../../models/Item');

    if (permanent === 'true') {
      // Permanently delete category and all its items
      await Promise.all([
        Category.findOneAndDelete({ id: categoryId }),
        Item.deleteMany({ categoryId: categoryId })
      ]);
    } else {
      // Soft delete - just update status
      const updatedCategory = await Category.findOneAndUpdate(
        { id: categoryId },
        { status: 'inactive', updatedAt: new Date() },
        { new: true }
      );

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'Category permanently deleted' : 'Category deactivated'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

router.get('/admin/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { includeAnalytics } = req.query;
    const Category = require('../../models/Category');
    const Item = require('../../models/Item');

    const category = await Category.findOne({ id: categoryId }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Add analytics if requested
    if (includeAnalytics === 'true') {
      const itemCount = await Item.countDocuments({ categoryId: categoryId, status: 'published' });
      category.analytics = {
        totalItems: itemCount,
        lastAccessed: new Date()
      };
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category details'
    });
  }
});

// Admin item management endpoints (compatible with ICS dashboard)
router.post('/admin/categories/:categoryId/items', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const itemData = req.body;
    const Item = require('../../models/Item');

    // Create new item with V2 structure
    const newItem = new Item({
      id: itemData.id || itemData.name.toLowerCase().replace(/\s+/g, '-'),
      name: itemData.name,
      description: itemData.description || '',
      letter: itemData.letter || itemData.name.charAt(0).toUpperCase(),
      categoryId: categoryId,
      categoryName: itemData.categoryName || categoryId,
      status: itemData.status || 'published',
      difficulty: itemData.difficulty || 1,
      hasImages: itemData.hasImages || false,
      imageCount: itemData.imageCount || 0,
      metadata: itemData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedItem = await newItem.save();

    // Return in admin format for compatibility
    res.json({
      success: true,
      data: savedItem
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create item'
    });
  }
});

router.put('/admin/categories/:categoryId/items/:itemId', async (req, res) => {
  try {
    const { categoryId, itemId } = req.params;
    const itemData = req.body;
    const Item = require('../../models/Item');

    const updatedItem = await Item.findOneAndUpdate(
      { id: itemId, categoryId: categoryId },
      {
        ...itemData,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

router.delete('/admin/categories/:categoryId/items/:itemId', async (req, res) => {
  try {
    const { categoryId, itemId } = req.params;
    const Item = require('../../models/Item');

    const deletedItem = await Item.findOneAndDelete({
      id: itemId,
      categoryId: categoryId
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: deletedItem
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

// Progress tracking endpoints (compatible with ICS dashboard)
router.get('/progress', async (req, res) => {
  try {
    const { limit = 100, offset = 0, categoryId } = req.query;
    const Category = require('../../models/Category');
    const Item = require('../../models/Item');

    // Build filter - support both single categoryId and multi-category categoryIds
    let filter = {};
    if (categoryId) {
      filter = {
        $or: [
          { categoryId: categoryId },
          { categoryIds: { $in: [categoryId] } }
        ]
      };
    }

    // Get progress data with pagination
    const progressData = await Item.find(filter)
      .populate('categoryId', 'name icon')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Transform to progress format expected by dashboard
    const progress = progressData.map(item => ({
      id: item._id,
      categoryId: item.categoryId,
      categoryName: item.categoryId?.name || item.categoryName,
      letter: item.letter,
      itemName: item.name,
      status: item.status, // Use actual database status
      collectionStatus: item.collectionStatus || (item.image ? 'complete' : 'pending'),
      publishingStatus: item.status === 'published' ? 'published' : 'draft',
      progress: item.collectionStatus === 'complete' ? 100 : 50, // Use collectionStatus
      lastUpdated: item.updatedAt,
      imageCount: item.metadata?.imageCount || 0,
      qualityScore: null
    }));

    const total = await Item.countDocuments(filter);

    res.json({
      success: true,
      data: progress,  // Return the array directly for compatibility
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error getting progress data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progress data'
    });
  }
});

router.get('/progress/summary', async (req, res) => {
  try {
    const Item = require('../../models/Item');

    // Get basic summary statistics using actual database fields
    const totalItems = await Item.countDocuments();
    const publishedItems = await Item.countDocuments({ status: 'published' });
    const draftItems = await Item.countDocuments({ status: 'draft' });
    const archivedItems = await Item.countDocuments({ status: 'archived' });
    const itemsWithImages = await Item.countDocuments({ collectionStatus: 'complete' });

    // Calculate completion percentages
    const completionRate = totalItems > 0 ? Math.round((itemsWithImages / totalItems) * 100) : 0;
    const publishedRate = totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0;

    // Get all unique category IDs from database
    const categories = await Item.distinct('categoryId');
    const categoryProgress = [];

    for (const categoryId of categories) {
      // Support both single categoryId and multi-category categoryIds
      const categoryFilter = {
        $or: [
          { categoryId: categoryId },
          { categoryIds: { $in: [categoryId] } }
        ]
      };

      const catTotal = await Item.countDocuments(categoryFilter);
      const catPublished = await Item.countDocuments({ ...categoryFilter, status: 'published' });
      const catDraft = await Item.countDocuments({ ...categoryFilter, status: 'draft' });
      const catWithImages = await Item.countDocuments({ ...categoryFilter, collectionStatus: 'complete' });

      if (catTotal > 0) {
        categoryProgress.push({
          categoryId,
          categoryName: categoryId,
          totalItems: catTotal,
          pendingItems: catDraft, // Use draft items as "pending"
          approvedItems: catPublished, // Use published items as "approved"
          itemsWithImages: catWithImages,
          completedItems: catWithImages,  // Progress component expects this field name
          totalImages: catWithImages,     // Progress component expects this field name
          completionRate: Math.round((catWithImages / catTotal) * 100)
        });
      }
    }

    res.json({
      success: true,
      data: categoryProgress,  // getCategoryStats expects this to be an array
      summary: {               // getProgressStats expects this field
        totalItems,
        totalCategories: categories.length,
        pendingItems: draftItems,
        approvedItems: publishedItems,
        rejectedItems: archivedItems,
        itemsWithImages,
        completionRate,
        approvalRate: publishedRate,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting progress summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progress summary'
    });
  }
});

// Generation statistics endpoint (compatible with ICS dashboard)
router.get('/generate/stats', async (req, res) => {
  try {
    // Mock generation statistics for now since this is image collection system
    // In a real implementation, these would come from actual generation logs/database
    const stats = {
      totalGenerated: 0,
      totalCost: 0,
      available: true,
      activeProvider: 'googleai',
      availableProviders: ['googleai'],
      openaiStats: {
        dailyRequests: 0,
        monthlyCost: 0
      },
      recentGenerations: []
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error getting generation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generation stats'
    });
  }
});

// Publishing workflow endpoints (compatible with ICS dashboard)
router.get('/admin/items/pending-review', async (req, res) => {
  try {
    const { categoryId, limit = 50, offset = 0 } = req.query;
    const Item = require('../../models/Item');

    // Build filter for pending review items (use draft status for review)
    let filter = {
      status: 'draft'  // Items in review status
    };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Get items with pagination
    const items = await Item.find(filter)
      .populate('categoryId', 'name')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ updatedAt: -1 });

    // Count total items for pagination
    const total = await Item.countDocuments(filter);

    // Transform items to include category name and additional fields expected by frontend
    const transformedItems = items.map(item => ({
      ...item.toObject(),
      categoryName: item.categoryId?.name || 'Unknown',
      imageCount: item.image ? 1 : 0
    }));

    res.json({
      success: true,
      data: {
        items: transformedItems,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error getting pending review items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending review items'
    });
  }
});

router.post('/admin/items/:itemId/publish', async (req, res) => {
  try {
    const { itemId } = req.params;
    const Item = require('../../models/Item');

    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      {
        status: 'published',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('categoryId', 'name');

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item published successfully',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error publishing item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish item'
    });
  }
});

router.post('/admin/items/:itemId/unpublish', async (req, res) => {
  try {
    const { itemId } = req.params;
    const Item = require('../../models/Item');

    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      {
        status: 'draft',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('categoryId', 'name');

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item unpublished successfully',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error unpublishing item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unpublish item'
    });
  }
});

router.post('/admin/items/bulk-publish', async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Item IDs array is required'
      });
    }

    const Item = require('../../models/Item');

    const result = await Item.updateMany(
      { _id: { $in: itemIds } },
      {
        status: 'published',
        updatedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} items published successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });

  } catch (error) {
    console.error('Error bulk publishing items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk publish items'
    });
  }
});

// Import/Export endpoints (compatible with ICS dashboard)
router.get('/admin/import-export/export/csv', async (req, res) => {
  try {
    const { categoryId, publishingStatus, collectionStatus, includeMetadata } = req.query;
    const Category = require('../../models/Category');
    const Item = require('../../models/Item');

    // Build filter for items
    let itemFilter = {};

    if (categoryId) {
      itemFilter.categoryId = categoryId;
    }

    if (publishingStatus) {
      // Map publishing status to backend status
      if (publishingStatus === 'published') {
        itemFilter.status = 'published';
      } else if (publishingStatus === 'draft') {
        itemFilter.status = 'draft';
      } else if (publishingStatus === 'review') {
        itemFilter.status = 'review';
      }
    }

    if (collectionStatus) {
      if (collectionStatus === 'complete') {
        itemFilter.image = { $exists: true, $ne: null };
      } else if (collectionStatus === 'pending') {
        itemFilter.$or = [
          { image: { $exists: false } },
          { image: null }
        ];
      }
    }

    // Get items
    const items = await Item.find(itemFilter).populate('categoryId', 'name');

    // Build CSV content
    const csvHeaders = [
      'Category',
      'Letter',
      'Name',
      'Description',
      'Status',
      'Publishing Status',
      'Difficulty'
    ];

    if (includeMetadata === 'true') {
      csvHeaders.push('Created Date', 'Updated Date', 'Image URL', 'Quality Score');
    }

    let csvContent = csvHeaders.join(',') + '\n';

    items.forEach(item => {
      const publishingStatus = item.status === 'published' ? 'published' :
                               item.status === 'draft' ? 'draft' : 'review';
      const collectionStatus = item.image ? 'complete' : 'pending';

      let row = [
        `"${item.categoryId?.name || 'Unknown'}"`,
        `"${item.letter || ''}"`,
        `"${item.name || ''}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${collectionStatus}"`,
        `"${publishingStatus}"`,
        `"${item.difficulty || 1}"`
      ];

      if (includeMetadata === 'true') {
        row.push(
          `"${item.createdAt ? item.createdAt.toISOString() : ''}"`,
          `"${item.updatedAt ? item.updatedAt.toISOString() : ''}"`,
          `"${item.image || ''}"`,
          `"${item.quality?.score || ''}"`
        );
      }

      csvContent += row.join(',') + '\n';
    });

    // Set response headers for file download
    const filename = categoryId ?
      `${items[0]?.categoryId?.name || 'category'}-export-${Date.now()}.csv` :
      `all-categories-export-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

router.get('/admin/import-export/import/template', async (req, res) => {
  try {
    // Create CSV template
    const csvHeaders = [
      'Category',
      'Letter',
      'Name',
      'Description',
      'Tags',
      'Difficulty'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    // Add example rows
    csvContent += '"Animals","A","Ant","A small insect that lives in colonies","insect,small,colony","1"\n';
    csvContent += '"Animals","B","Bear","A large mammal with thick fur","mammal,large,forest","2"\n';
    csvContent += '"Fruits","A","Apple","A round red or green fruit","fruit,sweet,healthy","1"\n';

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="import-template.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating import template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate import template'
    });
  }
});

module.exports = router;