const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const database = require('../db');
const Category = require('../models/Category');

class MetadataMigrator {
  constructor() {
    this.imageCollectionPath = path.join(process.cwd(), '../image-collection-system/images/categories');
    this.categoriesFound = new Map();
    this.errors = [];
    this.warnings = [];
  }

  async scanMetadataFiles() {
    console.log('🔍 Scanning metadata files...');

    try {
      const categories = await fs.readdir(this.imageCollectionPath);
      console.log(`📁 Found ${categories.length} category directories:`, categories);

      for (const categoryDir of categories) {
        if (categoryDir.startsWith('.')) continue;

        const categoryPath = path.join(this.imageCollectionPath, categoryDir);
        const stat = await fs.stat(categoryPath);

        if (stat.isDirectory()) {
          await this.scanCategoryDirectory(categoryDir, categoryPath);
        }
      }

      console.log(`✅ Scanned ${this.categoriesFound.size} categories`);
      return this.categoriesFound;
    } catch (error) {
      console.error('❌ Error scanning metadata files:', error);
      throw error;
    }
  }

  async scanCategoryDirectory(categoryName, categoryPath) {
    try {
      const letters = await fs.readdir(categoryPath);

      for (const letter of letters) {
        if (!/^[A-Z]$/.test(letter)) continue;

        const letterPath = path.join(categoryPath, letter);
        const letterStat = await fs.stat(letterPath);

        if (letterStat.isDirectory()) {
          await this.scanLetterDirectory(categoryName, letter, letterPath);
        }
      }
    } catch (error) {
      this.errors.push(`Failed to scan category ${categoryName}: ${error.message}`);
    }
  }

  async scanLetterDirectory(categoryName, letter, letterPath) {
    try {
      const items = await fs.readdir(letterPath);

      for (const itemDir of items) {
        if (itemDir.startsWith('.')) continue;

        const itemPath = path.join(letterPath, itemDir);
        const itemStat = await fs.stat(itemPath);

        if (itemStat.isDirectory()) {
          await this.processItemDirectory(categoryName, letter, itemDir, itemPath);
        }
      }
    } catch (error) {
      this.errors.push(`Failed to scan letter ${letter} in ${categoryName}: ${error.message}`);
    }
  }

  async processItemDirectory(categoryName, letter, itemName, itemPath) {
    try {
      const files = await fs.readdir(itemPath);
      const metadataFiles = files.filter(file => file.endsWith('_metadata.json'));

      if (metadataFiles.length === 0) {
        this.warnings.push(`No metadata file found for ${categoryName}/${letter}/${itemName}`);
        return;
      }

      // Use the first metadata file found
      const metadataFile = metadataFiles[0];
      const metadataPath = path.join(itemPath, metadataFile);

      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      await this.addItemToCategory(categoryName, letter, itemName, metadata);
    } catch (error) {
      this.errors.push(`Failed to process item ${itemName}: ${error.message}`);
    }
  }

  async addItemToCategory(categoryName, letter, itemName, metadata) {
    if (!this.categoriesFound.has(categoryName)) {
      this.categoriesFound.set(categoryName, {
        id: categoryName.toLowerCase(),
        name: this.formatCategoryName(categoryName),
        items: {}
      });
    }

    const category = this.categoriesFound.get(categoryName);

    if (!category.items[letter]) {
      category.items[letter] = [];
    }

    // Find the medium size image for web display
    const mediumImage = metadata.sizes?.find(size => size.name === 'medium');
    const imagePath = mediumImage ?
      `/images/${mediumImage.relativePath.replace(/\\\\/g, '/')}` :
      `/images/placeholder.webp`;

    const item = {
      id: itemName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: this.formatItemName(itemName),
      image: imagePath,
      imageAlt: `A ${this.formatItemName(itemName).toLowerCase()}`,
      difficulty: this.inferDifficulty(itemName),
      pronunciation: this.generatePronunciation(itemName),
      description: this.generateDescription(categoryName, itemName),
      facts: this.generateFacts(categoryName, itemName),
      tags: this.generateTags(categoryName, itemName),
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    category.items[letter].push(item);
  }

  formatCategoryName(categoryName) {
    const nameMap = {
      'animals': 'Animals',
      'fruits': 'Fruits & Vegetables',
      'transportation': 'Transportation',
      'colors': 'Colors & Shapes',
      'household': 'Household Items'
    };

    return nameMap[categoryName.toLowerCase()] ||
           categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  }

  formatItemName(itemName) {
    return itemName
      .split(/[-_\\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  inferDifficulty(itemName) {
    const easyWords = ['cat', 'dog', 'car', 'red', 'apple', 'ball'];
    const hardWords = ['alligator', 'helicopter', 'refrigerator', 'aquamarine'];

    const name = itemName.toLowerCase();
    if (easyWords.some(word => name.includes(word))) return 1;
    if (hardWords.some(word => name.includes(word))) return 3;
    return name.length > 8 ? 2 : 1;
  }

  generatePronunciation(itemName) {
    const name = this.formatItemName(itemName);
    // Simple syllable breaking - can be enhanced
    return name.toLowerCase().replace(/([aeiou])/g, '$1-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  generateDescription(categoryName, itemName) {
    const templates = {
      animals: [
        'A fascinating animal that lives in various habitats around the world',
        'An amazing creature known for its unique characteristics',
        'A beautiful animal that plays an important role in nature'
      ],
      fruits: [
        'A delicious and nutritious food that grows naturally',
        'A healthy fruit or vegetable packed with vitamins',
        'A tasty and colorful food that\'s good for you'
      ],
      transportation: [
        'A vehicle that helps people travel from place to place',
        'A mode of transportation used by people around the world',
        'A machine designed to move people or things efficiently'
      ],
      colors: [
        'A vibrant color that can be found in nature and art',
        'A beautiful color that brings life and meaning to the world',
        'A color that evokes specific emotions and feelings'
      ],
      household: [
        'A useful item commonly found in homes and daily life',
        'An everyday object that makes life more comfortable',
        'A practical item used in households around the world'
      ]
    };

    const categoryTemplates = templates[categoryName.toLowerCase()] || templates.animals;
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  }

  generateFacts(categoryName, itemName) {
    // Simple fact generation - can be enhanced with real data
    const factTemplates = {
      animals: [
        `${this.formatItemName(itemName)}s are found in many parts of the world`,
        `These animals have adapted to their environment over millions of years`
      ],
      fruits: [
        `${this.formatItemName(itemName)} contains important vitamins and minerals`,
        `This food has been enjoyed by people for thousands of years`
      ],
      transportation: [
        `The ${this.formatItemName(itemName).toLowerCase()} has revolutionized how people travel`,
        `This vehicle can travel at different speeds depending on its design`
      ]
    };

    const templates = factTemplates[categoryName.toLowerCase()] || factTemplates.animals;
    return [templates[Math.floor(Math.random() * templates.length)]];
  }

  generateTags(categoryName, itemName) {
    const baseTags = [categoryName.toLowerCase()];
    const name = itemName.toLowerCase();

    // Add size-based tags
    if (name.includes('big') || name.includes('large') || name.includes('giant')) {
      baseTags.push('large');
    } else if (name.includes('small') || name.includes('tiny') || name.includes('mini')) {
      baseTags.push('small');
    }

    // Add color tags
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'white'];
    colors.forEach(color => {
      if (name.includes(color)) baseTags.push(color);
    });

    // Category-specific tags
    if (categoryName === 'animals') {
      if (name.includes('cat') || name.includes('dog')) baseTags.push('pet', 'domestic');
      if (name.includes('wild') || name.includes('lion') || name.includes('tiger')) baseTags.push('wild');
    }

    return [...new Set(baseTags)]; // Remove duplicates
  }

  async createCategoryDefinitions() {
    const categoryDefinitions = {
      animals: {
        icon: '🐾',
        color: 'from-blue-400 to-cyan-300',
        difficulty: 'Easy',
        description: 'Meet amazing creatures from around the world!',
        tags: ['educational', 'nature', 'popular'],
        ageRange: '2-8',
        learningObjectives: [
          'Animal recognition',
          'Vocabulary building',
          'Letter-sound association'
        ]
      },
      fruits: {
        icon: '🍎',
        color: 'from-green-400 to-emerald-300',
        difficulty: 'Easy',
        description: 'Discover delicious and healthy foods!',
        tags: ['educational', 'healthy', 'popular'],
        ageRange: '2-6',
        learningObjectives: [
          'Healthy food recognition',
          'Color identification',
          'Nutritional awareness'
        ]
      },
      transportation: {
        icon: '🚗',
        color: 'from-purple-400 to-pink-300',
        difficulty: 'Medium',
        description: 'Explore vehicles that take us places!',
        tags: ['educational', 'vehicles', 'travel'],
        ageRange: '3-8',
        learningObjectives: [
          'Vehicle recognition',
          'Transportation methods',
          'How things move'
        ]
      },
      colors: {
        icon: '🌈',
        color: 'from-yellow-400 to-orange-300',
        difficulty: 'Easy',
        description: 'Learn about colors and geometric shapes!',
        tags: ['educational', 'art', 'basic'],
        ageRange: '2-5',
        learningObjectives: [
          'Color recognition',
          'Shape identification',
          'Visual discrimination'
        ]
      },
      household: {
        icon: '🏠',
        color: 'from-indigo-400 to-purple-300',
        difficulty: 'Medium',
        description: 'Discover things we use every day at home!',
        tags: ['educational', 'daily-life', 'practical'],
        ageRange: '3-7',
        learningObjectives: [
          'Object recognition',
          'Daily life vocabulary',
          'Home environment awareness'
        ]
      }
    };

    return categoryDefinitions;
  }

  async migrateToDatabase() {
    console.log('📦 Starting database migration...');

    const categoryDefinitions = await this.createCategoryDefinitions();
    let successCount = 0;
    let errorCount = 0;

    for (const [categoryKey, categoryData] of this.categoriesFound) {
      try {
        const definition = categoryDefinitions[categoryKey.toLowerCase()] || {
          icon: '📚',
          color: 'from-gray-400 to-gray-300',
          difficulty: 'Medium',
          description: `Learn about ${categoryData.name.toLowerCase()}!`,
          tags: ['educational'],
          ageRange: '3-8',
          learningObjectives: ['Vocabulary building', 'Recognition skills']
        };

        const categoryDoc = {
          id: categoryData.id,
          name: categoryData.name,
          ...definition,
          status: 'active',
          items: categoryData.items
        };

        // Check if category already exists
        const existingCategory = await Category.findOne({ id: categoryDoc.id });
        if (existingCategory) {
          console.log(`⚠️  Category '${categoryDoc.name}' already exists, skipping...`);
          continue;
        }

        const category = new Category(categoryDoc);
        await category.save();

        successCount++;
        console.log(`✅ Migrated category: ${categoryDoc.name} (${category.metadata.totalItems} items)`);
      } catch (error) {
        errorCount++;
        this.errors.push(`Failed to migrate category ${categoryData.name}: ${error.message}`);
        console.error(`❌ Failed to migrate ${categoryData.name}:`, error.message);
      }
    }

    console.log(`\\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${successCount} categories`);
    console.log(`   ❌ Failed migrations: ${errorCount} categories`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   🐛 Errors: ${this.errors.length}`);

    if (this.warnings.length > 0) {
      console.log('\\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\\n❌ Errors:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    return { successCount, errorCount, warnings: this.warnings.length, errors: this.errors.length };
  }

  async run() {
    try {
      console.log('🚀 EverythingABC Metadata Migration Tool');
      console.log('========================================\\n');

      await database.connect();
      console.log('✅ Connected to database\\n');

      await this.scanMetadataFiles();
      console.log('\\n📋 Categories found:');
      this.categoriesFound.forEach((category, key) => {
        const itemCount = Object.values(category.items).reduce((sum, items) => sum + items.length, 0);
        const letterCount = Object.keys(category.items).length;
        console.log(`   📁 ${category.name}: ${itemCount} items across ${letterCount} letters`);
      });

      console.log('\\n🔄 Starting database migration...');
      const result = await this.migrateToDatabase();

      console.log('\\n🎉 Migration completed!');
      console.log(`📈 Database now contains ${result.successCount} categories with rich metadata.`);

    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    } finally {
      await database.disconnect();
      console.log('🔌 Disconnected from database');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new MetadataMigrator();
  migrator.run().catch(console.error);
}

module.exports = MetadataMigrator;