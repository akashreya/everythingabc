/**
 * Migration Script: Extract Items to Separate Collection
 *
 * Purpose: Extract embedded items from Category documents to separate Item collection
 * Expected Result: Enable cross-category letter browsing with <200ms query performance
 * Core Feature: Enables the main letter browsing functionality
 *
 * Dependencies: Must run AFTER 01-migrate-images.js
 * Run: node scripts/migration/02-migrate-items.js
 */

const mongoose = require('mongoose');
const database = require('../../db');
const Category = require('../../models/Category');
const Item = require('../../models/Item');
const CategoryImage = require('../../models/CategoryImage');

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 100;

// Migration statistics
const stats = {
  categoriesProcessed: 0,
  itemsMigrated: 0,
  imageLinksCreated: 0,
  searchKeywordsGenerated: 0,
  errors: [],
  letterDistribution: {},
  startTime: null,
  endTime: null
};

/**
 * Main migration function
 */
async function migrateItems() {
  try {
    console.log('========================================');
    console.log('ITEMS MIGRATION - Phase 2');
    console.log('========================================');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
    console.log('');

    stats.startTime = Date.now();

    // Connect to database
    await database.connect();
    console.log('✅ Database connected');

    // Verify images collection exists
    const imagesCount = await CategoryImage.countDocuments({});
    console.log(`📊 Found ${imagesCount} images in separate collection`);

    if (imagesCount === 0) {
      console.error('❌ No images found! Run 01-migrate-images.js first');
      process.exit(1);
    }

    // Get all categories
    const categories = await Category.find({});
    console.log(`📊 Found ${categories.length} categories to process`);
    console.log('');

    // Initialize letter distribution
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    alphabet.split('').forEach(letter => {
      stats.letterDistribution[letter] = 0;
    });

    // Process each category
    for (const category of categories) {
      await processCategoryItems(category);
    }

    // Create indexes for optimal performance
    if (!DRY_RUN) {
      await createOptimalIndexes();
    }

    // Update category metadata
    if (!DRY_RUN) {
      await updateCategoryMetadata();
    }

    stats.endTime = Date.now();
    const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

    // Print summary
    printMigrationSummary(duration);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

/**
 * Process items for a single category
 */
async function processCategoryItems(category) {
  console.log(`Processing category: ${category.name} (${category.id})`);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let categoryItemCount = 0;

  for (const letter of alphabet) {
    const items = category.items[letter] || [];

    for (const item of items) {
      try {
        await migrateItem(item, category, letter);
        categoryItemCount++;
        stats.letterDistribution[letter]++;
      } catch (error) {
        const errorMsg = `Error migrating item ${item.id} in ${category.name}: ${error.message}`;
        console.error(`   ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  }

  stats.categoriesProcessed++;
  console.log(`   ✅ Migrated ${categoryItemCount} items from ${category.name}`);
}

/**
 * Migrate a single item to the items collection
 */
async function migrateItem(item, category, letter) {
  // Find primary image
  const primaryImage = await CategoryImage.findOne({
    itemId: item.id,
    isPrimary: true,
    status: 'approved'
  });

  // Find all images for this item
  const allImages = await CategoryImage.find({
    itemId: item.id,
    status: 'approved'
  });

  // Generate search keywords
  const searchKeywords = Item.generateSearchKeywords(item, category);
  stats.searchKeywordsGenerated += searchKeywords.length;

  // Determine learning level
  const learningLevel = determineLearningLevel(item.difficulty);

  // Create new item document
  const newItem = {
    // Basic identification
    id: item.id,
    name: item.name,

    // KEY FIELDS for letter browsing
    letter: letter.toUpperCase(),
    categoryId: category.id,

    // Denormalized category data
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,

    // Content fields
    description: item.description || '',
    pronunciation: item.pronunciation,
    facts: item.facts || [],
    tags: item.tags || [],

    // Learning attributes
    difficulty: item.difficulty || 1,
    ageRange: mapAgeRange(item.ageRange || category.ageRange),
    learningLevel: learningLevel,

    // Status
    status: item.status || 'published',

    // Image references
    primaryImageId: primaryImage ? primaryImage._id : null,
    imageIds: allImages.map(img => img._id),

    // Legacy image fields (backward compatibility)
    image: item.image,
    imageAlt: item.imageAlt || item.name,

    // Category-specific metadata
    nutritionFacts: item.nutritionFacts,
    technicalFacts: item.technicalFacts,
    colorInfo: item.colorInfo,
    roomLocation: item.roomLocation,
    uses: item.uses,

    // Search optimization
    searchKeywords: searchKeywords,

    // Analytics and metadata
    metadata: {
      viewCount: item.viewCount || 0,
      imageCount: allImages.length,
      lastViewed: item.lastViewed,
      popularityScore: calculatePopularityScore(item, allImages.length),
      lastUpdated: new Date()
    },

    // Content management
    createdBy: item.createdBy || 'migration',
    approvedBy: item.approvedBy || 'migration',
    createdAt: item.createdAt || category.createdAt || new Date(),
    updatedAt: new Date()
  };

  if (!DRY_RUN) {
    await Item.create(newItem);
  }

  stats.itemsMigrated++;
  stats.imageLinksCreated += allImages.length;
}

/**
 * Determine learning level based on difficulty
 */
function determineLearningLevel(difficulty) {
  if (!difficulty || difficulty <= 2) return 'beginner';
  if (difficulty <= 4) return 'intermediate';
  return 'advanced';
}

/**
 * Map existing age ranges to new enum values
 */
function mapAgeRange(existingAgeRange) {
  if (!existingAgeRange) return 'All Ages';

  // Handle existing formats
  const ageStr = existingAgeRange.toString().toLowerCase();

  // Map common age ranges
  if (ageStr.includes('2-6') || ageStr.includes('2-8') || ageStr.includes('3-6')) {
    return '3-6';
  }
  if (ageStr.includes('7-12') || ageStr.includes('6-12') || ageStr.includes('8-12')) {
    return '7-12';
  }
  if (ageStr.includes('13+') || ageStr.includes('13') || ageStr.includes('teen')) {
    return '13+';
  }
  if (ageStr.includes('3-12') || ageStr.includes('all') || ageStr.includes('any')) {
    return 'All Ages';
  }

  // Default mapping based on starting age
  if (ageStr.match(/^[0-6]/)) {
    return '3-6';
  }
  if (ageStr.match(/^[7-9]/) || ageStr.match(/^1[0-2]/)) {
    return '7-12';
  }
  if (ageStr.match(/^1[3-9]/)) {
    return '13+';
  }

  // Default fallback
  return 'All Ages';
}

/**
 * Calculate popularity score
 */
function calculatePopularityScore(item, imageCount) {
  const viewCount = item.viewCount || item.metadata?.viewCount || 0;
  const hasDescription = item.description ? 10 : 0;
  const hasFacts = (item.facts?.length || 0) * 5;
  const hasTags = (item.tags?.length || 0) * 2;
  const imageScore = imageCount * 2;

  return viewCount * 0.1 + imageScore + hasDescription + hasFacts + hasTags;
}

/**
 * Create optimal indexes for letter browsing
 */
async function createOptimalIndexes() {
  console.log('');
  console.log('Creating optimal indexes for letter browsing...');

  try {
    // Index 1: Letter browsing with category grouping
    await Item.collection.createIndex(
      { letter: 1, status: 1, categoryName: 1, name: 1 },
      { name: 'letter_browsing_sorted' }
    );
    console.log('   ✅ Created letter_browsing_sorted index');

    // Index 2: Letter browsing with category filtering
    await Item.collection.createIndex(
      { letter: 1, categoryId: 1, status: 1 },
      { name: 'letter_category_filter' }
    );
    console.log('   ✅ Created letter_category_filter index');

    // Index 3: Category browsing (maintain existing performance)
    await Item.collection.createIndex(
      { categoryId: 1, status: 1, letter: 1, name: 1 },
      { name: 'category_browsing_sorted' }
    );
    console.log('   ✅ Created category_browsing_sorted index');

    // Index 4: Full text search
    await Item.collection.createIndex(
      {
        name: 'text',
        description: 'text',
        tags: 'text',
        searchKeywords: 'text'
      },
      { name: 'full_text_search' }
    );
    console.log('   ✅ Created full_text_search index');

    // Index 5: Analytics indexes
    await Item.collection.createIndex({ status: 1, updatedAt: -1 });
    console.log('   ✅ Created status_updated index');

    await Item.collection.createIndex({ 'metadata.popularityScore': -1 });
    console.log('   ✅ Created popularity_score index');

    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    stats.errors.push(`Index creation error: ${error.message}`);
  }
}

/**
 * Update category metadata with item counts
 */
async function updateCategoryMetadata() {
  console.log('');
  console.log('Updating category metadata...');

  const categories = await Category.find({});
  let updatedCount = 0;

  for (const category of categories) {
    try {
      const totalItems = await Item.countDocuments({
        categoryId: category.id,
        status: 'published'
      });

      const itemsByLetter = {};
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (const letter of alphabet) {
        itemsByLetter[letter] = await Item.countDocuments({
          categoryId: category.id,
          letter: letter,
          status: 'published'
        });
      }

      // Update category metadata
      category.metadata.totalItems = totalItems;
      if (!category.metadata.itemsByLetter) {
        category.metadata.itemsByLetter = {};
      }
      Object.assign(category.metadata.itemsByLetter, itemsByLetter);
      category.metadata.lastUpdated = new Date();

      await category.save();
      updatedCount++;
    } catch (error) {
      console.error(`   ❌ Error updating ${category.name}:`, error.message);
    }
  }

  console.log(`✅ Updated metadata for ${updatedCount} categories`);
}

/**
 * Print migration summary
 */
function printMigrationSummary(duration) {
  console.log('');
  console.log('========================================');
  console.log('MIGRATION SUMMARY');
  console.log('========================================');
  console.log(`✅ Categories processed: ${stats.categoriesProcessed}`);
  console.log(`✅ Items migrated: ${stats.itemsMigrated}`);
  console.log(`✅ Image links created: ${stats.imageLinksCreated}`);
  console.log(`✅ Search keywords generated: ${stats.searchKeywordsGenerated}`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  console.log('');

  // Print letter distribution
  console.log('Letter Distribution:');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let row1 = '', row2 = '', row3 = '';

  alphabet.split('').forEach((letter, index) => {
    const count = stats.letterDistribution[letter] || 0;
    row1 += `${letter.padEnd(4)}`;
    row2 += `${count.toString().padEnd(4)}`;

    if ((index + 1) % 13 === 0) {
      console.log(`   ${row1}`);
      console.log(`   ${row2}`);
      console.log('');
      row1 = '';
      row2 = '';
    }
  });

  // Print top letters
  const sortedLetters = Object.entries(stats.letterDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  console.log('Top 5 Letters:');
  sortedLetters.forEach(([letter, count], index) => {
    console.log(`   ${index + 1}. ${letter}: ${count} items`);
  });

  if (stats.errors.length > 0) {
    console.log('');
    console.log(`⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  if (DRY_RUN) {
    console.log('');
    console.log('⚠️  DRY RUN MODE - No changes were made');
    console.log('    Run with DRY_RUN=false to apply migration');
  } else {
    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Test letter browsing: GET /api/v1/letters/A/items/');
    console.log('   2. Verify category compatibility: GET /api/v1/categories/:id');
    console.log('   3. Test search functionality: GET /api/v1/search/?q=test');
  }

  console.log('========================================');
}

/**
 * Rollback function to undo migration
 */
async function rollbackMigration() {
  console.log('========================================');
  console.log('ROLLING BACK ITEMS MIGRATION');
  console.log('========================================');

  await database.connect();

  const deleteResult = await Item.deleteMany({
    createdBy: 'migration'
  });

  console.log(`✅ Deleted ${deleteResult.deletedCount} migrated items`);

  // Drop indexes
  try {
    await Item.collection.dropIndex('letter_browsing_sorted');
    await Item.collection.dropIndex('letter_category_filter');
    await Item.collection.dropIndex('category_browsing_sorted');
    await Item.collection.dropIndex('full_text_search');
    console.log('✅ Dropped migration indexes');
  } catch (error) {
    console.log('⚠️  Some indexes may not exist or were already dropped');
  }

  await database.disconnect();
  console.log('✅ Rollback complete');
}

// Run migration if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--rollback')) {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Rollback failed:', err);
        process.exit(1);
      });
  } else {
    migrateItems()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
      });
  }
}

module.exports = { migrateItems, rollbackMigration };
