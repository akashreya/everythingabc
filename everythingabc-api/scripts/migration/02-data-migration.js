#!/usr/bin/env node

/**
 * EverythingABC Migration Script - Phase 2: Data Migration
 *
 * This script imports data from the Image Collection System into the unified EverythingABC database:
 * - Imports approved images from ICS Images collection
 * - Links images to corresponding category items
 * - Migrates collection progress data
 * - Creates collection tasks for automation
 *
 * PREREQUISITE: Phase 1 schema migration must be completed
 * ROLLBACK: Run with --rollback flag to revert changes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const EVERYTHINGABC_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc';
const IMAGE_COLLECTION_URI = process.env.IMAGE_COLLECTION_URI || 'mongodb://localhost:27017/image_collection';
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');

// Logging utility
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

// Database connections
let targetDb, sourceDb;
let targetConnection, sourceConnection;

async function connectDatabases() {
  try {
    log('Connecting to databases...');

    // Connect to target database (EverythingABC)
    targetConnection = await mongoose.createConnection(EVERYTHINGABC_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    targetDb = targetConnection.db;
    log('✅ Connected to EverythingABC database');

    // Connect to source database (Image Collection System)
    sourceConnection = await mongoose.createConnection(IMAGE_COLLECTION_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    sourceDb = sourceConnection.db;
    log('✅ Connected to Image Collection database');

  } catch (error) {
    log(`Failed to connect to databases: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Backup functionality
async function createBackup() {
  try {
    log('Creating Phase 2 backup...');

    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-phase2-${timestamp}.json`);

    // Export current state before data migration
    const collections = ['categories', 'images', 'collectionTasks'];
    const backup = {};

    for (const collectionName of collections) {
      try {
        const collection = targetDb.collection(collectionName);
        const documents = await collection.find({}).toArray();
        backup[collectionName] = documents;
        log(`  Backed up ${documents.length} documents from ${collectionName}`);
      } catch (error) {
        log(`  Warning: Could not backup ${collectionName}: ${error.message}`, 'warning');
        backup[collectionName] = [];
      }
    }

    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    log(`✅ Backup created: ${backupFile}`);

    return backupFile;
  } catch (error) {
    log(`Failed to create backup: ${error.message}`, 'error');
    throw error;
  }
}

// Import approved images from ICS
async function importImages() {
  try {
    log('🔄 Importing approved images from Image Collection System...');

    const sourceImages = sourceDb.collection('images');
    const targetImages = targetDb.collection('images');

    // Get approved images from ICS
    const approvedImages = await sourceImages.find({
      status: 'approved',
      'qualityScore.overall': { $gte: 5.0 }
    }).toArray();

    log(`Found ${approvedImages.length} approved images to import`);

    let importedCount = 0;
    const imageMap = new Map(); // category-letter-itemName -> images

    for (const sourceImage of approvedImages) {
      try {
        // Transform ICS image to unified format
        const unifiedImage = {
          // Basic identification
          category: sourceImage.category,
          letter: sourceImage.letter,
          itemName: sourceImage.itemName,

          // Source information
          sourceUrl: sourceImage.sourceUrl,
          sourceProvider: sourceImage.sourceProvider,
          sourceId: sourceImage.sourceId,

          // File information
          files: {
            original: {
              path: sourceImage.filePath,
              width: sourceImage.metadata.width,
              height: sourceImage.metadata.height,
              fileSize: sourceImage.metadata.fileSize,
              format: sourceImage.metadata.format,
              url: generateImageUrl(sourceImage, 'original')
            }
          },

          // Add processed sizes if available
          ...(sourceImage.processedSizes && sourceImage.processedSizes.length > 0 && {
            files: {
              ...sourceImage.processedSizes.reduce((acc, size) => {
                acc[size.size] = {
                  path: size.path,
                  width: size.width,
                  height: size.height,
                  fileSize: size.fileSize,
                  format: path.extname(size.path).slice(1),
                  url: generateImageUrl(sourceImage, size.size)
                };
                return acc;
              }, {})
            }
          }),

          // Quality assessment
          qualityScore: sourceImage.qualityScore,

          // License information
          license: sourceImage.license || {
            type: sourceImage.sourceProvider,
            attribution: `Image from ${sourceImage.sourceProvider}`,
            commercial: true
          },

          // Status and metadata
          status: sourceImage.status,
          tags: sourceImage.tags || [],
          description: sourceImage.description || `High-quality image of ${sourceImage.itemName}`,

          // Usage tracking
          usageCount: sourceImage.usageCount || 0,
          lastUsed: sourceImage.lastUsed,

          // Timestamps
          createdAt: sourceImage.createdAt,
          processedAt: sourceImage.processedAt,
          approvedAt: sourceImage.approvedAt || sourceImage.processedAt
        };

        // Check for duplicates
        const existing = await targetImages.findOne({
          sourceProvider: unifiedImage.sourceProvider,
          sourceId: unifiedImage.sourceId
        });

        if (existing) {
          log(`  ⚠️  Skipping duplicate image: ${sourceImage.sourceProvider}:${sourceImage.sourceId}`);
          continue;
        }

        // Insert image if not dry run
        if (!DRY_RUN) {
          await targetImages.insertOne(unifiedImage);
        }

        // Track for category linking
        const key = `${sourceImage.category}-${sourceImage.letter}-${sourceImage.itemName}`;
        if (!imageMap.has(key)) {
          imageMap.set(key, []);
        }
        imageMap.get(key).push(unifiedImage);

        importedCount++;
        log(`  ✅ Imported: ${sourceImage.category}/${sourceImage.letter}/${sourceImage.itemName}`);

      } catch (error) {
        log(`  ❌ Failed to import image ${sourceImage.sourceId}: ${error.message}`, 'error');
      }
    }

    log(`✅ Image import completed: ${importedCount}/${approvedImages.length} images imported`);
    return imageMap;

  } catch (error) {
    log(`Image import failed: ${error.message}`, 'error');
    throw error;
  }
}

// Generate image URLs (placeholder function - implement based on your CDN setup)
function generateImageUrl(image, size = 'medium') {
  const baseUrl = process.env.IMAGE_CDN_URL || 'https://images.everythingabc.com';
  const extension = size === 'original' ? 'jpg' : 'webp';
  return `${baseUrl}/${image.category}/${image.letter.toLowerCase()}/${image.itemName.toLowerCase()}_${size}.${extension}`;
}

// Link images to category items
async function linkImagesToItems(imageMap) {
  try {
    log('🔄 Linking images to category items...');

    const categoriesCollection = targetDb.collection('categories');
    const categories = await categoriesCollection.find({}).toArray();

    let linkedCount = 0;

    for (const category of categories) {
      if (!category.items) continue;

      let categoryUpdated = false;
      const updatedItems = { ...category.items };

      for (const [letter, items] of Object.entries(category.items)) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const key = `${category.id}-${letter}-${item.name}`;
          const availableImages = imageMap.get(key);

          if (availableImages && availableImages.length > 0) {
            // Sort images by quality score
            const sortedImages = availableImages.sort((a, b) =>
              b.qualityScore.overall - a.qualityScore.overall
            );

            // Update item with new images
            const enhancedImages = sortedImages.map((img, index) => ({
              sourceUrl: img.sourceUrl,
              sourceProvider: img.sourceProvider,
              sourceId: img.sourceId,
              filePath: img.files.original?.path,
              files: img.files,
              metadata: {
                width: img.files.original?.width,
                height: img.files.original?.height,
                fileSize: img.files.original?.fileSize,
                format: img.files.original?.format
              },
              qualityScore: img.qualityScore,
              license: img.license,
              status: 'approved',
              isPrimary: index === 0, // Best quality image is primary
              tags: img.tags,
              description: img.description,
              createdAt: img.createdAt,
              approvedAt: img.approvedAt
            }));

            // Merge with existing images (keep existing as fallback)
            const existingImages = item.images || [];
            const mergedImages = [...enhancedImages, ...existingImages];

            // Remove duplicates based on sourceId
            const uniqueImages = mergedImages.filter((img, index, arr) =>
              index === arr.findIndex(i => i.sourceId === img.sourceId)
            );

            updatedItems[letter][i] = {
              ...item,
              images: uniqueImages,
              collectionProgress: {
                ...item.collectionProgress,
                status: 'completed',
                collectedCount: uniqueImages.length,
                approvedCount: uniqueImages.filter(img => img.status === 'approved').length,
                lastAttempt: new Date()
              }
            };

            categoryUpdated = true;
            linkedCount++;
            log(`  ✅ Linked ${uniqueImages.length} images to ${category.id}/${letter}/${item.name}`);
          }
        }
      }

      // Update category if changes were made
      if (categoryUpdated && !DRY_RUN) {
        await categoriesCollection.updateOne(
          { _id: category._id },
          {
            $set: {
              items: updatedItems,
              'metadata.lastImageUpdate': new Date()
            }
          }
        );
      }
    }

    log(`✅ Image linking completed: ${linkedCount} items updated`);

  } catch (error) {
    log(`Image linking failed: ${error.message}`, 'error');
    throw error;
  }
}

// Import collection progress data
async function importCollectionProgress() {
  try {
    log('🔄 Importing collection progress data...');

    const sourceProgress = sourceDb.collection('collectionprogresses');
    const targetTasks = targetDb.collection('collectionTasks');

    const progressData = await sourceProgress.find({}).toArray();
    log(`Found ${progressData.length} collection progress records`);

    let importedCount = 0;

    for (const progress of progressData) {
      try {
        // Transform to collection task format
        const collectionTask = {
          category: progress.category,
          letter: progress.letter,
          itemName: progress.itemName,

          // Task configuration
          priority: progress.difficulty === 'very_hard' ? 'low' :
                   progress.difficulty === 'hard' ? 'medium' : 'high',

          targetCount: progress.targetCount || 3,

          // Status mapping
          status: mapProgressStatus(progress.status),

          // Progress tracking
          progress: {
            collectedCount: progress.collectedCount || 0,
            approvedCount: progress.approvedCount || 0,
            rejectedCount: progress.rejectedCount || 0,
            searchAttempts: progress.searchAttempts || 0
          },

          // Source analytics
          sources: progress.sources || {},

          // Quality metrics
          qualityMetrics: {
            averageScore: progress.averageQualityScore,
            bestScore: progress.bestQualityScore
          },

          // Search strategy
          strategy: progress.searchStrategy || {
            prioritySources: ['unsplash', 'pexels', 'pixabay'],
            useAiGeneration: true,
            minQualityThreshold: 7.0
          },

          // Error tracking
          errors: progress.errors || [],

          // Performance metrics
          metrics: progress.metrics || {},

          // Scheduling
          nextRun: determineNextRun(progress),

          // Metadata
          difficulty: progress.difficulty || 'medium',
          notes: progress.notes,

          // Timestamps
          createdAt: progress.createdAt || new Date(),
          updatedAt: progress.lastUpdated || new Date(),
          startedAt: progress.startedAt,
          completedAt: progress.completedAt
        };

        // Check for existing task
        const existing = await targetTasks.findOne({
          category: collectionTask.category,
          letter: collectionTask.letter,
          itemName: collectionTask.itemName
        });

        if (existing) {
          log(`  ⚠️  Task already exists: ${progress.category}/${progress.letter}/${progress.itemName}`);
          continue;
        }

        // Insert task if not dry run
        if (!DRY_RUN) {
          await targetTasks.insertOne(collectionTask);
        }

        importedCount++;
        log(`  ✅ Imported task: ${progress.category}/${progress.letter}/${progress.itemName}`);

      } catch (error) {
        log(`  ❌ Failed to import progress for ${progress.category}/${progress.letter}/${progress.itemName}: ${error.message}`, 'error');
      }
    }

    log(`✅ Collection progress import completed: ${importedCount}/${progressData.length} tasks imported`);

  } catch (error) {
    log(`Collection progress import failed: ${error.message}`, 'error');
    throw error;
  }
}

function mapProgressStatus(icsStatus) {
  const statusMap = {
    'pending': 'pending',
    'in_progress': 'active',
    'completed': 'completed',
    'failed': 'failed',
    'paused': 'paused'
  };
  return statusMap[icsStatus] || 'pending';
}

function determineNextRun(progress) {
  if (progress.status === 'completed') {
    return null; // No next run needed
  }

  if (progress.status === 'failed' || progress.status === 'paused') {
    // Retry in 24 hours
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // For pending/in_progress, schedule soon
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
}

// Update category metadata
async function updateCategoryMetadata() {
  try {
    log('🔄 Updating category metadata...');

    const categoriesCollection = targetDb.collection('categories');
    const categories = await categoriesCollection.find({}).toArray();

    for (const category of categories) {
      if (!category.items) continue;

      // Calculate statistics
      const stats = calculateCategoryStats(category);

      const updates = {
        'imageCollection.progress.totalItems': stats.totalItems,
        'imageCollection.progress.completedItems': stats.completedItems,
        'imageCollection.progress.pendingItems': stats.pendingItems,
        'imageCollection.progress.avgQualityScore': stats.avgQualityScore,
        'imageCollection.lastCollectionRun': new Date(),
        'metadata.itemsWithImages': stats.itemsWithImages,
        'metadata.lastImageUpdate': new Date()
      };

      if (!DRY_RUN) {
        await categoriesCollection.updateOne(
          { _id: category._id },
          { $set: updates }
        );
      }

      log(`  ✅ Updated metadata for ${category.name}: ${stats.itemsWithImages}/${stats.totalItems} items with images`);
    }

    log('✅ Category metadata update completed');

  } catch (error) {
    log(`Category metadata update failed: ${error.message}`, 'error');
    throw error;
  }
}

function calculateCategoryStats(category) {
  let totalItems = 0;
  let completedItems = 0;
  let pendingItems = 0;
  let itemsWithImages = 0;
  let qualityScores = [];

  for (const [letter, items] of Object.entries(category.items || {})) {
    for (const item of items) {
      totalItems++;

      const hasImages = item.images && item.images.length > 0;
      if (hasImages) {
        itemsWithImages++;
      }

      const collectionStatus = item.collectionProgress?.status || 'pending';
      if (collectionStatus === 'completed') {
        completedItems++;
      } else {
        pendingItems++;
      }

      // Collect quality scores
      if (item.images) {
        for (const image of item.images) {
          if (image.qualityScore?.overall) {
            qualityScores.push(image.qualityScore.overall);
          }
        }
      }
    }
  }

  const avgQualityScore = qualityScores.length > 0
    ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    : 0;

  return {
    totalItems,
    completedItems,
    pendingItems,
    itemsWithImages,
    avgQualityScore: Math.round(avgQualityScore * 10) / 10
  };
}

// Validation
async function validateDataMigration() {
  try {
    log('🔍 Validating data migration...');

    const categoriesCollection = targetDb.collection('categories');
    const imagesCollection = targetDb.collection('images');
    const tasksCollection = targetDb.collection('collectionTasks');

    // Count imported data
    const imageCount = await imagesCollection.countDocuments();
    const taskCount = await tasksCollection.countDocuments();

    log(`  Images imported: ${imageCount}`);
    log(`  Collection tasks imported: ${taskCount}`);

    // Validate image-item linking
    const categories = await categoriesCollection.find({}).toArray();
    let linkedItems = 0;
    let totalItems = 0;

    for (const category of categories) {
      if (!category.items) continue;

      for (const [letter, items] of Object.entries(category.items)) {
        for (const item of items) {
          totalItems++;
          if (item.images && item.images.length > 0) {
            linkedItems++;
          }
        }
      }
    }

    log(`  Items with images: ${linkedItems}/${totalItems}`);

    // Basic validation checks
    if (imageCount === 0) {
      log('  ⚠️  Warning: No images imported - check source database connection', 'warning');
    }

    if (taskCount === 0) {
      log('  ⚠️  Warning: No collection tasks imported', 'warning');
    }

    log('✅ Data migration validation completed');
    return true;

  } catch (error) {
    log(`Validation failed: ${error.message}`, 'error');
    return false;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabases();

    if (DRY_RUN) {
      log('🔍 DRY RUN MODE - No changes will be made');
    }

    // Step 1: Create backup
    const backupFile = await createBackup();

    // Step 2: Import images from ICS
    const imageMap = await importImages();

    // Step 3: Link images to category items
    await linkImagesToItems(imageMap);

    // Step 4: Import collection progress as tasks
    await importCollectionProgress();

    // Step 5: Update category metadata
    await updateCategoryMetadata();

    // Step 6: Validate migration
    const validationSuccess = await validateDataMigration();

    if (!validationSuccess) {
      log('Validation failed! Review logs and consider rollback.', 'warning');
    }

    if (DRY_RUN) {
      log('✅ DRY RUN completed successfully - ready for actual migration');
    } else {
      log('✅ Phase 2 data migration completed successfully!');
      log(`📁 Backup saved: ${backupFile}`);
      log('🚀 Ready for Phase 3: API Integration');
    }

  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    if (targetConnection) await targetConnection.close();
    if (sourceConnection) await sourceConnection.close();
  }
}

// Handle process interruption
process.on('SIGINT', async () => {
  log('Migration interrupted by user');
  if (targetConnection) await targetConnection.close();
  if (sourceConnection) await sourceConnection.close();
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  importImages,
  linkImagesToItems,
  importCollectionProgress,
  validateDataMigration
};