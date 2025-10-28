const express = require('express');
const asyncHandler = require('express-async-handler');
const path = require('path');
const router = express.Router();

const Category = require('../models/Category');
const Item = require('../models/Item');
const CategoryImage = require('../models/CategoryImage');
const logger = require('winston');

// Import apiClientManager for enhanced search functionality
const ImageDownloader = require('../services/download/ImageDownloader');

/**
 * ICS Compatibility Routes
 * These endpoints maintain compatibility with the original ICS dashboard
 */

// @desc    Collect selected images for an item (Direct S3 Upload)
// @route   POST /api/v1/collect/selected
// @access  Admin
router.post('/collect/selected', asyncHandler(async (req, res) => {
  try {
    const { category, letter, itemName, selectedImages } = req.body;

    logger.info('Collect selected request (Direct S3):', {
      category,
      letter,
      itemName,
      selectedImagesCount: selectedImages?.length
    });

    if (!category || !letter || !itemName || !selectedImages) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: category, letter, itemName, selectedImages'
      });
    }

    // Ensure category exists
    let categoryDoc = await Category.findOne({ id: category });

    // If category doesn't exist, create it
    if (!categoryDoc) {
      logger.info('Category not found, creating new category:', { category });

      categoryDoc = new Category({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        icon: '📦',
        color: 'from-gray-400 to-gray-300',
        difficulty: 'Medium',
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} collection`,
        status: 'active',
        tags: ['auto-created'],
        items: {},
        createdBy: 'ics-system',
        createdAt: new Date()
      });

      await categoryDoc.save();
    }

    // Find or create the item in the separated Items collection
    const upperLetter = letter.toUpperCase();
    const itemId = itemName.toLowerCase().replace(/\s+/g, '-');

    let item = await Item.findOne({
      id: itemId,
      categoryId: category,
      letter: upperLetter
    });

    // If item doesn't exist, create it
    if (!item) {
      logger.info('Item not found, creating new item in Items collection:', {
        category,
        letter: upperLetter,
        itemName
      });

      item = new Item({
        id: itemId,
        name: itemName,
        letter: upperLetter,
        categoryId: category,
        categoryName: categoryDoc.name,
        categoryIcon: categoryDoc.icon,
        categoryColor: categoryDoc.color,
        description: `A ${itemName.toLowerCase()}`,
        tags: [category],
        difficulty: 1,
        status: 'draft',
        imageIds: [],
        createdAt: new Date(),
        createdBy: 'ics-system'
      });

      await item.save();

      logger.info('Created new item in Items collection:', { itemId: item.id });
    }

    // Initialize ImageCollector service
    const imageCollector = new ImageCollector();
    await imageCollector.initialize();

    // Process each selected image and create CategoryImage documents
    const processedImageIds = [];
    const errors = [];
    let primaryImageSet = false;

    for (let index = 0; index < selectedImages.length; index++) {
      const img = selectedImages[index];

      try {
        logger.info(`Processing selected image ${index + 1}/${selectedImages.length}:`, {
          source: img.source,
          id: img.id
        });

        // Transform selected image to match ImageCollector format
        const imageData = {
          id: img.id || img.sourceId,
          source: img.source || 'manual',
          url: img.url,
          sourceUrl: img.url,
          sourceId: img.id || img.sourceId,
          purpose: 'primary',
          license: {
            type: img.source,
            attribution: img.attribution || '',
            commercial: true,
            url: img.licenseUrl || ''
          }
        };

        // Use ImageCollector's processImageCandidate method (uploads to S3)
        const imageRecord = await imageCollector.processImageCandidate(
          imageData,
          category,
          upperLetter,
          itemName,
          {
            uploadToCloud: true,  // Direct S3 upload
            manuallySelected: true  // Auto-approve manually selected images
          }
        );

        // Create CategoryImage document in separated collection
        const categoryImage = new CategoryImage({
          itemId: item.id,
          categoryId: category,
          letter: upperLetter,
          filePath: imageRecord.filePath || imageRecord.sourceUrl,
          fileName: imageRecord.fileName || `${itemId}-${index}.jpg`,
          altText: imageRecord.altText || `${itemName} image`,
          isPrimary: !primaryImageSet, // First image is primary
          status: 'approved', // Manually selected images are auto-approved
          source: {
            provider: imageRecord.source || img.source || 'manual',
            sourceId: imageRecord.sourceId || img.id,
            sourceUrl: imageRecord.sourceUrl || img.url,
            license: imageRecord.license?.type || img.source || 'manual',
            attribution: imageRecord.license?.attribution || img.attribution || '',
            commercial: true
          },
          metadata: {
            width: imageRecord.metadata?.width || 800,
            height: imageRecord.metadata?.height || 600,
            fileSize: imageRecord.metadata?.fileSize || 0,
            format: imageRecord.metadata?.format || 'jpg'
          },
          qualityScore: imageRecord.qualityScore || {
            overall: 8.0,
            breakdown: {
              technical: 8.0,
              relevance: 8.0,
              aesthetic: 8.0,
              usability: 8.0
            }
          },
          approvedAt: new Date(),
          approvedBy: 'ics-system',
          createdBy: 'ics-system'
        });

        await categoryImage.save();
        processedImageIds.push(categoryImage._id);

        // Set as primary image on item if first
        if (!primaryImageSet) {
          item.primaryImageId = categoryImage._id;
          item.image = categoryImage.filePath; // Legacy field for backward compatibility
          primaryImageSet = true;
        }

        logger.info(`Successfully created CategoryImage ${index + 1}:`, {
          imageId: categoryImage._id,
          itemId: item.id,
          isPrimary: categoryImage.isPrimary
        });

      } catch (error) {
        logger.error(`Failed to process selected image ${index + 1}:`, {
          url: img.url,
          error: error.message
        });
        errors.push({
          index: index + 1,
          url: img.url,
          error: error.message
        });
      }
    }

    if (processedImageIds.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process any images',
        errors
      });
    }

    // Update item with new image references
    item.imageIds = [...new Set([...item.imageIds, ...processedImageIds])]; // Deduplicate
    item.metadata.imageCount = item.imageIds.length;
    item.status = 'published'; // Auto-publish items with images
    item.updatedAt = new Date();

    await item.save();

    logger.info(`Updated Item with ${processedImageIds.length} new images:`, {
      itemId: item.id,
      totalImages: item.imageIds.length
    });

    logger.info(`Collected ${processedImageIds.length} images (Direct S3) for ${category}/${letter}/${itemName}`);

    res.json({
      success: true,
      message: `Successfully collected ${processedImageIds.length} images to S3`,
      data: {
        category,
        letter: upperLetter,
        itemName,
        itemId: item.id,
        imagesAdded: processedImageIds.length,
        totalImages: item.imageIds.length,
        cloudUpload: true,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('Failed to collect selected images:', {
      error: error.message,
      stack: error.stack,
      category: req.body.category,
      letter: req.body.letter,
      itemName: req.body.itemName
    });
    res.status(500).json({
      success: false,
      error: 'Failed to collect images',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// @desc    Enhanced search for images from external APIs
// @route   GET /api/v1/search/enhanced
// @access  Public
router.get('/search/enhanced', asyncHandler(async (req, res) => {
  try {
    const {
      query,
      category,
      maxTotalResults = 20,
      maxResultsPerSource = 15,
      sources = null
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    logger.info(`Enhanced search request: ${query}`, {
      category,
      maxTotalResults,
      maxResultsPerSource
    });

    // Use apiClientManager directly for search (no need for full ImageCollector)
    const { apiClientManager } = require('../services/apiClients');
    await apiClientManager.initialize();

    // Perform enhanced search using apiClientManager directly
    const searchOptions = {
      maxResultsPerSource: parseInt(maxResultsPerSource),
      timeout: 30000,
      excludeSources: [],
      prioritySources: sources ? sources.split(',') : []
    };

    const searchResults = await apiClientManager.enhancedSearchAllSources(
      query,
      category || 'general',
      searchOptions
    );

    // Transform results to match expected API response format
    const transformedResults = searchResults.images.map((image, index) => ({
      id: image.id || `${image.source}_${index}`,
      url: image.url || image.webformatURL, // Frontend expects 'url' not 'sourceUrl'
      sourceUrl: image.url || image.webformatURL, // Keep for backward compatibility
      thumbnailUrl: image.thumbnailUrl || image.webformatURL,
      previewUrl: image.previewUrl || image.webformatURL,
      source: image.source,
      sourceId: image.sourceId || image.id,
      title: image.title || image.alt || query,
      description: image.description || image.tags || query, // Fallback to query if no description
      width: image.width,
      height: image.height,
      license: image.license || {
        type: image.source,
        attribution: image.attribution || '',
        commercial: image.commercial !== false,
        url: image.licenseUrl || ''
      },
      tags: Array.isArray(image.tags) ? image.tags : (image.tags || '').split(',').map(t => t.trim()),
      relevanceScore: image.relevanceScore || 1.0,
      qualityScore: image.qualityScore || null
    })).slice(0, parseInt(maxTotalResults));

    const responseData = {
      success: true,
      result: {
        images: transformedResults,
        totalImages: searchResults.totalImages || transformedResults.length,
        count: transformedResults.length,
        query: query,
        category: category || 'general',
        sources: searchResults.successfulSources || [],
        searchTime: searchResults.searchTime || 0
      },
      // Keep backward compatibility
      data: transformedResults,
      count: transformedResults.length,
      totalFound: searchResults.totalImages || transformedResults.length,
      query: query,
      category: category || 'general',
      sources: searchResults.successfulSources || [],
      searchTime: searchResults.searchTime || 0,
      metadata: {
        maxResultsPerSource: parseInt(maxResultsPerSource),
        maxTotalResults: parseInt(maxTotalResults),
        sourcesSearched: searchResults.sourcesSearched || 0,
        successfulSources: searchResults.successfulSources?.length || 0,
        errors: searchResults.errors || []
      }
    };

    logger.info(`Enhanced search completed: ${query}`, {
      resultsFound: transformedResults.length,
      totalAvailable: searchResults.totalImages,
      sourcesUsed: searchResults.successfulSources?.length || 0
    });

    res.json(responseData);

  } catch (error) {
    logger.error('Enhanced search failed:', {
      query: req.query.query,
      category: req.query.category,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Enhanced search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// @desc    Search categories/items using Item collection
// @route   GET /api/v1/categories/search/:query
// @access  Public
router.get('/categories/search/:query', asyncHandler(async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20, category } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Build query for Item collection
    const searchQuery = {
      status: { $in: ['published', 'draft'] } // Include both published and draft items
    };

    if (category) {
      searchQuery.categoryId = category;
    }

    const searchTerm = query.toLowerCase();

    // Use text search or regex search for name, description, and tags
    searchQuery.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } },
      { searchKeywords: { $in: [new RegExp(searchTerm, 'i')] } }
    ];

    // Query Item collection directly
    const items = await Item.find(searchQuery)
      .select('id name description tags letter categoryId categoryName categoryIcon categoryColor image imageIds')
      .sort({ 'metadata.popularityScore': -1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    // Format results for backward compatibility
    const results = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      tags: item.tags || [],
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryIcon: item.categoryIcon,
      categoryColor: item.categoryColor,
      letter: item.letter,
      image: item.image,
      imageCount: item.imageIds?.length || 0
    }));

    res.json({
      success: true,
      data: results,
      count: results.length,
      query: query
    });

  } catch (error) {
    logger.error('Failed to search items:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
}));

// @desc    Collect images for a single item
// @route   POST /api/v1/collect/item
// @access  Public
router.post('/collect/item', asyncHandler(async (req, res) => {
  try {
    const { category, letter, itemName, targetCount = 3, options = {} } = req.body;

    if (!category || !letter || !itemName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: category, letter, itemName'
      });
    }

    logger.info(`Starting item collection: ${category}/${letter}/${itemName}`, {
      targetCount,
      options
    });

    // Initialize ImageCollector
    const imageCollector = new ImageCollector();
    await imageCollector.initialize();

    // Collect images for the item
    const result = await imageCollector.collectImagesForItem(
      category,
      letter,
      itemName,
      {
        targetCount,
        maxRetries: 3,
        minQualityScore: 7.0,
        useAiGeneration: options.useAiGeneration !== false,
        uploadToCloud: options.uploadToCloud !== false,
        ...options
      }
    );

    res.json({
      success: true,
      message: `Successfully collected ${result.approvedCount} images for ${itemName}`,
      data: {
        category,
        letter,
        itemName,
        targetCount,
        collectedCount: result.collectedCount,
        approvedCount: result.approvedCount,
        rejectedCount: result.rejectedCount,
        images: result.images,
        processingTime: Date.now() - req.startTime || 0
      }
    });

  } catch (error) {
    logger.error('Item collection failed:', {
      category: req.body.category,
      letter: req.body.letter,
      itemName: req.body.itemName,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Item collection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// @desc    Collect images for entire category
// @route   POST /api/v1/collect/category
// @access  Public
router.post('/collect/category', asyncHandler(async (req, res) => {
  try {
    const { category, options = {} } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: category'
      });
    }

    logger.info(`Starting category collection: ${category}`, { options });

    // Get category document
    const categoryDoc = await Category.findOne({ id: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        error: `Category not found: ${category}`
      });
    }

    // Initialize ImageCollector
    const imageCollector = new ImageCollector();
    await imageCollector.initialize();

    const results = {
      category,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      totalImages: 0,
      itemResults: {},
      errors: []
    };

    // Collect for all items in all letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const letter of alphabet) {
      if (categoryDoc.items[letter] && categoryDoc.items[letter].length > 0) {
        for (const item of categoryDoc.items[letter]) {
          results.totalItems++;
          results.processedItems++;

          try {
            logger.info(`Collecting for ${category}/${letter}/${item.name}`);

            const itemResult = await imageCollector.collectImagesForItem(
              category,
              letter,
              item.name,
              {
                targetCount: options.targetCount || 3,
                maxRetries: 2, // Reduced for bulk operations
                minQualityScore: options.minQualityScore || 7.0,
                useAiGeneration: options.useAiGeneration !== false,
                uploadToCloud: options.uploadToCloud !== false,
                ...options
              }
            );

            results.successfulItems++;
            results.totalImages += itemResult.approvedCount;
            results.itemResults[`${letter}/${item.name}`] = {
              success: true,
              collectedCount: itemResult.collectedCount,
              approvedCount: itemResult.approvedCount,
              rejectedCount: itemResult.rejectedCount
            };

            logger.info(`Completed ${category}/${letter}/${item.name}`, {
              approved: itemResult.approvedCount
            });

          } catch (error) {
            results.failedItems++;
            results.errors.push({
              item: `${letter}/${item.name}`,
              error: error.message
            });

            results.itemResults[`${letter}/${item.name}`] = {
              success: false,
              error: error.message
            };

            logger.error(`Failed ${category}/${letter}/${item.name}:`, error);
          }
        }
      }
    }

    logger.info(`Category collection completed: ${category}`, {
      totalItems: results.totalItems,
      successful: results.successfulItems,
      failed: results.failedItems,
      totalImages: results.totalImages
    });

    res.json({
      success: true,
      message: `Category collection completed: ${results.successfulItems}/${results.totalItems} items successful`,
      data: results
    });

  } catch (error) {
    logger.error('Category collection failed:', {
      category: req.body.category,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Category collection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// @desc    Download images using the new ImageDownloader service
// @route   POST /api/v1/download/images
// @access  Public
router.post('/download/images', asyncHandler(async (req, res) => {
  try {
    const { itemName, category, options = {} } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: itemName, category'
      });
    }

    logger.info(`Starting download: ${itemName} in ${category}`, { options });

    // Initialize ImageDownloader
    const imageDownloader = new ImageDownloader();
    await imageDownloader.initialize();

    // Download using the enhanced API client method
    const downloads = await imageDownloader.downloadWithApiClients(
      itemName,
      category,
      {
        countPerSource: options.countPerSource || 3,
        maxTotalResults: options.maxTotalResults || 10,
        sources: options.sources || ['unsplash', 'pixabay', 'pexels']
      }
    );

    const downloadStats = await imageDownloader.getDownloadStats();

    res.json({
      success: true,
      message: `Successfully downloaded ${downloads.length} images for ${itemName}`,
      data: {
        itemName,
        category,
        downloads,
        count: downloads.length,
        downloadStats,
        processingTime: Date.now() - req.startTime || 0
      }
    });

  } catch (error) {
    logger.error('Image download failed:', {
      itemName: req.body.itemName,
      category: req.body.category,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Image download failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

module.exports = router;