const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');

/**
 * ICS to Unified Migration Script
 *
 * This script imports comprehensive data from the Image Collection System (ICS)
 * into the unified Category model. It treats ICS data as the source of truth,
 * replacing any dummy data in the EverythingABC database.
 *
 * What it does:
 * 1. Connects to both databases (EverythingABC and ICS)
 * 2. Exports all data from ICS (Images, CollectionProgress)
 * 3. Creates/updates categories with real data from ICS
 * 4. Maps images and progress to the unified schema
 * 5. Validates data integrity and completeness
 */

class ICSToUnifiedMigrator {
  constructor() {
    this.backupPath = path.join(__dirname, '../backups');
    this.icsDbUrl = process.env.ICS_MONGODB_URL || 'mongodb://localhost:27017/image-collection-system';
    this.errors = [];
    this.warnings = [];
    this.migrationLog = [];
    this.stats = {
      categoriesCreated: 0,
      categoriesUpdated: 0,
      itemsCreated: 0,
      imagesTransferred: 0,
      progressRecordsTransferred: 0
    };
  }

  async connectToICS() {
    console.log('🔌 Connecting to Image Collection System database...');

    try {
      // Create separate connection for ICS database
      this.icsConnection = await mongoose.createConnection(this.icsDbUrl);

      // Define ICS schemas (flexible to handle existing data)
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

  async createBackup() {
    console.log('📦 Creating backup of existing EverythingABC categories...');

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupPath, { recursive: true });

      // Export existing categories (if any)
      const existingCategories = await Category.find({});
      const backup = {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        migrationPhase: 'ICS-to-Unified',
        totalCategories: existingCategories.length,
        categories: existingCategories
      };

      const backupFile = path.join(this.backupPath, `pre-ics-migration-backup-${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

      console.log(`✅ Backup created: ${backupFile}`);
      console.log(`📊 Backed up ${existingCategories.length} existing categories`);

      this.migrationLog.push(`Backup created with ${existingCategories.length} existing categories`);
      return backupFile;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  async exportICSData() {
    console.log('📤 Exporting comprehensive data from Image Collection System...');

    try {
      // Export all images
      const images = await this.ICSImage.find({}).lean();
      console.log(`📸 Found ${images.length} images in ICS`);

      // Export all collection progress records
      const progressRecords = await this.ICSProgress.find({}).lean();
      console.log(`📊 Found ${progressRecords.length} collection progress records in ICS`);

      // Group data by category/letter/item for easier processing
      const categoriesMap = new Map();

      // Process images first
      for (const image of images) {
        const categoryKey = image.category;
        const letter = image.letter;
        const itemName = image.itemName;

        if (!categoriesMap.has(categoryKey)) {
          categoriesMap.set(categoryKey, new Map());
        }

        const categoryMap = categoriesMap.get(categoryKey);
        const itemKey = `${letter}/${itemName}`;

        if (!categoryMap.has(itemKey)) {
          categoryMap.set(itemKey, {
            letter,
            itemName,
            images: [],
            progress: null
          });
        }

        categoryMap.get(itemKey).images.push(image);
      }

      // Process collection progress records
      for (const progress of progressRecords) {
        const categoryKey = progress.category;
        const letter = progress.letter;
        const itemName = progress.itemName;

        if (categoriesMap.has(categoryKey)) {
          const categoryMap = categoriesMap.get(categoryKey);
          const itemKey = `${letter}/${itemName}`;

          if (categoryMap.has(itemKey)) {
            categoryMap.get(itemKey).progress = progress;
          } else {
            // Create item entry for progress without images
            categoryMap.set(itemKey, {
              letter,
              itemName,
              images: [],
              progress
            });
          }
        }
      }

      console.log(`🗂️  Organized data for ${categoriesMap.size} categories`);

      // Calculate summary statistics
      let totalItems = 0;
      categoriesMap.forEach(categoryMap => {
        totalItems += categoryMap.size;
      });

      console.log(`📈 Summary: ${categoriesMap.size} categories, ${totalItems} items, ${images.length} images`);

      this.migrationLog.push(`Exported ${images.length} images and ${progressRecords.length} progress records`);
      this.migrationLog.push(`Organized into ${categoriesMap.size} categories with ${totalItems} total items`);

      return {
        images,
        progressRecords,
        categoriesMap
      };

    } catch (error) {
      console.error('❌ Failed to export ICS data:', error);
      throw error;
    }
  }

  async createUnifiedCategories(icsData) {
    console.log('🏗️  Creating unified categories with ICS data...');

    try {
      const { categoriesMap } = icsData;

      for (const [categoryKey, itemsMap] of categoriesMap) {
        try {
          console.log(`\n🔧 Processing category: ${categoryKey}`);

          // Create or find existing category
          let category = await Category.findOne({ id: categoryKey });

          if (!category) {
            // Create new category with sensible defaults
            category = new Category({
              id: categoryKey,
              name: this.formatCategoryName(categoryKey),
              icon: this.getCategoryIcon(categoryKey),
              color: this.getCategoryColor(categoryKey),
              difficulty: 'Medium',
              description: `Visual vocabulary for ${this.formatCategoryName(categoryKey)}`,
              status: 'active',
              completeness: 0,
              tags: [categoryKey],
              ageRange: '6-12 years',
              learningObjectives: [`Learn to identify ${this.formatCategoryName(categoryKey)}`],
              items: this.initializeItemsStructure(),
              imageCollection: {
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
                  totalItems: 0,
                  completedItems: 0,
                  pendingItems: 0,
                  collectingItems: 0,
                  failedItems: 0,
                  totalImages: 0,
                  approvedImages: 0,
                  pendingImages: 0,
                  avgQualityScore: 0,
                  lastCollectionRun: null,
                  nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
              },
              metadata: {
                totalItems: 0,
                lastUpdated: new Date(),
                viewCount: 0,
                avgSessionTime: 0
              }
            });

            this.stats.categoriesCreated++;
            console.log(`   ✨ Created new category: ${categoryKey}`);
          } else {
            // Initialize image collection fields if missing
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
                  totalItems: 0,
                  completedItems: 0,
                  pendingItems: 0,
                  collectingItems: 0,
                  failedItems: 0,
                  totalImages: 0,
                  approvedImages: 0,
                  pendingImages: 0,
                  avgQualityScore: 0,
                  lastCollectionRun: null,
                  nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
            }

            this.stats.categoriesUpdated++;
            console.log(`   🔄 Updated existing category: ${categoryKey}`);
          }

          // Process items for this category
          for (const [itemKey, itemData] of itemsMap) {
            await this.addItemToCategory(category, itemData);
          }

          // Save category
          category.markModified('items');
          category.markModified('imageCollection');
          await category.save();

          console.log(`   ✅ Saved category with ${itemsMap.size} items`);

        } catch (error) {
          this.errors.push(`Failed to process category ${categoryKey}: ${error.message}`);
          console.error(`   ❌ Failed to process category ${categoryKey}:`, error.message);
        }
      }

      console.log(`\n📊 Category Creation Summary:`);
      console.log(`   ✨ Categories created: ${this.stats.categoriesCreated}`);
      console.log(`   🔄 Categories updated: ${this.stats.categoriesUpdated}`);
      console.log(`   📝 Items created: ${this.stats.itemsCreated}`);
      console.log(`   📸 Images transferred: ${this.stats.imagesTransferred}`);

      this.migrationLog.push(`Created/updated ${this.stats.categoriesCreated + this.stats.categoriesUpdated} categories`);

    } catch (error) {
      console.error('❌ Failed to create unified categories:', error);
      throw error;
    }
  }

  async addItemToCategory(category, itemData) {
    const { letter, itemName, images, progress } = itemData;

    try {
      // Find or create item in the appropriate letter array
      if (!category.items[letter]) {
        category.items[letter] = [];
      }

      let item = category.items[letter].find(item => item.name === itemName);

      if (!item) {
        // Create new item
        item = {
          id: this.generateItemId(itemName),
          name: itemName,
          image: null, // Will be set from primary image
          imageAlt: itemName,
          images: [],
          difficulty: 1,
          pronunciation: '',
          description: `A ${itemName.toLowerCase()}`,
          facts: [],
          tags: [itemName.toLowerCase()],
          nutritionFacts: { vitamins: [], minerals: [], benefits: [] },
          technicalFacts: { speed: '', environment: '', passengers: '' },
          colorInfo: { hex: '', rgb: '', family: '', mood: '' },
          roomLocation: '',
          uses: [],
          collectionProgress: null,
          status: 'published',
          approvalStatus: 'approved',
          createdBy: 'ics-migration',
          lastModifiedBy: 'ics-migration',
          approvedBy: 'ics-migration',
          approvedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        category.items[letter].push(item);
        this.stats.itemsCreated++;
      }

      // Process images for this item
      if (images && images.length > 0) {
        for (const icsImage of images) {
          const unifiedImage = this.convertICSImageToUnified(icsImage);
          item.images.push(unifiedImage);
          this.stats.imagesTransferred++;
        }

        // Set primary image from the first approved image
        const primaryImage = item.images.find(img => img.status === 'approved');
        if (primaryImage) {
          item.image = primaryImage.filePath;
          primaryImage.isPrimary = true;
        }
      }

      // Process collection progress
      if (progress) {
        item.collectionProgress = this.convertICSProgressToUnified(progress);
        this.stats.progressRecordsTransferred++;
      } else if (!item.collectionProgress) {
        // Initialize default collection progress
        item.collectionProgress = {
          status: item.images.length > 0 ? 'completed' : 'pending',
          targetCount: 3,
          collectedCount: item.images.length,
          approvedCount: item.images.filter(img => img.status === 'approved').length,
          rejectedCount: item.images.filter(img => img.status === 'rejected').length,
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
          averageQualityScore: item.images.length > 0 ?
            item.images.reduce((sum, img) => sum + (img.qualityScore?.overall || 0), 0) / item.images.length : 0,
          bestQualityScore: item.images.length > 0 ?
            Math.max(...item.images.map(img => img.qualityScore?.overall || 0)) : 0,
          errors: [],
          startedAt: null,
          completedAt: item.images.length > 0 ? new Date() : null,
          lastAttempt: null,
          nextAttempt: null
        };
      }

    } catch (error) {
      this.errors.push(`Failed to add item ${itemName} to category: ${error.message}`);
      console.error(`     ❌ Failed to add item ${itemName}:`, error.message);
    }
  }

  convertICSImageToUnified(icsImage) {
    return {
      sourceUrl: icsImage.sourceUrl || null,
      sourceProvider: icsImage.sourceProvider || 'unknown',
      sourceId: icsImage.sourceId || `ics-${Date.now()}`,
      filePath: icsImage.filePath || '/images/placeholder.webp',
      fileName: icsImage.fileName || 'unknown.webp',
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
      isPrimary: false, // Will be set later
      license: {
        type: icsImage.license?.type || 'purchased',
        attribution: icsImage.license?.attribution,
        commercial: icsImage.license?.commercial !== false,
        url: icsImage.license?.url
      },
      usageCount: icsImage.usageCount || 0,
      lastUsed: icsImage.lastUsed,
      processedSizes: icsImage.processedSizes || [],
      approvedAt: icsImage.approvedAt || new Date(),
      approvedBy: icsImage.approvedBy || 'ics-migration',
      rejectionReason: icsImage.rejectionReason,
      rejectionDetails: icsImage.rejectionDetails,
      createdAt: icsImage.createdAt || new Date(),
      updatedAt: icsImage.updatedAt || new Date()
    };
  }

  convertICSProgressToUnified(icsProgress) {
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
      nextAttempt: null
    };
  }

  // Helper methods
  formatCategoryName(categoryKey) {
    return categoryKey.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getCategoryIcon(categoryKey) {
    const iconMap = {
      'animals': '🐾',
      'fruits': '🍎',
      'vegetables': '🥕',
      'colors': '🎨',
      'transportation': '🚗',
      'household-items': '🏠',
      'kitchen-tools': '🍴',
      'school-supplies': '📚',
      'clothing': '👕',
      'sports': '⚽',
      'music-instruments': '🎵',
      'food': '🍕',
      'nature': '🌲',
      'space': '🚀'
    };
    return iconMap[categoryKey] || '📁';
  }

  getCategoryColor(categoryKey) {
    const colorMap = {
      'animals': '#4F46E5',
      'fruits': '#F59E0B',
      'vegetables': '#10B981',
      'colors': '#EC4899',
      'transportation': '#3B82F6',
      'household-items': '#8B5CF6',
      'kitchen-tools': '#EF4444',
      'school-supplies': '#06B6D4',
      'clothing': '#84CC16',
      'sports': '#F97316',
      'music-instruments': '#6366F1',
      'food': '#14B8A6',
      'nature': '#22C55E',
      'space': '#1E40AF'
    };
    return colorMap[categoryKey] || '#6B7280';
  }

  generateItemId(itemName) {
    return itemName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  initializeItemsStructure() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const items = {};
    for (const letter of alphabet) {
      items[letter] = [];
    }
    return items;
  }

  async validateMigration() {
    console.log('🔍 Validating migration results...');

    try {
      const categories = await Category.find({});
      let validCategories = 0;
      let totalItems = 0;
      let totalImages = 0;

      for (const category of categories) {
        let categoryValid = true;

        // Check required fields
        if (!category.id || !category.name || !category.imageCollection) {
          this.errors.push(`Category missing required fields: ${category.id || 'unknown'}`);
          categoryValid = false;
        }

        // Count items and images
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let categoryItems = 0;
        let categoryImages = 0;

        for (const letter of alphabet) {
          if (category.items[letter]) {
            categoryItems += category.items[letter].length;

            for (const item of category.items[letter]) {
              if (item.images) {
                categoryImages += item.images.length;
              }

              // Validate item structure
              if (!item.id || !item.name) {
                this.warnings.push(`Item missing required fields: ${category.id}/${letter}/${item.id || 'unknown'}`);
              }
            }
          }
        }

        totalItems += categoryItems;
        totalImages += categoryImages;

        if (categoryValid) {
          validCategories++;
          console.log(`   ✅ ${category.name}: ${categoryItems} items, ${categoryImages} images`);
        } else {
          console.log(`   ❌ ${category.name}: Invalid structure`);
        }
      }

      console.log(`\n📊 Migration Validation Summary:`);
      console.log(`   ✅ Valid categories: ${validCategories}/${categories.length}`);
      console.log(`   📝 Total items: ${totalItems}`);
      console.log(`   📸 Total images: ${totalImages}`);
      console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
      console.log(`   ❌ Errors: ${this.errors.length}`);

      if (this.errors.length > 0) {
        console.log('\n❌ Errors found:');
        this.errors.forEach(error => console.log(`   - ${error}`));
      }

      this.migrationLog.push(`Validation completed: ${validCategories} valid categories, ${totalItems} items, ${totalImages} images`);

      return {
        validCategories,
        totalItems,
        totalImages,
        errors: this.errors.length,
        warnings: this.warnings.length
      };

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
        phase: 'ICS to Unified Migration',
        status: this.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        summary: {
          categoriesCreated: this.stats.categoriesCreated,
          categoriesUpdated: this.stats.categoriesUpdated,
          itemsCreated: this.stats.itemsCreated,
          imagesTransferred: this.stats.imagesTransferred,
          progressRecordsTransferred: this.stats.progressRecordsTransferred,
          totalErrors: this.errors.length,
          totalWarnings: this.warnings.length
        },
        migrationLog: this.migrationLog,
        errors: this.errors,
        warnings: this.warnings,
        nextSteps: [
          'Test unified API endpoints',
          'Validate image collection workflow',
          'Set up background processing queues',
          'Configure automated collection schedules'
        ]
      };

      const reportFile = path.join(this.backupPath, `ics-unified-migration-report-${Date.now()}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`✅ Migration report saved: ${reportFile}`);
      return report;

    } catch (error) {
      console.error('❌ Failed to create migration report:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up connections...');

    try {
      if (this.icsConnection) {
        await this.icsConnection.close();
        console.log('✅ ICS database connection closed');
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }

  async run() {
    let backupFile = null;

    try {
      console.log('🚀 EverythingABC ICS to Unified Migration');
      console.log('==========================================\n');

      // Connect to both databases
      await database.connect();
      console.log('✅ Connected to EverythingABC database');

      await this.connectToICS();

      // Step 1: Create backup
      backupFile = await this.createBackup();
      console.log('');

      // Step 2: Export ICS data
      const icsData = await this.exportICSData();
      console.log('');

      // Step 3: Create unified categories
      await this.createUnifiedCategories(icsData);
      console.log('');

      // Step 4: Validate migration
      await this.validateMigration();
      console.log('');

      // Step 5: Create report
      const report = await this.createMigrationReport();
      console.log('');

      console.log('🎉 ICS to Unified Migration Completed Successfully!');
      console.log('Next Steps:');
      console.log('  1. Review the migration report');
      console.log('  2. Test the unified API endpoints');
      console.log('  3. Set up background processing');
      console.log('\nBackup file:', backupFile);

      return {
        success: true,
        backupFile,
        report,
        stats: this.stats,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      console.error('💥 Migration failed:', error);

      return {
        success: false,
        error: error.message,
        backupFile,
        stats: this.stats,
        errors: this.errors,
        warnings: this.warnings
      };

    } finally {
      await this.cleanup();
      await database.disconnect();
      console.log('🔌 Disconnected from databases');
    }
  }
}

// CLI handling
async function main() {
  const migrator = new ICSToUnifiedMigrator();
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

module.exports = ICSToUnifiedMigrator;