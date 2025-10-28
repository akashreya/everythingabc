#!/usr/bin/env node

/**
 * Test Database Setup Script
 *
 * This script sets up a test database with sample data for development and testing.
 * It supports both in-memory MongoDB and external MongoDB instances.
 */

const path = require('path');
const fs = require('fs');

// Load appropriate environment configuration
function loadEnvConfig(envType = 'test') {
  const envFile = path.join(__dirname, '..', `.env.${envType}`);

  if (fs.existsSync(envFile)) {
    console.log(`🔧 Loading environment: .env.${envType}`);
    require('dotenv').config({ path: envFile });
  } else {
    console.log(`⚠️  Environment file .env.${envType} not found, using defaults`);
    require('dotenv').config();
  }
}

async function setupTestDatabase() {
  const envType = process.argv[2] || 'test';
  loadEnvConfig(envType);

  console.log('🚀 Setting up test database...'.bold);
  console.log(`📦 Environment: ${envType}`);
  console.log(`💾 Memory DB: ${process.env.USE_MEMORY_DB}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);

  try {
    // Import database connection
    const db = require('../db');
    await db.connect();

    // Import models
    require('../models/Category');
    require('../models/UnifiedCategory');
    require('../models/Item');
    require('../models/CategoryImage');
    require('../models/AdminUser');

    console.log('✅ Database connected successfully');

    // Check if data already exists
    const collections = await db.getDb().listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`📊 Found ${collections.length} existing collections:`, collectionNames);

    // Create test categories if none exist
    const categoriesCollection = db.getDb().collection('categories');
    const categoryCount = await categoriesCollection.countDocuments();

    if (categoryCount === 0) {
      console.log('📝 Creating comprehensive test data...');

      // Multiple test categories with rich data
      const testCategories = [
        {
          id: 'animals',
          name: 'Animals',
          description: 'Common animals from around the world',
          group: 'educational',
          icon: '🐾',
          color: '#4F46E5',
          status: 'published',
          items: {
            A: [
              { id: 'ant', name: 'Ant', description: 'Small industrious insect', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 },
              { id: 'alligator', name: 'Alligator', description: 'Large reptile found in swamps', status: 'published', difficulty: 2, hasImages: true, imageCount: 2 }
            ],
            B: [
              { id: 'bird', name: 'Bird', description: 'Flying animal with feathers', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
              { id: 'bear', name: 'Bear', description: 'Large mammal found in forests', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 },
              { id: 'butterfly', name: 'Butterfly', description: 'Colorful flying insect', status: 'published', difficulty: 1, hasImages: true, imageCount: 5 }
            ],
            C: [
              { id: 'cat', name: 'Cat', description: 'Domestic feline pet', status: 'published', difficulty: 1, hasImages: true, imageCount: 6 },
              { id: 'cow', name: 'Cow', description: 'Farm animal that produces milk', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
            ],
            D: [
              { id: 'dog', name: 'Dog', description: 'Loyal pet and companion', status: 'published', difficulty: 1, hasImages: true, imageCount: 8 },
              { id: 'duck', name: 'Duck', description: 'Water bird with webbed feet', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 }
            ]
          },
          stats: {
            totalItems: 9,
            totalLetters: 4,
            completeness: 15.4 // 4/26 * 100
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'fruits',
          name: 'Fruits',
          description: 'Fresh fruits and healthy snacks',
          group: 'educational',
          icon: '🍎',
          color: '#10B981',
          status: 'published',
          items: {
            A: [
              { id: 'apple', name: 'Apple', description: 'Crisp red or green fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
              { id: 'avocado', name: 'Avocado', description: 'Green creamy fruit rich in healthy fats', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 }
            ],
            B: [
              { id: 'banana', name: 'Banana', description: 'Yellow curved tropical fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 5 },
              { id: 'blueberry', name: 'Blueberry', description: 'Small blue antioxidant-rich berry', status: 'published', difficulty: 2, hasImages: true, imageCount: 3 }
            ],
            C: [
              { id: 'cherry', name: 'Cherry', description: 'Small red stone fruit', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 }
            ],
            O: [
              { id: 'orange', name: 'Orange', description: 'Citrus fruit high in vitamin C', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
            ]
          },
          stats: {
            totalItems: 6,
            totalLetters: 4,
            completeness: 15.4 // 4/26 * 100
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'transportation',
          name: 'Transportation',
          description: 'Vehicles and modes of transport',
          group: 'educational',
          icon: '🚗',
          color: '#F59E0B',
          status: 'published',
          items: {
            B: [
              { id: 'bicycle', name: 'Bicycle', description: 'Two-wheeled pedal-powered vehicle', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
              { id: 'bus', name: 'Bus', description: 'Large vehicle for public transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
            ],
            C: [
              { id: 'car', name: 'Car', description: 'Four-wheeled motor vehicle', status: 'published', difficulty: 1, hasImages: true, imageCount: 6 }
            ],
            T: [
              { id: 'train', name: 'Train', description: 'Railway vehicle for long-distance travel', status: 'published', difficulty: 1, hasImages: true, imageCount: 4 },
              { id: 'truck', name: 'Truck', description: 'Large vehicle for carrying cargo', status: 'published', difficulty: 1, hasImages: true, imageCount: 3 }
            ]
          },
          stats: {
            totalItems: 5,
            totalLetters: 3,
            completeness: 11.5 // 3/26 * 100
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await categoriesCollection.insertMany(testCategories);

      // Create corresponding Item documents for V2 API
      const itemsCollection = db.getDb().collection('items');
      const testItems = [
        // Animals
        { id: 'ant', name: 'Ant', description: 'Small industrious insect', letter: 'A', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'alligator', name: 'Alligator', description: 'Large reptile found in swamps', letter: 'A', categoryId: 'animals', status: 'published', difficulty: 2, hasImages: true, imageCount: 2, createdAt: new Date(), updatedAt: new Date() },
        { id: 'bird', name: 'Bird', description: 'Flying animal with feathers', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: 'bear', name: 'Bear', description: 'Large mammal found in forests', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'butterfly', name: 'Butterfly', description: 'Colorful flying insect', letter: 'B', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: 'cat', name: 'Cat', description: 'Domestic feline pet', letter: 'C', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 6, createdAt: new Date(), updatedAt: new Date() },
        { id: 'cow', name: 'Cow', description: 'Farm animal that produces milk', letter: 'C', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'dog', name: 'Dog', description: 'Loyal pet and companion', letter: 'D', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 8, createdAt: new Date(), updatedAt: new Date() },
        { id: 'duck', name: 'Duck', description: 'Water bird with webbed feet', letter: 'D', categoryId: 'animals', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },

        // Fruits
        { id: 'apple', name: 'Apple', description: 'Crisp red or green fruit', letter: 'A', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: 'avocado', name: 'Avocado', description: 'Green creamy fruit rich in healthy fats', letter: 'A', categoryId: 'fruits', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'banana', name: 'Banana', description: 'Yellow curved tropical fruit', letter: 'B', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: 'blueberry', name: 'Blueberry', description: 'Small blue antioxidant-rich berry', letter: 'B', categoryId: 'fruits', status: 'published', difficulty: 2, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'cherry', name: 'Cherry', description: 'Small red stone fruit', letter: 'C', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: 'orange', name: 'Orange', description: 'Citrus fruit high in vitamin C', letter: 'O', categoryId: 'fruits', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },

        // Transportation
        { id: 'bicycle', name: 'Bicycle', description: 'Two-wheeled pedal-powered vehicle', letter: 'B', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: 'bus', name: 'Bus', description: 'Large vehicle for public transportation', letter: 'B', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() },
        { id: 'car', name: 'Car', description: 'Four-wheeled motor vehicle', letter: 'C', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 6, createdAt: new Date(), updatedAt: new Date() },
        { id: 'train', name: 'Train', description: 'Railway vehicle for long-distance travel', letter: 'T', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 4, createdAt: new Date(), updatedAt: new Date() },
        { id: 'truck', name: 'Truck', description: 'Large vehicle for carrying cargo', letter: 'T', categoryId: 'transportation', status: 'published', difficulty: 1, hasImages: true, imageCount: 3, createdAt: new Date(), updatedAt: new Date() }
      ];

      await itemsCollection.insertMany(testItems);

      // Create sample CategoryImage documents
      const categoryImagesCollection = db.getDb().collection('categoryImages');
      const testImages = [
        // Animals - multiple images per item to simulate real data
        { itemId: 'ant', categoryId: 'animals', filename: 'ant_001.jpg', filePath: '/images/animals/ant_001.jpg', url: 'http://localhost:3003/images/animals/ant_001.jpg', size: 45678, width: 400, height: 300, format: 'jpeg', qualityScore: 8.5, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'ant', categoryId: 'animals', filename: 'ant_002.jpg', filePath: '/images/animals/ant_002.jpg', url: 'http://localhost:3003/images/animals/ant_002.jpg', size: 52341, width: 500, height: 400, format: 'jpeg', qualityScore: 7.8, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'ant', categoryId: 'animals', filename: 'ant_003.webp', filePath: '/images/animals/ant_003.webp', url: 'http://localhost:3003/images/animals/ant_003.webp', size: 38912, width: 600, height: 450, format: 'webp', qualityScore: 9.1, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'bird', categoryId: 'animals', filename: 'bird_001.jpg', filePath: '/images/animals/bird_001.jpg', url: 'http://localhost:3003/images/animals/bird_001.jpg', size: 67234, width: 800, height: 600, format: 'jpeg', qualityScore: 9.2, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'bird', categoryId: 'animals', filename: 'bird_002.png', filePath: '/images/animals/bird_002.png', url: 'http://localhost:3003/images/animals/bird_002.png', size: 123456, width: 1024, height: 768, format: 'png', qualityScore: 8.7, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'cat', categoryId: 'animals', filename: 'cat_001.jpg', filePath: '/images/animals/cat_001.jpg', url: 'http://localhost:3003/images/animals/cat_001.jpg', size: 78901, width: 640, height: 480, format: 'jpeg', qualityScore: 9.5, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'cat', categoryId: 'animals', filename: 'cat_002.webp', filePath: '/images/animals/cat_002.webp', url: 'http://localhost:3003/images/animals/cat_002.webp', size: 45123, width: 512, height: 384, format: 'webp', qualityScore: 8.9, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'dog', categoryId: 'animals', filename: 'dog_001.jpg', filePath: '/images/animals/dog_001.jpg', url: 'http://localhost:3003/images/animals/dog_001.jpg', size: 89012, width: 800, height: 600, format: 'jpeg', qualityScore: 9.8, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'dog', categoryId: 'animals', filename: 'dog_002.jpg', filePath: '/images/animals/dog_002.jpg', url: 'http://localhost:3003/images/animals/dog_002.jpg', size: 76543, width: 720, height: 540, format: 'jpeg', qualityScore: 8.3, aiGenerated: false, status: 'published', createdAt: new Date() },

        // Fruits
        { itemId: 'apple', categoryId: 'fruits', filename: 'apple_001.jpg', filePath: '/images/fruits/apple_001.jpg', url: 'http://localhost:3003/images/fruits/apple_001.jpg', size: 56789, width: 600, height: 450, format: 'jpeg', qualityScore: 8.7, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'apple', categoryId: 'fruits', filename: 'apple_002.webp', filePath: '/images/fruits/apple_002.webp', url: 'http://localhost:3003/images/fruits/apple_002.webp', size: 34567, width: 512, height: 384, format: 'webp', qualityScore: 9.1, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'banana', categoryId: 'fruits', filename: 'banana_001.jpg', filePath: '/images/fruits/banana_001.jpg', url: 'http://localhost:3003/images/fruits/banana_001.jpg', size: 43210, width: 480, height: 360, format: 'jpeg', qualityScore: 8.4, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'banana', categoryId: 'fruits', filename: 'banana_002.png', filePath: '/images/fruits/banana_002.png', url: 'http://localhost:3003/images/fruits/banana_002.png', size: 87654, width: 640, height: 480, format: 'png', qualityScore: 7.9, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'orange', categoryId: 'fruits', filename: 'orange_001.jpg', filePath: '/images/fruits/orange_001.jpg', url: 'http://localhost:3003/images/fruits/orange_001.jpg', size: 65432, width: 700, height: 525, format: 'jpeg', qualityScore: 8.8, aiGenerated: false, status: 'published', createdAt: new Date() },

        // Transportation
        { itemId: 'car', categoryId: 'transportation', filename: 'car_001.jpg', filePath: '/images/transportation/car_001.jpg', url: 'http://localhost:3003/images/transportation/car_001.jpg', size: 98765, width: 1024, height: 768, format: 'jpeg', qualityScore: 9.3, aiGenerated: false, status: 'published', createdAt: new Date() },
        { itemId: 'car', categoryId: 'transportation', filename: 'car_002.webp', filePath: '/images/transportation/car_002.webp', url: 'http://localhost:3003/images/transportation/car_002.webp', size: 54321, width: 800, height: 600, format: 'webp', qualityScore: 8.6, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'bicycle', categoryId: 'transportation', filename: 'bicycle_001.jpg', filePath: '/images/transportation/bicycle_001.jpg', url: 'http://localhost:3003/images/transportation/bicycle_001.jpg', size: 72109, width: 720, height: 540, format: 'jpeg', qualityScore: 8.2, aiGenerated: false, status: 'published', createdAt: new Date() },

        { itemId: 'train', categoryId: 'transportation', filename: 'train_001.jpg', filePath: '/images/transportation/train_001.jpg', url: 'http://localhost:3003/images/transportation/train_001.jpg', size: 134567, width: 1200, height: 900, format: 'jpeg', qualityScore: 9.6, aiGenerated: false, status: 'published', createdAt: new Date() }
      ];

      await categoryImagesCollection.insertMany(testImages);

      console.log('✅ Comprehensive test data created successfully');
      console.log(`📊 Created 3 categories with 20 items and ${testImages.length} images`);
    } else {
      console.log(`✅ Database already contains ${categoryCount} categories`);
    }

    // Display database stats
    const stats = await db.getStats();
    if (stats) {
      console.log('📈 Database Statistics:');
      console.log(`   Collections: ${stats.collections}`);
      console.log(`   Documents: ${stats.objects}`);
      console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(1)} KB`);
      console.log(`   Index Size: ${(stats.indexSize / 1024).toFixed(1)} KB`);
    }

    console.log('🎉 Test database setup completed successfully!');

  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupTestDatabase()
    .then(() => {
      console.log('✨ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupTestDatabase, loadEnvConfig };