const Queue = require('bull');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const logger = require('../utils/logger');
const QualityAssessmentService = require('./QualityAssessmentService');

/**
 * Unified Image Collection Service
 *
 * This service integrates the Image Collection System functionality into the main API,
 * providing automated image collection, quality assessment, and workflow management.
 * It eliminates the need for manual download/upload processes.
 */

class ImageCollectionService {
  constructor() {
    this.qualityService = new QualityAssessmentService();
    this.initialized = false;

    // Queue configuration
    this.queueConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 50,
        attempts: 3,
        backoff: 'exponential'
      }
    };

    // Image source APIs
    this.apiClients = {
      unsplash: {
        baseUrl: 'https://api.unsplash.com',
        key: process.env.UNSPLASH_ACCESS_KEY,
        rateLimit: { requests: 50, per: 'hour' }
      },
      pixabay: {
        baseUrl: 'https://pixabay.com/api',
        key: process.env.PIXABAY_API_KEY,
        rateLimit: { requests: 100, per: 'hour' }
      },
      pexels: {
        baseUrl: 'https://api.pexels.com/v1',
        key: process.env.PEXELS_API_KEY,
        rateLimit: { requests: 200, per: 'hour' }
      }
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Image Collection Service...');

      // Initialize queues
      this.collectionQueue = new Queue('image collection', this.queueConfig.redis);
      this.processingQueue = new Queue('image processing', this.queueConfig.redis);

      // Set up queue processors
      await this.setupQueueProcessors();

      // Validate API keys
      await this.validateApiKeys();

      this.initialized = true;
      logger.info('Image Collection Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Image Collection Service:', error);
      throw error;
    }
  }

  async setupQueueProcessors() {
    // Category collection processor
    this.collectionQueue.process('category-collection', 3, async (job) => {
      return this.processCategoryCollection(job);
    });

    // Item collection processor
    this.collectionQueue.process('item-collection', 5, async (job) => {
      return this.processItemCollection(job);
    });

    // Image processing processor
    this.processingQueue.process('image-processing', 10, async (job) => {
      return this.processImageQualityAssessment(job);
    });

    // Queue event handlers
    this.collectionQueue.on('completed', (job, result) => {
      logger.info(`Collection job completed: ${job.id}`, { result });
    });

    this.collectionQueue.on('failed', (job, err) => {
      logger.error(`Collection job failed: ${job.id}`, { error: err.message });
    });

    this.processingQueue.on('completed', (job, result) => {
      logger.info(`Processing job completed: ${job.id}`, { result });
    });
  }

  async validateApiKeys() {
    const validationResults = {};

    for (const [provider, config] of Object.entries(this.apiClients)) {
      if (!config.key) {
        logger.warn(`No API key configured for ${provider}`);
        validationResults[provider] = { valid: false, reason: 'No API key' };
        continue;
      }

      try {
        // Test API connection
        const isValid = await this.testApiConnection(provider);
        validationResults[provider] = { valid: isValid };

        if (isValid) {
          logger.info(`${provider} API key validated successfully`);
        } else {
          logger.warn(`${provider} API key validation failed`);
        }

      } catch (error) {
        logger.error(`${provider} API key validation error:`, error);
        validationResults[provider] = { valid: false, reason: error.message };
      }
    }

    this.apiValidation = validationResults;
    return validationResults;
  }

  async testApiConnection(provider) {
    const config = this.apiClients[provider];

    try {
      switch (provider) {
        case 'unsplash':
          const unsplashResponse = await axios.get(`${config.baseUrl}/photos/random`, {
            params: { client_id: config.key, count: 1 },
            timeout: 5000
          });
          return unsplashResponse.status === 200;

        case 'pixabay':
          const pixabayResponse = await axios.get(`${config.baseUrl}/`, {
            params: { key: config.key, q: 'test', per_page: 3 },
            timeout: 5000
          });
          return pixabayResponse.status === 200;

        case 'pexels':
          const pexelsResponse = await axios.get(`${config.baseUrl}/search`, {
            params: { query: 'test', per_page: 1 },
            headers: { Authorization: config.key },
            timeout: 5000
          });
          return pexelsResponse.status === 200;

        default:
          return false;
      }
    } catch (error) {
      logger.error(`API test failed for ${provider}:`, error.message);
      return false;
    }
  }

  async startCategoryCollection(options) {
    const { category, priority = 'normal', forceRestart = false, specificItems = null, settings = {} } = options;

    try {
      logger.info(`Starting category collection: ${category.name}`, { categoryId: category.id });

      // Check if collection is already running
      if (!forceRestart) {
        const activeJobs = await this.getActiveCategoryJobs(category.id);
        if (activeJobs.length > 0) {
          throw new Error(`Collection already running for category: ${category.name}`);
        }
      }

      // Get items that need collection
      const pendingItems = category.getPendingCollectionItems();
      const itemsToCollect = specificItems
        ? pendingItems.filter(item => specificItems.includes(item.item.id))
        : pendingItems;

      if (itemsToCollect.length === 0) {
        throw new Error('No items need collection');
      }

      // Create collection job
      const jobData = {
        type: 'category-collection',
        categoryId: category.id,
        categoryName: category.name,
        items: itemsToCollect.map(item => ({
          letter: item.letter,
          itemId: item.item.id,
          itemName: item.item.name,
          priority: item.priority
        })),
        settings: {
          ...category.imageCollection.strategy,
          ...settings
        },
        startedAt: new Date()
      };

      const job = await this.collectionQueue.add('category-collection', jobData, {
        priority: this.getPriorityValue(priority),
        ...this.queueConfig.defaultJobOptions
      });

      // Update category collection start time
      category.imageCollection.progress.lastCollectionRun = new Date();
      await category.save();

      logger.info(`Category collection job created: ${job.id}`, {
        categoryId: category.id,
        itemCount: itemsToCollect.length
      });

      return {
        id: job.id,
        type: 'category-collection',
        categoryId: category.id,
        itemCount: itemsToCollect.length,
        estimatedDuration: this.estimateCollectionDuration(itemsToCollect),
        status: 'queued'
      };

    } catch (error) {
      logger.error(`Failed to start category collection: ${category.name}`, error);
      throw error;
    }
  }

  async startItemCollection(options) {
    const { category, letter, item, priority = 'high', settings = {} } = options;

    try {
      logger.info(`Starting item collection: ${item.name}`, {
        categoryId: category.id,
        letter,
        itemId: item.id
      });

      const jobData = {
        type: 'item-collection',
        categoryId: category.id,
        categoryName: category.name,
        letter,
        itemId: item.id,
        itemName: item.name,
        settings: {
          ...category.imageCollection.strategy,
          ...settings
        },
        startedAt: new Date()
      };

      const job = await this.collectionQueue.add('item-collection', jobData, {
        priority: this.getPriorityValue(priority),
        ...this.queueConfig.defaultJobOptions
      });

      // Update item collection status
      item.collectionProgress.status = 'collecting';
      item.collectionProgress.lastAttempt = new Date();
      item.collectionProgress.searchAttempts += 1;

      category.markModified('items');
      await category.save();

      return {
        id: job.id,
        type: 'item-collection',
        categoryId: category.id,
        itemId: item.id,
        estimatedDuration: this.estimateItemCollectionDuration(item),
        status: 'queued'
      };

    } catch (error) {
      logger.error(`Failed to start item collection: ${item.name}`, error);
      throw error;
    }
  }

  async processCategoryCollection(job) {
    const { categoryId, items, settings } = job.data;

    try {
      logger.info(`Processing category collection job: ${job.id}`, { categoryId, itemCount: items.length });

      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process items in batches to avoid overwhelming APIs
      const batchSize = 3;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const batchPromises = batch.map(async (itemData) => {
          try {
            // Create individual item collection job
            const itemJob = await this.collectionQueue.add('item-collection', {
              type: 'item-collection',
              categoryId,
              letter: itemData.letter,
              itemId: itemData.itemId,
              itemName: itemData.itemName,
              settings,
              parentJobId: job.id
            }, {
              priority: this.getPriorityValue('high'),
              ...this.queueConfig.defaultJobOptions
            });

            results.successful++;
            return { success: true, itemId: itemData.itemId, jobId: itemJob.id };

          } catch (error) {
            results.failed++;
            results.errors.push({
              itemId: itemData.itemId,
              error: error.message
            });
            return { success: false, itemId: itemData.itemId, error: error.message };
          }
        });

        await Promise.all(batchPromises);
        results.processed += batch.length;

        // Update job progress
        const progress = Math.round((results.processed / items.length) * 100);
        await job.progress(progress);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`Category collection job completed: ${job.id}`, { results });
      return results;

    } catch (error) {
      logger.error(`Category collection job failed: ${job.id}`, error);
      throw error;
    }
  }

  async processItemCollection(job) {
    const { categoryId, letter, itemId, itemName, settings } = job.data;

    try {
      logger.info(`Processing item collection: ${itemName}`, { categoryId, letter, itemId });

      // Load category and item
      const Category = require('../models/Category');
      const category = await Category.findOne({ id: categoryId });
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      const items = category.getItemsByLetter(letter);
      const item = items.find(i => i.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      const results = {
        itemId,
        itemName,
        imagesFound: 0,
        imagesProcessed: 0,
        imagesApproved: 0,
        sources: {},
        errors: []
      };

      // Determine search terms
      const searchTerms = this.generateSearchTerms(item, category, settings);

      // Collect from each source
      const prioritySources = settings.prioritySources || ['unsplash', 'pixabay', 'pexels'];
      const neededImages = Math.max(0, (settings.targetImagesPerItem || 3) - item.collectionProgress.approvedCount);

      if (neededImages === 0) {
        logger.info(`Item already has enough images: ${itemName}`);
        return results;
      }

      for (const source of prioritySources) {
        if (results.imagesApproved >= neededImages) break;

        try {
          const sourceResults = await this.collectFromSource({
            source,
            searchTerms,
            item,
            category,
            settings,
            maxImages: neededImages - results.imagesApproved
          });

          results.sources[source] = sourceResults;
          results.imagesFound += sourceResults.found;
          results.imagesProcessed += sourceResults.processed;
          results.imagesApproved += sourceResults.approved;

          // Update item progress
          item.collectionProgress.sources[source].found += sourceResults.found;
          item.collectionProgress.sources[source].approved += sourceResults.approved;
          item.collectionProgress.sources[source].lastSearched = new Date();

        } catch (error) {
          logger.error(`Source collection failed: ${source}`, error);
          results.errors.push({ source, error: error.message });

          // Log error in item progress
          item.collectionProgress.errors.push({
            timestamp: new Date(),
            source,
            message: error.message
          });
        }

        // Update job progress
        const sourceIndex = prioritySources.indexOf(source);
        const progress = Math.round(((sourceIndex + 1) / prioritySources.length) * 100);
        await job.progress(progress);
      }

      // Update item collection status
      item.collectionProgress.collectedCount += results.imagesProcessed;
      item.collectionProgress.approvedCount += results.imagesApproved;

      if (item.collectionProgress.approvedCount >= item.collectionProgress.targetCount) {
        item.collectionProgress.status = 'completed';
        item.collectionProgress.completedAt = new Date();
      } else if (item.collectionProgress.searchAttempts >= (settings.maxSearchAttempts || 5)) {
        item.collectionProgress.status = 'failed';
      } else {
        item.collectionProgress.status = 'pending';
        item.collectionProgress.nextAttempt = new Date(Date.now() + (settings.retryInterval || 24) * 60 * 60 * 1000);
      }

      // Update quality statistics
      const approvedImages = item.images.filter(img => img.status === 'approved');
      if (approvedImages.length > 0) {
        const qualityScores = approvedImages.map(img => img.qualityScore.overall);
        item.collectionProgress.averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        item.collectionProgress.bestQualityScore = Math.max(...qualityScores);
      }

      category.markModified('items');
      await category.save();

      logger.info(`Item collection completed: ${itemName}`, { results });
      return results;

    } catch (error) {
      logger.error(`Item collection failed: ${itemName}`, error);

      // Update item status to failed
      try {
        const Category = require('../models/Category');
        const category = await Category.findOne({ id: categoryId });
        if (category) {
          const items = category.getItemsByLetter(letter);
          const item = items.find(i => i.id === itemId);
          if (item) {
            item.collectionProgress.status = 'failed';
            item.collectionProgress.errors.push({
              timestamp: new Date(),
              source: 'collection-service',
              message: error.message
            });
            category.markModified('items');
            await category.save();
          }
        }
      } catch (saveError) {
        logger.error('Failed to update item status after error:', saveError);
      }

      throw error;
    }
  }

  async collectFromSource(options) {
    const { source, searchTerms, item, category, settings, maxImages } = options;

    const results = {
      source,
      found: 0,
      processed: 0,
      approved: 0,
      images: []
    };

    if (!this.apiValidation[source]?.valid) {
      throw new Error(`${source} API not available`);
    }

    try {
      // Search for images
      const searchResults = await this.searchImages(source, searchTerms, {
        perPage: Math.min(maxImages * 2, 20), // Get more than needed for quality filtering
        safeSearch: true
      });

      results.found = searchResults.length;

      // Process each image
      for (const imageData of searchResults.slice(0, maxImages)) {
        try {
          // Download and process image
          const processedImage = await this.processImageFromSource(imageData, source, item, category);

          if (processedImage) {
            // Add to item's images array
            item.images.push(processedImage);
            results.images.push(processedImage);
            results.processed++;

            // Auto-approve high quality images
            if (processedImage.qualityScore.overall >= (settings.autoApprovalThreshold || 8.5)) {
              processedImage.status = 'approved';
              processedImage.approvedAt = new Date();
              processedImage.approvedBy = 'auto-approval';
              results.approved++;

              // Set as primary if it's the first approved image
              if (!item.images.some(img => img.isPrimary && img.status === 'approved')) {
                processedImage.isPrimary = true;
                item.image = processedImage.filePath;
                item.imageAlt = `A ${item.name.toLowerCase()}`;
              }
            }
          }

        } catch (imageError) {
          logger.error(`Failed to process image from ${source}:`, imageError);
          // Continue with next image
        }
      }

      return results;

    } catch (error) {
      logger.error(`Failed to collect from ${source}:`, error);
      throw error;
    }
  }

  async searchImages(source, searchTerms, options = {}) {
    const config = this.apiClients[source];
    if (!config) {
      throw new Error(`Unknown source: ${source}`);
    }

    // Try each search term until we get results
    for (const term of searchTerms) {
      try {
        const results = await this.performSearch(source, term, options);
        if (results.length > 0) {
          return results;
        }
      } catch (error) {
        logger.warn(`Search failed for term "${term}" on ${source}:`, error.message);
      }
    }

    return [];
  }

  async performSearch(source, searchTerm, options) {
    const config = this.apiClients[source];

    try {
      switch (source) {
        case 'unsplash':
          return this.searchUnsplash(searchTerm, options);
        case 'pixabay':
          return this.searchPixabay(searchTerm, options);
        case 'pexels':
          return this.searchPexels(searchTerm, options);
        default:
          throw new Error(`Search not implemented for ${source}`);
      }
    } catch (error) {
      logger.error(`Search error on ${source}:`, error);
      throw error;
    }
  }

  async searchUnsplash(query, options = {}) {
    const config = this.apiClients.unsplash;

    const response = await axios.get(`${config.baseUrl}/search/photos`, {
      params: {
        client_id: config.key,
        query,
        per_page: options.perPage || 10,
        order_by: 'relevance'
      },
      timeout: 10000
    });

    return response.data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      downloadUrl: photo.urls.full,
      width: photo.width,
      height: photo.height,
      description: photo.description || photo.alt_description,
      photographer: photo.user.name,
      source: 'unsplash',
      license: {
        type: 'unsplash',
        attribution: `Photo by ${photo.user.name} on Unsplash`,
        commercial: true,
        url: photo.links.html
      }
    }));
  }

  async searchPixabay(query, options = {}) {
    const config = this.apiClients.pixabay;

    const response = await axios.get(`${config.baseUrl}/`, {
      params: {
        key: config.key,
        q: query,
        per_page: options.perPage || 10,
        safesearch: 'true',
        order: 'popular',
        min_width: 640,
        min_height: 640
      },
      timeout: 10000
    });

    return response.data.hits.map(photo => ({
      id: photo.id.toString(),
      url: photo.webformatURL,
      downloadUrl: photo.largeImageURL,
      width: photo.imageWidth,
      height: photo.imageHeight,
      description: photo.tags,
      photographer: photo.user,
      source: 'pixabay',
      license: {
        type: 'pixabay',
        attribution: `Image by ${photo.user} from Pixabay`,
        commercial: true,
        url: photo.pageURL
      }
    }));
  }

  async searchPexels(query, options = {}) {
    const config = this.apiClients.pexels;

    const response = await axios.get(`${config.baseUrl}/search`, {
      params: {
        query,
        per_page: options.perPage || 10
      },
      headers: {
        Authorization: config.key
      },
      timeout: 10000
    });

    return response.data.photos.map(photo => ({
      id: photo.id.toString(),
      url: photo.src.large,
      downloadUrl: photo.src.original,
      width: photo.width,
      height: photo.height,
      description: photo.alt,
      photographer: photo.photographer,
      source: 'pexels',
      license: {
        type: 'pexels',
        attribution: `Photo by ${photo.photographer} from Pexels`,
        commercial: true,
        url: photo.url
      }
    }));
  }

  async processImageFromSource(imageData, source, item, category) {
    try {
      // Download image
      const imageBuffer = await this.downloadImage(imageData.downloadUrl);

      // Generate file path
      const fileName = `${item.id}-${source}-${imageData.id}.webp`;
      const relativePath = path.join('categories', category.id, item.letter, item.id, fileName);
      const fullPath = path.join(process.env.IMAGES_DIRECTORY || './images', relativePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Process and save image
      const processedBuffer = await this.processImageBuffer(imageBuffer);
      await fs.writeFile(fullPath, processedBuffer);

      // Get image metadata
      const metadata = await this.getImageMetadata(processedBuffer);

      // Assess quality
      const qualityScore = await this.qualityService.assessImage(processedBuffer, {
        itemName: item.name,
        category: category.name,
        expectedWidth: 400,
        expectedHeight: 400
      });

      return {
        sourceUrl: imageData.url,
        sourceProvider: source,
        sourceId: imageData.id,
        filePath: `/${relativePath.replace(/\\\\/g, '/')}`,
        fileName,
        metadata,
        qualityScore,
        status: qualityScore.overall >= 7.0 ? 'pending' : 'rejected',
        isPrimary: false,
        license: imageData.license,
        usageCount: 0,
        processedSizes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error) {
      logger.error('Failed to process image from source:', error);
      throw error;
    }
  }

  generateSearchTerms(item, category, settings) {
    const terms = [item.name];

    // Add category context
    if (category.name.toLowerCase() !== item.name.toLowerCase()) {
      terms.push(`${item.name} ${category.name.toLowerCase()}`);
    }

    // Add custom search terms
    if (settings.customSearchTerms) {
      terms.push(...settings.customSearchTerms);
    }

    // Add variations
    const variations = this.generateSearchVariations(item.name);
    terms.push(...variations);

    return [...new Set(terms)]; // Remove duplicates
  }

  generateSearchVariations(itemName) {
    const variations = [];
    const name = itemName.toLowerCase();

    // Plural/singular variations
    if (name.endsWith('s')) {
      variations.push(name.slice(0, -1));
    } else {
      variations.push(name + 's');
    }

    // Add descriptive terms
    variations.push(`${name} animal`, `${name} fruit`, `${name} vehicle`, `${name} object`);

    return variations;
  }

  // Utility methods
  getPriorityValue(priority) {
    const priorities = { low: 1, normal: 5, high: 10, urgent: 15 };
    return priorities[priority] || 5;
  }

  estimateCollectionDuration(items) {
    // Estimate based on number of items and their difficulty
    const avgTimePerItem = 30; // seconds
    return items.length * avgTimePerItem * 1000; // milliseconds
  }

  estimateItemCollectionDuration(item) {
    const baseTime = 30000; // 30 seconds base
    const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2, very_hard: 3 };
    const multiplier = difficultyMultiplier[item.collectionProgress?.difficulty] || 1.5;
    return baseTime * multiplier;
  }

  // Queue management methods
  async getActiveCategoryJobs(categoryId) {
    const activeJobs = await this.collectionQueue.getJobs(['waiting', 'active']);
    return activeJobs.filter(job => job.data.categoryId === categoryId);
  }

  async getQueueStatus(options = {}) {
    const { status = 'all', priority = 'all', limit = 50, offset = 0 } = options;

    const [waiting, active, completed, failed] = await Promise.all([
      this.collectionQueue.getJobs(['waiting'], offset, offset + limit),
      this.collectionQueue.getJobs(['active'], 0, 100),
      this.collectionQueue.getJobs(['completed'], offset, offset + limit),
      this.collectionQueue.getJobs(['failed'], offset, offset + limit)
    ]);

    const jobs = [...waiting, ...active, ...completed, ...failed];

    return {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
      failed: failed.length,
      total: jobs.length,
      jobs: jobs.slice(0, limit)
    };
  }

  async processQueue(options = {}) {
    const { maxJobs = 5, categories = null, priority = 'normal' } = options;

    // This would trigger automated processing
    // Implementation depends on your specific queue management strategy

    return {
      jobsStarted: 0,
      categoriesProcessed: 0,
      estimatedCompletionTime: 0,
      queueStatus: await this.getQueueStatus()
    };
  }

  // Placeholder methods that would be implemented with actual image processing libraries
  async downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(response.data);
  }

  async processImageBuffer(buffer) {
    // Would use Sharp or similar to convert to WebP, resize, etc.
    return buffer;
  }

  async getImageMetadata(buffer) {
    // Would use Sharp or similar to extract metadata
    return {
      width: 400,
      height: 400,
      fileSize: buffer.length,
      format: 'webp'
    };
  }

  async cancelJob(jobId) {
    const job = await this.collectionQueue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.remove();
    return { status: 'cancelled', cancelledAt: new Date() };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.collectionQueue.getWaiting(),
      this.collectionQueue.getActive(),
      this.collectionQueue.getCompleted(),
      this.collectionQueue.getFailed()
    ]);

    return {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
      failed: failed.length,
      totalProcessed: completed.length + failed.length
    };
  }

  async getRecentJobs(limit = 10) {
    const recentJobs = await this.collectionQueue.getJobs(['completed', 'failed'], 0, limit);
    return recentJobs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Image processing queue handler
  async processImageQualityAssessment(job) {
    const { imageId, categoryId, letter, itemId, imageBuffer, context } = job.data;

    try {
      logger.info(`Processing image quality assessment: ${imageId}`, { categoryId, letter, itemId });

      // Assess image quality
      const qualityScore = await this.qualityService.assessImage(imageBuffer, context);

      // Update image in database
      const Category = require('../models/Category');
      const category = await Category.findOne({ id: categoryId });

      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      const item = category.items[letter]?.find(item => item.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId} in ${categoryId}/${letter}`);
      }

      const image = item.images.find(img => img.sourceId === imageId);
      if (!image) {
        throw new Error(`Image not found: ${imageId}`);
      }

      // Update quality score
      image.qualityScore = qualityScore;

      // Auto-approve/reject based on quality
      if (qualityScore.overall >= (context.autoApprovalThreshold || 8.5)) {
        image.status = 'approved';
        image.approvedAt = new Date();
        image.approvedBy = 'auto-approval';

        // Set as primary if it's the first approved image
        if (!item.images.some(img => img.isPrimary && img.status === 'approved')) {
          image.isPrimary = true;
          item.image = image.filePath;
        }
      } else if (qualityScore.overall < (context.minQualityThreshold || 5.0)) {
        image.status = 'rejected';
        image.rejectionReason = 'Quality score too low';
        image.rejectedAt = new Date();
      } else {
        image.status = 'manual_review';
      }

      // Update collection progress
      if (item.collectionProgress) {
        const approvedCount = item.images.filter(img => img.status === 'approved').length;
        item.collectionProgress.approvedCount = approvedCount;

        if (approvedCount >= item.collectionProgress.targetCount) {
          item.collectionProgress.status = 'completed';
          item.collectionProgress.completedAt = new Date();
        }

        // Update quality statistics
        const approvedImages = item.images.filter(img => img.status === 'approved');
        if (approvedImages.length > 0) {
          const qualityScores = approvedImages.map(img => img.qualityScore.overall);
          item.collectionProgress.averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
          item.collectionProgress.bestQualityScore = Math.max(...qualityScores);
        }
      }

      // Save changes
      category.markModified('items');
      await category.save();

      logger.info(`Image quality assessment completed: ${imageId}`, {
        qualityScore: qualityScore.overall,
        status: image.status,
        isPrimary: image.isPrimary
      });

      return {
        imageId,
        qualityScore,
        status: image.status,
        isPrimary: image.isPrimary,
        approvedCount: item.collectionProgress?.approvedCount,
        collectionStatus: item.collectionProgress?.status
      };

    } catch (error) {
      logger.error(`Image quality assessment failed: ${imageId}`, error);

      // Try to update image status to failed
      try {
        const Category = require('../models/Category');
        const category = await Category.findOne({ id: categoryId });
        if (category) {
          const item = category.items[letter]?.find(item => item.id === itemId);
          if (item) {
            const image = item.images.find(img => img.sourceId === imageId);
            if (image) {
              image.status = 'rejected';
              image.rejectionReason = `Processing failed: ${error.message}`;
              image.rejectedAt = new Date();
              category.markModified('items');
              await category.save();
            }
          }
        }
      } catch (saveError) {
        logger.error('Failed to update image status after processing error:', saveError);
      }

      throw error;
    }
  }
}

module.exports = ImageCollectionService;