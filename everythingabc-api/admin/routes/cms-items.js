const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const asyncHandler = require('express-async-handler');

// GET /api/v1/admin/categories/:categoryId/items - List items for category
router.get('/:categoryId/items',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const {
      letter,
      collectionStatus,
      publishingStatus,
      search,
      sort = 'name',
      limit = 100,
      offset = 0
    } = req.query;

    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Collect all items
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let allItems = [];

    alphabet.split('').forEach(l => {
      if (!letter || l === letter.toUpperCase()) {
        const items = category.items[l] || [];
        items.forEach(item => {
          allItems.push({
            ...formatItemDetailed(item),
            categoryId: category.id,
            letter: l
          });
        });
      }
    });

    // Apply filters
    if (collectionStatus) {
      allItems = allItems.filter(item => item.collectionStatus === collectionStatus);
    }
    if (publishingStatus) {
      allItems = allItems.filter(item => item.publishingStatus === publishingStatus);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      allItems = allItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort items
    allItems.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created_at') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'updated_at') return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sort === 'imageCount') return b.imageCount - a.imageCount;
      return 0;
    });

    // Apply pagination
    const total = allItems.length;
    const paginatedItems = allItems.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        total,
        page: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });
  })
);

// GET /api/v1/admin/categories/:categoryId/items/:letter - Get items by letter
router.get('/:categoryId/items/:letter',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId, letter } = req.params;

    if (!/^[A-Z]$/i.test(letter)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid letter. Must be A-Z'
      });
    }

    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const upperLetter = letter.toUpperCase();
    const items = (category.items[upperLetter] || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      collectionStatus: item.collectionStatus || 'pending',
      publishingStatus: item.publishingStatus || 'draft',
      imageCount: (item.images || []).length
    }));

    res.json({
      success: true,
      data: {
        categoryId: category.id,
        letter: upperLetter,
        items,
        total: items.length
      }
    });
  })
);

// POST /api/v1/admin/categories/:categoryId/items - Create new item
router.post('/:categoryId/items',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { letter, name, description, tags, difficulty, facts } = req.body;

    // Validate required fields
    if (!letter || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: letter, name'
      });
    }

    const upperLetter = letter.toUpperCase();
    if (!/^[A-Z]$/.test(upperLetter)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid letter. Must be A-Z'
      });
    }

    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Generate item ID
    const itemId = generateItemId(name);

    // Check if item already exists
    const existingItems = category.items[upperLetter] || [];
    if (existingItems.some(i => i.id === itemId)) {
      return res.status(409).json({
        success: false,
        error: 'Item with this ID already exists in this letter'
      });
    }

    // Create new item
    const newItem = {
      id: itemId,
      name: name.trim(),
      description: description || '',
      tags: tags || [],
      difficulty: difficulty || 1,
      facts: facts || [],
      collectionStatus: 'pending',
      publishingStatus: 'draft',
      images: [],
      createdBy: req.user?.email || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add item to category
    if (!category.items[upperLetter]) {
      category.items[upperLetter] = [];
    }
    category.items[upperLetter].push(newItem);

    // Update metadata
    category.metadata.totalItems = (category.metadata.totalItems || 0) + 1;
    category.metadata.pendingItems = (category.metadata.pendingItems || 0) + 1;
    category.metadata.draftItems = (category.metadata.draftItems || 0) + 1;
    category.metadata.lastUpdated = new Date();
    category.lastModifiedBy = req.user?.email || 'system';

    await category.save();

    // Log the creation
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'create',
      resourceType: 'item',
      resourceId: `${categoryId}/${itemId}`,
      description: `Created item: ${name} in category ${category.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { after: newItem }
    });

    res.status(201).json({
      success: true,
      data: {
        item: {
          id: newItem.id,
          categoryId: category.id,
          letter: upperLetter,
          name: newItem.name,
          description: newItem.description,
          tags: newItem.tags,
          difficulty: newItem.difficulty,
          facts: newItem.facts,
          collectionStatus: newItem.collectionStatus,
          publishingStatus: newItem.publishingStatus,
          imageCount: 0,
          metadata: {
            createdAt: newItem.createdAt,
            createdBy: newItem.createdBy
          }
        }
      },
      message: 'Item created successfully with status=pending, publishingStatus=draft'
    });
  })
);

// PUT /api/v1/admin/items/:itemId - Update item
router.put('/items/:itemId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { name, description, tags, difficulty, facts } = req.body;

    // Find category containing this item
    const category = await Category.findOne({
      $or: [
        { 'items.A.id': itemId }, { 'items.B.id': itemId }, { 'items.C.id': itemId },
        { 'items.D.id': itemId }, { 'items.E.id': itemId }, { 'items.F.id': itemId },
        { 'items.G.id': itemId }, { 'items.H.id': itemId }, { 'items.I.id': itemId },
        { 'items.J.id': itemId }, { 'items.K.id': itemId }, { 'items.L.id': itemId },
        { 'items.M.id': itemId }, { 'items.N.id': itemId }, { 'items.O.id': itemId },
        { 'items.P.id': itemId }, { 'items.Q.id': itemId }, { 'items.R.id': itemId },
        { 'items.S.id': itemId }, { 'items.T.id': itemId }, { 'items.U.id': itemId },
        { 'items.V.id': itemId }, { 'items.W.id': itemId }, { 'items.X.id': itemId },
        { 'items.Y.id': itemId }, { 'items.Z.id': itemId }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Find the item
    let itemLetter = null;
    let itemIndex = -1;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
        error: 'Item not found'
      });
    }

    const item = category.items[itemLetter][itemIndex];
    const before = { ...item };

    // Update fields
    if (name) item.name = name.trim();
    if (description !== undefined) item.description = description;
    if (tags) item.tags = tags;
    if (difficulty) item.difficulty = difficulty;
    if (facts) item.facts = facts;

    item.updatedAt = new Date();
    item.lastModifiedBy = req.user?.email || 'system';

    category.metadata.lastUpdated = new Date();
    category.lastModifiedBy = req.user?.email || 'system';

    await category.save();

    // Log the update
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'update',
      resourceType: 'item',
      resourceId: itemId,
      description: `Updated item: ${item.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { before, after: item }
    });

    res.json({
      success: true,
      data: {
        item: {
          id: item.id,
          name: item.name,
          description: item.description,
          tags: item.tags,
          difficulty: item.difficulty,
          facts: item.facts,
          metadata: {
            updatedAt: item.updatedAt
          }
        }
      },
      message: 'Item updated successfully'
    });
  })
);

// DELETE /api/v1/admin/items/:itemId - Delete item
router.delete('/items/:itemId',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_DELETE),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { deleteImages = 'false' } = req.query;

    // Find category containing this item
    const category = await Category.findOne({
      $or: [
        { 'items.A.id': itemId }, { 'items.B.id': itemId }, { 'items.C.id': itemId },
        { 'items.D.id': itemId }, { 'items.E.id': itemId }, { 'items.F.id': itemId },
        { 'items.G.id': itemId }, { 'items.H.id': itemId }, { 'items.I.id': itemId },
        { 'items.J.id': itemId }, { 'items.K.id': itemId }, { 'items.L.id': itemId },
        { 'items.M.id': itemId }, { 'items.N.id': itemId }, { 'items.O.id': itemId },
        { 'items.P.id': itemId }, { 'items.Q.id': itemId }, { 'items.R.id': itemId },
        { 'items.S.id': itemId }, { 'items.T.id': itemId }, { 'items.U.id': itemId },
        { 'items.V.id': itemId }, { 'items.W.id': itemId }, { 'items.X.id': itemId },
        { 'items.Y.id': itemId }, { 'items.Z.id': itemId }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Find and remove the item
    let itemLetter = null;
    let deletedItem = null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const letter of alphabet) {
      const items = category.items[letter] || [];
      const index = items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        itemLetter = letter;
        deletedItem = items[index];
        items.splice(index, 1);
        break;
      }
    }

    const deletedImages = (deletedItem?.images || []).length;

    // Update metadata
    category.metadata.totalItems = Math.max((category.metadata.totalItems || 1) - 1, 0);
    if (deletedItem?.collectionStatus === 'pending') {
      category.metadata.pendingItems = Math.max((category.metadata.pendingItems || 1) - 1, 0);
    } else {
      category.metadata.completedItems = Math.max((category.metadata.completedItems || 1) - 1, 0);
    }
    if (deletedItem?.publishingStatus === 'draft') {
      category.metadata.draftItems = Math.max((category.metadata.draftItems || 1) - 1, 0);
    } else if (deletedItem?.publishingStatus === 'review') {
      category.metadata.reviewItems = Math.max((category.metadata.reviewItems || 1) - 1, 0);
    } else if (deletedItem?.publishingStatus === 'published') {
      category.metadata.publishedItems = Math.max((category.metadata.publishedItems || 1) - 1, 0);
    }
    category.metadata.lastUpdated = new Date();

    await category.save();

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'delete',
      resourceType: 'item',
      resourceId: itemId,
      description: `Deleted item: ${deletedItem?.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { before: deletedItem }
    });

    res.json({
      success: true,
      data: {
        deletedItem: itemId,
        deletedImages
      },
      message: 'Item deleted successfully'
    });
  })
);

// Helper functions
function generateItemId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36).slice(-6);
}

function formatItemDetailed(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: item.tags || [],
    difficulty: item.difficulty || 1,
    collectionStatus: item.collectionStatus || 'pending',
    publishingStatus: item.publishingStatus || 'draft',
    imageCount: (item.images || []).length,
    images: (item.images || []).map(img => ({
      imageId: img._id || img.sourceId,
      url: img.filePath || img.sourceUrl,
      isPrimary: img.isPrimary || false
    })),
    metadata: {
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt || null
    }
  };
}

module.exports = router;
