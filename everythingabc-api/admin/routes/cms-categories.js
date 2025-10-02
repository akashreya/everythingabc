const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const asyncHandler = require('express-async-handler');

// GET /api/v1/admin/categories - List all categories with statistics
router.get('/',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const {
      include_stats = 'true',
      group,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // Build filter
    const filter = { status: { $ne: 'archived' } };
    if (group) filter.group = group;

    // Build sort
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Execute query
    const categories = await Category.find(filter)
      .sort(sortObj)
      .lean();

    // Calculate summary stats
    let totalItems = 0;
    let completedItems = 0;
    let publishedItems = 0;

    const enhancedCategories = categories.map(category => {
      const stats = calculateCategoryStats(category);
      totalItems += stats.totalItems;
      completedItems += stats.completedItems;
      publishedItems += stats.publishedItems;

      return {
        _id: category._id,
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        group: category.group || 'educational',
        priority: category.priority || 50,
        color: category.color,
        completeness: category.completeness || 0,
        metadata: include_stats === 'true' ? {
          ...stats,
          lastUpdated: category.metadata?.lastUpdated || category.updatedAt,
          createdAt: category.metadata?.createdAt || category.createdAt
        } : undefined
      };
    });

    res.json({
      success: true,
      data: {
        categories: enhancedCategories,
        total: categories.length,
        summary: {
          totalCategories: categories.length,
          totalItems,
          completedItems,
          publishedItems
        }
      }
    });
  })
);

// GET /api/v1/admin/categories/:categoryId - Get single category
router.get('/:categoryId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { include_items = 'false', letter } = req.query;

    const category = await Category.findOne({ id: categoryId }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Prepare response
    const responseData = {
      _id: category._id,
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      group: category.group || 'educational',
      priority: category.priority || 50,
      color: category.color,
      completeness: category.completeness || 0
    };

    if (include_items === 'true') {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const items = {};

      if (letter && /^[A-Z]$/.test(letter.toUpperCase())) {
        // Include only specified letter
        items[letter.toUpperCase()] = (category.items[letter.toUpperCase()] || []).map(formatItem);
      } else {
        // Include all letters
        alphabet.split('').forEach(l => {
          items[l] = (category.items[l] || []).map(formatItem);
        });
      }

      responseData.items = items;
    }

    responseData.metadata = calculateCategoryStats(category);

    res.json({
      success: true,
      data: {
        category: responseData
      }
    });
  })
);

// POST /api/v1/admin/categories - Create new category
router.post('/',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  asyncHandler(async (req, res) => {
    const { name, description, icon, group, priority, color } = req.body;

    // Validate required fields
    if (!name || !description || !icon || !color) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, icon, color'
      });
    }

    // Generate category ID from name
    const id = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if category already exists
    const existing = await Category.findOne({ id });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Category with this ID already exists'
      });
    }

    // Create new category
    const category = new Category({
      id,
      name,
      description,
      icon,
      group: group || 'educational',
      priority: priority || 50,
      color,
      status: 'active',
      completeness: 0,
      items: {},
      metadata: {
        totalItems: 0,
        completedItems: 0,
        publishedItems: 0,
        pendingItems: 0,
        draftItems: 0,
        reviewItems: 0,
        createdAt: new Date()
      },
      createdBy: req.user?.email || 'system'
    });

    await category.save();

    // Log the creation
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'create',
      resourceType: 'category',
      resourceId: category.id,
      description: `Created category: ${category.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { after: category.toObject() }
    });

    res.status(201).json({
      success: true,
      data: {
        category: {
          _id: category._id,
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          group: category.group,
          priority: category.priority,
          color: category.color,
          completeness: category.completeness,
          items: {},
          metadata: category.metadata
        }
      },
      message: 'Category created successfully'
    });
  })
);

// PUT /api/v1/admin/categories/:categoryId - Update category
router.put('/:categoryId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { name, description, icon, priority, color, group } = req.body;

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const before = category.toObject();

    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (icon) category.icon = icon;
    if (priority !== undefined) category.priority = priority;
    if (color) category.color = color;
    if (group) category.group = group;

    category.lastModifiedBy = req.user?.email || 'system';
    category.metadata.lastUpdated = new Date();

    await category.save();

    // Log the update
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'update',
      resourceType: 'category',
      resourceId: category.id,
      description: `Updated category: ${category.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: {
        before,
        after: category.toObject()
      }
    });

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          group: category.group,
          priority: category.priority,
          color: category.color,
          metadata: {
            updatedAt: category.metadata.lastUpdated
          }
        }
      },
      message: 'Category updated successfully'
    });
  })
);

// DELETE /api/v1/admin/categories/:categoryId - Delete category
router.delete('/:categoryId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Add ?confirm=true to confirm deletion'
      });
    }

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Count items and images
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let deletedItems = 0;
    let deletedImages = 0;

    alphabet.split('').forEach(letter => {
      const items = category.items[letter] || [];
      deletedItems += items.length;
      items.forEach(item => {
        deletedImages += (item.images || []).length;
      });
    });

    const before = category.toObject();

    // Delete category
    await Category.deleteOne({ id: categoryId });

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'delete',
      resourceType: 'category',
      resourceId: categoryId,
      description: `Deleted category: ${category.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { before }
    });

    res.json({
      success: true,
      data: {
        deletedCategory: categoryId,
        deletedItems,
        deletedImages
      },
      message: 'Category and all associated data deleted successfully'
    });
  })
);

// GET /api/v1/admin/categories/:categoryId/stats - Get category statistics
router.get('/:categoryId/stats',
  authenticateAdmin,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const stats = calculateDetailedStats(category);

    res.json({
      success: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
        stats
      }
    });
  })
);

// Helper functions
function formatItem(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: item.tags || [],
    difficulty: item.difficulty || 1,
    collectionStatus: item.collectionStatus || 'pending',
    publishingStatus: item.publishingStatus || 'draft',
    imageCount: (item.images || []).length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function calculateCategoryStats(category) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let totalItems = 0;
  let completedItems = 0;
  let publishedItems = 0;
  let pendingItems = 0;
  let draftItems = 0;
  let reviewItems = 0;
  let totalImages = 0;

  alphabet.split('').forEach(letter => {
    const items = category.items[letter] || [];
    totalItems += items.length;

    items.forEach(item => {
      // Collection status
      if (item.collectionStatus === 'complete') completedItems++;
      else pendingItems++;

      // Publishing status
      if (item.publishingStatus === 'published') publishedItems++;
      else if (item.publishingStatus === 'review') reviewItems++;
      else draftItems++;

      // Image count
      totalImages += (item.images || []).length;
    });
  });

  const avgImagesPerItem = totalItems > 0 ? (totalImages / totalItems).toFixed(1) : 0;

  return {
    totalItems,
    completedItems,
    publishedItems,
    pendingItems,
    draftItems,
    reviewItems,
    avgImagesPerItem: parseFloat(avgImagesPerItem)
  };
}

function calculateDetailedStats(category) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const itemsByLetter = {};
  let totalItems = 0;
  let completedItems = 0;
  let publishedItems = 0;
  let reviewItems = 0;
  let draftItems = 0;
  let pendingItems = 0;
  let totalImages = 0;

  alphabet.split('').forEach(letter => {
    const items = category.items[letter] || [];
    const completed = items.filter(i => i.collectionStatus === 'complete').length;
    const published = items.filter(i => i.publishingStatus === 'published').length;

    itemsByLetter[letter] = {
      total: items.length,
      completed,
      published
    };

    totalItems += items.length;

    items.forEach(item => {
      if (item.collectionStatus === 'complete') completedItems++;
      else pendingItems++;

      if (item.publishingStatus === 'published') publishedItems++;
      else if (item.publishingStatus === 'review') reviewItems++;
      else draftItems++;

      totalImages += (item.images || []).length;
    });
  });

  const completeness = alphabet.split('').filter(l => (category.items[l] || []).length > 0).length;
  const completionRate = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(2) : 0;
  const publishRate = totalItems > 0 ? ((publishedItems / totalItems) * 100).toFixed(2) : 0;
  const avgImagesPerItem = totalItems > 0 ? (totalImages / totalItems).toFixed(1) : 0;

  return {
    totalItems,
    completedItems,
    pendingItems,
    publishedItems,
    reviewItems,
    draftItems,
    itemsByLetter,
    completeness,
    completionRate: parseFloat(completionRate),
    publishRate: parseFloat(publishRate),
    avgImagesPerItem: parseFloat(avgImagesPerItem)
  };
}

module.exports = router;
