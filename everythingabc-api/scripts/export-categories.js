// Export all categories with full data (including images) to JSON
// This creates a production-ready backup for deployment

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('../db');
const Category = require('../models/Category');

async function exportCategories(options = {}) {
  const { outputPath = null, categoryIds = null } = options;

  try {
    console.log('=== EXPORTING CATEGORIES FROM DATABASE ===\n');

    // Connect to database
    await database.connect();
    console.log('✅ Connected to database\n');

    // Build query
    const query = {};
    if (categoryIds && categoryIds.length > 0) {
      query.id = { $in: categoryIds };
      console.log(`📦 Filtering categories: ${categoryIds.join(', ')}\n`);
    }

    // Fetch all categories
    const categories = await Category.find(query).lean();
    console.log(`📊 Found ${categories.length} categories in database\n`);

    if (categories.length === 0) {
      console.log('⚠️  No categories found to export');
      return;
    }

    // Stats
    let totalItems = 0;
    let totalItemsWithImages = 0;

    categories.forEach(category => {
      if (category.items) {
        Object.values(category.items).forEach(letterItems => {
          if (Array.isArray(letterItems)) {
            letterItems.forEach(item => {
              totalItems++;
              if (item.image || (item.images && item.images.length > 0)) {
                totalItemsWithImages++;
              }
            });
          }
        });
      }
    });

    console.log(`📋 Export statistics:`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Total items: ${totalItems}`);
    console.log(`   Items with images: ${totalItemsWithImages}`);
    console.log(`   Items without images: ${totalItems - totalItemsWithImages}\n`);

    // Prepare export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      database: 'everythingabc',
      stats: {
        totalCategories: categories.length,
        totalItems: totalItems,
        itemsWithImages: totalItemsWithImages
      },
      categories: categories
    };

    // Determine output path
    const finalOutputPath = outputPath || path.join(__dirname, '../data/categories-export.json');

    // Ensure directory exists
    const dir = path.dirname(finalOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(finalOutputPath, JSON.stringify(exportData, null, 2), 'utf8');

    const fileSize = (fs.statSync(finalOutputPath).size / 1024).toFixed(2);
    console.log(`✅ Export completed successfully!`);
    console.log(`📁 File: ${finalOutputPath}`);
    console.log(`💾 Size: ${fileSize} KB\n`);

    // Category summary
    console.log('📦 Exported categories:');
    categories.forEach(cat => {
      const itemCount = cat.metadata?.totalItems || 0;
      const lettersWithItems = cat.lettersWithItems?.length || 0;
      console.log(`   - ${cat.name} (${cat.id}): ${itemCount} items across ${lettersWithItems} letters`);
    });

    return finalOutputPath;

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    throw error;
  } finally {
    await database.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    outputPath: null,
    categoryIds: null
  };

  // Parse output path
  const outputIndex = args.findIndex(arg => arg === '--output' || arg === '-o');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputPath = args[outputIndex + 1];
  }

  // Parse category filter
  const categoryIndex = args.findIndex(arg => arg === '--categories' || arg === '-c');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    options.categoryIds = args[categoryIndex + 1].split(',');
  }

  console.log('Usage: node export-categories.js [--output <path>] [--categories <id1,id2,...>]\n');

  exportCategories(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { exportCategories };
