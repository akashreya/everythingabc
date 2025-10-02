const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');

/**
 * Schema Migration Script - Phase 1
 *
 * This script extends the existing Category model with new fields from the Image Collection System
 * without losing any existing data. It's designed to be safe and reversible.
 *
 * What it does:
 * 1. Backs up existing categories
 * 2. Adds new fields with default values
 * 3. Maintains backward compatibility
 * 4. Validates the migration
 */

class SchemaMigrator {
  constructor() {
    this.backupPath = path.join(__dirname, '../backups');
    this.errors = [];
    this.warnings = [];
    this.migrationLog = [];
  }

  async createBackup() {
    console.log('📦 Creating backup of existing categories...');

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupPath, { recursive: true });

      // Export all categories
      const categories = await Category.find({});
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalCategories: categories.length,
        categories: categories
      };

      const backupFile = path.join(this.backupPath, `categories-backup-${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

      console.log(`✅ Backup created: ${backupFile}`);
      console.log(`📊 Backed up ${categories.length} categories`);

      this.migrationLog.push(`Backup created with ${categories.length} categories`);
      return backupFile;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  async validateExistingData() {
    console.log('🔍 Validating existing data structure...');

    try {
      const categories = await Category.find({});
      let validCategories = 0;
      let invalidCategories = 0;

      for (const category of categories) {
        try {
          // Check required fields
          if (!category.id || !category.name) {
            this.errors.push(`Category missing required fields: ${category._id}`);
            invalidCategories++;
            continue;
          }

          // Check items structure
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          let itemCount = 0;

          for (const letter of alphabet) {
            if (category.items[letter]) {
              itemCount += category.items[letter].length;

              // Validate each item
              for (const item of category.items[letter]) {
                if (!item.id || !item.name) {
                  this.warnings.push(`Item missing required fields: ${category.id}/${letter}/${item.id || 'unknown'}`);
                }
              }
            }
          }

          console.log(`   ✓ ${category.name}: ${itemCount} items across ${category.completeness} letters`);
          validCategories++;

        } catch (error) {
          this.errors.push(`Error validating category ${category.id}: ${error.message}`);
          invalidCategories++;
        }
      }

      console.log(`📊 Validation Summary:`);
      console.log(`   ✅ Valid categories: ${validCategories}`);
      console.log(`   ❌ Invalid categories: ${invalidCategories}`);
      console.log(`   ⚠️  Warnings: ${this.warnings.length}`);

      if (invalidCategories > 0) {
        throw new Error(`Found ${invalidCategories} invalid categories. Migration aborted.`);
      }

      this.migrationLog.push(`Validated ${validCategories} categories successfully`);
      return { validCategories, invalidCategories, warnings: this.warnings.length };

    } catch (error) {
      console.error('❌ Data validation failed:', error);
      throw error;
    }
  }

  async addImageCollectionFields() {
    console.log('🔧 Adding image collection fields to existing categories...');

    try {
      const categories = await Category.find({});
      let updatedCategories = 0;
      let skippedCategories = 0;

      for (const category of categories) {
        try {
          let needsUpdate = false;

          // Add imageCollection field if it doesn't exist
          if (!category.imageCollection) {
            category.imageCollection = {
              strategy: {
                enabled: true,
                prioritySources: ['unsplash', 'pixabay', 'pexels'],
                excludeSources: [],
                useAiGeneration: true,
                minQualityThreshold: 7.0,
                targetImagesPerItem: 3,
                autoApprovalThreshold: 8.5,
                maxSearchAttempts: 5,
                retryInterval: 24,
                customSearchTerms: []
              },
              progress: {
                totalItems: category.metadata?.totalItems || 0,
                completedItems: 0,
                pendingItems: category.metadata?.totalItems || 0,
                collectingItems: 0,
                failedItems: 0,
                totalImages: 0,
                approvedImages: 0,
                pendingImages: 0,
                avgQualityScore: 0,
                lastCollectionRun: null,
                nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                totalCollectionAttempts: 0,
                successfulCollections: 0,
                avgCollectionTime: 0,
                sourceStats: {
                  unsplash: { totalSearches: 0, successfulFinds: 0, approvedImages: 0 },
                  pixabay: { totalSearches: 0, successfulFinds: 0, approvedImages: 0 },
                  pexels: { totalSearches: 0, successfulFinds: 0, approvedImages: 0 }
                }
              },
              enabled: true,
              lastConfigUpdate: new Date()
            };
            needsUpdate = true;
          }

          // Add collection progress to items
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (const letter of alphabet) {
            if (category.items[letter]) {
              for (const item of category.items[letter]) {
                if (!item.images) {
                  item.images = [];
                  needsUpdate = true;
                }

                if (!item.collectionProgress) {
                  item.collectionProgress = {
                    status: 'pending',
                    targetCount: 3,
                    collectedCount: 0,
                    approvedCount: 0,
                    rejectedCount: 0,
                    searchAttempts: 0,
                    lastSearchTerms: [],
                    difficulty: 'medium',
                    sources: {
                      unsplash: { found: 0, approved: 0, lastSearched: null },
                      pixabay: { found: 0, approved: 0, lastSearched: null },
                      pexels: { found: 0, approved: 0, lastSearched: null },
                      wikimedia: { found: 0, approved: 0, lastSearched: null },
                      dalle: { generated: 0, approved: 0, lastGenerated: null }
                    },
                    averageQualityScore: 0,
                    bestQualityScore: 0,
                    errors: [],
                    startedAt: null,
                    completedAt: null,
                    lastAttempt: null,
                    nextAttempt: null
                  };
                  needsUpdate = true;
                }

                // Create primary image entry from existing image field
                if (item.image && item.images.length === 0) {
                  item.images.push({
                    sourceUrl: null,
                    sourceProvider: 'manual',
                    sourceId: `manual-${item.id}-${Date.now()}`,
                    filePath: item.image,
                    fileName: path.basename(item.image),
                    metadata: {
                      width: 400,
                      height: 400,
                      fileSize: 50000,
                      format: 'webp'
                    },
                    qualityScore: {
                      overall: 8.0,
                      breakdown: {
                        technical: 8.0,
                        relevance: 8.0,
                        aesthetic: 8.0,
                        usability: 8.0
                      }
                    },
                    status: 'approved',
                    isPrimary: true,
                    license: {
                      type: 'purchased',
                      commercial: true
                    },
                    usageCount: 0,
                    processedSizes: [],
                    approvedAt: new Date(),
                    approvedBy: 'migration-script',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });

                  // Update collection progress
                  item.collectionProgress.collectedCount = 1;
                  item.collectionProgress.approvedCount = 1;
                  item.collectionProgress.status = 'completed';
                  item.collectionProgress.completedAt = new Date();
                  item.collectionProgress.averageQualityScore = 8.0;
                  item.collectionProgress.bestQualityScore = 8.0;

                  needsUpdate = true;
                }
              }
            }
          }

          if (needsUpdate) {
            // Use markModified to ensure nested objects are saved
            category.markModified('imageCollection');
            category.markModified('items');
            await category.save();
            updatedCategories++;
            console.log(`   ✅ Updated: ${category.name}`);
          } else {
            skippedCategories++;
            console.log(`   ⏭️  Skipped: ${category.name} (already migrated)`);
          }

        } catch (error) {
          this.errors.push(`Failed to update category ${category.id}: ${error.message}`);
          console.error(`   ❌ Failed: ${category.name} - ${error.message}`);
        }
      }

      console.log(`\\n📊 Schema Migration Summary:`);
      console.log(`   ✅ Updated categories: ${updatedCategories}`);
      console.log(`   ⏭️  Skipped categories: ${skippedCategories}`);
      console.log(`   ❌ Failed updates: ${this.errors.length}`);

      this.migrationLog.push(`Schema migration completed: ${updatedCategories} updated, ${skippedCategories} skipped`);
      return { updatedCategories, skippedCategories, errors: this.errors.length };

    } catch (error) {
      console.error('❌ Schema migration failed:', error);
      throw error;
    }
  }

  async validateMigration() {
    console.log('🔍 Validating schema migration...');

    try {
      const categories = await Category.find({});
      let validMigrations = 0;
      let invalidMigrations = 0;

      for (const category of categories) {
        try {
          // Check for required new fields
          if (!category.imageCollection) {
            this.errors.push(`Missing imageCollection field: ${category.id}`);
            invalidMigrations++;
            continue;
          }

          if (!category.imageCollection.strategy || !category.imageCollection.progress) {
            this.errors.push(`Incomplete imageCollection structure: ${category.id}`);
            invalidMigrations++;
            continue;
          }

          // Check items have new fields
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          let itemsChecked = 0;
          let itemsValid = 0;

          for (const letter of alphabet) {
            if (category.items[letter]) {
              for (const item of category.items[letter]) {
                itemsChecked++;

                if (item.images !== undefined && item.collectionProgress) {
                  itemsValid++;
                } else {
                  this.warnings.push(`Item missing new fields: ${category.id}/${letter}/${item.id}`);
                }
              }
            }
          }

          if (itemsChecked === itemsValid) {
            validMigrations++;
            console.log(`   ✅ ${category.name}: All ${itemsChecked} items migrated successfully`);
          } else {
            invalidMigrations++;
            console.log(`   ❌ ${category.name}: ${itemsValid}/${itemsChecked} items migrated`);
          }

        } catch (error) {
          this.errors.push(`Validation error for category ${category.id}: ${error.message}`);
          invalidMigrations++;
        }
      }

      console.log(`\\n📊 Migration Validation Summary:`);
      console.log(`   ✅ Valid migrations: ${validMigrations}`);
      console.log(`   ❌ Invalid migrations: ${invalidMigrations}`);
      console.log(`   ⚠️  Total warnings: ${this.warnings.length}`);

      if (invalidMigrations > 0) {
        throw new Error(`Migration validation failed for ${invalidMigrations} categories`);
      }

      this.migrationLog.push(`Migration validation passed for ${validMigrations} categories`);
      return { validMigrations, invalidMigrations, warnings: this.warnings.length };

    } catch (error) {
      console.error('❌ Migration validation failed:', error);
      throw error;
    }
  }

  async createMigrationReport() {
    console.log('📄 Creating migration report...');

    try {
      const report = {
        timestamp: new Date().toISOString(),
        phase: 'Schema Migration (Phase 1)',
        status: this.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        summary: {
          totalErrors: this.errors.length,
          totalWarnings: this.warnings.length,
          migrationSteps: this.migrationLog.length
        },
        migrationLog: this.migrationLog,
        errors: this.errors,
        warnings: this.warnings,
        nextSteps: [
          'Execute Phase 2: Data Migration (script 02-data-migration.js)',
          'Test unified API endpoints',
          'Validate image collection workflow'
        ]
      };

      const reportFile = path.join(this.backupPath, `schema-migration-report-${Date.now()}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`✅ Migration report saved: ${reportFile}`);
      return report;

    } catch (error) {
      console.error('❌ Failed to create migration report:', error);
      throw error;
    }
  }

  async rollback(backupFile) {
    console.log('⏪ Rolling back schema migration...');

    try {
      if (!backupFile || !(await fs.stat(backupFile)).isFile()) {
        throw new Error('Backup file not found or invalid');
      }

      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));

      // Drop the existing categories collection
      await Category.collection.drop();

      // Restore from backup
      if (backupData.categories && backupData.categories.length > 0) {
        await Category.insertMany(backupData.categories);
      }

      console.log(`✅ Rollback completed. Restored ${backupData.totalCategories} categories.`);
      this.migrationLog.push(`Rollback completed from backup: ${backupFile}`);

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  async run() {
    let backupFile = null;

    try {
      console.log('🚀 EverythingABC Schema Migration - Phase 1');
      console.log('===========================================\\n');

      // Connect to database
      await database.connect();
      console.log('✅ Connected to database\\n');

      // Step 1: Create backup
      backupFile = await this.createBackup();
      console.log('');

      // Step 2: Validate existing data
      await this.validateExistingData();
      console.log('');

      // Step 3: Add new fields
      await this.addImageCollectionFields();
      console.log('');

      // Step 4: Validate migration
      await this.validateMigration();
      console.log('');

      // Step 5: Create report
      const report = await this.createMigrationReport();
      console.log('');

      console.log('🎉 Schema Migration Phase 1 Completed Successfully!');
      console.log('Next Steps:');
      console.log('  1. Review the migration report');
      console.log('  2. Test the enhanced Category model');
      console.log('  3. Execute Phase 2: Data Migration');
      console.log('\\nBackup file:', backupFile);

      return {
        success: true,
        backupFile,
        report,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      console.error('💥 Schema migration failed:', error);

      // Offer rollback option
      if (backupFile) {
        console.log('\\n⚠️  Rollback available. Run with --rollback flag to restore from backup.');
        console.log(`Backup file: ${backupFile}`);
      }

      return {
        success: false,
        error: error.message,
        backupFile,
        errors: this.errors,
        warnings: this.warnings
      };

    } finally {
      await database.disconnect();
      console.log('🔌 Disconnected from database');
    }
  }
}

// CLI handling
async function main() {
  const migrator = new SchemaMigrator();

  // Check for rollback flag
  if (process.argv.includes('--rollback')) {
    const backupFile = process.argv[process.argv.indexOf('--rollback') + 1];
    if (!backupFile) {
      console.error('❌ Please specify backup file path after --rollback flag');
      process.exit(1);
    }

    try {
      await database.connect();
      await migrator.rollback(backupFile);
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    } finally {
      await database.disconnect();
    }
    return;
  }

  // Run normal migration
  const result = await migrator.run();
  process.exit(result.success ? 0 : 1);
}

// Run migration if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = SchemaMigrator;