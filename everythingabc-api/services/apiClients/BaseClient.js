const axios = require('axios');
const logger = require('../../utils/logger');

class BaseClient {
  constructor(config, rateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'EverythingABC-Platform/1.0',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor for rate limiting and logging
    this.client.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();
        config.metadata = { startTime };

        // Apply rate limiting
        await this.respectRateLimit();

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;

        logger.info(`API Call: ${this.constructor.name}`, {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          duration: `${duration}ms`
        });

        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime
          ? Date.now() - error.config.metadata.startTime
          : null;

        logger.error(`API Error: ${error.response?.status || 'NETWORK_ERROR'}`, {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          duration: duration ? `${duration}ms` : 'unknown',
          message: error.message,
          responseData: error.response?.data
        });

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  async respectRateLimit() {
    // Completely disable rate limiting for development
    if (process.env.NODE_ENV === 'development') {
      return; // Skip rate limiting entirely
    }

    if (this.rateLimiter) {
      try {
        await this.rateLimiter.consume(this.constructor.name);
      } catch (rateLimiterError) {
        // Instead of waiting, just skip rate limiting during development
        logger.warn(`Rate limit reached for ${this.constructor.name}, skipping check`);
        // Don't wait or retry - just continue
      }
    }
  }

  handleApiError(error) {
    const baseError = {
      source: this.constructor.name.replace('Client', '').toLowerCase(),
      originalError: error.message,
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      // Server responded with error status
      return {
        ...baseError,
        type: 'api_error',
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        retryable: error.response.status >= 500 || error.response.status === 429
      };
    } else if (error.request) {
      // Network error
      return {
        ...baseError,
        type: 'network_error',
        retryable: true
      };
    } else {
      // Request setup error
      return {
        ...baseError,
        type: 'request_error',
        retryable: false
      };
    }
  }

  async retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFunction();
      } catch (error) {
        lastError = error;

        if (!error.retryable || attempt === maxRetries) {
          throw error;
        }

        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`, {
          source: this.constructor.name,
          error: error.originalError
        });

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }

  // Abstract methods to be implemented by subclasses
  async search(query, options = {}) {
    throw new Error('search method must be implemented by subclass');
  }

  async downloadImage(imageData) {
    throw new Error('downloadImage method must be implemented by subclass');
  }

  generateSearchQueries(itemName, category) {
    const baseQueries = [
      itemName,
      `${itemName} ${category}`,
      `${itemName} isolated white background`,
      `${itemName} stock photo`,
      `${itemName} high resolution`
    ];

    // Add synonyms if available
    const synonyms = this.getSynonyms(itemName);
    const synonymQueries = synonyms.flatMap(synonym => [
      synonym,
      `${synonym} ${category}`,
      `${synonym} isolated`
    ]);

    return [...baseQueries, ...synonymQueries].slice(0, 10); // Limit to 10 queries
  }

  getSynonyms(itemName) {
    // Enhanced synonym mapping for visual vocabulary platform
    const synonymMap = {
      // Animals
      'car': ['automobile', 'vehicle', 'auto'],
      'dog': ['canine', 'puppy', 'hound', 'pooch'],
      'cat': ['feline', 'kitten', 'kitty'],
      'horse': ['stallion', 'mare', 'equine', 'pony'],
      'bird': ['avian', 'fowl'],
      'fish': ['marine life', 'aquatic animal'],
      'elephant': ['pachyderm'],
      'lion': ['big cat', 'feline'],
      'tiger': ['big cat', 'feline'],
      'bear': ['ursine'],
      'rabbit': ['bunny', 'hare'],
      'mouse': ['rodent'],
      'butterfly': ['lepidoptera'],

      // Fruits & Vegetables
      'apple': ['fruit', 'red apple', 'green apple'],
      'banana': ['fruit', 'yellow fruit'],
      'orange': ['citrus', 'citrus fruit'],
      'grape': ['berry', 'vine fruit'],
      'strawberry': ['berry', 'red berry'],
      'tomato': ['vegetable', 'red vegetable'],
      'carrot': ['root vegetable', 'orange vegetable'],
      'potato': ['vegetable', 'tuber'],
      'lettuce': ['leafy green', 'salad green'],
      'pepper': ['bell pepper', 'capsicum'],

      // Transportation
      'airplane': ['aircraft', 'plane', 'jet'],
      'boat': ['vessel', 'ship', 'watercraft'],
      'bicycle': ['bike', 'cycle'],
      'motorcycle': ['motorbike', 'bike'],
      'truck': ['lorry', 'vehicle'],
      'bus': ['coach', 'public transport'],
      'train': ['locomotive', 'railway'],

      // Household Items
      'house': ['home', 'building', 'residence'],
      'chair': ['seat', 'furniture'],
      'table': ['furniture', 'desk'],
      'bed': ['furniture', 'mattress'],
      'lamp': ['light', 'lighting'],
      'clock': ['timepiece', 'watch'],
      'book': ['literature', 'reading material'],
      'phone': ['telephone', 'mobile'],
      'computer': ['laptop', 'PC', 'device'],

      // Colors & Shapes
      'red': ['crimson', 'scarlet'],
      'blue': ['azure', 'navy'],
      'green': ['emerald', 'forest green'],
      'yellow': ['golden', 'lemon'],
      'circle': ['round', 'circular'],
      'square': ['rectangle', 'box'],
      'triangle': ['triangular', 'three-sided'],

      // Nature
      'tree': ['plant', 'vegetation', 'woody plant'],
      'flower': ['bloom', 'blossom', 'floral'],
      'grass': ['lawn', 'turf', 'vegetation'],
      'mountain': ['peak', 'hill', 'summit'],
      'river': ['stream', 'waterway'],
      'ocean': ['sea', 'water'],
      'sun': ['solar', 'sunshine'],
      'moon': ['lunar', 'satellite'],
      'star': ['celestial', 'stellar']
    };

    return synonymMap[itemName.toLowerCase()] || [];
  }

  validateImageResponse(imageData) {
    const required = ['id', 'url', 'width', 'height'];
    const missing = required.filter(field => !imageData[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate dimensions
    if (imageData.width < 300 || imageData.height < 300) {
      throw new Error('Image dimensions too small (minimum 300x300)');
    }

    // Validate URL
    try {
      new URL(imageData.url);
    } catch {
      throw new Error('Invalid image URL');
    }

    return true;
  }

  formatImageResponse(rawData, searchTerm) {
    // To be implemented by each client with their specific response format
    return {
      id: rawData.id,
      url: rawData.url,
      width: rawData.width,
      height: rawData.height,
      description: rawData.description || searchTerm,
      tags: rawData.tags || [],
      source: this.constructor.name.replace('Client', '').toLowerCase(),
      license: rawData.license || 'unknown',
      attribution: rawData.attribution || '',
      originalData: rawData
    };
  }
}

module.exports = BaseClient;