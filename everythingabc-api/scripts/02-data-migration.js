const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');

/**
 * Data Migration Script - Phase 2
 *
 * This script merges data from the Image Collection System into the unified Category model.
 * It transfers images, collection progress, and quality scores while preserving all existing data.
 *
 * Prerequisites: Phase 1 (Schema Migration) must be completed first
 *
 * What it does:
 * 1. Connects to Image Collection System database
 * 2. Exports Images and CollectionProgress data
 * 3. Maps and merges data into unified Categories
 * 4. Validates data integrity
 * 5. Updates collection progress and statistics
 */

class DataMigrator {
  constructor() {
    this.backupPath = path.join(__dirname, '../backups');
    this.icsDbUrl = process.env.ICS_MONGODB_URL || 'mongodb://localhost:27017/image-collection-system';
    this.errors = [];
    this.warnings = [];
    this.migrationLog = [];
    this.stats = {
      categoriesProcessed: 0,
      itemsProcessed: 0,
      imagesTransferred: 0,
      progressRecordsTransferred: 0
    };
  }

  async connectToICS() {
    console.log('🔌 Connecting to Image Collection System database...');

    try {
      // Create separate connection for ICS database
      this.icsConnection = await mongoose.createConnection(this.icsDbUrl);

      // Define ICS schemas
      this.icsImageSchema = new mongoose.Schema({}, { strict: false, collection: 'images' });
      this.icsProgressSchema = new mongoose.Schema({}, { strict: false, collection: 'collectionprogresses' });

      this.ICSImage = this.icsConnection.model('Image', this.icsImageSchema);
      this.ICSProgress = this.icsConnection.model('CollectionProgress', this.icsProgressSchema);

      console.log('✅ Connected to Image Collection System database');
      this.migrationLog.push('Connected to ICS database');

    } catch (error) {
      console.error('❌ Failed to connect to ICS database:', error);
      throw error;
    }
  }

  async exportICSData() {
    console.log('📤 Exporting data from Image Collection System...');

    try {
      // Export images
      const images = await this.ICSImage.find({}).lean();
      console.log(`📸 Found ${images.length} images in ICS`);

      // Export collection progress
      const progressRecords = await this.ICSProgress.find({}).lean();
      console.log(`📊 Found ${progressRecords.length} collection progress records in ICS`);

      // Group images by category/letter/item
      const imagesByItem = new Map();
      for (const image of images) {
        const key = `${image.category}/${image.letter}/${image.itemName}`;
        if (!imagesByItem.has(key)) {
          imagesByItem.set(key, []);
        }
        imagesByItem.get(key).push(image);
      }

      // Group progress by category/letter/item
      const progressByItem = new Map();
      for (const progress of progressRecords) {
        const key = `${progress.category}/${progress.letter}/${progress.itemName}`;
        progressByItem.set(key, progress);
      }

      console.log(`🗂️  Organized data for ${imagesByItem.size} unique items`);

      this.migrationLog.push(`Exported ${images.length} images and ${progressRecords.length} progress records`);

      return {
        images,
        progressRecords,
        imagesByItem,
        progressByItem
      };

    } catch (error) {
      console.error('❌ Failed to export ICS data:', error);
      throw error;
    }
  }

  async createDataBackup() {
    console.log('📦 Creating backup before data migration...');

    try {
      const categories = await Category.find({}).lean();

      const backup = {
        timestamp: new Date().toISOString(),
        phase: 'Pre-Data-Migration',
        totalCategories: categories.length,
        categories: categories
      };

      const backupFile = path.join(this.backupPath, `pre-data-migration-backup-${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

      console.log(`✅ Pre-migration backup created: ${backupFile}`);
      this.migrationLog.push(`Pre-migration backup created with ${categories.length} categories`);

      return backupFile;

    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  transformICSImageToUnified(icsImage) {
    return {
      sourceUrl: icsImage.sourceUrl,
      sourceProvider: icsImage.sourceProvider,
      sourceId: icsImage.sourceId,
      filePath: icsImage.filePath,
      fileName: icsImage.fileName,

      metadata: {
        width: icsImage.metadata?.width || 400,
        height: icsImage.metadata?.height || 400,
        fileSize: icsImage.metadata?.fileSize || 50000,
        format: icsImage.metadata?.format || 'webp',
        colorSpace: icsImage.metadata?.colorSpace,
        hasAlpha: icsImage.metadata?.hasAlpha,
        orientation: icsImage.metadata?.orientation
      },

      qualityScore: {
        overall: icsImage.qualityScore?.overall || 7.0,
        breakdown: {
          technical: icsImage.qualityScore?.breakdown?.technical || 7.0,
          relevance: icsImage.qualityScore?.breakdown?.relevance || 7.0,
          aesthetic: icsImage.qualityScore?.breakdown?.aesthetic || 7.0,
          usability: icsImage.qualityScore?.breakdown?.usability || 7.0
        }
      },

      status: icsImage.status || 'approved',
      isPrimary: false, // Will be set later based on quality/preference

      license: {
        type: icsImage.license?.type || 'cc0',
        attribution: icsImage.license?.attribution,
        commercial: icsImage.license?.commercial !== false,
        url: icsImage.license?.url
      },

      usageCount: icsImage.usageCount || 0,
      lastUsed: icsImage.lastUsed,

      processedSizes: icsImage.processedSizes || [],

      approvedAt: icsImage.approvedAt || (icsImage.status === 'approved' ? icsImage.createdAt : null),
      approvedBy: icsImage.reviewedBy || 'ics-migration',
      rejectionReason: icsImage.rejectionReason,
      rejectionDetails: icsImage.rejectionDetails,

      createdAt: icsImage.createdAt || new Date(),
      updatedAt: icsImage.updatedAt || new Date()
    };
  }

  transformICSProgressToUnified(icsProgress) {
    return {
      status: icsProgress.status || 'pending',
      targetCount: icsProgress.targetCount || 3,
      collectedCount: icsProgress.collectedCount || 0,
      approvedCount: icsProgress.approvedCount || 0,
      rejectedCount: icsProgress.rejectedCount || 0,

      searchAttempts: icsProgress.searchAttempts || 0,
      lastSearchTerms: icsProgress.lastSearchTerms || [],

      difficulty: icsProgress.difficulty || 'medium',

      sources: {
        unsplash: {
          found: icsProgress.sources?.unsplash?.found || 0,
          approved: icsProgress.sources?.unsplash?.approved || 0,
          lastSearched: icsProgress.sources?.unsplash?.lastSearched
        },
        pixabay: {
          found: icsProgress.sources?.pixabay?.found || 0,
          approved: icsProgress.sources?.pixabay?.approved || 0,
          lastSearched: icsProgress.sources?.pixabay?.lastSearched
        },
        pexels: {
          found: icsProgress.sources?.pexels?.found || 0,
          approved: icsProgress.sources?.pexels?.approved || 0,
          lastSearched: icsProgress.sources?.pexels?.lastSearched
        },
        wikimedia: {
          found: icsProgress.sources?.wikimedia?.found || 0,
          approved: icsProgress.sources?.wikimedia?.approved || 0,
          lastSearched: icsProgress.sources?.wikimedia?.lastSearched
        },
        dalle: {
          generated: icsProgress.sources?.dalle?.generated || 0,
          approved: icsProgress.sources?.dalle?.approved || 0,
          lastGenerated: icsProgress.sources?.dalle?.lastGenerated
        }
      },

      averageQualityScore: icsProgress.averageQualityScore || 0,
      bestQualityScore: icsProgress.bestQualityScore || 0,

      errors: icsProgress.errors || [],

      startedAt: icsProgress.startedAt,
      completedAt: icsProgress.completedAt,
      lastAttempt: icsProgress.lastUpdated,
      nextAttempt: icsProgress.nextAttempt
    };
  }

  async mergeDataIntoCategories(icsData) {
    console.log('🔄 Merging ICS data into unified categories...');

    try {
      const categories = await Category.find({});

      for (const category of categories) {
        let categoryUpdated = false;
        this.stats.categoriesProcessed++;

        console.log(`\\n📂 Processing category: ${category.name}`);

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        for (const letter of alphabet) {
          if (!category.items[letter]) continue;

          for (const item of category.items[letter]) {
            const itemKey = `${category.id}/${letter}/${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            const altItemKey = `${category.id}/${letter}/${item.id}`;

            // Try different variations of the item key
            const possibleKeys = [
              itemKey,
              altItemKey,
              `${category.id}/${letter}/${item.name}`,
              `${category.id.toLowerCase()}/${letter}/${item.name.toLowerCase()}`
            ];

            let icsImages = [];
            let icsProgress = null;

            // Find matching ICS data
            for (const key of possibleKeys) {
              if (icsData.imagesByItem.has(key)) {
                icsImages = icsData.imagesByItem.get(key);
                break;
              }
            }

            for (const key of possibleKeys) {
              if (icsData.progressByItem.has(key)) {
                icsProgress = icsData.progressByItem.get(key);
                break;
              }
            }

            if (icsImages.length > 0 || icsProgress) {
              this.stats.itemsProcessed++;
              console.log(`   📝 Processing item: ${letter}/${item.name} (${icsImages.length} images)`);

              // Merge images
              if (icsImages.length > 0) {
                const transformedImages = icsImages.map(img => this.transformICSImageToUnified(img));

                // Sort by quality score and set primary image
                transformedImages.sort((a, b) => b.qualityScore.overall - a.qualityScore.overall);
                if (transformedImages.length > 0) {
                  transformedImages[0].isPrimary = true;
                }

                // Merge with existing images (avoiding duplicates)
                const existingPaths = new Set(item.images.map(img => img.filePath));
                const newImages = transformedImages.filter(img => !existingPaths.has(img.filePath));

                item.images.push(...newImages);
                this.stats.imagesTransferred += newImages.length;
                categoryUpdated = true;
              }

              // Merge collection progress
              if (icsProgress) {
                const transformedProgress = this.transformICSProgressToUnified(icsProgress);

                // Update the existing collection progress with ICS data
                Object.assign(item.collectionProgress, transformedProgress);
                this.stats.progressRecordsTransferred++;
                categoryUpdated = true;
              }

              // Update legacy image field to primary image
              if (item.images.length > 0) {
                const primaryImage = item.images.find(img => img.isPrimary);
                if (primaryImage) {
                  item.image = primaryImage.filePath;
                  item.imageAlt = `A ${item.name.toLowerCase()}`;
                }
              }
            }
          }
        }

        // Save category if updated
        if (categoryUpdated) {
          try {
            category.markModified('items');
            await category.save();
            console.log(`   ✅ Saved updates for ${category.name}`);
          } catch (error) {
            this.errors.push(`Failed to save category ${category.name}: ${error.message}`);
            console.error(`   ❌ Failed to save ${category.name}:`, error.message);
          }
        } else {
          console.log(`   ⏭️  No ICS data found for ${category.name}`);
        }
      }

      console.log(`\\n📊 Data Migration Summary:`);
      console.log(`   📂 Categories processed: ${this.stats.categoriesProcessed}`);
      console.log(`   📝 Items processed: ${this.stats.itemsProcessed}`);
      console.log(`   📸 Images transferred: ${this.stats.imagesTransferred}`);
      console.log(`   📊 Progress records transferred: ${this.stats.progressRecordsTransferred}`);

      this.migrationLog.push(`Data migration completed: ${this.stats.imagesTransferred} images and ${this.stats.progressRecordsTransferred} progress records transferred`);

    } catch (error) {
      console.error('❌ Data merge failed:', error);
      throw error;
    }
  }

  async updateCategoryStatistics() {
    console.log('📈 Updating category-level statistics...');

    try {
      const categories = await Category.find({});
      let updatedCategories = 0;

      for (const category of categories) {
        let hasUpdates = false;

        // Calculate category-level progress statistics
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let totalItems = 0;
        let completedItems = 0;
        let pendingItems = 0;
        let collectingItems = 0;
        let failedItems = 0;
        let totalImages = 0;
        let approvedImages = 0;
        let pendingImages = 0;
        let qualityScores = [];

        for (const letter of alphabet) {
          if (category.items[letter]) {
            for (const item of category.items[letter]) {
              totalItems++;

              if (item.collectionProgress) {
                switch (item.collectionProgress.status) {
                  case 'completed': completedItems++; break;
                  case 'collecting': collectingItems++; break;
                  case 'failed': failedItems++; break;
                  default: pendingItems++; break;
                }
              }

              if (item.images) {
                for (const image of item.images) {
                  totalImages++;
                  if (image.status === 'approved') {
                    approvedImages++;
                    if (image.qualityScore?.overall) {
                      qualityScores.push(image.qualityScore.overall);
                    }
                  } else if (image.status === 'pending') {
                    pendingImages++;
                  }
                }
              }
            }
          }
        }

        // Update category imageCollection progress
        if (category.imageCollection?.progress) {
          category.imageCollection.progress.totalItems = totalItems;
          category.imageCollection.progress.completedItems = completedItems;
          category.imageCollection.progress.pendingItems = pendingItems;
          category.imageCollection.progress.collectingItems = collectingItems;
          category.imageCollection.progress.failedItems = failedItems;
          category.imageCollection.progress.totalImages = totalImages;
          category.imageCollection.progress.approvedImages = approvedImages;
          category.imageCollection.progress.pendingImages = pendingImages;

          if (qualityScores.length > 0) {
            category.imageCollection.progress.avgQualityScore =
              qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
          }

          hasUpdates = true;
        }

        if (hasUpdates) {
          category.markModified('imageCollection');
          await category.save();
          updatedCategories++;

          console.log(`   ✅ ${category.name}: ${approvedImages}/${totalImages} images approved (avg quality: ${category.imageCollection.progress.avgQualityScore?.toFixed(1) || 'N/A'})`);
        }
      }

      console.log(`\\n📊 Updated statistics for ${updatedCategories} categories`);
      this.migrationLog.push(`Updated statistics for ${updatedCategories} categories`);

    } catch (error) {
      console.error('❌ Failed to update statistics:', error);
      throw error;
    }
  }

  async validateDataMigration() {
    console.log('🔍 Validating data migration...');

    try {
      const categories = await Category.find({});
      let validCategories = 0;
      let invalidCategories = 0;
      let totalImages = 0;
      let validImages = 0;

      for (const category of categories) {
        let categoryValid = true;

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const letter of alphabet) {
          if (category.items[letter]) {
            for (const item of category.items[letter]) {
              if (item.images) {
                for (const image of item.images) {
                  totalImages++;

                  // Validate required image fields
                  if (!image.sourceProvider || !image.filePath || !image.qualityScore) {
                    this.errors.push(`Invalid image data: ${category.id}/${letter}/${item.id} - missing required fields`);
                    categoryValid = false;
                  } else {
                    validImages++;
                  }

                  // Validate quality score
                  if (image.qualityScore.overall < 0 || image.qualityScore.overall > 10) {
                    this.warnings.push(`Invalid quality score: ${category.id}/${letter}/${item.id} - score: ${image.qualityScore.overall}`);
                  }
                }
              }

              // Validate collection progress
              if (item.collectionProgress) {
                if (item.collectionProgress.approvedCount > item.images?.length) {
                  this.warnings.push(`Inconsistent counts: ${category.id}/${letter}/${item.id} - approved count higher than actual images`);
                }
              }
            }
          }
        }

        if (categoryValid) {
          validCategories++;
        } else {
          invalidCategories++;
        }
      }

      console.log(`\\n📊 Data Migration Validation:`);
      console.log(`   ✅ Valid categories: ${validCategories}`);
      console.log(`   ❌ Invalid categories: ${invalidCategories}`);
      console.log(`   📸 Valid images: ${validImages}/${totalImages}`);
      console.log(`   ⚠️  Total warnings: ${this.warnings.length}`);
      console.log(`   🐛 Total errors: ${this.errors.length}`);

      if (invalidCategories > 0) {
        throw new Error(`Data validation failed for ${invalidCategories} categories`);
      }

      this.migrationLog.push(`Data validation passed: ${validImages}/${totalImages} images validated`);
      return { validCategories, invalidCategories, validImages, totalImages };

    } catch (error) {
      console.error('❌ Data validation failed:', error);
      throw error;
    }
  }

  async createMigrationReport() {
    console.log('📄 Creating data migration report...');

    try {
      const report = {
        timestamp: new Date().toISOString(),
        phase: 'Data Migration (Phase 2)',
        status: this.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        statistics: this.stats,
        summary: {
          totalErrors: this.errors.length,
          totalWarnings: this.warnings.length,
          migrationSteps: this.migrationLog.length
        },
        migrationLog: this.migrationLog,
        errors: this.errors,
        warnings: this.warnings,
        nextSteps: [
          'Execute Phase 3: Unified API Development',
          'Test image collection workflow',
          'Validate automated processes',
          'Update admin interface'
        ]
      };

      const reportFile = path.join(this.backupPath, `data-migration-report-${Date.now()}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`✅ Migration report saved: ${reportFile}`);
      return report;

    } catch (error) {
      console.error('❌ Failed to create migration report:', error);
      throw error;
    }
  }

  async run() {
    let backupFile = null;

    try {
      console.log('🚀 EverythingABC Data Migration - Phase 2');
      console.log('==========================================\\n');

      // Connect to main database
      await database.connect();
      console.log('✅ Connected to main database\\n');

      // Connect to ICS database
      await this.connectToICS();
      console.log('');

      // Create backup
      backupFile = await this.createDataBackup();
      console.log('');

      // Export ICS data
      const icsData = await this.exportICSData();
      console.log('');

      // Merge data into categories
      await this.mergeDataIntoCategories(icsData);
      console.log('');

      // Update statistics
      await this.updateCategoryStatistics();
      console.log('');

      // Validate migration
      await this.validateDataMigration();
      console.log('');

      // Create report
      const report = await this.createMigrationReport();
      console.log('');

      console.log('🎉 Data Migration Phase 2 Completed Successfully!');
      console.log('\\nMigration Statistics:');
      console.log(`  📂 Categories: ${this.stats.categoriesProcessed}`);
      console.log(`  📝 Items: ${this.stats.itemsProcessed}`);
      console.log(`  📸 Images: ${this.stats.imagesTransferred}`);
      console.log(`  📊 Progress Records: ${this.stats.progressRecordsTransferred}`);
      console.log('\\nNext Steps:');
      console.log('  1. Test unified category model');
      console.log('  2. Develop unified API endpoints');
      console.log('  3. Implement automated workflow');
      console.log('\\nBackup file:', backupFile);

      return {
        success: true,
        backupFile,
        report,
        stats: this.stats,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      console.error('💥 Data migration failed:', error);

      if (backupFile) {
        console.log('\\n⚠️  Rollback available. Restore from backup if needed.');
        console.log(`Backup file: ${backupFile}`);
      }

      return {
        success: false,
        error: error.message,
        backupFile,
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

// Run migration if called directly
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.run().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = DataMigrator;