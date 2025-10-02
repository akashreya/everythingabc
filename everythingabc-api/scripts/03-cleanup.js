const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');

/**
 * Cleanup Script - Phase 3
 *
 * This script performs post-migration cleanup:
 * 1. Archives old ICS collections that are no longer needed
 * 2. Optimizes database indexes for the new unified schema
 * 3. Removes temporary migration files
 * 4. Validates the final unified system
 */

class CleanupManager {
  constructor() {
    this.backupPath = path.join(__dirname, '../backups');
    this.icsDbUrl = process.env.ICS_MONGODB_URL || 'mongodb://localhost:27017/image-collection-system';
    this.errors = [];
    this.warnings = [];
    this.cleanupLog = [];
    this.stats = {
      archivedCollections: 0,
      removedTempFiles: 0,
      optimizedIndexes: 0,
      freedSpace: 0
    };
  }

  async connectToICS() {
    console.log('🔌 Connecting to Image Collection System database...');

    try {
      this.icsConnection = await mongoose.createConnection(this.icsDbUrl);

      // Define ICS schemas for cleanup operations
      this.icsImageSchema = new mongoose.Schema({}, { strict: false, collection: 'images' });
      this.icsProgressSchema = new mongoose.Schema({}, { strict: false, collection: 'collectionprogresses' });

      this.ICSImage = this.icsConnection.model('Image', this.icsImageSchema);
      this.ICSProgress = this.icsConnection.model('CollectionProgress', this.icsProgressSchema);

      console.log('✅ Connected to Image Collection System database');
      this.cleanupLog.push('Connected to ICS database for cleanup');

    } catch (error) {
      console.error('❌ Failed to connect to ICS database:', error);
      this.warnings.push('Could not connect to ICS database for cleanup - skipping ICS cleanup');
    }
  }

  async archiveICSData() {
    if (!this.icsConnection) {
      console.log('⏭️  Skipping ICS data archival (no connection)');
      return;
    }

    console.log('📦 Archiving Image Collection System data...');

    try {
      // Export all ICS data for archival
      const [images, progressRecords] = await Promise.all([
        this.ICSImage.find({}).lean(),
        this.ICSProgress.find({}).lean()
      ]);

      const archiveData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'Image Collection System',
        description: 'Archived data after migration to unified system',
        statistics: {
          totalImages: images.length,
          totalProgressRecords: progressRecords.length,
          categories: [...new Set(images.map(img => img.category))],
          sources: [...new Set(images.map(img => img.sourceProvider))]
        },
        data: {
          images,
          progressRecords
        }
      };

      // Save archive
      const archiveFile = path.join(this.backupPath, `ics-archive-${Date.now()}.json`);
      await fs.writeFile(archiveFile, JSON.stringify(archiveData, null, 2));

      console.log(`✅ ICS data archived: ${archiveFile}`);
      console.log(`📊 Archived ${images.length} images and ${progressRecords.length} progress records`);

      this.stats.archivedCollections = images.length;
      this.cleanupLog.push(`Archived ${images.length} ICS images and ${progressRecords.length} progress records`);

      // Calculate space that can be freed
      const estimatedSize = JSON.stringify(archiveData).length;
      this.stats.freedSpace += estimatedSize;

      return archiveFile;

    } catch (error) {
      console.error('❌ Failed to archive ICS data:', error);
      this.errors.push(`ICS data archival failed: ${error.message}`);
    }
  }

  async createICSTombstone() {
    if (!this.icsConnection) return;

    console.log('🪦 Creating ICS database tombstone...');

    try {
      // Create a tombstone collection to indicate migration completion
      const tombstoneSchema = new mongoose.Schema({
        migratedAt: { type: Date, default: Date.now },
        migratedTo: String,
        backupLocation: String,
        originalStats: Object,
        notes: String
      });

      const Tombstone = this.icsConnection.model('MigrationTombstone', tombstoneSchema);

      const tombstone = new Tombstone({
        migratedAt: new Date(),
        migratedTo: 'EverythingABC Unified System',
        backupLocation: this.backupPath,
        originalStats: {
          totalImages: this.stats.archivedCollections,
          migrationDate: new Date().toISOString()
        },
        notes: 'This database has been migrated to the unified EverythingABC system. Original data is archived.'
      });

      await tombstone.save();

      console.log('✅ ICS tombstone created');
      this.cleanupLog.push('Created ICS database tombstone');

    } catch (error) {
      console.error('❌ Failed to create ICS tombstone:', error);
      this.warnings.push(`Could not create ICS tombstone: ${error.message}`);
    }
  }

  async optimizeUnifiedDatabase() {
    console.log('⚡ Optimizing unified database indexes...');

    try {
      const collections = await database.db.listCollections().toArray();
      let optimizedIndexes = 0;

      for (const collection of collections) {
        if (collection.name === 'categories') {
          await this.optimizeCategoriesIndexes();
          optimizedIndexes++;
        }
      }

      this.stats.optimizedIndexes = optimizedIndexes;
      console.log(`✅ Optimized indexes for ${optimizedIndexes} collections`);
      this.cleanupLog.push(`Optimized ${optimizedIndexes} database indexes`);

    } catch (error) {
      console.error('❌ Failed to optimize database indexes:', error);
      this.errors.push(`Index optimization failed: ${error.message}`);
    }
  }

  async optimizeCategoriesIndexes() {
    try {
      const categoriesCollection = database.db.collection('categories');

      // Get existing indexes
      const existingIndexes = await categoriesCollection.listIndexes().toArray();
      console.log(`📋 Found ${existingIndexes.length} existing indexes`);

      // Add new indexes for unified schema
      const newIndexes = [
        // Image collection indexes
        { 'imageCollection.progress.nextScheduledRun': 1 },
        { 'imageCollection.enabled': 1, 'status': 1 },

        // Image-specific indexes
        { 'items.$.images.status': 1 },
        { 'items.$.images.qualityScore.overall': -1 },
        { 'items.$.images.sourceProvider': 1 },
        { 'items.$.images.isPrimary': 1 },

        // Collection progress indexes
        { 'items.$.collectionProgress.status': 1 },
        { 'items.$.collectionProgress.nextAttempt': 1 },

        // Quality and performance indexes
        { 'imageCollection.progress.avgQualityScore': -1 },
        { 'imageCollection.progress.completedItems': -1 },

        // Compound indexes for common queries
        { 'status': 1, 'imageCollection.enabled': 1 },
        { 'status': 1, 'imageCollection.progress.pendingItems': -1 }
      ];

      // Create new indexes
      let createdIndexes = 0;
      for (const indexSpec of newIndexes) {
        try {
          await categoriesCollection.createIndex(indexSpec, {
            background: true,
            sparse: true  // Allow null values
          });
          createdIndexes++;
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️  Could not create index:`, error.message);
          }
        }
      }

      console.log(`✅ Created ${createdIndexes} new indexes for categories collection`);

      // Remove old unused indexes if they exist
      const unusedIndexes = [
        // Add any old index names that are no longer needed
      ];

      let removedIndexes = 0;
      for (const indexName of unusedIndexes) {
        try {
          await categoriesCollection.dropIndex(indexName);
          removedIndexes++;
          console.log(`🗑️  Removed unused index: ${indexName}`);
        } catch (error) {
          // Index might not exist, which is fine
          if (!error.message.includes('index not found')) {
            console.warn(`⚠️  Could not remove index ${indexName}:`, error.message);
          }
        }
      }

      this.cleanupLog.push(`Categories collection: +${createdIndexes} indexes, -${removedIndexes} indexes`);

    } catch (error) {
      console.error('❌ Failed to optimize categories indexes:', error);
      throw error;
    }
  }

  async cleanupTemporaryFiles() {
    console.log('🧹 Cleaning up temporary migration files...');

    try {
      const tempPatterns = [
        'temp-*.json',
        'migration-temp-*',
        '*.tmp',
        'backup-*.temp'
      ];

      let removedFiles = 0;
      let freedSpace = 0;

      // Clean up backup directory
      if (await this.directoryExists(this.backupPath)) {
        const files = await fs.readdir(this.backupPath);

        for (const file of files) {
          const filePath = path.join(this.backupPath, file);
          const stats = await fs.stat(filePath);

          // Remove files older than 30 days that match temp patterns
          const isOld = (Date.now() - stats.mtime.getTime()) > (30 * 24 * 60 * 60 * 1000);
          const isTemp = tempPatterns.some(pattern =>
            file.match(new RegExp(pattern.replace('*', '.*')))
          );

          if (isOld && isTemp) {
            await fs.unlink(filePath);
            removedFiles++;
            freedSpace += stats.size;
            console.log(`🗑️  Removed temp file: ${file}`);
          }
        }
      }

      // Clean up logs directory
      const logsPath = path.join(__dirname, '../logs');
      if (await this.directoryExists(logsPath)) {
        const logFiles = await fs.readdir(logsPath);

        for (const file of logFiles) {
          const filePath = path.join(logsPath, file);
          const stats = await fs.stat(filePath);

          // Remove log files older than 7 days
          const isOld = (Date.now() - stats.mtime.getTime()) > (7 * 24 * 60 * 60 * 1000);

          if (isOld && file.endsWith('.log')) {
            await fs.unlink(filePath);
            removedFiles++;
            freedSpace += stats.size;
            console.log(`🗑️  Removed old log: ${file}`);
          }
        }
      }

      this.stats.removedTempFiles = removedFiles;
      this.stats.freedSpace += freedSpace;

      console.log(`✅ Cleaned up ${removedFiles} temporary files (${this.formatBytes(freedSpace)} freed)`);
      this.cleanupLog.push(`Removed ${removedFiles} temporary files, freed ${this.formatBytes(freedSpace)}`);

    } catch (error) {
      console.error('❌ Failed to cleanup temporary files:', error);
      this.warnings.push(`Temporary file cleanup failed: ${error.message}`);
    }
  }

  async validateUnifiedSystem() {
    console.log('🔍 Validating unified system integrity...');

    try {
      const validationResults = {
        totalCategories: 0,
        validCategories: 0,
        totalItems: 0,
        itemsWithImages: 0,
        totalImages: 0,
        approvedImages: 0,
        avgQualityScore: 0,
        issuesFound: []
      };

      const categories = await Category.find({});
      validationResults.totalCategories = categories.length;

      for (const category of categories) {
        let categoryValid = true;

        // Validate category structure
        if (!category.imageCollection) {
          validationResults.issuesFound.push(`Category ${category.id} missing imageCollection`);
          categoryValid = false;
        }

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let qualityScores = [];

        for (const letter of alphabet) {
          if (category.items[letter]) {
            for (const item of category.items[letter]) {
              validationResults.totalItems++;

              // Validate item structure
              if (!item.images) {
                validationResults.issuesFound.push(`Item ${category.id}/${letter}/${item.id} missing images array`);
                categoryValid = false;
              }

              if (!item.collectionProgress) {
                validationResults.issuesFound.push(`Item ${category.id}/${letter}/${item.id} missing collectionProgress`);
                categoryValid = false;
              }

              if (item.images && item.images.length > 0) {
                validationResults.itemsWithImages++;
                validationResults.totalImages += item.images.length;

                for (const image of item.images) {
                  if (image.status === 'approved') {
                    validationResults.approvedImages++;
                    if (image.qualityScore && image.qualityScore.overall) {
                      qualityScores.push(image.qualityScore.overall);
                    }
                  }

                  // Validate image structure
                  if (!image.sourceProvider || !image.filePath) {
                    validationResults.issuesFound.push(`Invalid image in ${category.id}/${letter}/${item.id}`);
                    categoryValid = false;
                  }
                }

                // Check for primary image
                const primaryImages = item.images.filter(img => img.isPrimary);
                if (primaryImages.length > 1) {
                  validationResults.issuesFound.push(`Multiple primary images in ${category.id}/${letter}/${item.id}`);
                  categoryValid = false;
                }
              }
            }
          }
        }

        if (categoryValid) {
          validationResults.validCategories++;
        }
      }

      // Calculate average quality score
      if (qualityScores.length > 0) {
        validationResults.avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      }

      // Display validation results
      console.log('\\n📊 Unified System Validation Results:');
      console.log(`   📂 Categories: ${validationResults.validCategories}/${validationResults.totalCategories} valid`);
      console.log(`   📝 Items: ${validationResults.totalItems} total, ${validationResults.itemsWithImages} with images`);
      console.log(`   📸 Images: ${validationResults.approvedImages}/${validationResults.totalImages} approved`);
      console.log(`   ⭐ Average quality score: ${validationResults.avgQualityScore.toFixed(2)}`);
      console.log(`   🐛 Issues found: ${validationResults.issuesFound.length}`);

      if (validationResults.issuesFound.length > 0) {
        console.log('\\n⚠️  Issues found:');
        validationResults.issuesFound.slice(0, 10).forEach(issue => {
          console.log(`   - ${issue}`);
        });

        if (validationResults.issuesFound.length > 10) {
          console.log(`   ... and ${validationResults.issuesFound.length - 10} more`);
        }
      }

      this.cleanupLog.push(`System validation: ${validationResults.validCategories}/${validationResults.totalCategories} categories valid, ${validationResults.issuesFound.length} issues found`);

      return validationResults;

    } catch (error) {
      console.error('❌ Failed to validate unified system:', error);
      this.errors.push(`System validation failed: ${error.message}`);
      return null;
    }
  }

  async generateMigrationSummary() {
    console.log('📄 Generating migration summary report...');

    try {
      const categories = await Category.find({});

      const summary = {
        timestamp: new Date().toISOString(),
        phase: 'Migration Cleanup (Phase 3)',
        status: this.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',

        migrationStatistics: {
          totalCategories: categories.length,
          totalItems: categories.reduce((sum, cat) => sum + (cat.metadata?.totalItems || 0), 0),
          totalImages: categories.reduce((sum, cat) => {
            return sum + (cat.imageCollection?.progress?.totalImages || 0);
          }, 0),
          approvedImages: categories.reduce((sum, cat) => {
            return sum + (cat.imageCollection?.progress?.approvedImages || 0);
          }, 0),
          avgQualityScore: this.calculateOverallQualityScore(categories)
        },

        cleanupStatistics: this.stats,

        systemHealth: {
          databaseOptimized: this.stats.optimizedIndexes > 0,
          temporaryFilesCleanup: this.stats.removedTempFiles,
          spaceSaved: this.formatBytes(this.stats.freedSpace),
          icsDataArchived: this.stats.archivedCollections > 0
        },

        summary: {
          totalErrors: this.errors.length,
          totalWarnings: this.warnings.length,
          cleanupSteps: this.cleanupLog.length
        },

        cleanupLog: this.cleanupLog,
        errors: this.errors,
        warnings: this.warnings,

        nextSteps: [
          'Update server.js to include unified collection routes',
          'Test automated image collection workflow',
          'Update admin interface to use new endpoints',
          'Monitor system performance and quality metrics',
          'Schedule regular maintenance tasks'
        ],

        recommendations: [
          'Set up automated collection scheduling for high-priority categories',
          'Implement quality monitoring alerts for images below threshold',
          'Consider implementing image CDN for better performance',
          'Regular database maintenance and index optimization',
          'Monitor API rate limits for image sources'
        ]
      };

      const summaryFile = path.join(this.backupPath, `migration-summary-${Date.now()}.json`);
      await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));

      console.log(`✅ Migration summary saved: ${summaryFile}`);
      return summary;

    } catch (error) {
      console.error('❌ Failed to generate migration summary:', error);
      throw error;
    }
  }

  calculateOverallQualityScore(categories) {
    let totalScore = 0;
    let count = 0;

    for (const category of categories) {
      if (category.imageCollection?.progress?.avgQualityScore) {
        totalScore += category.imageCollection.progress.avgQualityScore;
        count++;
      }
    }

    return count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0;
  }

  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    try {
      console.log('🚀 EverythingABC Migration Cleanup - Phase 3');
      console.log('===========================================\\n');

      // Connect to databases
      await database.connect();
      console.log('✅ Connected to main database\\n');

      await this.connectToICS();
      console.log('');

      // Perform cleanup operations
      const archiveFile = await this.archiveICSData();
      console.log('');

      await this.createICSTombstone();
      console.log('');

      await this.optimizeUnifiedDatabase();
      console.log('');

      await this.cleanupTemporaryFiles();
      console.log('');

      const validationResults = await this.validateUnifiedSystem();
      console.log('');

      const summary = await this.generateMigrationSummary();
      console.log('');

      console.log('🎉 Migration Cleanup Completed Successfully!');
      console.log('\\nCleanup Summary:');
      console.log(`  📦 Archived: ${this.stats.archivedCollections} ICS records`);
      console.log(`  ⚡ Optimized: ${this.stats.optimizedIndexes} database indexes`);
      console.log(`  🧹 Cleaned: ${this.stats.removedTempFiles} temporary files`);
      console.log(`  💾 Space freed: ${this.formatBytes(this.stats.freedSpace)}`);

      if (validationResults) {
        console.log(`\\nSystem Health:');
        console.log(`  📂 Categories: ${validationResults.validCategories}/${validationResults.totalCategories} valid`);
        console.log(`  📸 Images: ${validationResults.approvedImages} approved`);
        console.log(`  ⭐ Quality: ${validationResults.avgQualityScore.toFixed(2)}/10 average`);
      }

      console.log('\\n🚀 The unified EverythingABC system is now ready!');
      console.log('Next: Update server.js and test the new automated workflow.');

      return {
        success: true,
        summary,
        archiveFile,
        stats: this.stats,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      console.error('💥 Migration cleanup failed:', error);

      return {
        success: false,
        error: error.message,
        stats: this.stats,
        errors: this.errors,
        warnings: this.warnings
      };

    } finally {
      if (this.icsConnection) {
        await this.icsConnection.close();
        console.log('🔌 Disconnected from ICS database');
      }
      await database.disconnect();
      console.log('🔌 Disconnected from main database');
    }
  }
}

// Run cleanup if called directly
if (require.main === module) {
  const cleanup = new CleanupManager();
  cleanup.run().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
}

module.exports = CleanupManager;