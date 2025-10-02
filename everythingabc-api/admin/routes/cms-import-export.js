const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const AuditLog = require('../../models/AuditLog');
const Category = require('../../models/Category');
const asyncHandler = require('express-async-handler');

// Configure multer for CSV uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/v1/admin/import/validate - Validate CSV file
router.post('/import/validate',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const { rows, errors, warnings } = await parseAndValidateCSV(csvContent);

    const valid = errors.length === 0;

    res.json({
      success: true,
      data: {
        valid,
        rowCount: rows.length,
        errors,
        warnings,
        preview: rows.slice(0, 5)
      }
    });
  })
);

// POST /api/v1/admin/import/csv - Import items from CSV
router.post('/import/csv',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_CREATE),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { createCategories = 'false', skipDuplicates = 'true', updateExisting = 'false' } = req.body;

    const csvContent = req.file.buffer.toString('utf-8');
    const { rows, errors, warnings } = await parseAndValidateCSV(csvContent);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV validation failed',
        data: {
          valid: false,
          errors,
          warnings
        }
      });
    }

    const results = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Account for header row

      try {
        // Find or create category
        let category = await Category.findOne({ id: row.category });

        if (!category && createCategories === 'true') {
          category = new Category({
            id: row.category,
            name: capitalize(row.category),
            description: `Category for ${row.category}`,
            icon: '📦',
            color: 'from-gray-400 to-gray-300',
            group: 'educational',
            status: 'active',
            items: {},
            metadata: {
              totalItems: 0,
              createdAt: new Date()
            }
          });
          await category.save();
        }

        if (!category) {
          results.push({
            row: rowNum,
            status: 'failed',
            reason: `Category '${row.category}' does not exist`,
            itemName: row.itemName
          });
          failed++;
          continue;
        }

        // Generate item ID
        const itemId = generateItemId(row.itemName);
        const upperLetter = row.letter.toUpperCase();

        // Check if item exists
        const existingItems = category.items[upperLetter] || [];
        const existingItem = existingItems.find(i => i.id === itemId || i.name.toLowerCase() === row.itemName.toLowerCase());

        if (existingItem) {
          if (skipDuplicates === 'true') {
            results.push({
              row: rowNum,
              status: 'skipped',
              reason: 'Item already exists',
              itemName: row.itemName
            });
            skipped++;
            continue;
          } else if (updateExisting === 'true') {
            // Update existing item
            existingItem.description = row.description || existingItem.description;
            existingItem.tags = row.tags || existingItem.tags;
            existingItem.difficulty = row.difficulty || existingItem.difficulty;
            existingItem.updatedAt = new Date();

            await category.save();

            results.push({
              row: rowNum,
              status: 'updated',
              itemId: existingItem.id,
              itemName: row.itemName
            });
            updated++;
            continue;
          }
        }

        // Create new item
        const newItem = {
          id: itemId,
          name: row.itemName.trim(),
          description: row.description || '',
          tags: row.tags || [],
          difficulty: row.difficulty || 1,
          collectionStatus: 'pending',
          publishingStatus: 'draft',
          images: [],
          createdBy: req.user?.email || 'csv-import',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (!category.items[upperLetter]) {
          category.items[upperLetter] = [];
        }
        category.items[upperLetter].push(newItem);

        // Update metadata
        category.metadata.totalItems = (category.metadata.totalItems || 0) + 1;
        category.metadata.pendingItems = (category.metadata.pendingItems || 0) + 1;
        category.metadata.draftItems = (category.metadata.draftItems || 0) + 1;
        category.metadata.lastUpdated = new Date();

        await category.save();

        results.push({
          row: rowNum,
          status: 'created',
          itemId: newItem.id,
          itemName: row.itemName
        });
        created++;

      } catch (error) {
        results.push({
          row: rowNum,
          status: 'failed',
          reason: error.message,
          itemName: row.itemName
        });
        failed++;
      }
    }

    // Log the import
    await AuditLog.logAction({
      userId: req.user?.id || 'system',
      userEmail: req.user?.email || 'system',
      action: 'csv_import',
      resourceType: 'item',
      resourceId: 'bulk',
      description: `Imported CSV: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { created, updated, skipped, failed, totalRows: rows.length }
    });

    res.json({
      success: true,
      data: {
        imported: created + updated,
        skipped,
        failed,
        summary: {
          totalRows: rows.length,
          created,
          updated,
          skipped,
          errors: failed
        },
        results
      },
      message: `Import completed: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`
    });
  })
);

// GET /api/v1/admin/import/template - Download CSV template
router.get('/import/template',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { format = 'basic' } = req.query;

    const headers = 'category,letter,itemName,description,tags,difficulty';
    const examples = [
      'animals,A,Ant,"Small insect that lives in colonies","insect,colony,worker",1',
      'animals,B,Bear,"Large mammal that hibernates","mammal,forest,hibernate",2',
      'fruits,A,Apple,"Sweet red fruit","fruit,sweet,healthy",1'
    ];

    const csvContent = [headers, ...examples].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=import-template.csv');
    res.send(csvContent);
  })
);

// GET /api/v1/admin/export/csv - Export data as CSV
router.get('/export/csv',
  authenticateAdmin,
  requirePermission(PERMISSIONS.ITEMS_READ),
  asyncHandler(async (req, res) => {
    const { categoryId, publishingStatus, collectionStatus, includeMetadata = 'false' } = req.query;

    // Build filter
    const filter = { status: { $ne: 'archived' } };
    if (categoryId) filter.id = categoryId;

    const categories = await Category.find(filter).lean();

    // Collect items
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rows = [];

    categories.forEach(category => {
      alphabet.split('').forEach(letter => {
        const items = category.items[letter] || [];
        items.forEach(item => {
          // Apply filters
          if (publishingStatus && item.publishingStatus !== publishingStatus) return;
          if (collectionStatus && item.collectionStatus !== collectionStatus) return;

          const tags = (item.tags || []).join(',');

          if (includeMetadata === 'true') {
            rows.push({
              category: category.id,
              letter,
              itemName: item.name,
              description: item.description || '',
              tags,
              difficulty: item.difficulty || 1,
              collectionStatus: item.collectionStatus || 'pending',
              publishingStatus: item.publishingStatus || 'draft',
              imageCount: (item.images || []).length,
              createdAt: item.createdAt || '',
              updatedAt: item.updatedAt || ''
            });
          } else {
            rows.push({
              category: category.id,
              letter,
              itemName: item.name,
              description: item.description || '',
              tags,
              difficulty: item.difficulty || 1
            });
          }
        });
      });
    });

    // Generate CSV
    const headers = includeMetadata === 'true'
      ? 'category,letter,itemName,description,tags,difficulty,collectionStatus,publishingStatus,imageCount,createdAt,updatedAt'
      : 'category,letter,itemName,description,tags,difficulty';

    const csvRows = rows.map(row => {
      return Object.values(row).map(value => {
        // Escape quotes and wrap in quotes if contains comma or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = categoryId
      ? `export-${categoryId}-${timestamp}.csv`
      : `export-all-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvContent);
  })
);

// Helper functions
async function parseAndValidateCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const errors = [];
  const warnings = [];
  const rows = [];

  if (lines.length < 2) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'CSV file is empty or has no data rows'
    });
    return { rows, errors, warnings };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const requiredHeaders = ['category', 'letter', 'itemName'];

  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      errors.push({
        row: 1,
        field: header,
        message: `Missing required header: ${header}`
      });
    }
  });

  if (errors.length > 0) {
    return { rows, errors, warnings };
  }

  // Get all category IDs for validation
  const categories = await Category.find({}, 'id').lean();
  const categoryIds = new Set(categories.map(c => c.id));

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const rowNum = i + 1;

    // Validate category
    if (!row.category) {
      errors.push({
        row: rowNum,
        field: 'category',
        message: 'Category is required'
      });
    } else if (!categoryIds.has(row.category)) {
      errors.push({
        row: rowNum,
        field: 'category',
        message: `Category '${row.category}' does not exist`
      });
    }

    // Validate letter
    if (!row.letter) {
      errors.push({
        row: rowNum,
        field: 'letter',
        message: 'Letter is required'
      });
    } else if (!/^[A-Z]$/i.test(row.letter)) {
      errors.push({
        row: rowNum,
        field: 'letter',
        message: 'Letter must be A-Z'
      });
    }

    // Validate itemName
    if (!row.itemName || !row.itemName.trim()) {
      errors.push({
        row: rowNum,
        field: 'itemName',
        message: 'Item name is required'
      });
    }

    // Validate difficulty (optional)
    if (row.difficulty && (isNaN(row.difficulty) || row.difficulty < 1 || row.difficulty > 5)) {
      warnings.push({
        row: rowNum,
        field: 'difficulty',
        message: 'Invalid difficulty (should be 1-5), will default to 1'
      });
      row.difficulty = 1;
    } else {
      row.difficulty = parseInt(row.difficulty) || 1;
    }

    // Parse tags
    if (row.tags) {
      row.tags = row.tags.split(',').map(t => t.trim()).filter(t => t);
    } else {
      row.tags = [];
    }

    rows.push(row);
  }

  return { rows, errors, warnings };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function generateItemId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36).slice(-6);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
