/**
 * Update Completion Status for All Items
 *
 * Updates items to be marked as "completed" if they have at least 1 approved image
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateCompletionStatus() {
  console.log('🔄 Updating completion status for all items...\n');

  let stats = {
    categoriesProcessed: 0,
    itemsUpdated: 0,
    itemsCompleted: 0
  };

  try {
    const categories = await Category.find({});

    for (const category of categories) {
      console.log(`📦 Processing ${category.name}...`);
      stats.categoriesProcessed++;

      let categoryUpdated = false;

      for (const letter in category.items) {
        const itemsInLetter = category.items[letter];
        if (!Array.isArray(itemsInLetter)) continue;

        for (const item of itemsInLetter) {
          const approvedImages = item.images.filter(img => img.status === 'approved');

          if (approvedImages.length >= 1) {
            const wasCompleted = item.collectionProgress?.status === 'completed';

            if (!item.collectionProgress) {
              item.collectionProgress = {
                status: 'pending',
                targetCount: 3,
                collectedCount: 0,
                approvedCount: 0
              };
            }

            item.collectionProgress.collectedCount = item.images.length;
            item.collectionProgress.approvedCount = approvedImages.length;
            item.collectionProgress.status = 'completed';
            item.collectionProgress.completedAt = new Date();

            if (!wasCompleted) {
              stats.itemsCompleted++;
              console.log(`  ✅ ${item.name} (${letter}): ${approvedImages.length} images -> completed`);
            }

            stats.itemsUpdated++;
            categoryUpdated = true;
          }
        }
      }

      if (categoryUpdated) {
        // Mark all nested paths as modified
        category.markModified('items');
        Object.keys(category.items).forEach(letter => {
          category.markModified(`items.${letter}`);
        });

        await category.save();
        console.log(`  💾 Saved ${category.name}\n`);
      }
    }

    console.log('='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Categories processed:  ${stats.categoriesProcessed}`);
    console.log(`Items updated:         ${stats.itemsUpdated}`);
    console.log(`Items marked complete: ${stats.itemsCompleted}`);
    console.log('\n✅ Update completed successfully!');

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

updateCompletionStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});