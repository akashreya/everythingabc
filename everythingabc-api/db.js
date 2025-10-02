const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.mongooseConnection = null;
    this.mongoServer = null;
  }

  async connect() {
    try {
      let mongoUri = process.env.MONGODB_URI;

      // Use in-memory MongoDB for development if no local MongoDB
      if (process.env.USE_MEMORY_DB === 'true') {
        console.log('🔧 Starting in-memory MongoDB for development...');
        this.mongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'everythingabc'
          }
        });
        mongoUri = this.mongoServer.getUri();
        console.log(`📦 In-memory MongoDB started at: ${mongoUri}`);
      }

      // MongoDB native client for complex operations
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db('everythingabc');

      // Mongoose for schema validation and middleware
      this.mongooseConnection = await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ Connected to MongoDB');
      console.log(`📊 Database: ${this.db.databaseName}`);

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
}

module.exports = new Database();