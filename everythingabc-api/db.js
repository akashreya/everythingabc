const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.mongooseConnection = null;
    this.mongoServer = null;
  }

  /**
   * Extract database name from MONGODB_URI or use fallback based on environment
   */
  getDbNameFromEnv() {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.includes('/')) {
      const dbName = mongoUri.split('/').pop().split('?')[0];
      if (dbName && dbName !== 'localhost:27017') {
        return dbName;
      }
    }

    // Fallback to environment-specific names
    const env = process.env.NODE_ENV || 'development';
    return `everythingabc_${env}`;
  }

  async connect() {
    try {
      let mongoUri = process.env.MONGODB_URI;

      // Use in-memory MongoDB for development/testing environments
      if (process.env.USE_MEMORY_DB === 'true') {
        const dbName = this.getDbNameFromEnv();
        console.log(`🔧 Starting in-memory MongoDB for ${process.env.NODE_ENV}...`);
        const { MongoMemoryServer } = require('mongodb-memory-server');

        this.mongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: dbName,
            port: process.env.NODE_ENV === 'test' ? undefined : 27018, // Use random port for test, specific for dev
          }
        });
        mongoUri = this.mongoServer.getUri();
        console.log(`📦 In-memory MongoDB started at: ${mongoUri}`);
        console.log(`🗄️  Database: ${dbName}`);
      }

      // MongoDB native client for complex operations
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();

      // Use the database name from the URI or the environment-specific name
      const dbName = process.env.USE_MEMORY_DB === 'true'
        ? this.getDbNameFromEnv()
        : 'everythingabc';
      this.db = this.client.db(dbName);

      // Mongoose for schema validation and middleware
      // Ensure Mongoose uses the same database as native client
      const mongooseUri = process.env.USE_MEMORY_DB === 'true'
        ? mongoUri.replace(/\/[^\/]*\?/, `/${dbName}?`).replace(/\/[^\/]*$/, `/${dbName}`)
        : mongoUri;

      this.mongooseConnection = await mongoose.connect(mongooseUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ Connected to MongoDB');
      console.log(`📊 Native Client Database: ${this.db.databaseName}`);
      console.log(`📊 Mongoose Database: ${this.mongooseConnection.connection.db.databaseName}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Using Memory DB: ${process.env.USE_MEMORY_DB === 'true' ? 'Yes' : 'No'}`);

      // Auto-populate test data for in-memory database
      if (process.env.USE_MEMORY_DB === 'true' && process.env.AUTO_POPULATE !== 'false') {
        await this.populateTestData();
      }

      return this.db;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.mongooseConnection) {
        await mongoose.disconnect();
      }
      if (this.mongoServer) {
        await this.mongoServer.stop();
        console.log('🛑 In-memory MongoDB stopped');
      }
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Database disconnection error:', error);
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getClient() {
    if (!this.client) {
      throw new Error('Database client not connected. Call connect() first.');
    }
    return this.client;
  }

  async ping() {
    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ Database ping failed:', error);
      return false;
    }
  }

  async getStats() {
    try {
      const stats = await this.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Auto-populate test data for in-memory database
   */
  async populateTestData() {
    try {
      console.log('🌱 Auto-populating test data...');

      // Check if data already exists
      const categoriesCollection = this.db.collection('categories');
      const categoryCount = await categoriesCollection.countDocuments();

      if (categoryCount > 0) {
        console.log(`✅ Database already contains ${categoryCount} categories, skipping auto-population`);
        return;
      }

      // Import test data from setup script
      const { createTestData } = require('./scripts/test-data');
      const testData = createTestData();

      // Insert categories
      await categoriesCollection.insertMany(testData.categories);

      // Insert items
      const itemsCollection = this.db.collection('items');
      await itemsCollection.insertMany(testData.items);

      // Insert images
      const categoryImagesCollection = this.db.collection('categoryImages');
      await categoryImagesCollection.insertMany(testData.images);

      console.log('✅ Test data populated successfully');
      console.log(`📊 Created ${testData.categories.length} categories, ${testData.items.length} items, ${testData.images.length} images`);

    } catch (error) {
      console.error('⚠️  Failed to auto-populate test data:', error.message);
      // Don't throw - allow database to continue without test data
    }
  }
}

module.exports = new Database();