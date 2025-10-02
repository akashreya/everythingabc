const { RateLimiterMemory } = require("rate-limiter-flexible");
const logger = require("../../utils/logger");

const UnsplashClient = require("./UnsplashClient");
const PixabayClient = require("./PixabayClient");
const PexelsClient = require("./PexelsClient");

class ApiClientManager {
  constructor() {
    this.clients = new Map();
    this.rateLimiters = new Map();
    this.initialized = false;
    this.initializationPromise = null;

    // Default configuration (can be overridden)
    this.config = {
      apis: {
        unsplash: {
          baseUrl: 'https://api.unsplash.com',
          accessKey: process.env.UNSPLASH_ACCESS_KEY,
          rateLimit: 50
        },
        pixabay: {
          baseUrl: 'https://pixabay.com/api',
          apiKey: process.env.PIXABAY_API_KEY,
          rateLimit: 100
        },
        pexels: {
          baseUrl: 'https://api.pexels.com/v1',
          apiKey: process.env.PEXELS_API_KEY,
          rateLimit: 200
        }
      }
    };
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.initialized) return;

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Start initialization
    this.initializationPromise = this._doInitialize();

    try {
      await this.initializationPromise;
    } catch (error) {
      // Reset promise on failure so retry is possible
      this.initializationPromise = null;
      throw error;
    }
  }

  async _doInitialize() {
    try {
      logger.info("Starting API clients initialization...");

      // Create rate limiters for each API
      this.createRateLimiters();
      logger.debug("Rate limiters created");

      // Initialize API clients
      await this.initializeClients();
      logger.debug("API clients created and tested");

      this.initialized = true;
      this.initializationPromise = null;
      logger.info("API clients initialized successfully", {
        clients: Array.from(this.clients.keys()),
        rateLimiters: Array.from(this.rateLimiters.keys()),
      });
    } catch (error) {
      logger.error("Failed to initialize API clients", error);
      throw error;
    }
  }

  createRateLimiters() {
    const rateLimiterConfigs = {
      unsplash: {
        points: this.config.apis.unsplash.rateLimit,
        duration: 3600, // 1 hour
        blockDuration: 60, // Only block for 1 minute instead of full hour
      },
      pixabay: {
        points: this.config.apis.pixabay.rateLimit,
        duration: 3600,
        blockDuration: 60,
      },
      pexels: {
        points: this.config.apis.pexels.rateLimit,
        duration: 3600,
        blockDuration: 60,
      },
    };

    Object.entries(rateLimiterConfigs).forEach(([name, rateLimitConfig]) => {
      this.rateLimiters.set(
        name,
        new RateLimiterMemory({
          keyGeneratorFunction: () => name, // Use service name as key
          points: rateLimitConfig.points,
          duration: rateLimitConfig.duration,
          blockDuration: rateLimitConfig.blockDuration,
          execEvenly: true, // Spread requests evenly across duration
        })
      );

      logger.debug(`Created rate limiter for ${name}`, rateLimitConfig);
    });
  }

  async initializeClients() {
    const clientConfigs = [
      {
        name: "unsplash",
        ClientClass: UnsplashClient,
        config: this.config.apis.unsplash,
        required: false,
      },
      {
        name: "pixabay",
        ClientClass: PixabayClient,
        config: this.config.apis.pixabay,
        required: true,
      },
      {
        name: "pexels",
        ClientClass: PexelsClient,
        config: this.config.apis.pexels,
        required: false,
      },
    ];

    for (const clientConfig of clientConfigs) {
      try {
        if (!clientConfig.config.apiKey && !clientConfig.config.accessKey) {
          if (clientConfig.required) {
            throw new Error(`Missing API key for ${clientConfig.name}`);
          }
          logger.warn(`Skipping ${clientConfig.name} client - missing API key`);
          continue;
        }

        const rateLimiter = this.rateLimiters.get(clientConfig.name);
        const client = new clientConfig.ClientClass(
          clientConfig.config,
          rateLimiter
        );

        // Test the client connection (skip in development for speed)
        if (process.env.NODE_ENV !== 'development') {
          await this.testClient(client, clientConfig.name);
        }

        this.clients.set(clientConfig.name, client);
        logger.info(`Initialized ${clientConfig.name} client successfully`);
      } catch (error) {
        logger.error(`Failed to initialize ${clientConfig.name} client`, error);
        if (clientConfig.required) {
          throw error;
        }
      }
    }

    if (this.clients.size === 0) {
      throw new Error("No API clients were successfully initialized");
    }
  }

  async testClient(client, name) {
    try {
      // Skip rate limiter during initialization test
      const originalRespectRateLimit = client.respectRateLimit;
      client.respectRateLimit = async () => {}; // Temporarily disable rate limiting

      // Test with a simple search
      const testResult = await client.search("test", { perPage: 1 });

      // Restore rate limiter
      client.respectRateLimit = originalRespectRateLimit;

      if (!testResult || !testResult.images) {
        throw new Error("Invalid response format");
      }
      logger.debug(`${name} client test successful`);
    } catch (error) {
      logger.error(`${name} client test failed`, error);
      throw new Error(`${name} client test failed: ${error.message}`);
    }
  }

  getClient(name) {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Client '${name}' not found or not initialized`);
    }
    return client;
  }

  getAllClients() {
    return Array.from(this.clients.entries()).map(([name, client]) => ({
      name,
      client,
    }));
  }

  getAvailableClients() {
    return Array.from(this.clients.keys());
  }

  async searchAllSources(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      maxResultsPerSource = 10,
      excludeSources = [],
      prioritySources = [],
      timeout = 30000,
    } = options;

    // Determine which sources to use
    let sourcesToUse = this.getAvailableClients().filter(
      (source) => !excludeSources.includes(source)
    );

    if (prioritySources.length > 0) {
      // Reorder based on priority
      const prioritized = prioritySources.filter((source) =>
        sourcesToUse.includes(source)
      );
      const remaining = sourcesToUse.filter(
        (source) => !prioritySources.includes(source)
      );
      sourcesToUse = [...prioritized, ...remaining];
    }

    logger.info(`Searching across sources: ${sourcesToUse.join(", ")}`, {
      query,
      maxResultsPerSource,
      excludeSources,
      prioritySources,
    });

    const results = new Map();
    const errors = new Map();

    // Search all sources in parallel with timeout
    const searchPromises = sourcesToUse.map(async (sourceName) => {
      try {
        const client = this.getClient(sourceName);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Search timeout")), timeout)
        );

        const searchPromise = client.search(query, {
          perPage: maxResultsPerSource,
          ...options,
        });

        const result = await Promise.race([searchPromise, timeoutPromise]);

        results.set(sourceName, {
          source: sourceName,
          images: result.images || [],
          total: result.total || 0,
          success: true,
          timestamp: new Date(),
        });

        logger.info(`${sourceName} search completed`, {
          query,
          results: result.images?.length || 0,
          total: result.total || 0,
        });
      } catch (error) {
        errors.set(sourceName, {
          source: sourceName,
          error: error.message,
          success: false,
          timestamp: new Date(),
        });

        logger.error(`${sourceName} search failed`, {
          query,
          error: error.message,
        });
      }
    });

    await Promise.allSettled(searchPromises);

    // Combine and return results
    const allImages = [];
    const sourceStats = {};

    results.forEach((result, sourceName) => {
      sourceStats[sourceName] = {
        count: result.images.length,
        total: result.total,
        success: true,
      };

      // Add source ranking to images for later sorting
      result.images.forEach((image, index) => {
        allImages.push({
          ...image,
          sourceRank: sourcesToUse.indexOf(sourceName),
          positionInSource: index,
        });
      });
    });

    errors.forEach((error, sourceName) => {
      sourceStats[sourceName] = {
        count: 0,
        total: 0,
        success: false,
        error: error.error,
      };
    });

    return {
      images: allImages,
      totalImages: allImages.length,
      sourceStats,
      searchedSources: sourcesToUse,
      successfulSources: Array.from(results.keys()),
      failedSources: Array.from(errors.keys()),
      query,
      timestamp: new Date(),
    };
  }

  async enhancedSearchAllSources(itemName, category, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      maxResultsPerSource = 15,
      excludeSources = [],
      prioritySources = [],
      timeout = 15000,
    } = options;

    let sourcesToUse = this.getAvailableClients().filter(
      (source) => !excludeSources.includes(source)
    );

    if (prioritySources.length > 0) {
      const prioritized = prioritySources.filter((source) =>
        sourcesToUse.includes(source)
      );
      const remaining = sourcesToUse.filter(
        (source) => !prioritySources.includes(source)
      );
      sourcesToUse = [...prioritized, ...remaining];
    }

    logger.info(`Enhanced search across sources: ${sourcesToUse.join(", ")}`, {
      itemName,
      category,
      maxResultsPerSource,
    });

    const results = new Map();
    const errors = new Map();

    // Run enhanced search on each source
    const searchPromises = sourcesToUse.map(async (sourceName) => {
      try {
        const client = this.getClient(sourceName);

        // Check if client has enhancedSearch method
        let result;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Enhanced search timeout")),
            timeout
          )
        );

        // Use basic search in development for speed
        const useEnhanced = process.env.NODE_ENV !== 'development' && typeof client.enhancedSearch === "function";

        const searchCall = useEnhanced
          ? client.enhancedSearch(itemName, category, {
            maxResults: maxResultsPerSource,
            perPage: Math.min(maxResultsPerSource, 10),
            ...options,
          })
          : client.search(itemName, {
            perPage: maxResultsPerSource,
            ...options,
          });

        result = await Promise.race([searchCall, timeoutPromise]);

        results.set(sourceName, {
          source: sourceName,
          images: result.images || [],
          success: true,
          metadata: {
            totalStrategies: result.totalStrategies,
            totalResults: result.totalResults,
            uniqueResults: result.uniqueResults,
          },
        });

        logger.info(`${sourceName} enhanced search completed`, {
          itemName,
          category,
          results: result.images?.length || 0,
        });
      } catch (error) {
        errors.set(sourceName, {
          source: sourceName,
          error: error.message,
          success: false,
        });

        logger.error(`${sourceName} enhanced search failed`, {
          itemName,
          category,
          error: error.message,
        });
      }
    });

    await Promise.allSettled(searchPromises);

    // Combine results with cross-source ranking
    const allImages = [];
    const sourceStats = {};

    results.forEach((result, sourceName) => {
      sourceStats[sourceName] = {
        count: result.images.length,
        success: true,
        metadata: result.metadata,
      };

      result.images.forEach((image) => {
        allImages.push({
          ...image,
          sourceRank: sourcesToUse.indexOf(sourceName),
        });
      });
    });

    errors.forEach((error, sourceName) => {
      sourceStats[sourceName] = {
        count: 0,
        success: false,
        error: error.error,
      };
    });

    // Sort images by quality and relevance across sources
    const rankedImages = this.rankImagesAcrossSources(
      allImages,
      itemName,
      category
    );

    return {
      images: rankedImages.slice(0, options.maxTotalResults || 50),
      totalImages: rankedImages.length,
      sourceStats,
      searchedSources: sourcesToUse,
      successfulSources: Array.from(results.keys()),
      failedSources: Array.from(errors.keys()),
      itemName,
      category,
      timestamp: new Date(),
    };
  }

  rankImagesAcrossSources(images, itemName, category) {
    return images.sort((a, b) => {
      // Source priority (lower sourceRank is better)
      const sourceRankDiff = a.sourceRank - b.sourceRank;
      if (Math.abs(sourceRankDiff) > 0) return sourceRankDiff * 0.1;

      // Search weight (if available from enhanced search)
      const weightDiff = (b.searchWeight || 0) - (a.searchWeight || 0);
      if (Math.abs(weightDiff) > 0.1) return weightDiff;

      // Image quality metrics
      const aQuality = this.calculateImageQuality(a);
      const bQuality = this.calculateImageQuality(b);
      const qualityDiff = bQuality - aQuality;
      if (Math.abs(qualityDiff) > 0.1) return qualityDiff;

      // Prefer newer images (if timestamp available)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      return 0;
    });
  }

  calculateImageQuality(image) {
    let quality = 0;

    // Size score (prefer larger images, but not too large)
    const pixels = image.width * image.height;
    if (pixels >= 1920 * 1080) quality += 1.0;
    else if (pixels >= 1280 * 720) quality += 0.8;
    else if (pixels >= 800 * 600) quality += 0.6;
    else quality += 0.3;

    // Aspect ratio score (prefer closer to square)
    const aspectRatio = image.width / image.height;
    const aspectScore = 1 - Math.abs(1 - aspectRatio);
    quality += aspectScore * 0.5;

    // Social metrics (if available)
    if (image.stats?.likes) quality += Math.min(image.stats.likes / 1000, 0.5);
    if (image.stats?.downloads)
      quality += Math.min(image.stats.downloads / 10000, 0.3);

    return quality;
  }

  async getClientStats() {
    const stats = {};

    for (const [name, rateLimiter] of this.rateLimiters.entries()) {
      try {
        const remainingPoints = await rateLimiter.get(name);
        stats[name] = {
          available: this.clients.has(name),
          remainingRequests: remainingPoints
            ? remainingPoints.remainingHits
            : "unlimited",
          resetTime: remainingPoints
            ? new Date(Date.now() + remainingPoints.msBeforeNext)
            : null,
        };
      } catch (error) {
        stats[name] = {
          available: this.clients.has(name),
          error: error.message,
        };
      }
    }

    return stats;
  }

  // Configuration update method
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
const apiClientManager = new ApiClientManager();

module.exports = {
  ApiClientManager,
  apiClientManager,
  UnsplashClient,
  PixabayClient,
  PexelsClient,
};