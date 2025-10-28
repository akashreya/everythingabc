#!/usr/bin/env node

/**
 * Test Mongoose Models
 *
 * This script tests if Mongoose models can access the test data.
 */

require('dotenv').config();
const db = require('../db');
const Category = require('../models/Category');
const Item = require('../models/Item');

async function testMongoose() {
  try {
    console.log('🔍 Testing Mongoose model access...');

    await db.connect();

    console.log('\n📊 Database Connection Info:');
    console.log(`   Native DB: ${db.getDb().databaseName}`);
    console.log(`   Mongoose DB: ${db.mongooseConnection.connection.db.databaseName}`);

    // Test Category model
    console.log('\n🏷️  Testing Category Model:');
    const categoryCount = await Category.countDocuments();
    console.log(`   Category.countDocuments(): ${categoryCount}`);

    if (categoryCount > 0) {
      const categories = await Category.find({}).select('id name').limit(3);
      console.log(`   Found categories: ${categories.map(c => `${c.id} (${c.name})`).join(', ')}`);
    }

    // Test Item model
    console.log('\n📋 Testing Item Model:');
    const itemCount = await Item.countDocuments();
    console.log(`   Item.countDocuments(): ${itemCount}`);

    if (itemCount > 0) {
      const items = await Item.find({}).select('id name categoryId').limit(5);
      console.log(`   Found items: ${items.map(i => `${i.id} (${i.name} - ${i.categoryId})`).join(', ')}`);
    }

    // Direct collection check
    console.log('\n🔧 Direct Collection Check:');
    const directCategoryCount = await db.getDb().collection('categories').countDocuments();
    const directItemCount = await db.getDb().collection('items').countDocuments();
    console.log(`   Direct categories count: ${directCategoryCount}`);
    console.log(`   Direct items count: ${directItemCount}`);

    // Show collection names
    const collections = await db.getDb().listCollections().toArray();
    console.log(`\n📁 Available Collections: ${collections.map(c => c.name).join(', ')}`);

    console.log('\n✅ Mongoose test completed');

  } catch (error) {
    console.error('❌ Mongoose test failed:', error);
  } finally {
    await db.disconnect();
    process.exit(0);
  }
}

testMongoose();