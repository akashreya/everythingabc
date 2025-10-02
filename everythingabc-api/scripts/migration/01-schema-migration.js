#!/usr/bin/env node

/**
 * EverythingABC Migration Script - Phase 1: Schema Enhancement
 *
 * This script extends the existing Category model to support:
 * - Image collection automation
 * - Quality assessment integration
 * - Multi-size image storage
 * - Collection progress tracking
 *
 * IMPORTANT: Creates backup before any changes
 * ROLLBACK: Run with --rollback flag to revert changes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc';
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');

// Logging utility
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

// Database connection
let db;

async function connectDatabase() {
  try {
    log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    db = mongoose.connection.db;
    log('✅ Connected to MongoDB successfully');
  } catch (error) {
    log(`Failed to connect to MongoDB: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Backup functionality
async function createBackup() {
  try {
    log('Creating database backup...');

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-phase1-${timestamp}.json`);

    // Export collections
    const collections = ['categories', 'adminUsers', 'auditLogs'];
    const backup = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        backup[collectionName] = documents;
        log(`  Backed up ${documents.length} documents from ${collectionName}`);
      } catch (error) {
        log(`  Warning: Could not backup ${collectionName}: ${error.message}`, 'warning');
        backup[collectionName] = [];
      }
    }

    // Save backup
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    log(`✅ Backup created: ${backupFile}`);

    return backupFile;
  } catch (error) {
    log(`Failed to create backup: ${error.message}`, 'error');
    throw error;
  }
}

// Rollback functionality
async function performRollback() {
  try {
    log('🔄 Starting rollback process...');

    // Find latest backup
    const backupFiles = await fs.readdir(BACKUP_DIR);
    const phase1Backups = backupFiles
      .filter(f => f.startsWith('backup-phase1-'))
      .sort()
      .reverse();

    if (phase1Backups.length === 0) {
      log('No Phase 1 backup found!', 'error');
      return false;
    }

    const latestBackup = path.join(BACKUP_DIR, phase1Backups[0]);
    log(`Using backup: ${latestBackup}`);

    // Load backup
    const backupData = JSON.parse(await fs.readFile(latestBackup, 'utf8'));

    // Restore collections
    for (const [collectionName, documents] of Object.entries(backupData)) {
      const collection = db.collection(collectionName);

      // Drop collection and recreate
      try {
        await collection.drop();
      } catch (error) {
        // Collection might not exist
      }

      if (documents.length > 0) {
        await collection.insertMany(documents);
        log(`  Restored ${documents.length} documents to ${collectionName}`);
      }
    }

    log('✅ Rollback completed successfully');
    return true;
  } catch (error) {
    log(`Rollback failed: ${error.message}`, 'error');
    return false;
  }
}

// Schema migration
async function migrateSchema() {
  try {
    log('🔄 Starting schema migration...');

    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection.find({}).toArray();

    log(`Found ${categories.length} categories to migrate`);

    let migratedCount = 0;

    for (const category of categories) {
      try {
        const updates = {};
        let hasUpdates = false;

        // Add imageCollection field if missing
        if (!category.imageCollection) {
          updates['imageCollection'] = {
            enabled: true,
            strategy: {
              prioritySources: ['unsplash', 'pexels', 'pixabay'],
              useAiGeneration: true,
              minQualityThreshold: 7.0,
              targetImagesPerItem: 3
            },
            progress: {
              totalItems: 0,
              completedItems: 0,
              pendingItems: 0,
              avgQualityScore: 0
            },
            lastCollectionRun: null,
            nextScheduledRun: null
          };
          hasUpdates = true;
        }

        // Enhance items with image collection fields
        if (category.items) {
          const enhancedItems = {};

          for (const [letter, items] of Object.entries(category.items)) {
            enhancedItems[letter] = items.map(item => {
              const enhancedItem = { ...item };

              // Add images array if missing
              if (!enhancedItem.images) {
                enhancedItem.images = [];

                // Migrate existing single image to new format
                if (item.image) {
                  enhancedItem.images.push({
                    sourceUrl: item.image,
                    sourceProvider: 'unknown',
                    filePath: null,
                    metadata: {
                      width: null,
                      height: null,
                      fileSize: null,
                      format: null
                    },
                    qualityScore: {
                      overall: 7.0, // Default score for existing images
                      breakdown: {
                        technical: 7.0,
                        relevance: 7.0,
                        aesthetic: 7.0,
                        usability: 7.0
                      }
                    },
                    status: 'approved',
                    isPrimary: true,
                    createdAt: item.createdAt || new Date(),
                    approvedAt: item.approvedAt || item.createdAt || new Date()
                  });
                }
              }

              // Add collection progress if missing
              if (!enhancedItem.collectionProgress) {
                enhancedItem.collectionProgress = {
                  status: enhancedItem.images && enhancedItem.images.length > 0 ? 'completed' : 'pending',
                  targetCount: 3,
                  collectedCount: enhancedItem.images ? enhancedItem.images.length : 0,
                  approvedCount: enhancedItem.images ? enhancedItem.images.filter(img => img.status === 'approved').length : 0,
                  searchAttempts: 0,
                  difficulty: 'medium',
                  lastAttempt: null
                };
              }

              return enhancedItem;
            });
          }

          updates['items'] = enhancedItems;
          hasUpdates = true;
        }

        // Update category metadata
        if (category.metadata) {
          const totalItems = Object.values(category.items || {}).reduce((sum, items) => sum + items.length, 0);
          const itemsWithImages = Object.values(updates.items || category.items || {})
            .flat()
            .filter(item => item.images && item.images.length > 0).length;

          updates['metadata.itemsWithImages'] = itemsWithImages;
          updates['metadata.lastImageUpdate'] = new Date();
          hasUpdates = true;
        }

        // Apply updates
        if (hasUpdates && !DRY_RUN) {
          await categoriesCollection.updateOne(
            { _id: category._id },
            { $set: updates }
          );
        }

        migratedCount++;
        log(`  ✅ Migrated category: ${category.name} (${category.id})`);
      } catch (error) {
        log(`  ❌ Failed to migrate category ${category.id}: ${error.message}`, 'error');
      }
    }

    log(`✅ Schema migration completed: ${migratedCount}/${categories.length} categories migrated`);
    return true;
  } catch (error) {
    log(`Schema migration failed: ${error.message}`, 'error');
    return false;
  }
}

// Create new collections for unified system
async function createNewCollections() {
  try {
    log('🔄 Creating new collections...');

    // Create Images collection with indexes
    const imagesCollection = db.collection('images');
    await imagesCollection.createIndex({ category: 1, letter: 1, itemName: 1 });
    await imagesCollection.createIndex({ status: 1, createdAt: -1 });
    await imagesCollection.createIndex({ 'qualityScore.overall': -1 });
    await imagesCollection.createIndex({ sourceProvider: 1, sourceId: 1 }, { unique: true });
    log('  ✅ Created Images collection with indexes');

    // Create CollectionTasks collection with indexes
    const tasksCollection = db.collection('collectionTasks');
    await tasksCollection.createIndex({ category: 1, letter: 1, itemName: 1 }, { unique: true });
    await tasksCollection.createIndex({ status: 1, priority: -1, createdAt: 1 });
    await tasksCollection.createIndex({ nextRun: 1 });
    log('  ✅ Created CollectionTasks collection with indexes');

    return true;
  } catch (error) {
    log(`Failed to create new collections: ${error.message}`, 'error');
    return false;
  }
}

// Validation
async function validateMigration() {
  try {
    log('🔍 Validating migration...');

    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection.find({}).toArray();

    let validationErrors = 0;

    for (const category of categories) {
      // Check if imageCollection field exists
      if (!category.imageCollection) {
        log(`  ❌ Category ${category.id} missing imageCollection field`, 'error');
        validationErrors++;
        continue;
      }

      // Check items structure
      if (category.items) {
        for (const [letter, items] of Object.entries(category.items)) {
          for (const item of items) {
            if (!item.images || !Array.isArray(item.images)) {
              log(`  ❌ Item ${item.id} in ${category.id}/${letter} missing images array`, 'error');
              validationErrors++;
            }

            if (!item.collectionProgress) {
              log(`  ❌ Item ${item.id} in ${category.id}/${letter} missing collectionProgress`, 'error');
              validationErrors++;
            }
          }
        }
      }
    }

    if (validationErrors === 0) {
      log('✅ Migration validation passed');
      return true;
    } else {
      log(`❌ Migration validation failed with ${validationErrors} errors`, 'error');
      return false;
    }
  } catch (error) {
    log(`Validation failed: ${error.message}`, 'error');
    return false;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();

    if (ROLLBACK) {
      const success = await performRollback();
      process.exit(success ? 0 : 1);
    }

    if (DRY_RUN) {
      log('🔍 DRY RUN MODE - No changes will be made');
    }

    // Step 1: Create backup
    const backupFile = await createBackup();

    // Step 2: Create new collections
    await createNewCollections();

    // Step 3: Migrate schema
    const migrationSuccess = await migrateSchema();

    if (!migrationSuccess) {
      log('Migration failed! Consider running rollback.', 'error');
      process.exit(1);
    }

    // Step 4: Validate migration
    const validationSuccess = await validateMigration();

    if (!validationSuccess) {
      log('Validation failed! Consider running rollback.', 'error');
      process.exit(1);
    }

    if (DRY_RUN) {
      log('✅ DRY RUN completed successfully - ready for actual migration');
    } else {
      log('✅ Phase 1 migration completed successfully!');
      log(`📁 Backup saved: ${backupFile}`);
      log('🚀 Ready for Phase 2: Data Migration');
    }

  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Handle process interruption
process.on('SIGINT', async () => {
  log('Migration interrupted by user');
  await mongoose.disconnect();
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createBackup,
  performRollback,
  migrateSchema,
  validateMigration
};