const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { apiClientManager } = require('../apiClients');
const logger = require('../../utils/logger');

class ImageDownloader {
  constructor() {
    this.apiKeys = {
      unsplash: process.env.UNSPLASH_ACCESS_KEY,
      pixabay: process.env.PIXABAY_API_KEY,
      pexels: process.env.PEXELS_API_KEY
    };
    this.rateLimiters = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize API client manager
      await apiClientManager.initialize();

      // Setup rate limiters
      this.setupRateLimiters();

      this.initialized = true;
      logger.info('ImageDownloader initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ImageDownloader', error);
      throw error;
    }
  }

  setupRateLimiters() {
    const limits = {
      unsplash: { requests: 50, period: 3600000 }, // 50 per hour
      pixabay: { requests: 100, period: 3600000 },  // 100 per hour
      pexels: { requests: 200, period: 3600000 }    // 200 per hour
    };

    Object.entries(limits).forEach(([source, limit]) => {
      this.rateLimiters.set(source, {
        requests: [],
        limit: limit.requests,
        period: limit.period,
        nextReset: Date.now() + limit.period
      });
    });

    logger.debug('Rate limiters configured for all sources');
  }

  async downloadImage(imageUrl, savePath, options = {}) {
    try {
      // Add user agent and headers to avoid blocking
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Visual-Vocabulary-Platform/1.0',
          'Accept': 'image/*',
          ...options.headers
        },
        timeout: 30000 // 30 second timeout
      });

      const buffer = Buffer.from(response.data);

      // Validate it's actually an image
      const imageInfo = await this.validateImageBuffer(buffer);
      if (!imageInfo.valid) {
        throw new Error('Downloaded file is not a valid image');
      }

      // Ensure directory exists
      await fs.ensureDir(path.dirname(savePath));

      // Save original
      await fs.writeFile(savePath, buffer);

      return {
        buffer,
        filePath: savePath,
        size: buffer.length,
        dimensions: imageInfo.dimensions,
        format: imageInfo.format,
        downloadedAt: new Date()
      };
    } catch (error) {
      logger.error(`Download failed for ${imageUrl}:`, error.message);
      throw error;
    }
  }

  async validateImageBuffer(buffer) {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(buffer).metadata();

      return {
        valid: true,
        dimensions: { width: metadata.width, height: metadata.height },
        format: metadata.format,
        size: buffer.length
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Unsplash API Integration
  async downloadFromUnsplash(searchTerm, count = 5) {
    await this.respectRateLimit('unsplash');

    try {
      const response = await axios.get(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=${count}&orientation=all`,
        {
          headers: {
            'Authorization': `Client-ID ${this.apiKeys.unsplash}`,
            'Accept-Version': 'v1'
          }
        }
      );

      const data = response.data;
      const downloads = [];

      for (const photo of data.results) {
        try {
          const fileName = `unsplash_${photo.id}_${Date.now()}.jpg`;
          const savePath = path.join('./images/temp', fileName);

          const imageData = await this.downloadImage(photo.urls.regular, savePath);

          downloads.push({
            ...imageData,
            sourceId: photo.id,
            source: 'unsplash',
            originalUrl: photo.urls.regular,
            attribution: `Photo by ${photo.user.name} on Unsplash`,
            license: 'unsplash',
            tags: photo.tags?.map(tag => tag.title) || [],
            description: photo.description || photo.alt_description
          });
        } catch (error) {
          logger.error(`Failed to download Unsplash image ${photo.id}:`, error);
        }
      }

      return downloads;
    } catch (error) {
      logger.error('Unsplash search failed:', error);
      return [];
    }
  }

  // Pixabay API Integration
  async downloadFromPixabay(searchTerm, count = 5) {
    await this.respectRateLimit('pixabay');

    try {
      const response = await axios.get(
        `https://pixabay.com/api/?key=${this.apiKeys.pixabay}&q=${encodeURIComponent(searchTerm)}&image_type=photo&per_page=${count}&safesearch=true&min_width=800&min_height=600`,
        {
          headers: { 'Accept': 'application/json' }
        }
      );

      const data = response.data;
      const downloads = [];

      for (const image of data.hits) {
        try {
          const fileName = `pixabay_${image.id}_${Date.now()}.jpg`;
          const savePath = path.join('./images/temp', fileName);

          const imageData = await this.downloadImage(image.largeImageURL, savePath);

          downloads.push({
            ...imageData,
            sourceId: image.id,
            source: 'pixabay',
            originalUrl: image.largeImageURL,
            attribution: `Image by ${image.user} from Pixabay`,
            license: 'pixabay',
            tags: image.tags.split(', '),
            description: image.tags
          });
        } catch (error) {
          logger.error(`Failed to download Pixabay image ${image.id}:`, error);
        }
      }

      return downloads;
    } catch (error) {
      logger.error('Pixabay search failed:', error);
      return [];
    }
  }

  // Pexels API Integration
  async downloadFromPexels(searchTerm, count = 5) {
    await this.respectRateLimit('pexels');

    try {
      const response = await axios.get(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=${count}`,
        {
          headers: {
            'Authorization': this.apiKeys.pexels,
            'Accept': 'application/json'
          }
        }
      );

      const data = response.data;
      const downloads = [];

      for (const photo of data.photos) {
        try {
          const fileName = `pexels_${photo.id}_${Date.now()}.jpg`;
          const savePath = path.join('./images/temp', fileName);

          const imageData = await this.downloadImage(photo.src.large, savePath);

          downloads.push({
            ...imageData,
            sourceId: photo.id,
            source: 'pexels',
            originalUrl: photo.src.large,
            attribution: `Photo by ${photo.photographer} from Pexels`,
            license: 'pexels',
            tags: [],
            description: photo.alt || searchTerm
          });
        } catch (error) {
          logger.error(`Failed to download Pexels image ${photo.id}:`, error);
        }
      }

      return downloads;
    } catch (error) {
      logger.error('Pexels search failed:', error);
      return [];
    }
  }

  // Rate limiting to respect API limits
  async respectRateLimit(source) {
    const tracker = this.rateLimiters.get(source);
    if (!tracker) return;

    const now = Date.now();

    // Clean old requests
    tracker.requests = tracker.requests.filter(time => now - time < tracker.period);

    // Check if we're at limit
    if (tracker.requests.length >= tracker.limit) {
      const oldestRequest = Math.min(...tracker.requests);
      const waitTime = tracker.period - (now - oldestRequest);
      logger.info(`Rate limit reached for ${source}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    tracker.requests.push(now);
  }

  // Multi-source download orchestrator
  async downloadAllSources(searchTerm, countPerSource = 3) {
    if (!this.initialized) {
      await this.initialize();
    }

    const sources = ['unsplash', 'pixabay', 'pexels'];
    const allDownloads = [];

    // Download from all sources in parallel
    const downloadPromises = sources.map(async (source) => {
      try {
        switch (source) {
          case 'unsplash':
            return await this.downloadFromUnsplash(searchTerm, countPerSource);
          case 'pixabay':
            return await this.downloadFromPixabay(searchTerm, countPerSource);
          case 'pexels':
            return await this.downloadFromPexels(searchTerm, countPerSource);
          default:
            return [];
        }
      } catch (error) {
        logger.error(`Source ${source} failed:`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(downloadPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allDownloads.push(...result.value);
        logger.info(`${sources[index]}: Downloaded ${result.value.length} images`);
      } else {
        logger.error(`${sources[index]}: Failed -`, result.reason);
      }
    });

    return allDownloads;
  }

  // Enhanced download using existing API clients
  async downloadWithApiClients(itemName, category, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      countPerSource = 3,
      maxTotalResults = 10,
      sources = ['unsplash', 'pixabay', 'pexels']
    } = options;

    try {
      // Use the existing enhanced search
      const searchResults = await apiClientManager.enhancedSearchAllSources(
        itemName,
        category,
        {
          maxResultsPerSource: countPerSource,
          prioritySources: sources
        }
      );

      const downloads = [];

      // Download the best images from search results
      for (const imageData of searchResults.images.slice(0, maxTotalResults)) {
        try {
          const client = apiClientManager.getClient(imageData.source);
          const downloadResult = await client.downloadImage(imageData);

          if (downloadResult && downloadResult.stream) {
            const fileName = `${itemName}_${imageData.source}_${imageData.id || Date.now()}.jpg`;
            const tempPath = path.join(process.cwd(), 'temp', fileName);

            // Ensure temp directory exists
            await fs.ensureDir(path.dirname(tempPath));

            // Save stream to file
            const writeStream = fs.createWriteStream(tempPath);
            downloadResult.stream.pipe(writeStream);

            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              downloadResult.stream.on('error', reject);
            });

            // Verify file was created
            const stats = await fs.stat(tempPath);
            if (stats.size > 0) {
              downloads.push({
                ...imageData,
                localPath: tempPath,
                fileSize: stats.size,
                downloadedAt: new Date()
              });

              logger.info(`Downloaded ${fileName} (${stats.size} bytes)`);
            }
          }
        } catch (error) {
          logger.error(`Failed to download image ${imageData.id}:`, error);
        }
      }

      logger.info(`Downloaded ${downloads.length} images for ${itemName}`);
      return downloads;

    } catch (error) {
      logger.error(`Enhanced download failed for ${itemName}:`, error);
      throw error;
    }
  }

  // Get download statistics
  async getDownloadStats() {
    const stats = {};

    for (const [source, tracker] of this.rateLimiters.entries()) {
      stats[source] = {
        remainingRequests: tracker.limit - tracker.requests.length,
        totalRequests: tracker.requests.length,
        limit: tracker.limit,
        resetTime: new Date(tracker.nextReset)
      };
    }

    return stats;
  }
}

module.exports = ImageDownloader;