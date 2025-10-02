const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('Connected to database');

    const Category = require('../models/Category');
    const category = await Category.findOne({ id: 'animals' });

    if (category && category.items.A) {
      console.log('\nFirst 3 items in A:');
      category.items.A.slice(0, 3).forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.name}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Collection Status: ${item.collectionStatus}`);
        console.log(`   Publishing Status: ${item.publishingStatus}`);
        console.log('');
      });
    } else {
      console.log('No items found');
    }

    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verify();
