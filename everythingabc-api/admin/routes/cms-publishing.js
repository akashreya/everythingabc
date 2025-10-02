const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const asyncHandler = require('express-async-handler');

// PATCH /api/v1/admin/items/:itemId/status - Update item publishing status
router.patch('/items/:itemId/status',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { publishingStatus } = req.body;

    // Validate publishing status
    if (!['draft', 'review', 'published'].includes(publishingStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid publishingStatus. Must be one of: draft, review, published'
      });
    }

    // Find category containing this item
    const { category, item, letter } = await findItemInCategories(itemId);

    if (!category || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Validation: Can only publish items with complete collection status
    if (publishingStatus === 'published' && item.collectionStatus === 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot publish item with pending collection status. Please add images first.'
        }
      });
    }

    const oldStatus = item.publishingStatus;

    // Update publishing status
    item.publishingStatus = publishingStatus;
    item.updatedAt = new Date();

    // Set published timestamp if publishing
    if (publishingStatus === 'published' && !item.publishedAt) {
      item.publishedAt = new Date();
      item.publishedBy = req.user?.email || 'system';
    }

    // Update category metadata counts
    updateCategoryPublishingCounts(category, oldStatus, publishingStatus);
    category.metadata.lastUpdated = new Date();

    await category.save();

    // Log the status change
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'update_status',
      resourceType: 'item',
      resourceId: itemId,
      description: `Changed publishing status from ${oldStatus} to ${publishingStatus}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes: {
        before: { publishingStatus: oldStatus },
        after: { publishingStatus }
      }
    });

    res.json({
      success: true,
      data: {
        item: {
          id: item.id,
          name: item.name,
          collectionStatus: item.collectionStatus,
          publishingStatus: item.publishingStatus,
          metadata: {
            publishedAt: item.publishedAt,
            publishedBy: item.publishedBy
          }
        }
      },
      message: `Item ${publishingStatus === 'published' ? 'published' : 'status updated'} successfully`
    });
  })
);

// POST /api/v1/admin/items/bulk-status - Bulk update publishing status
router.post('/items/bulk-status',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemIds, publishingStatus } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'itemIds array is required and must not be empty'
      });
    }

    if (!['draft', 'review', 'published'].includes(publishingStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid publishingStatus. Must be one of: draft, review, published'
      });
    }

    const results = [];
    let updated = 0;
    let failed = 0;

    for (const itemId of itemIds) {
      try {
        const { category, item, letter } = await findItemInCategories(itemId);

        if (!category || !item) {
          results.push({
            itemId,
            status: 'failed',
            error: 'Item not found'
          });
          failed++;
          continue;
        }

        // Validation for publishing
        if (publishingStatus === 'published' && item.collectionStatus === 'pending') {
          results.push({
            itemId,
            status: 'failed',
            error: 'Cannot publish item with pending collection status'
          });
          failed++;
          continue;
        }

        const oldStatus = item.publishingStatus;

        // Update status
        item.publishingStatus = publishingStatus;
        item.updatedAt = new Date();

        if (publishingStatus === 'published' && !item.publishedAt) {
          item.publishedAt = new Date();
          item.publishedBy = req.user?.email || 'system';
        }

        updateCategoryPublishingCounts(category, oldStatus, publishingStatus);
        category.metadata.lastUpdated = new Date();

        await category.save();

        results.push({
          itemId,
          status: 'success',
          newStatus: publishingStatus
        });
        updated++;

      } catch (error) {
        results.push({
          itemId,
          status: 'failed',
          error: error.message
        });
        failed++;
      }
    }

    // Log bulk operation
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'bulk_update_status',
      resourceType: 'item',
      resourceId: 'bulk',
      description: `Bulk updated ${updated} items to ${publishingStatus}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { itemIds, publishingStatus, updated, failed }
    });

    res.json({
      success: true,
      data: {
        updated,
        failed,
        results
      },
      message: `${updated} items updated${failed > 0 ? `, ${failed} failed` : ''}`
    });
  })
);

// GET /api/v1/admin/items/pending-review - Get items pending review
router.get('/items/pending-review',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId, limit = 50, offset = 0 } = req.query;

    const filter = { status: 'active' };
    if (categoryId) filter.id = categoryId;

    const categories = await Category.find(filter).lean();

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let allItems = [];

    categories.forEach(category => {
      alphabet.split('').forEach(letter => {
        const items = category.items[letter] || [];
        items.forEach(item => {
          if (item.publishingStatus === 'review') {
            allItems.push({
              id: item.id,
              categoryId: category.id,
              categoryName: category.name,
              letter,
              name: item.name,
              collectionStatus: item.collectionStatus,
              publishingStatus: item.publishingStatus,
              imageCount: (item.images || []).length,
              metadata: {
                updatedAt: item.updatedAt
              }
            });
          }
        });
      });
    });

    // Sort by most recently updated
    allItems.sort((a, b) => new Date(b.metadata.updatedAt) - new Date(a.metadata.updatedAt));

    const total = allItems.length;
    const paginatedItems = allItems.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        total,
        page: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  })
);

// POST /api/v1/admin/items/:itemId/publish - Publish item
router.post('/items/:itemId/publish',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    const { category, item, letter } = await findItemInCategories(itemId);

    if (!category || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Validation: Can only publish items with complete collection status
    if (item.collectionStatus === 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot publish item with pending collection status. Please add images first.'
        }
      });
    }

    const oldStatus = item.publishingStatus;

    // Update to published
    item.publishingStatus = 'published';
    item.publishedAt = new Date();
    item.publishedBy = req.user?.email || 'system';
    item.updatedAt = new Date();

    updateCategoryPublishingCounts(category, oldStatus, 'published');
    category.metadata.lastUpdated = new Date();

    await category.save();

    // Log the publication
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'publish',
      resourceType: 'item',
      resourceId: itemId,
      description: `Published item: ${item.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        item: {
          id: item.id,
          publishingStatus: 'published',
          metadata: {
            publishedAt: item.publishedAt,
            publishedBy: item.publishedBy
          }
        }
      },
      message: 'Item published successfully'
    });
  })
);

// POST /api/v1/admin/items/:itemId/unpublish - Unpublish item
router.post('/items/:itemId/unpublish',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    const { category, item, letter } = await findItemInCategories(itemId);

    if (!category || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const oldStatus = item.publishingStatus;

    // Update to draft
    item.publishingStatus = 'draft';
    item.updatedAt = new Date();

    updateCategoryPublishingCounts(category, oldStatus, 'draft');
    category.metadata.lastUpdated = new Date();

    await category.save();

    // Log the unpublication
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'unpublish',
      resourceType: 'item',
      resourceId: itemId,
      description: `Unpublished item: ${item.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        item: {
          id: item.id,
          publishingStatus: 'draft',
          metadata: {
            unpublishedAt: new Date(),
            unpublishedBy: req.user?.email || 'system'
          }
        }
      },
      message: 'Item unpublished successfully'
    });
  })
);

// POST /api/v1/admin/items/bulk-publish - Bulk publish items
router.post('/items/bulk-publish',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_UPDATE),
  asyncHandler(async (req, res) => {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'itemIds array is required and must not be empty'
      });
    }

    const results = [];
    let published = 0;
    let failed = 0;

    for (const itemId of itemIds) {
      try {
        const { category, item, letter } = await findItemInCategories(itemId);

        if (!category || !item) {
          results.push({
            itemId,
            status: 'failed',
            error: 'Item not found'
          });
          failed++;
          continue;
        }

        // Validation
        if (item.collectionStatus === 'pending') {
          results.push({
            itemId,
            status: 'failed',
            error: 'Cannot publish item with pending collection status'
          });
          failed++;
          continue;
        }

        const oldStatus = item.publishingStatus;

        item.publishingStatus = 'published';
        item.publishedAt = new Date();
        item.publishedBy = req.user?.email || 'system';
        item.updatedAt = new Date();

        updateCategoryPublishingCounts(category, oldStatus, 'published');
        category.metadata.lastUpdated = new Date();

        await category.save();

        results.push({
          itemId,
          status: 'success'
        });
        published++;

      } catch (error) {
        results.push({
          itemId,
          status: 'failed',
          error: error.message
        });
        failed++;
      }
    }

    // Log bulk publication
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'bulk_publish',
      resourceType: 'item',
      resourceId: 'bulk',
      description: `Bulk published ${published} items`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { itemIds, published, failed }
    });

    res.json({
      success: true,
      data: {
        published,
        failed,
        results
      },
      message: `${published} items published successfully${failed > 0 ? `, ${failed} failed` : ''}`
    });
  })
);

// Helper functions
async function findItemInCategories(itemId) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const category = await Category.findOne({
    $or: alphabet.split('').map(letter => ({ [`items.${letter}.id`]: itemId }))
  });

  if (!category) {
    return { category: null, item: null, letter: null };
  }

  for (const letter of alphabet) {
    const items = category.items[letter] || [];
    const item = items.find(i => i.id === itemId);
    if (item) {
      return { category, item, letter };
    }
  }

  return { category: null, item: null, letter: null };
}

function updateCategoryPublishingCounts(category, oldStatus, newStatus) {
  // Decrement old status count
  if (oldStatus === 'draft') {
    category.metadata.draftItems = Math.max((category.metadata.draftItems || 1) - 1, 0);
  } else if (oldStatus === 'review') {
    category.metadata.reviewItems = Math.max((category.metadata.reviewItems || 1) - 1, 0);
  } else if (oldStatus === 'published') {
    category.metadata.publishedItems = Math.max((category.metadata.publishedItems || 1) - 1, 0);
  }

  // Increment new status count
  if (newStatus === 'draft') {
    category.metadata.draftItems = (category.metadata.draftItems || 0) + 1;
  } else if (newStatus === 'review') {
    category.metadata.reviewItems = (category.metadata.reviewItems || 0) + 1;
  } else if (newStatus === 'published') {
    category.metadata.publishedItems = (category.metadata.publishedItems || 0) + 1;
  }
}

module.exports = router;
