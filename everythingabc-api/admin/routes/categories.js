const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const asyncHandler = require('express-async-handler');

// GET /admin/categories - List all categories with stats
router.get('/',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search,
      group,
      status,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'seo.searchKeywords': { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (group) filter.group = group;
    if (status) filter.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Category.countDocuments(filter)
    ]);

    // Enhance categories with stats
    const enhancedCategories = categories.map(category => {
      const items = category.items || {};
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      let totalItems = 0;
      let lettersWithItems = 0;
      let activeItems = 0;

      alphabet.forEach(letter => {
        const letterItems = items[letter] || [];
        const activeLetterItems = letterItems.filter(item =>
          item.quality?.status === 'approved' || item.quality?.status === 'active'
        );

        totalItems += letterItems.length;
        activeItems += activeLetterItems.length;
        if (activeLetterItems.length > 0) lettersWithItems++;
      });

      const completenessPercentage = Math.round((lettersWithItems / 26) * 100);
      const qualityScore = category.metadata?.qualityScore || 0;

      return {
        ...category,
        stats: {
          totalItems,
          activeItems,
          lettersWithItems,
          completenessPercentage,
          qualityScore,
          lastUpdated: category.metadata?.lastUpdated
        }
      };
    });

    // Log the request
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'view',
      resourceType: 'category',
      resourceId: 'list',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Viewed categories list (page ${page})`
    });

    res.json({
      success: true,
      data: {
        categories: enhancedCategories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: { search, group, status, sortBy, sortOrder }
      }
    });
  })
);

// GET /admin/categories/:id - Get category details
router.get('/:id',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeAnalytics = false } = req.query;

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Enhance with detailed stats
    const items = category.items || {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const letterStats = alphabet.map(letter => {
      const letterItems = items[letter] || [];
      const activeItems = letterItems.filter(item =>
        item.quality?.status === 'approved' || item.quality?.status === 'active'
      );
      const pendingItems = letterItems.filter(item =>
        item.quality?.status === 'pending' || item.quality?.status === 'review'
      );

      return {
        letter,
        totalItems: letterItems.length,
        activeItems: activeItems.length,
        pendingItems: pendingItems.length,
        status: activeItems.length === 0 ? 'empty' :
               activeItems.length === 1 ? 'minimal' : 'good',
        lastItemAdded: letterItems.length > 0 ?
          Math.max(...letterItems.map(i => new Date(i.audit?.createdAt || i.createdAt))) : null
      };
    });

    // Calculate gaps and recommendations
    const criticalGaps = letterStats.filter(ls => ls.status === 'empty');
    const minimalLetters = letterStats.filter(ls => ls.status === 'minimal');

    const gapAnalysis = {
      criticalGaps: criticalGaps.map(g => g.letter),
      minimalLetters: minimalLetters.map(g => g.letter),
      completenessPercentage: Math.round(((26 - criticalGaps.length) / 26) * 100),
      recommendations: generateRecommendations(criticalGaps, minimalLetters)
    };

    // Log the request
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'view',
      resourceType: 'category',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Viewed category: ${category.name}`
    });

    res.json({
      success: true,
      data: {
        category,
        letterStats,
        gapAnalysis,
        analytics: includeAnalytics ? await getCategoryAnalytics(id) : null
      }
    });
  })
);

// POST /admin/categories - Create new category
router.post('/',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  asyncHandler(async (req, res) => {
    const categoryData = {
      ...req.body,
      metadata: {
        completenessScore: 0,
        totalItems: 0,
        qualityScore: 0,
        lastUpdated: new Date(),
        publishedAt: null
      },
      items: {}, // Initialize empty items object
      gaps: {
        missingLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        sparseLetters: [],
        lastAnalyzed: new Date()
      },
      audit: {
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Generate SEO slug if not provided
    if (!categoryData.seo?.slug) {
      categoryData.seo = {
        ...categoryData.seo,
        slug: categoryData.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      };
    }

    const category = new Category(categoryData);
    await category.save();

    // Log the creation
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'create',
      resourceType: 'category',
      resourceId: category._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Created category: ${category.name}`,
      changes: {
        after: categoryData
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  })
);

// PUT /admin/categories/:id - Update category
router.put('/:id',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updateData = {
      ...req.body,
      'metadata.lastUpdated': new Date(),
      'audit.updatedAt': new Date(),
      'audit.lastModifiedBy': req.user.id
    };

    // Update SEO slug if name changed
    if (req.body.name && req.body.name !== existingCategory.name) {
      updateData['seo.slug'] = req.body.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Log the update
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'update',
      resourceType: 'category',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Updated category: ${updatedCategory.name}`,
      changes: {
        before: existingCategory.toObject(),
        after: updateData
      }
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updatedCategory }
    });
  })
);

// DELETE /admin/categories/:id - Soft delete category
router.delete('/:id',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (permanent === 'true') {
      // Permanent deletion (only for super admins)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for permanent deletion'
        });
      }

      await Category.findByIdAndDelete(id);

      await AuditLog.logAction({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'delete',
        resourceType: 'category',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Permanently deleted category: ${category.name}`,
        changes: { before: category.toObject() }
      });

      res.json({
        success: true,
        message: 'Category permanently deleted'
      });
    } else {
      // Soft delete
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'archived',
            'metadata.lastUpdated': new Date(),
            'audit.updatedAt': new Date(),
            'audit.lastModifiedBy': req.user.id
          }
        },
        { new: true }
      );

      await AuditLog.logAction({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'update',
        resourceType: 'category',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Archived category: ${category.name}`,
        changes: {
          before: category.toObject(),
          after: { status: 'archived' }
        }
      });

      res.json({
        success: true,
        message: 'Category archived successfully',
        data: { category: updatedCategory }
      });
    }
  })
);

// POST /admin/categories/:id/duplicate - Duplicate category
router.post('/:id/duplicate',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, includeItems = false } = req.body;

    const originalCategory = await Category.findById(id);
    if (!originalCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const duplicateData = {
      ...originalCategory.toObject(),
      _id: undefined,
      name: name || `${originalCategory.name} (Copy)`,
      seo: {
        ...originalCategory.seo,
        slug: (name || `${originalCategory.name}-copy`).toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      },
      items: includeItems ? originalCategory.items : {},
      metadata: {
        completenessScore: includeItems ? originalCategory.metadata.completenessScore : 0,
        totalItems: includeItems ? originalCategory.metadata.totalItems : 0,
        qualityScore: 0,
        lastUpdated: new Date(),
        publishedAt: null
      },
      audit: {
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    const newCategory = new Category(duplicateData);
    await newCategory.save();

    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'create',
      resourceType: 'category',
      resourceId: newCategory._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Duplicated category: ${newCategory.name} from ${category.name}`,
      changes: {
        after: newCategory.toObject()
      },
      changes: { after: duplicateData }
    });

    res.status(201).json({
      success: true,
      message: 'Category duplicated successfully',
      data: { category: newCategory }
    });
  })
);

// GET /admin/categories/:id/gaps - Analyze category gaps
router.get('/:id/gaps',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findById(id).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const gapAnalysis = await analyzeGaps(category);

    res.json({
      success: true,
      data: gapAnalysis
    });
  })
);

// Helper functions
function generateRecommendations(criticalGaps, minimalLetters) {
  const recommendations = [];

  if (criticalGaps.length > 0) {
    recommendations.push({
      type: 'critical',
      priority: 'high',
      message: `Add items for letters: ${criticalGaps.map(g => g.letter).join(', ')}`,
      action: 'bulk_add_items',
      letters: criticalGaps.map(g => g.letter)
    });
  }

  if (minimalLetters.length > 0) {
    recommendations.push({
      type: 'enhancement',
      priority: 'medium',
      message: `Consider adding more items for: ${minimalLetters.map(g => g.letter).join(', ')}`,
      action: 'add_alternative_items',
      letters: minimalLetters.map(g => g.letter)
    });
  }

  return recommendations;
}

async function analyzeGaps(category) {
  const items = category.items || {};
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const gapAnalysis = alphabet.map(letter => {
    const letterItems = items[letter] || [];
    const activeItems = letterItems.filter(item =>
      item.quality?.status === 'approved' || item.quality?.status === 'active'
    );

    return {
      letter,
      totalItems: letterItems.length,
      activeItems: activeItems.length,
      status: activeItems.length === 0 ? 'critical' :
             activeItems.length === 1 ? 'minimal' : 'good',
      lastAdded: letterItems.length > 0 ?
        Math.max(...letterItems.map(i => new Date(i.audit?.createdAt || i.createdAt))) : null
    };
  });

  const criticalGaps = gapAnalysis.filter(g => g.status === 'critical');
  const minimalLetters = gapAnalysis.filter(g => g.status === 'minimal');

  return {
    categoryId: category._id,
    completeness: gapAnalysis.filter(g => g.status !== 'critical').length,
    totalLetters: 26,
    gaps: gapAnalysis,
    summary: {
      criticalGaps: criticalGaps.length,
      minimalLetters: minimalLetters.length,
      completenessPercentage: Math.round(((26 - criticalGaps.length) / 26) * 100)
    },
    recommendations: generateRecommendations(criticalGaps, minimalLetters)
  };
}

async function getCategoryAnalytics(categoryId) {
  // This would integrate with your analytics system
  // For now, return mock data structure
  return {
    pageViews30d: 0,
    uniqueVisitors30d: 0,
    sessionDuration: 0,
    bounceRate: 0,
    lastUpdated: new Date()
  };
}

// GET /admin/categories/search/:query - Search categories and items
router.get('/search/:query', asyncHandler(async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20, category } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    let matchQuery = { status: { $ne: 'deleted' } };
    if (category) {
      matchQuery.name = category;
    }

    const categories = await Category.find(matchQuery).limit(parseInt(limit));

    // Search through items
    const results = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const searchTerm = query.toLowerCase();

    categories.forEach(cat => {
      alphabet.split('').forEach(letter => {
        if (cat.items[letter]) {
          cat.items[letter].forEach(item => {
            if (item.name.toLowerCase().includes(searchTerm) ||
                (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)))) {
              results.push({
                id: item.id,
                name: item.name,
                description: item.description,
                image: item.image,
                tags: item.tags,
                categoryId: cat.id,
                categoryName: cat.name,
                letter: letter
              });
            }
          });
        }
      });
    });

    res.json({
      success: true,
      data: results.slice(0, parseInt(limit)),
      count: results.length,
      query: query
    });

  } catch (error) {
    logger.error('Failed to search categories:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
}));

module.exports = router;