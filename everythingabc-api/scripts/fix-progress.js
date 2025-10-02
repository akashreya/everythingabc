const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');

async function fixProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('Connected to database');

    const cat = await Category.findOne({ id: 'sports' });
    if (!cat) {
      console.log('Sports category not found');
      process.exit(1);
    }

    const items = cat.items?.A || [];
    const itemIndex = items.findIndex(i => i.name.toLowerCase().includes('american football'));

    if (itemIndex === -1) {
      console.log('American Football not found');
      process.exit(1);
    }

    const item = items[itemIndex];
    const approvedImages = item.images.filter(img => img.status === 'approved');

    console.log('Found', approvedImages.length, 'approved images out of', item.images.length, 'total');

    // Update progress
    item.collectionProgress = item.collectionProgress || {};
    item.collectionProgress.collectedCount = item.images.length;
    item.collectionProgress.approvedCount = approvedImages.length;
    item.collectionProgress.targetCount = item.collectionProgress.targetCount || 3;

    // Force status to completed
    item.collectionProgress.status = 'completed';

    item.collectionProgress.lastAttempt = new Date();

    cat.markModified('items');
    await cat.save();

    console.log('Updated progress:', JSON.stringify(item.collectionProgress, null, 2));
    console.log('Status updated successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProgress();
