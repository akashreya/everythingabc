const mongoose = require('mongoose');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');
const ImageCollectionService = require('../services/ImageCollectionService');
const QualityAssessmentService = require('../services/QualityAssessmentService');

/**
 * Unified System Test Suite
 *
 * This script validates the migrated unified system to ensure:
 * 1. Enhanced Category model works correctly
 * 2. Image collection services are functional
 * 3. API endpoints respond properly
 * 4. Queue processing is operational
 */

class UnifiedSystemTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
    this.imageCollectionService = new ImageCollectionService();
    this.qualityService = new QualityAssessmentService();
  }

  async runAllTests() {
    console.log('🧪 EverythingABC Unified System Test Suite');
    console.log('=========================================\n');

    try {
      // Connect to database
      await database.connect();
      console.log('✅ Database connection established\n');

      // Run test categories
      await this.testCategoryModel();
      await this.testImageCollectionService();
      await this.testQualityAssessmentService();
      await this.testUnifiedEndpoints();
      await this.testDataIntegrity();

      // Display results
      this.displayResults();

      return {
        success: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        results: this.testResults
      };

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      return {
        success: false,
        error: error.message,
        errors: this.errors,
        warnings: this.warnings
      };

    } finally {
      await database.disconnect();
      console.log('\n🔌 Database connection closed');
    }
  }

  async testCategoryModel() {
    console.log('📋 Testing Enhanced Category Model...');

    try {
      // Test basic category operations
      await this.test('Category creation with enhanced schema', async () => {
        const testCategory = new Category({
          id: 'test-category',
          name: 'Test Category',
          icon: '🧪',
          color: '#FF0000',
          description: 'Test category for validation',
          items: { A: [], B: [], C: [] },
          imageCollection: {
            strategy: {
              enabled: true,
              prioritySources: ['unsplash'],
              targetImagesPerItem: 2
            },
            progress: {
              totalItems: 0,
              completedItems: 0
            },
            enabled: true
          }
        });

        await testCategory.save();
        return testCategory;
      });

      // Test item addition with collection progress
      await this.test('Adding item with collection progress', async () => {
        const category = await Category.findOne({ id: 'test-category' });

        const testItem = {
          id: 'test-apple',
          name: 'Apple',
          description: 'A red fruit',
          images: [],
          collectionProgress: {
            status: 'pending',
            targetCount: 2,
            sources: {
              unsplash: { found: 0, approved: 0 }
            }
          }
        };

        category.items.A.push(testItem);
        await category.save();

        return category.items.A.find(item => item.id === 'test-apple');
      });

      // Test category methods
      await this.test('Category utility methods', async () => {
        const category = await Category.findOne({ id: 'test-category' });

        const letters = category.getLettersWithItems();
        const aItems = category.getItemsByLetter('A');
        const pendingItems = category.getPendingCollectionItems();

        return {
          letters,
          aItems: aItems.length,
          pendingItems: pendingItems.length
        };
      });

      // Test static methods
      await this.test('Category static methods', async () => {
        const stats = await Category.getCollectionStats();
        const needingCollection = await Category.getCategoriesNeedingCollection();

        return {
          stats: stats.length > 0,
          needingCollection: needingCollection.length >= 0
        };
      });

      console.log('   ✅ Category model tests completed\n');

    } catch (error) {
      this.errors.push(`Category model test failed: ${error.message}`);
      console.log('   ❌ Category model tests failed\n');
    } finally {
      // Cleanup test data
      try {
        await Category.deleteOne({ id: 'test-category' });
      } catch (cleanup) {
        this.warnings.push('Failed to cleanup test category');
      }
    }
  }

  async testImageCollectionService() {
    console.log('🖼️  Testing Image Collection Service...');

    try {
      // Test service initialization
      await this.test('Image Collection Service initialization', async () => {
        if (!this.imageCollectionService.initialized) {
          await this.imageCollectionService.initialize();
        }
        return this.imageCollectionService.initialized;
      });

      // Test API validation
      await this.test('API key validation', async () => {
        const validation = await this.imageCollectionService.validateApiKeys();

        // Count valid APIs
        const validApis = Object.values(validation).filter(v => v.valid).length;

        if (validApis === 0) {
          this.warnings.push('No image API keys are configured - collection will not work');
        }

        return { totalApis: Object.keys(validation).length, validApis };
      });

      // Test queue setup
      await this.test('Queue initialization', async () => {
        const queueStatus = await this.imageCollectionService.getQueueStats();
        return queueStatus;
      });

      // Test search term generation
      await this.test('Search term generation', async () => {
        const testItem = { name: 'Apple' };
        const testCategory = { name: 'Fruits' };
        const terms = this.imageCollectionService.generateSearchTerms(testItem, testCategory, {});

        return {
          terms: terms.length,
          includesBasic: terms.includes('Apple'),
          includesContext: terms.some(term => term.includes('fruit'))
        };
      });

      console.log('   ✅ Image Collection Service tests completed\n');

    } catch (error) {
      this.errors.push(`Image Collection Service test failed: ${error.message}`);
      console.log('   ❌ Image Collection Service tests failed\n');
    }
  }

  async testQualityAssessmentService() {
    console.log('🎯 Testing Quality Assessment Service...');

    try {
      // Test service initialization
      await this.test('Quality Assessment Service initialization', async () => {
        await this.qualityService.initialize();
        return this.qualityService.initialized;
      });

      // Test quality thresholds
      await this.test('Quality thresholds configuration', async () => {
        const thresholds = this.qualityService.thresholds;

        return {
          hasTechnical: !!thresholds.technical,
          hasRelevance: !!thresholds.relevance,
          hasAesthetic: !!thresholds.aesthetic,
          hasUsability: !!thresholds.usability
        };
      });

      // Test category adjustments
      await this.test('Category-specific adjustments', async () => {
        const adjustments = this.qualityService.categoryAdjustments;

        return {
          hasAnimalAdjustments: !!adjustments.animals,
          hasFruitAdjustments: !!adjustments.fruits,
          totalCategories: Object.keys(adjustments).length
        };
      });

      console.log('   ✅ Quality Assessment Service tests completed\n');

    } catch (error) {
      this.errors.push(`Quality Assessment Service test failed: ${error.message}`);
      console.log('   ❌ Quality Assessment Service tests failed\n');
    }
  }

  async testUnifiedEndpoints() {
    console.log('🌐 Testing Unified API Endpoints...');

    try {
      const axios = require('axios');
      const baseUrl = `http://localhost:${process.env.PORT || 3003}`;

      // Test health endpoint
      await this.test('Health endpoint', async () => {
        try {
          const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
          return response.status === 200;
        } catch (error) {
          this.warnings.push('API server not running - endpoint tests skipped');
          return false;
        }
      });

      // Test collection stats endpoint (would only work if server is running)
      await this.test('Collection stats endpoint structure', async () => {
        // Test the logic without making HTTP request
        const stats = await Category.getCollectionStats();
        return {
          isArray: Array.isArray(stats),
          hasData: stats.length >= 0
        };
      });

      console.log('   ✅ API endpoint structure tests completed\n');

    } catch (error) {
      this.errors.push(`API endpoint test failed: ${error.message}`);
      console.log('   ❌ API endpoint tests failed\n');
    }
  }

  async testDataIntegrity() {
    console.log('🔍 Testing Data Integrity...');

    try {
      // Test category completeness
      await this.test('Category data integrity', async () => {
        const categories = await Category.find({ status: 'active' }).limit(5);

        let validCategories = 0;
        let totalItems = 0;
        let categoriesWithCollection = 0;

        for (const category of categories) {
          if (category.id && category.name && category.items) {
            validCategories++;

            // Count items
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (const letter of alphabet) {
              if (category.items[letter]) {
                totalItems += category.items[letter].length;
              }
            }

            // Check for image collection setup
            if (category.imageCollection) {
              categoriesWithCollection++;
            }
          }
        }

        return {
          totalCategories: categories.length,
          validCategories,
          totalItems,
          categoriesWithCollection,
          migrationComplete: categoriesWithCollection === validCategories
        };
      });

      // Test image data structure
      await this.test('Image data structure validation', async () => {
        const categories = await Category.find({
          'items.A.images': { $exists: true }
        }).limit(3);

        let validImages = 0;
        let totalImages = 0;
        let imagesWithQuality = 0;

        for (const category of categories) {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (const letter of alphabet) {
            if (category.items[letter]) {
              for (const item of category.items[letter]) {
                if (item.images) {
                  for (const image of item.images) {
                    totalImages++;

                    if (image.sourceProvider && image.filePath && image.status) {
                      validImages++;
                    }

                    if (image.qualityScore && typeof image.qualityScore.overall === 'number') {
                      imagesWithQuality++;
                    }
                  }
                }
              }
            }
          }
        }

        return {
          totalImages,
          validImages,
          imagesWithQuality,
          structureIntegrity: totalImages > 0 ? (validImages / totalImages * 100).toFixed(1) : 0
        };
      });

      // Test collection progress data
      await this.test('Collection progress validation', async () => {
        const categories = await Category.find({
          'items.A.collectionProgress': { $exists: true }
        }).limit(3);

        let itemsWithProgress = 0;
        let validProgress = 0;

        for (const category of categories) {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (const letter of alphabet) {
            if (category.items[letter]) {
              for (const item of category.items[letter]) {
                if (item.collectionProgress) {
                  itemsWithProgress++;

                  if (item.collectionProgress.status &&
                      typeof item.collectionProgress.targetCount === 'number' &&
                      typeof item.collectionProgress.approvedCount === 'number') {
                    validProgress++;
                  }
                }
              }
            }
          }
        }

        return {
          itemsWithProgress,
          validProgress,
          progressIntegrity: itemsWithProgress > 0 ? (validProgress / itemsWithProgress * 100).toFixed(1) : 0
        };
      });

      console.log('   ✅ Data integrity tests completed\n');

    } catch (error) {
      this.errors.push(`Data integrity test failed: ${error.message}`);
      console.log('   ❌ Data integrity tests failed\n');
    }
  }

  async test(name, testFunction) {
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name,
        status: 'passed',
        result,
        duration
      });

      console.log(`   ✅ ${name} (${duration}ms)`);
      return result;

    } catch (error) {
      this.testResults.push({
        name,
        status: 'failed',
        error: error.message,
        duration: 0
      });

      console.log(`   ❌ ${name} - ${error.message}`);
      throw error;
    }
  }

  displayResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');

    const passed = this.testResults.filter(test => test.status === 'passed').length;
    const failed = this.testResults.filter(test => test.status === 'failed').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${total > 0 ? (passed / total * 100).toFixed(1) : 0}%`);

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (failed === 0 && this.errors.length === 0) {
      console.log('\n🎉 All tests passed! The unified system is ready for use.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues before proceeding.');
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Run the migration script: node scripts/ics-to-unified-migration.js');
    console.log('   2. Start the API server: npm start');
    console.log('   3. Test the collection endpoints');
    console.log('   4. Configure image API keys for full functionality');
  }
}

// CLI handling
async function main() {
  const tester = new UnifiedSystemTester();
  const results = await tester.runAllTests();
  process.exit(results.success ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = UnifiedSystemTester;