const mongoose = require('mongoose');
require('dotenv').config();

// Connect to the main database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
const Item = require('../models/Item');

async function updateCollectionStatus() {
  try {
    console.log('🔄 Starting collection status update...');

    // Wait for connection
    await new Promise((resolve, reject) => {
      mongoose.connection.on('connected', resolve);
      mongoose.connection.on('error', reject);
      if (mongoose.connection.readyState === 1) resolve();
    });

    console.log('📊 Connected to database:', mongoose.connection.db.databaseName);

    // Get all items
    const allItems = await Item.find({});
    console.log(`📦 Found ${allItems.length} total items`);

    let completedCount = 0;
    let pendingCount = 0;
    let updatedCount = 0;

    console.log('\n🔄 Processing items...');

    for (const item of allItems) {
      // Check if item has images (based on the image field)
      const hasImages = item.image && item.image !== null && item.image !== '';

      // Determine collection status
      const newCollectionStatus = hasImages ? 'complete' : 'pending';

      // Count for reporting
      if (hasImages) {
        completedCount++;
      } else {
        pendingCount++;
      }

      // Update item if collection status is different or doesn't exist
      if (item.collectionStatus !== newCollectionStatus) {
        await Item.findByIdAndUpdate(item._id, {
          collectionStatus: newCollectionStatus,
          updatedAt: new Date()
        });
        updatedCount++;

        if (updatedCount <= 10) { // Show first 10 updates as examples
          console.log(`  ✅ Updated ${item.name} (${item.categoryId}) -> ${newCollectionStatus}`);
        }
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  Total items processed: ${allItems.length}`);
    console.log(`  Items with images (complete): ${completedCount}`);
    console.log(`  Items without images (pending): ${pendingCount}`);
    console.log(`  Items updated: ${updatedCount}`);

    // Show some examples
    console.log('\n🔍 Sample updated items:');
    const sampleComplete = await Item.findOne({ collectionStatus: 'complete' });
    const samplePending = await Item.findOne({ collectionStatus: 'pending' });

    if (sampleComplete) {
      console.log(`  Complete example: ${sampleComplete.name} (${sampleComplete.categoryId}) - has image: ${sampleComplete.image ? 'Yes' : 'No'}`);
    }
    if (samplePending) {
      console.log(`  Pending example: ${samplePending.name} (${samplePending.categoryId}) - has image: ${samplePending.image ? 'Yes' : 'No'}`);
    }

    // Check Turkey specifically
    const turkey = await Item.findOne({
      categoryId: 'animals',
      name: { $regex: /turkey/i }
    });

    if (turkey) {
      console.log(`\n🦃 Turkey status: ${turkey.name}`);
      console.log(`  Collection Status: ${turkey.collectionStatus}`);
      console.log(`  Has Image: ${turkey.image ? 'Yes' : 'No'}`);
      console.log(`  Image Path: ${turkey.image || 'None'}`);
    } else {
      console.log('\n🦃 Turkey not found in animals category');
    }

    console.log('\n✅ Collection status update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating collection status:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the update
updateCollectionStatus();