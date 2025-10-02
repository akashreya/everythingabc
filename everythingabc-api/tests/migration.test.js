const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const SchemaMigrator = require('../scripts/01-schema-migration');
const DataMigrator = require('../scripts/02-data-migration');
const Category = require('../models/Category');

/**
 * Comprehensive Migration Test Suite
 *
 * Tests all migration phases to ensure data integrity and functionality
 */

describe('EverythingABC Migration Suite', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    // Connect to test database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database before each test
    await mongoose.connection.db.dropDatabase();
  });

  describe('Schema Migration (Phase 1)', () => {
    beforeEach(async () => {
      // Create sample category data matching original schema
      const sampleCategory = new Category({
        id: 'animals',
        name: 'Animals',
        icon: '🐾',
        color: '#4F46E5',
        difficulty: 'Easy',
        description: 'Meet amazing creatures from around the world!',
        status: 'active',
        items: {
          A: [{
            id: 'ant',
            name: 'Ant',
            image: '/images/animals/ant.webp',
            imageAlt: 'A small ant',
            difficulty: 1,
            description: 'A small insect that works in colonies',
            facts: ['Ants can lift 50 times their own weight'],
            tags: ['insect', 'small', 'worker']
          }],
          B: [{
            id: 'bear',
            name: 'Bear',
            image: '/images/animals/bear.webp',
            imageAlt: 'A brown bear',
            difficulty: 2,
            description: 'A large mammal found in forests',
            facts: ['Bears can run up to 30 mph'],
            tags: ['mammal', 'large', 'forest']
          }]
        }
      });

      await sampleCategory.save();
    });

    test('should validate existing data structure', async () => {
      const migrator = new SchemaMigrator();
      const result = await migrator.validateExistingData();

      expect(result.validCategories).toBe(1);
      expect(result.invalidCategories).toBe(0);
    });

    test('should add image collection fields without data loss', async () => {
      const migrator = new SchemaMigrator();

      // Get category before migration
      const beforeCategory = await Category.findOne({ id: 'animals' });
      expect(beforeCategory.items.A).toHaveLength(1);
      expect(beforeCategory.items.B).toHaveLength(1);

      // Run schema migration
      const result = await migrator.addImageCollectionFields();

      // Verify data preservation
      const afterCategory = await Category.findOne({ id: 'animals' });
      expect(afterCategory.items.A).toHaveLength(1);
      expect(afterCategory.items.B).toHaveLength(1);
      expect(afterCategory.items.A[0].name).toBe('Ant');
      expect(afterCategory.items.B[0].name).toBe('Bear');

      // Verify new fields added
      expect(afterCategory.imageCollection).toBeDefined();
      expect(afterCategory.imageCollection.enabled).toBe(true);
      expect(afterCategory.imageCollection.strategy).toBeDefined();
      expect(afterCategory.imageCollection.progress).toBeDefined();

      // Verify item-level new fields
      expect(afterCategory.items.A[0].images).toBeDefined();
      expect(afterCategory.items.A[0].collectionProgress).toBeDefined();
      expect(afterCategory.items.A[0].collectionProgress.status).toBe('completed'); // Should be completed due to existing image
    });

    test('should create primary image entries from existing image fields', async () => {
      const migrator = new SchemaMigrator();
      await migrator.addImageCollectionFields();

      const category = await Category.findOne({ id: 'animals' });
      const antItem = category.items.A[0];

      expect(antItem.images).toHaveLength(1);
      expect(antItem.images[0].isPrimary).toBe(true);
      expect(antItem.images[0].status).toBe('approved');
      expect(antItem.images[0].filePath).toBe('/images/animals/ant.webp');
      expect(antItem.collectionProgress.approvedCount).toBe(1);
    });

    test('should validate migration completion', async () => {
      const migrator = new SchemaMigrator();
      await migrator.addImageCollectionFields();

      const result = await migrator.validateMigration();

      expect(result.validMigrations).toBe(1);
      expect(result.invalidMigrations).toBe(0);
    });

    test('should handle rollback correctly', async () => {
      const migrator = new SchemaMigrator();

      // Create backup
      const backupFile = await migrator.createBackup();

      // Run migration
      await migrator.addImageCollectionFields();

      // Verify migration completed
      let category = await Category.findOne({ id: 'animals' });
      expect(category.imageCollection).toBeDefined();

      // Rollback
      await migrator.rollback(backupFile);

      // Verify rollback
      category = await Category.findOne({ id: 'animals' });
      expect(category.imageCollection).toBeUndefined();
      expect(category.items.A[0].name).toBe('Ant'); // Data should still be there
    });
  });

  describe('Data Migration (Phase 2)', () => {
    beforeEach(async () => {
      // Set up migrated schema first
      const sampleCategory = new Category({
        id: 'animals',
        name: 'Animals',
        icon: '🐾',
        color: '#4F46E5',
        difficulty: 'Easy',
        description: 'Meet amazing creatures from around the world!',
        status: 'active',
        imageCollection: {
          enabled: true,
          strategy: {
            prioritySources: ['unsplash', 'pixabay'],
            targetImagesPerItem: 3
          },
          progress: {
            totalItems: 2,
            pendingItems: 2
          }
        },
        items: {
          A: [{
            id: 'ant',
            name: 'Ant',
            image: '/images/animals/ant.webp',
            description: 'A small insect',
            images: [],
            collectionProgress: {
              status: 'pending',
              targetCount: 3,
              approvedCount: 0
            }
          }]
        }
      });

      await sampleCategory.save();
    });

    test('should transform ICS image data correctly', async () => {
      const migrator = new DataMigrator();

      const icsImage = {
        sourceProvider: 'unsplash',
        sourceId: 'test123',
        filePath: '/images/test.webp',
        fileName: 'test.webp',
        metadata: {
          width: 800,
          height: 600,
          fileSize: 150000,
          format: 'webp'
        },
        qualityScore: {
          overall: 8.5,
          breakdown: {
            technical: 8.0,
            relevance: 9.0,
            aesthetic: 8.5,
            usability: 8.5
          }
        },
        status: 'approved',
        license: {
          type: 'unsplash',
          commercial: true
        }
      };

      const transformed = migrator.transformICSImageToUnified(icsImage);

      expect(transformed.sourceProvider).toBe('unsplash');
      expect(transformed.sourceId).toBe('test123');
      expect(transformed.qualityScore.overall).toBe(8.5);
      expect(transformed.status).toBe('approved');
      expect(transformed.license.commercial).toBe(true);
    });

    test('should transform ICS progress data correctly', async () => {
      const migrator = new DataMigrator();

      const icsProgress = {
        status: 'completed',
        targetCount: 3,
        approvedCount: 2,
        searchAttempts: 2,
        difficulty: 'medium',
        sources: {
          unsplash: { found: 5, approved: 2 },
          pixabay: { found: 3, approved: 0 }
        },
        averageQualityScore: 7.8
      };

      const transformed = migrator.transformICSProgressToUnified(icsProgress);

      expect(transformed.status).toBe('completed');
      expect(transformed.approvedCount).toBe(2);
      expect(transformed.sources.unsplash.approved).toBe(2);
      expect(transformed.averageQualityScore).toBe(7.8);
    });

    test('should update category statistics after data merge', async () => {
      const migrator = new DataMigrator();

      // Simulate adding images to the category
      const category = await Category.findOne({ id: 'animals' });
      category.items.A[0].images.push({
        sourceProvider: 'unsplash',
        sourceId: 'test1',
        filePath: '/test1.webp',
        fileName: 'test1.webp',
        status: 'approved',
        qualityScore: { overall: 8.5 },
        metadata: { width: 400, height: 400, fileSize: 50000, format: 'webp' },
        license: { type: 'unsplash', commercial: true }
      });
      category.items.A[0].collectionProgress.approvedCount = 1;

      await category.save();

      // Update statistics
      await migrator.updateCategoryStatistics();

      // Verify statistics updated
      const updatedCategory = await Category.findOne({ id: 'animals' });
      expect(updatedCategory.imageCollection.progress.approvedImages).toBe(1);
      expect(updatedCategory.imageCollection.progress.avgQualityScore).toBe(8.5);
    });
  });

  describe('Unified API Integration', () => {
    beforeEach(async () => {
      // Create fully migrated category
      const category = new Category({
        id: 'animals',
        name: 'Animals',
        icon: '🐾',
        color: '#4F46E5',
        status: 'active',
        description: 'Animals category',
        imageCollection: {
          enabled: true,
          strategy: {
            prioritySources: ['unsplash'],
            targetImagesPerItem: 3,
            autoApprovalThreshold: 8.0
          },
          progress: {
            totalItems: 1,
            pendingItems: 1,
            approvedImages: 0
          }
        },
        items: {
          A: [{
            id: 'ant',
            name: 'Ant',
            description: 'A small insect',
            images: [{
              sourceProvider: 'unsplash',
              sourceId: 'test1',
              filePath: '/test1.webp',
              fileName: 'test1.webp',
              status: 'pending',
              qualityScore: { overall: 7.5 },
              metadata: { width: 400, height: 400, fileSize: 50000, format: 'webp' },
              license: { type: 'unsplash', commercial: true }
            }],
            collectionProgress: {
              status: 'pending',
              targetCount: 3,
              approvedCount: 0
            }
          }]
        }
      });

      await category.save();
    });

    test('should get pending collection items correctly', async () => {
      const category = await Category.findOne({ id: 'animals' });
      const pendingItems = category.getPendingCollectionItems();

      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0].letter).toBe('A');
      expect(pendingItems[0].item.name).toBe('Ant');
      expect(pendingItems[0].priority).toBeGreaterThan(0);
    });

    test('should calculate collection priority correctly', async () => {
      const category = await Category.findOne({ id: 'animals' });
      const item = category.items.A[0];

      const priority = category.calculateCollectionPriority(item);

      expect(priority).toBeGreaterThan(100); // Should have base priority plus bonus for no approved images
    });

    test('should update collection progress when images are approved', async () => {
      const category = await Category.findOne({ id: 'animals' });
      const item = category.items.A[0];
      const image = item.images[0];

      // Approve the image
      image.status = 'approved';
      image.approvedAt = new Date();
      image.isPrimary = true;

      // Update collection progress
      item.collectionProgress.approvedCount = 1;
      item.image = image.filePath;

      await category.save();

      // Verify updates
      const updatedCategory = await Category.findOne({ id: 'animals' });
      const updatedItem = updatedCategory.items.A[0];

      expect(updatedItem.images[0].status).toBe('approved');
      expect(updatedItem.images[0].isPrimary).toBe(true);
      expect(updatedItem.collectionProgress.approvedCount).toBe(1);
      expect(updatedItem.image).toBe('/test1.webp');
    });

    test('should handle collection completion correctly', async () => {
      const category = await Category.findOne({ id: 'animals' });
      const item = category.items.A[0];

      // Add enough approved images to complete collection
      for (let i = 0; i < 3; i++) {
        item.images.push({
          sourceProvider: 'unsplash',
          sourceId: `test${i + 2}`,
          filePath: `/test${i + 2}.webp`,
          fileName: `test${i + 2}.webp`,
          status: 'approved',
          qualityScore: { overall: 8.0 },
          metadata: { width: 400, height: 400, fileSize: 50000, format: 'webp' },
          license: { type: 'unsplash', commercial: true }
        });
      }

      item.collectionProgress.approvedCount = 3;
      item.collectionProgress.status = 'completed';
      item.collectionProgress.completedAt = new Date();

      await category.save();

      // Verify completion
      const updatedCategory = await Category.findOne({ id: 'animals' });
      const updatedItem = updatedCategory.items.A[0];

      expect(updatedItem.collectionProgress.status).toBe('completed');
      expect(updatedItem.collectionProgress.approvedCount).toBe(3);
      expect(updatedItem.collectionProgress.completedAt).toBeDefined();
    });
  });

  describe('Quality Assessment Integration', () => {
    test('should assess image quality correctly', async () => {
      const QualityAssessmentService = require('../services/QualityAssessmentService');
      const qualityService = new QualityAssessmentService();

      // Create mock image buffer
      const mockBuffer = Buffer.alloc(100000);

      const assessment = await qualityService.assessImage(mockBuffer, {
        itemName: 'Ant',
        category: 'Animals'
      });

      expect(assessment).toHaveProperty('overall');
      expect(assessment).toHaveProperty('breakdown');
      expect(assessment.breakdown).toHaveProperty('technical');
      expect(assessment.breakdown).toHaveProperty('relevance');
      expect(assessment.breakdown).toHaveProperty('aesthetic');
      expect(assessment.breakdown).toHaveProperty('usability');

      expect(assessment.overall).toBeGreaterThanOrEqual(0);
      expect(assessment.overall).toBeLessThanOrEqual(10);
    });

    test('should handle quality assessment errors gracefully', async () => {
      const QualityAssessmentService = require('../services/QualityAssessmentService');
      const qualityService = new QualityAssessmentService();

      // Provide invalid buffer
      const assessment = await qualityService.assessImage(null, {});

      expect(assessment.overall).toBe(3.0);
      expect(assessment.details.error).toBeDefined();
    });
  });

  describe('Data Integrity and Backward Compatibility', () => {
    test('should maintain all existing API endpoints', async () => {
      // Create category with both old and new structure
      const category = new Category({
        id: 'test-category',
        name: 'Test Category',
        icon: '🧪',
        color: '#000000',
        status: 'active',
        description: 'Test category',
        items: {
          A: [{
            id: 'apple',
            name: 'Apple',
            image: '/images/apple.webp',
            description: 'A red fruit',
            images: [{
              sourceProvider: 'unsplash',
              sourceId: 'apple1',
              filePath: '/images/apple.webp',
              fileName: 'apple.webp',
              status: 'approved',
              isPrimary: true,
              qualityScore: { overall: 8.5 },
              metadata: { width: 400, height: 400, fileSize: 50000, format: 'webp' },
              license: { type: 'unsplash', commercial: true }
            }]
          }]
        }
      });

      await category.save();

      // Test existing methods still work
      const lettersWithItems = category.getLettersWithItems();
      expect(lettersWithItems).toContain('A');

      const itemsByLetter = category.getItemsByLetter('A');
      expect(itemsByLetter).toHaveLength(1);
      expect(itemsByLetter[0].name).toBe('Apple');

      // Test legacy image field is maintained
      expect(itemsByLetter[0].image).toBe('/images/apple.webp');

      // Test new primary image virtual
      expect(itemsByLetter[0].primaryImage).toBe('/images/apple.webp');
    });

    test('should preserve all existing category metadata', async () => {
      const originalData = {
        id: 'test',
        name: 'Test',
        icon: '🧪',
        color: '#FF0000',
        difficulty: 'Medium',
        description: 'Test category',
        status: 'active',
        tags: ['test', 'sample'],
        ageRange: '5-10',
        learningObjectives: ['Recognition', 'Vocabulary'],
        metadata: {
          viewCount: 100,
          avgSessionTime: 300
        }
      };

      const category = new Category(originalData);
      await category.save();

      // Verify all original fields preserved
      const saved = await Category.findOne({ id: 'test' });
      expect(saved.name).toBe('Test');
      expect(saved.difficulty).toBe('Medium');
      expect(saved.tags).toEqual(['test', 'sample']);
      expect(saved.ageRange).toBe('5-10');
      expect(saved.learningObjectives).toEqual(['Recognition', 'Vocabulary']);
      expect(saved.metadata.viewCount).toBe(100);
    });

    test('should maintain performance with large datasets', async () => {
      // Create category with many items
      const items = {};
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (const letter of alphabet) {
        items[letter] = [];
        for (let i = 0; i < 10; i++) {
          items[letter].push({
            id: `${letter.toLowerCase()}${i}`,
            name: `${letter} Item ${i}`,
            description: `Test item ${i}`,
            image: `/images/${letter.toLowerCase()}${i}.webp`,
            images: [],
            collectionProgress: {
              status: 'pending',
              targetCount: 3,
              approvedCount: 0
            }
          });
        }
      }

      const category = new Category({
        id: 'large-test',
        name: 'Large Test Category',
        icon: '📊',
        color: '#0000FF',
        status: 'active',
        description: 'Large test category',
        items
      });

      const startTime = Date.now();
      await category.save();
      const saveTime = Date.now() - startTime;

      // Should save within reasonable time (< 1 second)
      expect(saveTime).toBeLessThan(1000);

      // Verify completeness calculation
      expect(category.completeness).toBe(26);
      expect(category.metadata.totalItems).toBe(260);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty categories gracefully', async () => {
      const category = new Category({
        id: 'empty',
        name: 'Empty Category',
        icon: '📭',
        color: '#CCCCCC',
        status: 'active',
        description: 'Empty category',
        items: {}
      });

      await category.save();

      expect(category.completeness).toBe(0);
      expect(category.metadata.totalItems).toBe(0);
      expect(category.getLettersWithItems()).toEqual([]);
    });

    test('should handle malformed image data', async () => {
      const category = new Category({
        id: 'malformed',
        name: 'Malformed Category',
        icon: '⚠️',
        color: '#FF0000',
        status: 'active',
        description: 'Category with malformed data',
        items: {
          A: [{
            id: 'broken',
            name: 'Broken Item',
            description: 'Item with malformed images',
            images: [
              {
                // Missing required fields
                sourceProvider: 'test',
                status: 'pending'
              }
            ]
          }]
        }
      });

      // Should save without throwing
      await expect(category.save()).resolves.toBeDefined();
    });

    test('should handle migration with no existing data', async () => {
      const migrator = new SchemaMigrator();

      const result = await migrator.validateExistingData();
      expect(result.validCategories).toBe(0);
      expect(result.invalidCategories).toBe(0);

      // Migration should still complete successfully
      const migrationResult = await migrator.addImageCollectionFields();
      expect(migrationResult.updatedCategories).toBe(0);
      expect(migrationResult.skippedCategories).toBe(0);
    });
  });
});

describe('Performance and Stress Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('should handle concurrent migrations', async () => {
    // Create multiple categories
    const categories = [];
    for (let i = 0; i < 5; i++) {
      categories.push(new Category({
        id: `test${i}`,
        name: `Test Category ${i}`,
        icon: '🧪',
        color: '#000000',
        status: 'active',
        description: `Test category ${i}`,
        items: {
          A: [{
            id: 'test-item',
            name: 'Test Item',
            description: 'Test item',
            image: '/test.webp'
          }]
        }
      }));
    }

    await Promise.all(categories.map(cat => cat.save()));

    // Run migration
    const migrator = new SchemaMigrator();
    const startTime = Date.now();
    const result = await migrator.addImageCollectionFields();
    const duration = Date.now() - startTime;

    expect(result.updatedCategories).toBe(5);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should maintain memory usage within limits', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Create large category
    const items = {};
    for (let i = 0; i < 100; i++) {
      const letter = String.fromCharCode(65 + (i % 26)); // A-Z
      if (!items[letter]) items[letter] = [];

      items[letter].push({
        id: `item${i}`,
        name: `Item ${i}`,
        description: `Test item ${i}`,
        image: `/test${i}.webp`,
        images: Array(10).fill().map((_, j) => ({
          sourceProvider: 'test',
          sourceId: `${i}-${j}`,
          filePath: `/test${i}-${j}.webp`,
          fileName: `test${i}-${j}.webp`,
          status: 'approved',
          qualityScore: { overall: 8.0 },
          metadata: { width: 400, height: 400, fileSize: 50000, format: 'webp' },
          license: { type: 'test', commercial: true }
        }))
      });
    }

    const category = new Category({
      id: 'memory-test',
      name: 'Memory Test Category',
      icon: '🧠',
      color: '#FF00FF',
      status: 'active',
      description: 'Memory test category',
      items
    });

    await category.save();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (< 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});