// Import categories from exported JSON file
// This is used for production deployment to replicate local database

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('../db');
const Category = require('../models/Category');

async function importCategories(options = {}) {
  const {
    inputPath = null,
    dryRun = false,
    overwrite = false
  } = options;

  try {
    console.log('=== IMPORTING CATEGORIES TO DATABASE ===\n');

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Determine input path
    const finalInputPath = inputPath || path.join(__dirname, '../data/categories-export.json');

    // Read JSON file
    console.log(`📖 Reading import file: ${finalInputPath}`);
    if (!fs.existsSync(finalInputPath)) {
      throw new Error(`Import file not found: ${finalInputPath}`);
    }

    const importData = JSON.parse(fs.readFileSync(finalInputPath, 'utf8'));

    console.log(`✅ Loaded export from ${importData.exportedAt}`);
    console.log(`📊 Export contains ${importData.stats.totalCategories} categories with ${importData.stats.totalItems} items\n`);

    // Connect to database
    await database.connect();
    console.log('✅ Connected to database\n');

    const stats = {
      categoriesProcessed: 0,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      categoriesSkipped: 0,
      itemsImported: 0,
      itemsWithImages: 0
    };

    // Process each category
    for (const categoryData of importData.categories) {
      console.log(`\n📦 Processing category: ${categoryData.name} (${categoryData.id})`);
      stats.categoriesProcessed++;

      // Check if category exists
      const existingCategory = await Category.findOne({ id: categoryData.id });

      if (existingCategory && !overwrite) {
        console.log(`  ⏭️  Category already exists, skipping (use --overwrite to replace)`);
        stats.categoriesSkipped++;
        continue;
      }

      if (existingCategory && overwrite) {
        console.log(`  🔄 Category exists, will overwrite`);
        stats.categoriesUpdated++;
      } else {
        console.log(`  ✨ Creating new category`);
        stats.categoriesCreated++;
      }

      // Count items
      let categoryItems = 0;
      let categoryItemsWithImages = 0;

      if (categoryData.items) {
        Object.values(categoryData.items).forEach(letterItems => {
          if (Array.isArray(letterItems)) {
            letterItems.forEach(item => {
              categoryItems++;
              if (item.image || (item.images && item.images.length > 0)) {
                categoryItemsWithImages++;
              }
            });
          }
        });
      }

      stats.itemsImported += categoryItems;
      stats.itemsWithImages += categoryItemsWithImages;

      console.log(`  📊 Items: ${categoryItems} total, ${categoryItemsWithImages} with images`);

      if (!dryRun) {
        // Remove MongoDB-specific fields
        delete categoryData._id;
        delete categoryData.__v;
        delete categoryData.createdAt;
        delete categoryData.updatedAt;

        if (existingCategory && overwrite) {
          // Update existing
          await Category.findOneAndUpdate(
            { id: categoryData.id },
            categoryData,
            { new: true }
          );
        } else {
          // Create new
          const newCategory = new Category(categoryData);
          await newCategory.save();
        }
      }

      console.log(`  ✅ Category ${existingCategory && overwrite ? 'updated' : 'created'}`);
    }

    // Print summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Categories processed: ${stats.categoriesProcessed}`);
    console.log(`Categories created: ${stats.categoriesCreated}`);
    console.log(`Categories updated: ${stats.categoriesUpdated}`);
    console.log(`Categories skipped: ${stats.categoriesSkipped}`);
    console.log(`\nItems imported: ${stats.itemsImported}`);
    console.log(`Items with images: ${stats.itemsWithImages}`);
    console.log(`Items without images: ${stats.itemsImported - stats.itemsWithImages}`);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database');
    } else {
      console.log('\n✅ Import completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await database.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    inputPath: null,
    dryRun: args.includes('--dry-run'),
    overwrite: args.includes('--overwrite')
  };

  // Parse input path
  const inputIndex = args.findIndex(arg => arg === '--input' || arg === '-i');
  if (inputIndex !== -1 && args[inputIndex + 1]) {
    options.inputPath = args[inputIndex + 1];
  }

  console.log('Usage: node import-categories.js [--input <path>] [--dry-run] [--overwrite]\n');

  importCategories(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { importCategories };
