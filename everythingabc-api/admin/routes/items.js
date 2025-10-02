const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../middleware/permissions');
const { AuditLog } = require('../../models/AuditLog');
const { Category } = require('../../models/Category');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const logger = require('../../utils/logger');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /admin/categories/:categoryId/items - List items in category
router.get('/:categoryId/items',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const {
      letter,
      status,
      quality,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const category = await Category.findById(categoryId).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let items = [];
    const categoryItems = category.items || {};

    if (letter) {
      // Get items for specific letter
      items = categoryItems[letter.toUpperCase()] || [];
    } else {
      // Get all items
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      alphabet.forEach(l => {
        const letterItems = (categoryItems[l] || []).map(item => ({
          ...item,
          letter: l
        }));
        items = items.concat(letterItems);
      });
    }

    // Apply filters
    if (status) {
      items = items.filter(item => item.quality?.status === status);
    }
    if (quality) {
      const qualityThreshold = parseFloat(quality);
      items = items.filter(item => (item.quality?.score || 0) >= qualityThreshold);
    }

    // Sort items
    items.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'quality') {
        comparison = (a.quality?.score || 0) - (b.quality?.score || 0);
      } else if (sortBy === 'views') {
        comparison = (a.analytics?.viewCount || 0) - (b.analytics?.viewCount || 0);
      } else if (sortBy === 'created') {
        comparison = new Date(a.audit?.createdAt || a.createdAt) - new Date(b.audit?.createdAt || b.createdAt);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Pagination
    const total = items.length;
    const skip = (page - 1) * limit;
    const paginatedItems = items.slice(skip, skip + parseInt(limit));

    // Enhance items with additional data
    const enhancedItems = paginatedItems.map(item => ({
      ...item,
      categoryId,
      categoryName: category.name
    }));

    await AuditLog.logAction({
      userId: req.user.id,
      action: 'read',
      resourceType: 'item',
      resourceId: `${categoryId}/list`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { letter, status, quality, page, limit }
    });

    res.json({
      success: true,
      data: {
        items: enhancedItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: { letter, status, quality, sortBy, sortOrder }
      }
    });
  })
);

// GET /admin/categories/:categoryId/items/:itemId - Get specific item
router.get('/:categoryId/items/:itemId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId, itemId } = req.params;

    const category = await Category.findById(categoryId).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Find item across all letters
    let foundItem = null;
    let itemLetter = null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of alphabet) {
      const items = category.items[letter] || [];
      const item = items.find(i => i.id === itemId);
      if (item) {
        foundItem = item;
        itemLetter = letter;
        break;
      }
    }

    if (!foundItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    await AuditLog.logAction({
      userId: req.user.id,
      action: 'read',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        item: {
          ...foundItem,
          letter: itemLetter,
          categoryId,
          categoryName: category.name
        }
      }
    });
  })
);

// POST /admin/categories/:categoryId/items - Add new item to category
router.post('/:categoryId/items',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { letter, name, description, alternativeNames, difficulty, rarity, culturalContext, ageAppropriateness } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate letter
    const targetLetter = letter.toUpperCase();
    if (!/^[A-Z]$/.test(targetLetter)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid letter. Must be A-Z'
      });
    }

    // Process uploaded image
    let imageData = null;
    if (req.file) {
      imageData = {
        original: req.file.path,
        optimized: req.file.path, // TODO: Add image optimization
        thumbnail: req.file.path, // TODO: Generate thumbnail
        altText: `${name} image`,
        width: 800, // TODO: Get actual dimensions
        height: 600,
        sizeBytes: req.file.size
      };
    }

    // Create new item
    const newItem = {
      id: generateItemId(),
      name: name.trim(),
      alternativeNames: alternativeNames ? alternativeNames.split(',').map(n => n.trim()) : [],
      description: description || '',
      image: imageData,
      attributes: {
        difficulty: parseInt(difficulty) || 1,
        rarity: rarity || 'common',
        culturalContext: culturalContext || 'global',
        ageAppropriateness: parseInt(ageAppropriateness) || 1
      },
      quality: {
        status: 'pending',
        score: 0,
        flags: [],
        factChecked: false,
        expertReviewed: false
      },
      analytics: {
        viewCount: 0,
        likeCount: 0,
        reportCount: 0,
        lastViewed: null
      },
      audit: {
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Add item to category using atomic operation
    const updateResult = await Category.updateOne(
      { _id: categoryId },
      {
        $push: { [`items.${targetLetter}`]: newItem },
        $inc: { 'metadata.totalItems': 1 },
        $set: {
          'metadata.lastUpdated': new Date(),
          'audit.lastModifiedBy': req.user.id,
          'audit.updatedAt': new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to add item to category'
      });
    }

    // Update gaps analysis
    await updateGapsAnalysis(categoryId);

    // Log the creation
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'create',
      resourceType: 'item',
      resourceId: `${categoryId}/${newItem.id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: {
        after: newItem
      }
    });

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: {
        item: {
          ...newItem,
          letter: targetLetter,
          categoryId,
          categoryName: category.name
        }
      }
    });
  })
);

// PUT /admin/categories/:categoryId/items/:itemId - Update item
router.put('/:categoryId/items/:itemId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { categoryId, itemId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Find the item and its letter
    let itemLetter = null;
    let itemIndex = -1;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of alphabet) {
      const items = category.items[letter] || [];
      const index = items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        itemLetter = letter;
        itemIndex = index;
        break;
      }
    }

    if (!itemLetter) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const existingItem = category.items[itemLetter][itemIndex];

    // Process image update if provided
    let imageData = existingItem.image;
    if (req.file) {
      imageData = {
        original: req.file.path,
        optimized: req.file.path,
        thumbnail: req.file.path,
        altText: `${req.body.name || existingItem.name} image`,
        width: 800,
        height: 600,
        sizeBytes: req.file.size
      };
    }

    // Prepare update data
    const updateData = {};
    if (req.body.name) updateData[`items.${itemLetter}.${itemIndex}.name`] = req.body.name.trim();
    if (req.body.description !== undefined) updateData[`items.${itemLetter}.${itemIndex}.description`] = req.body.description;
    if (req.body.alternativeNames) {
      updateData[`items.${itemLetter}.${itemIndex}.alternativeNames`] =
        req.body.alternativeNames.split(',').map(n => n.trim());
    }
    if (req.body.difficulty) updateData[`items.${itemLetter}.${itemIndex}.attributes.difficulty`] = parseInt(req.body.difficulty);
    if (req.body.rarity) updateData[`items.${itemLetter}.${itemIndex}.attributes.rarity`] = req.body.rarity;
    if (req.body.culturalContext) updateData[`items.${itemLetter}.${itemIndex}.attributes.culturalContext`] = req.body.culturalContext;
    if (req.body.ageAppropriateness) updateData[`items.${itemLetter}.${itemIndex}.attributes.ageAppropriateness`] = parseInt(req.body.ageAppropriateness);

    if (req.file) {
      updateData[`items.${itemLetter}.${itemIndex}.image`] = imageData;
    }

    updateData[`items.${itemLetter}.${itemIndex}.audit.updatedAt`] = new Date();
    updateData[`items.${itemLetter}.${itemIndex}.audit.lastModifiedBy`] = req.user.id;
    updateData['metadata.lastUpdated'] = new Date();
    updateData['audit.lastModifiedBy'] = req.user.id;
    updateData['audit.updatedAt'] = new Date();

    // Update the item
    const updateResult = await Category.updateOne(
      { _id: categoryId },
      { $set: updateData }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update item'
      });
    }

    // Get updated item
    const updatedCategory = await Category.findById(categoryId);
    const updatedItem = updatedCategory.items[itemLetter][itemIndex];

    // Log the update
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'update',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: {
        before: existingItem,
        after: updatedItem
      }
    });

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: {
        item: {
          ...updatedItem,
          letter: itemLetter,
          categoryId,
          categoryName: category.name
        }
      }
    });
  })
);

// DELETE /admin/categories/:categoryId/items/:itemId - Delete item
router.delete('/:categoryId/items/:itemId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_DELETE),
  asyncHandler(async (req, res) => {
    const { categoryId, itemId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Find the item and its letter
    let itemLetter = null;
    let existingItem = null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of alphabet) {
      const items = category.items[letter] || [];
      const item = items.find(i => i.id === itemId);
      if (item) {
        itemLetter = letter;
        existingItem = item;
        break;
      }
    }

    if (!itemLetter) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Remove item from category
    const updateResult = await Category.updateOne(
      { _id: categoryId },
      {
        $pull: { [`items.${itemLetter}`]: { id: itemId } },
        $inc: { 'metadata.totalItems': -1 },
        $set: {
          'metadata.lastUpdated': new Date(),
          'audit.lastModifiedBy': req.user.id,
          'audit.updatedAt': new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete item'
      });
    }

    // Update gaps analysis
    await updateGapsAnalysis(categoryId);

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'delete',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: {
        before: existingItem
      }
    });

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  })
);

// POST /admin/categories/:categoryId/items/:itemId/approve - Approve item
router.post('/:categoryId/items/:itemId/approve',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_APPROVE),
  asyncHandler(async (req, res) => {
    const { categoryId, itemId } = req.params;
    const { score, feedback } = req.body;

    const result = await updateItemStatus(categoryId, itemId, 'approved', {
      score: score || 5,
      feedback: feedback || '',
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    await AuditLog.logAction({
      userId: req.user.id,
      action: 'approve',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { score, feedback }
    });

    res.json({
      success: true,
      message: 'Item approved successfully'
    });
  })
);

// POST /admin/categories/:categoryId/items/:itemId/reject - Reject item
router.post('/:categoryId/items/:itemId/reject',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_APPROVE),
  asyncHandler(async (req, res) => {
    const { categoryId, itemId } = req.params;
    const { reason, feedback } = req.body;

    const result = await updateItemStatus(categoryId, itemId, 'rejected', {
      reason: reason || 'Quality issues',
      feedback: feedback || '',
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    await AuditLog.logAction({
      userId: req.user.id,
      action: 'reject',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { reason, feedback }
    });

    res.json({
      success: true,
      message: 'Item rejected successfully'
    });
  })
);

// POST /admin/categories/:categoryId/items/bulk - Bulk operations
router.post('/:categoryId/items/bulk',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { operation, items, data } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let results = [];

    switch (operation) {
      case 'approve':
        results = await bulkApproveItems(categoryId, items, req.user.id);
        break;
      case 'reject':
        results = await bulkRejectItems(categoryId, items, data.reason, req.user.id);
        break;
      case 'delete':
        results = await bulkDeleteItems(categoryId, items, req.user.id);
        break;
      case 'update_status':
        results = await bulkUpdateStatus(categoryId, items, data.status, req.user.id);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid bulk operation'
        });
    }

    await AuditLog.logAction({
      userId: req.user.id,
      action: 'bulk_update',
      resourceType: 'item',
      resourceId: `${categoryId}/bulk`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { operation, itemCount: items.length, results }
    });

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      data: { results }
    });
  })
);

// Helper functions
function generateItemId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function updateGapsAnalysis(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) return;

  const items = category.items || {};
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const missingLetters = [];
  const sparseLetters = [];

  alphabet.forEach(letter => {
    const letterItems = items[letter] || [];
    const activeItems = letterItems.filter(item =>
      item.quality?.status === 'approved' || item.quality?.status === 'active'
    );

    if (activeItems.length === 0) {
      missingLetters.push(letter);
    } else if (activeItems.length === 1) {
      sparseLetters.push(letter);
    }
  });

  await Category.updateOne(
    { _id: categoryId },
    {
      $set: {
        'gaps.missingLetters': missingLetters,
        'gaps.sparseLetters': sparseLetters,
        'gaps.lastAnalyzed': new Date(),
        'metadata.completenessScore': 26 - missingLetters.length
      }
    }
  );
}

async function updateItemStatus(categoryId, itemId, status, metadata) {
  const category = await Category.findById(categoryId);
  if (!category) {
    return { success: false, statusCode: 404, message: 'Category not found' };
  }

  // Find the item
  let itemLetter = null;
  let itemIndex = -1;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (const letter of alphabet) {
    const items = category.items[letter] || [];
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      itemLetter = letter;
      itemIndex = index;
      break;
    }
  }

  if (!itemLetter) {
    return { success: false, statusCode: 404, message: 'Item not found' };
  }

  // Update item status
  const updateData = {
    [`items.${itemLetter}.${itemIndex}.quality.status`]: status,
    [`items.${itemLetter}.${itemIndex}.quality.expertReviewed`]: true,
    [`items.${itemLetter}.${itemIndex}.audit.updatedAt`]: new Date()
  };

  if (metadata.score) {
    updateData[`items.${itemLetter}.${itemIndex}.quality.score`] = metadata.score;
  }

  const updateResult = await Category.updateOne(
    { _id: categoryId },
    { $set: updateData }
  );

  return {
    success: updateResult.modifiedCount > 0,
    statusCode: updateResult.modifiedCount > 0 ? 200 : 500,
    message: updateResult.modifiedCount > 0 ? 'Status updated' : 'Failed to update status'
  };
}

async function bulkApproveItems(categoryId, itemIds, userId) {
  const results = [];
  for (const itemId of itemIds) {
    const result = await updateItemStatus(categoryId, itemId, 'approved', {
      score: 5,
      reviewedBy: userId,
      reviewedAt: new Date()
    });
    results.push({ itemId, success: result.success });
  }
  return results;
}

async function bulkRejectItems(categoryId, itemIds, reason, userId) {
  const results = [];
  for (const itemId of itemIds) {
    const result = await updateItemStatus(categoryId, itemId, 'rejected', {
      reason,
      reviewedBy: userId,
      reviewedAt: new Date()
    });
    results.push({ itemId, success: result.success });
  }
  return results;
}

async function bulkDeleteItems(categoryId, itemIds, userId) {
  const results = [];
  for (const itemId of itemIds) {
    try {
      const updateResult = await Category.updateOne(
        { _id: categoryId },
        {
          $pull: {
            'items.A': { id: itemId },
            'items.B': { id: itemId },
            'items.C': { id: itemId },
            'items.D': { id: itemId },
            'items.E': { id: itemId },
            'items.F': { id: itemId },
            'items.G': { id: itemId },
            'items.H': { id: itemId },
            'items.I': { id: itemId },
            'items.J': { id: itemId },
            'items.K': { id: itemId },
            'items.L': { id: itemId },
            'items.M': { id: itemId },
            'items.N': { id: itemId },
            'items.O': { id: itemId },
            'items.P': { id: itemId },
            'items.Q': { id: itemId },
            'items.R': { id: itemId },
            'items.S': { id: itemId },
            'items.T': { id: itemId },
            'items.U': { id: itemId },
            'items.V': { id: itemId },
            'items.W': { id: itemId },
            'items.X': { id: itemId },
            'items.Y': { id: itemId },
            'items.Z': { id: itemId }
          }
        }
      );
      results.push({ itemId, success: updateResult.modifiedCount > 0 });
    } catch (error) {
      results.push({ itemId, success: false, error: error.message });
    }
  }
  return results;
}

async function bulkUpdateStatus(categoryId, itemIds, status, userId) {
  const results = [];
  for (const itemId of itemIds) {
    const result = await updateItemStatus(categoryId, itemId, status, {
      reviewedBy: userId,
      reviewedAt: new Date()
    });
    results.push({ itemId, success: result.success });
  }
  return results;
}

// GET /admin/clients - Get API client statistics (for dashboard)
router.get('/clients',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  asyncHandler(async (req, res) => {
    // Import and initialize the API client manager
    const { ApiClientManager } = require('../../services/apiClients');
    const apiManager = new ApiClientManager();

    try {
      await apiManager.initialize();

      // Get real API client status
      const stats = {};
      const clientNames = ['unsplash', 'pixabay', 'pexels'];

      for (const clientName of clientNames) {
        const client = apiManager.getClient(clientName);
        let status = {
          available: false,
          error: null,
          remainingRequests: 0,
          lastChecked: new Date()
        };

        if (client) {
          try {
            // Check if client is properly configured (has API key)
            const config = apiManager.config.apis[clientName];
            const hasApiKey = config && (config.accessKey || config.apiKey);

            if (hasApiKey) {
              // Try to get client status
              const clientStatus = await client.getStatus();
              status = {
                available: clientStatus.available || true,
                error: clientStatus.error || null,
                remainingRequests: clientStatus.remainingRequests || 'unlimited',
                lastChecked: new Date()
              };
            } else {
              status.error = 'API key not configured';
            }
          } catch (error) {
            status.error = error.message || 'Failed to check status';
          }
        } else {
          status.error = 'Client not initialized';
        }

        stats[clientName] = status;
      }

      // Add OpenAI status (if available)
      stats.openai = {
        available: !!process.env.OPENAI_API_KEY,
        error: process.env.OPENAI_API_KEY ? null : 'API key not configured',
        remainingRequests: process.env.OPENAI_API_KEY ? 'limited' : 0,
        lastChecked: new Date()
      };

      const clientStats = {
        stats,
        totalClients: 4, // Number of configured API clients
        activeClients: Object.values(stats).filter(s => s.available).length,
        newThisMonth: 0,
        topClients: [
          { id: 1, name: "Unsplash API", type: "api", requests: stats.unsplash.available ? 1000 : 0, lastActive: new Date() },
          { id: 2, name: "Pixabay API", type: "api", requests: stats.pixabay.available ? 500 : 0, lastActive: new Date() },
          { id: 3, name: "Pexels API", type: "api", requests: stats.pexels.available ? 200 : 0, lastActive: new Date() },
          { id: 4, name: "OpenAI API", type: "api", requests: stats.openai.available ? 50 : 0, lastActive: new Date() }
        ]
      };

      res.json({
        success: true,
        data: clientStats
      });

    } catch (error) {
      logger.error('Failed to get API client status:', error);

      // Fallback to basic status check
      const stats = {
        unsplash: {
          available: !!process.env.UNSPLASH_ACCESS_KEY,
          error: process.env.UNSPLASH_ACCESS_KEY ? null : 'API key not configured',
          remainingRequests: process.env.UNSPLASH_ACCESS_KEY ? 'unknown' : 0,
          lastChecked: new Date()
        },
        pixabay: {
          available: !!process.env.PIXABAY_API_KEY,
          error: process.env.PIXABAY_API_KEY ? null : 'API key not configured',
          remainingRequests: process.env.PIXABAY_API_KEY ? 'unknown' : 0,
          lastChecked: new Date()
        },
        pexels: {
          available: !!process.env.PEXELS_API_KEY,
          error: process.env.PEXELS_API_KEY ? null : 'API key not configured',
          remainingRequests: process.env.PEXELS_API_KEY ? 'unknown' : 0,
          lastChecked: new Date()
        },
        openai: {
          available: !!process.env.OPENAI_API_KEY,
          error: process.env.OPENAI_API_KEY ? null : 'API key not configured',
          remainingRequests: process.env.OPENAI_API_KEY ? 'unknown' : 0,
          lastChecked: new Date()
        }
      };

      const clientStats = {
        stats,
        totalClients: 4,
        activeClients: Object.values(stats).filter(s => s.available).length,
        newThisMonth: 0,
        topClients: []
      };

      res.json({
        success: true,
        data: clientStats
      });
    }
  })
);

module.exports = router;