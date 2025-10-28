#!/usr/bin/env node

/**
 * Debug Database Script
 *
 * This script connects to the database and shows what collections and data exist.
 */

require('dotenv').config();
const db = require('../db');

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database connection...');

    await db.connect();

    console.log('\n📊 Database Info:');
    console.log(`   Name: ${db.getDb().databaseName}`);

    // List all collections
    const collections = await db.getDb().listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);

    for (const collection of collections) {
      const count = await db.getDb().collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);

      if (count > 0 && count <= 5) {
        // Show sample documents for small collections
        const samples = await db.getDb().collection(collection.name).find({}).limit(2).toArray();
        samples.forEach((doc, index) => {
          console.log(`     Sample ${index + 1}: ${JSON.stringify(doc, null, 2).substring(0, 200)}...`);
        });
      }
    }

    // Check specific collections
    console.log('\n🔍 Specific Collection Checks:');

    const categories = await db.getDb().collection('categories').find({}).toArray();
    console.log(`   Categories: ${categories.length} found`);
    if (categories.length > 0) {
      console.log(`   First category: ${categories[0].id} - ${categories[0].name}`);
    }

    const items = await db.getDb().collection('items').find({}).toArray();
    console.log(`   Items: ${items.length} found`);
    if (items.length > 0) {
      console.log(`   First item: ${items[0].id} - ${items[0].name} (${items[0].categoryId})`);
    }

    const images = await db.getDb().collection('categoryImages').find({}).toArray();
    console.log(`   Images: ${images.length} found`);
    if (images.length > 0) {
      console.log(`   First image: ${images[0].itemId} - ${images[0].filename}`);
    }

    console.log('\n✅ Database debug completed');

  } catch (error) {
    console.error('❌ Database debug failed:', error);
  } finally {
    await db.disconnect();
    process.exit(0);
  }
}

debugDatabase();