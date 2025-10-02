// Seed database from ICS JSON file (phase1-categories-complete.json)
// This script ensures all items from JSON are in the database
// Items without images are marked as "pending" for collection

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('../db');
const Category = require('../models/Category');

// Path to ICS JSON file
const JSON_FILE_PATH = path.join(__dirname, '../../image-collection-system/src/data/phase1-categories-complete.json');

function generateItemId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mapGroupToEnum(group) {
  // Map JSON group values to allowed enum values
  const groupMap = {
    'educational': 'educational',
    'health': 'nature',
    'nature': 'nature',
    'practical': 'everyday',
    'everyday': 'everyday',
    'professional': 'professional'
  };
  return groupMap[group] || 'educational';
}

async function seedFromJson(options = {}) {
  const { dryRun = false, categories = null } = options;

  try {
    console.log('=== SEEDING DATABASE FROM JSON ===\n');

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Read JSON file
    console.log(`📖 Reading JSON file: ${JSON_FILE_PATH}`);
    if (!fs.existsSync(JSON_FILE_PATH)) {
      throw new Error(`JSON file not found: ${JSON_FILE_PATH}`);
    }

    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
    console.log(`✅ Loaded ${Object.keys(jsonData.categories).length} categories from JSON\n`);

    // Connect to database
    await database.connect();
    console.log('✅ Connected to database\n');

    const stats = {
      categoriesProcessed: 0,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      itemsAdded: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      totalJsonItems: 0
    };

    // Process each category
    for (const [categoryKey, categoryData] of Object.entries(jsonData.categories)) {
      // Skip if specific categories requested and this isn't one
      if (categories && !categories.includes(categoryData.id)) {
        continue;
      }

      console.log(`\n📦 Processing category: ${categoryData.name} (${categoryData.id})`);
      stats.categoriesProcessed++;

      // Find existing category in database
      let dbCategory = await Category.findOne({ id: categoryData.id });

      if (!dbCategory) {
        console.log(`  📝 Category not found in DB, creating new...`);

        if (!dryRun) {
          dbCategory = new Category({
            id: categoryData.id,
            name: categoryData.name,
            icon: categoryData.icon || '📦',
            color: 'from-gray-400 to-gray-300',
            group: mapGroupToEnum(categoryData.group),
            difficulty: 'Medium',
            description: `${categoryData.name} collection`,
            status: 'active',
            tags: ['auto-created'],
            priority: categoryData.priority || 999,
            items: {}
          });
          await dbCategory.save();
        }

        stats.categoriesCreated++;
        console.log(`  ✅ Category created`);
      } else {
        stats.categoriesUpdated++;
        console.log(`  ✅ Category found in DB`);
      }

      // Process items for each letter
      let categoryItemsAdded = 0;
      let categoryItemsSkipped = 0;
      let categoryItemsUpdated = 0;

      for (const [letter, items] of Object.entries(categoryData.items || {})) {
        if (!Array.isArray(items)) continue;

        stats.totalJsonItems += items.length;

        for (const itemName of items) {
          const itemId = generateItemId(itemName);

          // Check if item exists in database
          const existingItem = dbCategory.items?.[letter]?.find(item =>
            item.id === itemId || item.name === itemName
          );

          if (existingItem) {
            // Item exists - check if it has images
            const hasImages = existingItem.images && existingItem.images.length > 0;

            if (hasImages) {
              // Keep existing item with images
              categoryItemsSkipped++;
              stats.itemsSkipped++;
            } else {
              // Update to ensure it's marked as pending
              if (!dryRun) {
                existingItem.collectionStatus = 'pending';
                existingItem.publishingStatus = 'draft';
                existingItem.description = existingItem.description || `Learn about ${itemName}`;
              }
              categoryItemsUpdated++;
              stats.itemsUpdated++;
            }
          } else {
            // Item doesn't exist - add as pending
            if (!dryRun) {
              if (!dbCategory.items[letter]) {
                dbCategory.items[letter] = [];
              }

              const newItem = {
                id: itemId,
                name: itemName,
                description: `Learn about ${itemName}`,
                tags: ['auto-created'],
                difficulty: 2,
                collectionStatus: 'pending',
                publishingStatus: 'draft',
                status: 'published',
                approvalStatus: 'approved',
                images: [],
                facts: [],
                createdAt: new Date(),
                updatedAt: new Date()
              };

              dbCategory.items[letter].push(newItem);
            }

            categoryItemsAdded++;
            stats.itemsAdded++;
          }
        }
      }

      // Save category with new items
      if (!dryRun && (categoryItemsAdded > 0 || categoryItemsUpdated > 0)) {
        dbCategory.markModified('items');
        await dbCategory.save();
      }

      console.log(`  📊 Items - Added: ${categoryItemsAdded}, Updated: ${categoryItemsUpdated}, Skipped: ${categoryItemsSkipped}`);
    }

    // Print summary
    console.log('\n=== SEEDING SUMMARY ===');
    console.log(`Categories processed: ${stats.categoriesProcessed}`);
    console.log(`Categories created: ${stats.categoriesCreated}`);
    console.log(`Categories updated: ${stats.categoriesUpdated}`);
    console.log(`\nItems in JSON: ${stats.totalJsonItems}`);
    console.log(`Items added (pending): ${stats.itemsAdded}`);
    console.log(`Items updated (pending): ${stats.itemsUpdated}`);
    console.log(`Items skipped (has images): ${stats.itemsSkipped}`);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database');
    } else {
      console.log('\n✅ Seeding completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
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
    dryRun: args.includes('--dry-run'),
    categories: null
  };

  // Parse category filter
  const categoryIndex = args.findIndex(arg => arg === '--category' || arg === '-c');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    options.categories = [args[categoryIndex + 1]];
  }

  console.log('Usage: node seed-from-json.js [--dry-run] [--category <id>]\n');

  seedFromJson(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedFromJson };
