/**
 * Import Images from ICS Folder to Database
 *
 * This script scans the image-collection-system/images/categories folder
 * and imports all collected images into the database with proper metadata
 */

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const ICS_IMAGES_PATH = path.join(__dirname, '../../image-collection-system/images/categories');

// Extract provider and ID from filename
// Format: itemname_provider_id_timestamp_size.webp
// Note: itemName and sourceId can both contain underscores
function parseFilename(filename) {
  // Remove .webp extension
  const nameWithoutExt = filename.replace(/\.webp$/i, '');

  // Split by underscore
  const parts = nameWithoutExt.split('_');

  if (parts.length < 5) return null;

  // Last part is size (original, large, medium, small, thumbnail)
  const size = parts[parts.length - 1];

  // Second-to-last part is timestamp (all digits)
  const timestamp = parts[parts.length - 2];
  if (!/^\d+$/.test(timestamp)) return null;

  // Known providers
  const knownProviders = ['unsplash', 'pixabay', 'pexels', 'wikimedia', 'dalle'];

  // Find provider by looking for known provider names in parts
  let providerIndex = -1;
  let provider = null;

  for (let i = 0; i < parts.length - 2; i++) {
    if (knownProviders.includes(parts[i].toLowerCase())) {
      providerIndex = i;
      provider = parts[i].toLowerCase();
      break;
    }
  }

  if (!provider || providerIndex === -1) return null;

  // Everything before provider is item name
  const itemName = parts.slice(0, providerIndex).join('_');

  // Everything between provider and timestamp is source ID
  const sourceId = parts.slice(providerIndex + 1, parts.length - 2).join('_');

  return {
    itemName,
    provider,
    sourceId,
    timestamp,
    size
  };
}

// Get image metadata
async function getImageMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      fileSize: stats.size,
      format: 'webp'
    };
  } catch (error) {
    return null;
  }
}

// Scan images for a specific item
async function scanItemImages(categoryPath, categoryId, letter, itemName) {
  const itemPath = path.join(categoryPath, letter, itemName);

  try {
    await fs.access(itemPath);
  } catch {
    return [];
  }

  const images = [];
  const sizes = ['original', 'large', 'medium', 'small', 'thumbnail'];

  for (const size of sizes) {
    const sizePath = path.join(itemPath, size);
    try {
      const files = await fs.readdir(sizePath);

      for (const file of files) {
        if (!file.endsWith('.webp')) continue;

        const parsed = parseFilename(file);
        if (!parsed) continue;

        const filePath = path.join(sizePath, file);
        const relativePath = path.relative(
          path.join(__dirname, '../../image-collection-system/images'),
          filePath
        ).replace(/\\/g, '/');

        const metadata = await getImageMetadata(filePath);
        if (!metadata) continue;

        // Find or create image entry
        let imageEntry = images.find(img =>
          img.sourceProvider === parsed.provider &&
          img.sourceId === parsed.sourceId
        );

        if (!imageEntry) {
          imageEntry = {
            sourceProvider: parsed.provider,
            sourceId: parsed.sourceId,
            sourceUrl: '', // We don't have original URLs
            filePath: `/categories/${categoryId}/${letter}/${itemName}/${size}/${file}`,
            fileName: file,
            metadata: {
              width: 0, // We don't have this info
              height: 0,
              fileSize: metadata.fileSize,
              format: metadata.format
            },
            qualityScore: {
              overall: 8.0, // Default assumed quality
              breakdown: {
                technical: 8,
                relevance: 8,
                aesthetic: 8,
                usability: 8
              }
            },
            status: 'approved', // ICS images are pre-approved
            isPrimary: false,
            license: {
              type: parsed.provider,
              attribution: '',
              commercial: true,
              url: ''
            },
            usageCount: 0,
            processedSizes: [],
            createdAt: new Date(parseInt(parsed.timestamp)),
            updatedAt: new Date()
          };
          images.push(imageEntry);
        }

        // Add processed size info
        imageEntry.processedSizes.push({
          size: size,
          path: `/categories/${categoryId}/${letter}/${itemName}/${size}/${file}`,
          width: 0,
          height: 0,
          fileSize: metadata.fileSize
        });

        // Update main file path to medium size
        if (size === 'medium') {
          imageEntry.filePath = `/categories/${categoryId}/${letter}/${itemName}/${size}/${file}`;
        }
      }
    } catch (error) {
      // Size folder doesn't exist, skip
      continue;
    }
  }

  return images;
}

// Category metadata for auto-creation
const categoryMetadata = {
  animals: { icon: '🐾', color: 'from-blue-400 to-cyan-300', group: 'educational', description: 'Meet amazing creatures from around the world!' },
  birds: { icon: '🐦', color: 'from-sky-400 to-blue-300', group: 'educational', description: 'Discover beautiful birds from around the world!' },
  flowers: { icon: '🌸', color: 'from-pink-400 to-rose-300', group: 'nature', description: 'Explore colorful and fragrant flowers!' },
  fruits: { icon: '🍎', color: 'from-green-400 to-emerald-300', group: 'educational', description: 'Discover delicious and healthy fruits!' },
  vegetables: { icon: '🥕', color: 'from-orange-400 to-amber-300', group: 'educational', description: 'Learn about nutritious vegetables!' },
  plants: { icon: '🌿', color: 'from-green-400 to-teal-300', group: 'nature', description: 'Explore the world of plants!' },
  transportation: { icon: '🚗', color: 'from-purple-400 to-pink-300', group: 'general', description: 'Explore vehicles that take us places!' },
  music: { icon: '🎵', color: 'from-violet-400 to-purple-300', group: 'arts', description: 'Discover musical instruments and concepts!' },
  sports: { icon: '⚽', color: 'from-red-400 to-orange-300', group: 'general', description: 'Learn about different sports and games!' },
  food: { icon: '🍔', color: 'from-yellow-400 to-orange-300', group: 'general', description: 'Explore different types of food!' }
};

// Create category if it doesn't exist
async function getOrCreateCategory(categoryId) {
  let category = await Category.findOne({ id: categoryId });

  if (!category) {
    const meta = categoryMetadata[categoryId] || {
      icon: '📦',
      color: 'from-gray-400 to-gray-300',
      group: 'general',
      description: `${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} collection`
    };

    category = new Category({
      id: categoryId,
      name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      icon: meta.icon,
      color: meta.color,
      difficulty: 'Medium',
      description: meta.description,
      status: 'active',
      completeness: 0,
      tags: ['auto-created'],
      metadata: {
        totalItems: 0,
        viewCount: 0
      },
      items: {}
    });

    await category.save();
    console.log(`  ✨ Created new category: ${category.name}`);
  }

  return category;
}

// Create item if it doesn't exist
function getOrCreateItem(category, letter, itemName) {
  if (!category.items[letter]) {
    category.items[letter] = [];
  }

  let item = category.items[letter].find(i =>
    i.id === itemName.toLowerCase() ||
    i.name.toLowerCase() === itemName.toLowerCase()
  );

  if (!item) {
    // Format item name (replace underscores with spaces, title case)
    const formattedName = itemName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    item = {
      id: itemName.toLowerCase().replace(/\s+/g, '_'),
      name: formattedName,
      image: '',
      imageAlt: `A ${formattedName.toLowerCase()}`,
      difficulty: 2,
      description: `Learn about ${formattedName}`,
      tags: ['auto-created'],
      status: 'published',
      approvalStatus: 'approved',
      images: [],
      collectionProgress: {
        status: 'pending',
        targetCount: 3,
        collectedCount: 0,
        approvedCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    category.items[letter].push(item);
    console.log(`  ✨ Created new item: ${formattedName} (${letter})`);
  }

  return item;
}

// Main import function
async function importImages() {
  console.log('🔍 Scanning ICS images folder...');
  console.log(`📁 Path: ${ICS_IMAGES_PATH}\n`);
  console.log('🌱 Auto-seeding enabled: Will create missing categories and items\n');

  let stats = {
    categoriesProcessed: 0,
    categoriesCreated: 0,
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    imagesImported: 0,
    errors: []
  };

  try {
    const categories = await fs.readdir(ICS_IMAGES_PATH);

    for (const categoryFolder of categories) {
      const categoryPath = path.join(ICS_IMAGES_PATH, categoryFolder);
      const categoryStat = await fs.stat(categoryPath);

      if (!categoryStat.isDirectory()) continue;

      console.log(`\n📦 Processing category: ${categoryFolder}`);

      // Get or create category
      const categoryBeforeCount = await Category.countDocuments({ id: categoryFolder });
      const category = await getOrCreateCategory(categoryFolder);
      if (categoryBeforeCount === 0) {
        stats.categoriesCreated++;
      }

      stats.categoriesProcessed++;
      const letters = await fs.readdir(categoryPath);

      for (const letter of letters) {
        const letterPath = path.join(categoryPath, letter);
        const letterStat = await fs.stat(letterPath);

        if (!letterStat.isDirectory()) continue;
        if (!/^[A-Z]$/.test(letter)) continue;

        const items = await fs.readdir(letterPath);

        for (const itemName of items) {
          const itemPath = path.join(letterPath, itemName);
          const itemStat = await fs.stat(itemPath);

          if (!itemStat.isDirectory()) continue;

          stats.itemsProcessed++;

          // Get or create item
          const itemBeforeLength = (category.items[letter] || []).length;
          const item = getOrCreateItem(category, letter, itemName);
          if ((category.items[letter] || []).length > itemBeforeLength) {
            stats.itemsCreated++;
          }

          // Scan images for this item
          const images = await scanItemImages(categoryPath, categoryFolder, letter, itemName);

          if (images.length > 0) {
            // Add images to item
            item.images = item.images || [];

            // Only add new images (check by sourceId)
            const existingSourceIds = new Set(
              item.images.map(img => `${img.sourceProvider}_${img.sourceId}`)
            );

            let newImagesCount = 0;
            for (const newImage of images) {
              const imageKey = `${newImage.sourceProvider}_${newImage.sourceId}`;
              if (!existingSourceIds.has(imageKey)) {
                item.images.push(newImage);
                newImagesCount++;
                stats.imagesImported++;
              }
            }

            // Set first image as primary if none exists
            if (!item.images.some(img => img.isPrimary) && item.images.length > 0) {
              item.images[0].isPrimary = true;
              item.image = item.images[0].filePath;
              item.imageAlt = `A ${item.name.toLowerCase()}`;
            }

            // Update collection progress
            if (!item.collectionProgress) {
              item.collectionProgress = {
                status: 'pending',
                targetCount: 3,
                collectedCount: 0,
                approvedCount: 0
              };
            }

            const approvedCount = item.images.filter(img => img.status === 'approved').length;
            item.collectionProgress.collectedCount = item.images.length;
            item.collectionProgress.approvedCount = approvedCount;

            // Mark as completed if at least 1 approved image (anything extra is bonus)
            if (approvedCount >= 1) {
              item.collectionProgress.status = 'completed';
              item.collectionProgress.completedAt = new Date();
            }

            if (newImagesCount > 0) {
              console.log(`  ✅ ${item.name} (${letter}): +${newImagesCount} images (total: ${item.images.length})`);
              stats.itemsUpdated++;
            }
          }
        }
      }

      // Save category - must mark ALL nested paths as modified for Mongoose to detect changes
      category.markModified('items');

      // Mark each letter's items array as modified
      Object.keys(category.items).forEach(letter => {
        category.markModified(`items.${letter}`);
        // Mark each item in the letter array as modified
        category.items[letter].forEach((item, index) => {
          if (item.images && item.images.length > 0) {
            category.markModified(`items.${letter}.${index}.images`);
            category.markModified(`items.${letter}.${index}.collectionProgress`);
          }
        });
      });

      await category.save();
      console.log(`  💾 Saved ${categoryFolder}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Categories processed:  ${stats.categoriesProcessed}`);
    console.log(`Categories created:    ${stats.categoriesCreated}`);
    console.log(`Items scanned:         ${stats.itemsProcessed}`);
    console.log(`Items created:         ${stats.itemsCreated}`);
    console.log(`Items updated:         ${stats.itemsUpdated}`);
    console.log(`Images imported:       ${stats.imagesImported}`);
    console.log(`Errors:                ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Run import
importImages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});