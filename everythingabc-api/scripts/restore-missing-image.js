const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Category = require('../models/Category');

async function restoreMissingImage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('Connected to database');

    // Read the metadata file
    const metadataPath = path.join(
      __dirname,
      '..',
      '..',
      'image-collection-system',
      'images',
      'categories',
      'sports',
      'A',
      'american football',
      'american_football_unsplash_XXqNsborcjU_1759253717535_metadata.json'
    );

    console.log('Reading metadata from:', metadataPath);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // Get the sports category
    const cat = await Category.findOne({ id: 'sports' });
    if (!cat) {
      console.log('Sports category not found');
      process.exit(1);
    }

    // Find American Football item
    const items = cat.items?.A || [];
    const itemIndex = items.findIndex(i => i.name.toLowerCase().includes('american football'));

    if (itemIndex === -1) {
      console.log('American Football not found');
      process.exit(1);
    }

    const item = items[itemIndex];

    // Check if this image already exists
    const existingImage = item.images.find(img => img.sourceId === metadata.sourceId);
    if (existingImage) {
      console.log('Image already exists in database');
      process.exit(0);
    }

    // Find the medium size for primary path
    const mediumSize = metadata.sizes.find(s => s.name === 'medium');

    // Create image object matching the schema
    const imageObject = {
      sourceId: metadata.sourceId,
      sourceUrl: `https://unsplash.com/photos/${metadata.sourceId}`,
      sourceProvider: metadata.source,
      filePath: `/${mediumSize.relativePath}`,
      fileName: path.basename(mediumSize.path),
      license: {
        type: 'unsplash',
        attribution: '',
        commercial: true,
        url: ''
      },
      status: 'approved',
      createdAt: new Date(metadata.createdAt),
      metadata: {
        width: mediumSize.width,
        height: mediumSize.height,
        fileSize: mediumSize.fileSize,
        format: mediumSize.format
      },
      processedSizes: metadata.sizes.map(s => ({
        size: s.name,
        path: `/${s.relativePath}`,
        width: s.width,
        height: s.height,
        fileSize: s.fileSize
      })),
      qualityScore: {
        overall: 8.0,
        breakdown: {
          technical: 8.0,
          relevance: 8.0,
          aesthetic: 8.0,
          usability: 8.0
        }
      },
      isPrimary: false,
      usageCount: 0,
      updatedAt: new Date()
    };

    // Add to images array
    item.images.unshift(imageObject); // Add at beginning since it was first

    // Update collection progress
    item.collectionProgress.collectedCount = item.images.length;
    item.collectionProgress.approvedCount = item.images.filter(img => img.status === 'approved').length;

    // Update status
    if (item.collectionProgress.approvedCount >= item.collectionProgress.targetCount) {
      item.collectionProgress.status = 'completed';
    }

    cat.markModified('items');
    await cat.save();

    console.log('Successfully restored missing image!');
    console.log('Total images:', item.images.length);
    console.log('Approved images:', item.collectionProgress.approvedCount);
    console.log('Status:', item.collectionProgress.status);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreMissingImage();
