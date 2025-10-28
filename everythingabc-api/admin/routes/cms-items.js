const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const Item = require('../../models/Item');
const CategoryImage = require('../../models/CategoryImage');
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

    // Verify category exists
    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Build query for Item collection
    const query = { categoryId };

    if (letter) {
      query.letter = letter.toUpperCase();
    }

    if (search) {
      const searchLower = search.toLowerCase();
      query.$or = [
        { name: { $regex: searchLower, $options: 'i' } },
        { description: { $regex: searchLower, $options: 'i' } }
      ];
    }

    // Map status fields (handle legacy field names)
    if (publishingStatus) {
      query.status = publishingStatus; // Map to Item.status
    }

    // Build sort
    let sortObj = {};
    if (sort === 'name') sortObj.name = 1;
    else if (sort === 'created_at') sortObj.createdAt = -1;
    else if (sort === 'updated_at') sortObj.updatedAt = -1;
    else if (sort === 'imageCount') sortObj['metadata.imageCount'] = -1;
    else sortObj.name = 1; // Default sort

    // Query Item collection with pagination
    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .sort(sortObj)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Format items for response
    const allItems = items.map(item => formatItemDetailed(item));

    res.json({
      success: true,
      data: {
        items: allItems,
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

    // Verify category exists
    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const upperLetter = letter.toUpperCase();

    // Query Item collection for items in this letter
    const items = await Item.find({
      categoryId,
      letter: upperLetter
    })
    .select('id name description status imageIds')
    .sort({ name: 1 })
    .lean();

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      collectionStatus: (item.imageIds || []).length > 0 ? 'complete' : 'pending',
      publishingStatus: item.status || 'draft',
      imageCount: (item.imageIds || []).length
    }));

    res.json({
      success: true,
      data: {
        categoryId: category.id,
        letter: upperLetter,
        items: formattedItems,
        total: formattedItems.length
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

    // Verify category exists
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Generate item ID
    const itemId = generateItemId(name);

    // Check if item already exists in Item collection
    const existingItem = await Item.findOne({
      id: itemId,
      categoryId,
      letter: upperLetter
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        error: 'Item with this ID already exists in this letter'
      });
    }

    // Create new item in Item collection
    const newItem = new Item({
      id: itemId,
      name: name.trim(),
      letter: upperLetter,
      categoryId,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      description: description || '',
      tags: tags || [],
      difficulty: difficulty || 1,
      facts: facts || [],
      status: 'draft',
      imageIds: [],
      createdBy: req.user?.email || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newItem.save();

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
          collectionStatus: 'pending',
          publishingStatus: newItem.status,
          imageCount: 0,
          metadata: {
            createdAt: newItem.createdAt,
            createdBy: newItem.createdBy
          }
        }
      },
      message: 'Item created successfully in Items collection with status=draft'
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

    // Find item in Item collection
    const item = await Item.findOne({ id: itemId });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const before = item.toObject();

    // Update fields
    if (name) item.name = name.trim();
    if (description !== undefined) item.description = description;
    if (tags) item.tags = tags;
    if (difficulty) item.difficulty = difficulty;
    if (facts) item.facts = facts;

    item.updatedAt = new Date();

    await item.save();

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

    // Find item in Item collection
    const item = await Item.findOne({ id: itemId });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const deletedItemData = item.toObject();
    const deletedImages = (item.imageIds || []).length;

    // Optionally delete associated images from CategoryImage collection
    if (deleteImages === 'true') {
      await CategoryImage.deleteMany({
        itemId: item.id,
        categoryId: item.categoryId
      });
    }

    // Delete the item
    await Item.deleteOne({ id: itemId });

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'delete',
      resourceType: 'item',
      resourceId: itemId,
      description: `Deleted item: ${deletedItemData.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: { before: deletedItemData }
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
    letter: item.letter,
    categoryId: item.categoryId,
    description: item.description,
    tags: item.tags || [],
    difficulty: item.difficulty || 1,
    collectionStatus: (item.imageIds || []).length > 0 ? 'complete' : 'pending',
    publishingStatus: item.status || 'draft',
    imageCount: (item.imageIds || []).length,
    images: (item.imageIds || []).map(imgId => ({
      imageId: imgId,
      url: item.image, // Legacy field
      isPrimary: false // Would need to populate from CategoryImage to get accurate value
    })),
    metadata: {
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      imageCount: item.metadata?.imageCount || 0
    }
  };
}

module.exports = router;
