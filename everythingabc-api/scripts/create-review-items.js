const mongoose = require('mongoose');
require('dotenv').config();

async function createReviewItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('Connected to database');

    const Category = require('../models/Category');

    // Create items in review status for testing
    const testItems = [
      { letter: 'B', name: 'Bear', id: 'bear' },
      { letter: 'C', name: 'Cat', id: 'cat' },
      { letter: 'D', name: 'Dog', id: 'dog' },
      { letter: 'E', name: 'Elephant', id: 'elephant' },
      { letter: 'F', name: 'Fox', id: 'fox' }
    ];

    for (const item of testItems) {
      const updatePath = `items.${item.letter}`;

      // Check if item already exists
      const category = await Category.findOne({
        id: 'animals',
        [`${updatePath}.id`]: item.id
      });

      if (category) {
        console.log(`Item ${item.name} already exists, updating status...`);
        await Category.updateOne(
          {
            id: 'animals',
            [`${updatePath}.id`]: item.id
          },
          {
            $set: {
              [`${updatePath}.$.collectionStatus`]: 'complete',
              [`${updatePath}.$.publishingStatus`]: 'review',
              [`${updatePath}.$.updatedAt`]: new Date()
            }
          }
        );
      } else {
        console.log(`Creating new item ${item.name}...`);
        await Category.updateOne(
          { id: 'animals' },
          {
            $push: {
              [updatePath]: {
                id: item.id,
                name: item.name,
                letter: item.letter,
                collectionStatus: 'complete',
                publishingStatus: 'review',
                images: [],
                metadata: {
                  tags: ['animal', item.name.toLowerCase()],
                  difficulty: 1
                },
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          }
        );
      }
      console.log(`✓ ${item.name} - ready for review`);
    }

    await mongoose.disconnect();
    console.log('\nDone! Created/updated 5 items in review status.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createReviewItems();
