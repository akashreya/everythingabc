const BaseClient = require('./BaseClient');
const logger = require('../../utils/logger');

class PexelsClient extends BaseClient {
  constructor(config, rateLimiter) {
    super(config, rateLimiter);
    
    // Add Pexels-specific authorization header
    this.client.defaults.headers['Authorization'] = config.apiKey;
  }

  async search(query, options = {}) {
    const {
      page = 1,
      perPage = 80, // Pexels allows up to 80
      orientation = '', // landscape, portrait, square
      size = '', // large, medium, small
      color = '', // red, orange, yellow, green, turquoise, blue, violet, pink, brown, black, gray, white
      locale = 'en-US'
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        const params = {
          query,
          page,
          per_page: Math.min(perPage, 80),
          locale
        };

        // Add optional parameters only if they have values
        if (orientation) params.orientation = orientation;
        if (size) params.size = size;
        if (color) params.color = color;

        return await this.client.get('/search', { params });
      });

      const images = response.data.photos.map(photo => this.formatPexelsImage(photo, query));

      return {
        images,
        total: response.data.total_results,
        currentPage: response.data.page,
        perPage: response.data.per_page,
        hasMore: response.data.next_page !== undefined,
        nextPage: response.data.next_page
      };
    } catch (error) {
      logger.error('Pexels search failed', {
        query,
        page,
        error: error.message
      });
      throw error;
    }
  }

  async downloadImage(imageData) {
    try {
      const imageResponse = await this.client({
        method: 'GET',
        url: imageData.url,
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'Authorization': this.client.defaults.headers['Authorization'],
          'Accept': 'image/*'
        }
      });

      return {
        stream: imageResponse.data,
        headers: imageResponse.headers,
        size: parseInt(imageResponse.headers['content-length']) || 0
      };
    } catch (error) {
      logger.error('Pexels image download failed', {
        imageId: imageData.id,
        url: imageData.url,
        error: error.message
      });
      throw error;
    }
  }

  formatPexelsImage(photo, searchTerm) {
    return {
      id: photo.id.toString(),
      url: photo.src.large,
      urlLarge: photo.src.original,
      urlSmall: photo.src.medium,
      urlTiny: photo.src.tiny,
      width: photo.width,
      height: photo.height,
      description: photo.alt || searchTerm,
      tags: [], // Pexels doesn't provide tags
      source: 'pexels',
      sourceId: photo.id.toString(),
      license: {
        type: 'pexels',
        commercial: true,
        attribution: `Photo by ${photo.photographer} from Pexels`,
        url: photo.url
      },
      photographer: {
        name: photo.photographer,
        id: photo.photographer_id,
        profile: photo.photographer_url
      },
      stats: {
        likes: null, // Pexels doesn't provide this
        views: null,
        downloads: null
      },
      colors: {
        primary: photo.avg_color,
        dominant: photo.avg_color
      },
      createdAt: null, // Pexels doesn't provide creation date
      originalData: photo
    };
  }

  async getCuratedPhotos(options = {}) {
    const {
      page = 1,
      perPage = 80
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get('/curated', {
          params: {
            page,
            per_page: Math.min(perPage, 80)
          }
        });
      });

      return {
        images: response.data.photos.map(photo => this.formatPexelsImage(photo, 'curated')),
        currentPage: response.data.page,
        perPage: response.data.per_page,
        hasMore: response.data.next_page !== undefined,
        nextPage: response.data.next_page
      };
    } catch (error) {
      logger.error('Pexels curated photos failed', {
        error: error.message
      });
      throw error;
    }
  }

  async getPhoto(photoId) {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/photos/${photoId}`);
      });

      return this.formatPexelsImage(response.data, '');
    } catch (error) {
      logger.error('Failed to get Pexels photo details', {
        photoId,
        error: error.message
      });
      throw error;
    }
  }

  async enhancedSearch(itemName, category, options = {}) {
    const searchStrategies = [
      // Direct item search
      { query: itemName, options: {}, weight: 1.0 },
      // Category + item
      { query: `${itemName} ${category}`, options: {}, weight: 0.9 },
      // Professional variants
      { query: `${itemName} professional`, options: { size: 'large' }, weight: 0.8 },
      { query: `${itemName} isolated`, options: { color: 'white' }, weight: 0.8 },
      // Different orientations for better coverage
      { query: itemName, options: { orientation: 'square' }, weight: 0.7 },
      { query: itemName, options: { orientation: 'landscape' }, weight: 0.6 }
    ];

    const allResults = [];

    for (const strategy of searchStrategies) {
      try {
        const results = await this.search(strategy.query, {
          ...options,
          ...strategy.options,
          perPage: Math.min(options.perPage || 15, 20)
        });

        const weightedImages = results.images.map(img => ({
          ...img,
          searchWeight: strategy.weight,
          searchQuery: strategy.query,
          searchOptions: strategy.options
        }));

        allResults.push(...weightedImages);
      } catch (error) {
        logger.warn(`Pexels strategy failed: ${strategy.query}`, error.message);
      }
    }

    const uniqueResults = this.deduplicateAndRank(allResults, itemName);

    return {
      images: uniqueResults.slice(0, options.maxResults || 20),
      totalStrategies: searchStrategies.length,
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length
    };
  }

  deduplicateAndRank(images, itemName) {
    const seen = new Set();
    const unique = images.filter(img => {
      if (seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });

    return unique.sort((a, b) => {
      // Higher search weight
      const weightDiff = b.searchWeight - a.searchWeight;
      if (Math.abs(weightDiff) > 0.1) return weightDiff;

      // Prefer larger images
      const aSizeScore = a.width * a.height;
      const bSizeScore = b.width * b.height;
      const sizeDiff = bSizeScore - aSizeScore;
      if (Math.abs(sizeDiff) > 1000000) return sizeDiff * 0.000001; // 1MP difference

      // Prefer better aspect ratios (closer to square for thumbnails)
      const aRatio = Math.abs(1 - (a.width / a.height));
      const bRatio = Math.abs(1 - (b.width / b.height));
      
      return aRatio - bRatio;
    });
  }

  // Search for collections
  async getCollections(query, options = {}) {
    const {
      page = 1,
      perPage = 80
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get('/collections/search', {
          params: {
            query,
            page,
            per_page: Math.min(perPage, 80)
          }
        });
      });

      return {
        collections: response.data.collections.map(collection => ({
          id: collection.id,
          title: collection.title,
          description: collection.description,
          private: collection.private,
          mediaCount: collection.media_count,
          photosCount: collection.photos_count,
          videosCount: collection.videos_count
        })),
        currentPage: response.data.page,
        perPage: response.data.per_page,
        totalResults: response.data.total_results,
        hasMore: response.data.next_page !== undefined
      };
    } catch (error) {
      logger.error('Pexels collections search failed', {
        query,
        error: error.message
      });
      throw error;
    }
  }

  // Get photos from a specific collection
  async getCollectionMedia(collectionId, options = {}) {
    const {
      type = 'photos', // photos or videos
      page = 1,
      perPage = 80
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/collections/${collectionId}`, {
          params: {
            type,
            page,
            per_page: Math.min(perPage, 80)
          }
        });
      });

      if (type === 'photos') {
        return response.data.media
          .filter(media => media.type === 'Photo')
          .map(media => this.formatPexelsImage(media, ''));
      }

      return response.data.media;
    } catch (error) {
      logger.error('Failed to get Pexels collection media', {
        collectionId,
        type,
        error: error.message
      });
      throw error;
    }
  }

  // Search by color
  async searchByColor(query, color, options = {}) {
    const validColors = [
      'red', 'orange', 'yellow', 'green', 'turquoise', 
      'blue', 'violet', 'pink', 'brown', 'black', 'gray', 'white'
    ];

    if (!validColors.includes(color)) {
      throw new Error(`Invalid color. Valid colors: ${validColors.join(', ')}`);
    }

    return await this.search(query, {
      ...options,
      color
    });
  }

  // Get popular photos (using curated as proxy)
  async getPopularPhotos(options = {}) {
    return await this.getCuratedPhotos(options);
  }
}

module.exports = PexelsClient;