const mongoose = require('mongoose');
require('dotenv').config();

// Connect to the main database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
const Item = require('../models/Item');

// Multi-category mappings - ONLY what the user specifically requested
const MULTI_CATEGORY_MAPPINGS = {
  // Turkey can be in both Animals and Birds (user specified)
  'turkey': ['animals', 'birds'],
};

// Category metadata for denormalization
const CATEGORY_METADATA = {
  'animals': { name: 'Animals', icon: '🐾', color: '#4F46E5' },
  'birds': { name: 'Birds', icon: '🦅', color: '#06B6D4' },
  'food': { name: 'Food', icon: '🍎', color: '#F59E0B' },
  'fruits': { name: 'Fruits', icon: '🍓', color: '#EF4444' },
  'vegetables': { name: 'Vegetables', icon: '🥕', color: '#10B981' },
  'plants': { name: 'Plants', icon: '🌱', color: '#22C55E' },
  'flowers': { name: 'Flowers', icon: '🌸', color: '#EC4899' },
  'transportation': { name: 'Transportation', icon: '🚗', color: '#8B5CF6' },
  'automotive-parts': { name: 'Automotive Parts', icon: '🔧', color: '#6B7280' },
  'clothing-accessories': { name: 'Clothing & Accessories', icon: '👕', color: '#F97316' },
  'construction-tools': { name: 'Construction Tools', icon: '🔨', color: '#92400E' },
  'cooking-equipment': { name: 'Cooking Equipment', icon: '🍳', color: '#DC2626' },
  'countries-flags': { name: 'Countries & Flags', icon: '🏁', color: '#1E40AF' },
  'household-items': { name: 'Household Items', icon: '🏠', color: '#7C2D12' },
  'kitchen-tools': { name: 'Kitchen Tools', icon: '🥄', color: '#BE185D' },
  'medical-equipment': { name: 'Medical Equipment', icon: '🩺', color: '#DC2626' },
  'music': { name: 'Music', icon: '🎵', color: '#7C3AED' },
  'office-equipment': { name: 'Office Equipment', icon: '💼', color: '#374151' },
  'sports': { name: 'Sports', icon: '⚽', color: '#059669' },
  'toys-board-games': { name: 'Toys & Board Games', icon: '🎲', color: '#DB2777' }
};

async function migrateToMultiCategory() {
  try {
    console.log('🔄 Starting migration to multi-category support...');

    // Wait for connection
    await new Promise((resolve, reject) => {
      mongoose.connection.on('connected', resolve);
      mongoose.connection.on('error', reject);
      if (mongoose.connection.readyState === 1) resolve();
    });

    console.log('📊 Connected to database:', mongoose.connection.db.databaseName);

    // Get all items
    const allItems = await Item.find({});
    console.log(`📦 Found ${allItems.length} total items to migrate`);

    let migratedCount = 0;
    let multiCategoryCount = 0;
    let errorCount = 0;

    console.log('\\n🔄 Processing items...');

    for (const item of allItems) {
      try {
        // Determine categories for this item
        let categoryIds = [];
        let primaryCategoryId = item.categoryId; // Default to current category

        // Check if this item should be in multiple categories
        const itemKey = item.id?.toLowerCase();
        if (itemKey && MULTI_CATEGORY_MAPPINGS[itemKey]) {
          categoryIds = [...MULTI_CATEGORY_MAPPINGS[itemKey]];
          // Primary category is the first one in the mapping
          primaryCategoryId = categoryIds[0];
          multiCategoryCount++;
        } else {
          // Single category item - use current category
          categoryIds = [item.categoryId];
        }

        // Build categories array with metadata
        const categories = categoryIds.map(catId => {
          const meta = CATEGORY_METADATA[catId] || {
            name: catId.charAt(0).toUpperCase() + catId.slice(1),
            icon: '📁',
            color: '#6B7280'
          };
          return {
            id: catId,
            name: meta.name,
            icon: meta.icon,
            color: meta.color
          };
        });

        // Update item with multi-category support
        await Item.findByIdAndUpdate(item._id, {
          categoryIds: categoryIds,
          primaryCategoryId: primaryCategoryId,
          categories: categories,
          // Keep legacy fields for backward compatibility
          // categoryId: item.categoryId (unchanged)
          // categoryName: item.categoryName (unchanged)
          updatedAt: new Date()
        });

        migratedCount++;

        // Show progress for first 20 multi-category items
        if (categoryIds.length > 1 && multiCategoryCount <= 20) {
          console.log(`  ✅ ${item.name} (${item.id}) -> [${categoryIds.join(', ')}] primary: ${primaryCategoryId}`);
        }

      } catch (error) {
        console.error(`  ❌ Error migrating ${item.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\\n📊 Migration Summary:');
    console.log(`  Total items processed: ${allItems.length}`);
    console.log(`  Items successfully migrated: ${migratedCount}`);
    console.log(`  Items now in multiple categories: ${multiCategoryCount}`);
    console.log(`  Errors encountered: ${errorCount}`);

    // Show some examples of migrated items
    console.log('\\n🔍 Sample multi-category items:');
    const sampleMultiCategory = await Item.find({
      $expr: { $gt: [{ $size: "$categoryIds" }, 1] }
    }).limit(5);

    sampleMultiCategory.forEach(item => {
      console.log(`  ${item.name} -> Categories: [${item.categoryIds.join(', ')}], Primary: ${item.primaryCategoryId}`);
    });

    console.log('\\n✅ Multi-category migration completed successfully!');
    console.log('\\n📝 Next steps:');
    console.log('  1. Update API endpoints to use categoryIds instead of categoryId');
    console.log('  2. Update frontend to handle multi-category items');
    console.log('  3. Test cross-category browsing (e.g., Turkey in both Animals and Birds)');
    console.log('  4. Verify image collection works with multi-category items');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration
migrateToMultiCategory();