const BaseClient = require("./BaseClient");
const logger = require("../../utils/logger");

class UnsplashClient extends BaseClient {
  constructor(config, rateLimiter) {
    super(config, rateLimiter);

    // Add Unsplash-specific headers
    this.client.defaults.headers[
      "Authorization"
    ] = `Client-ID ${config.accessKey}`;
    this.client.defaults.headers["Accept-Version"] = "v1";
  }

  async search(query, options = {}) {
    const {
      page = 1,
      perPage = 20,
      orientation = undefined, // only 'landscape' | 'portrait' | 'squarish' are valid
      minWidth = 800,
      minHeight = 600,
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        const params = {
          query,
          page,
          per_page: Math.min(Math.max(perPage, 1), 30), // 1..30
          order_by: "relevant",
        };
        const validOrientations = new Set([
          "landscape",
          "portrait",
          "squarish",
        ]);
        if (orientation && validOrientations.has(orientation)) {
          params.orientation = orientation;
        }

        return await this.client.get("/search/photos", { params });
      });

      const images = response.data.results
        .filter((photo) => photo.width >= minWidth && photo.height >= minHeight)
        .map((photo) => this.formatUnsplashImage(photo, query));

      return {
        images,
        total: response.data.total,
        totalPages: response.data.total_pages,
        currentPage: page,
        hasMore: page < response.data.total_pages,
      };
    } catch (error) {
      logger.error("Unsplash search failed", {
        query,
        page,
        error: error.message,
      });
      throw error;
    }
  }

  async downloadImage(imageData, savePath) {
    try {
      // Trigger download tracking (Unsplash requirement)
      if (imageData.downloadUrl) {
        await this.client.get(
          imageData.downloadUrl.replace("https://api.unsplash.com", "")
        );
      }

      // Use regular HTTP client for actual image download
      const imageResponse = await this.client({
        method: "GET",
        url: imageData.url,
        responseType: "stream",
        timeout: 60000,
      });

      return {
        stream: imageResponse.data,
        headers: imageResponse.headers,
        size: parseInt(imageResponse.headers["content-length"]) || 0,
      };
    } catch (error) {
      logger.error("Unsplash image download failed", {
        imageId: imageData.id,
        url: imageData.url,
        error: error.message,
      });
      throw error;
    }
  }

  formatUnsplashImage(photo, searchTerm) {
    return {
      id: photo.id,
      url: photo.urls.regular,
      urlLarge: photo.urls.full,
      urlSmall: photo.urls.small,
      width: photo.width,
      height: photo.height,
      description: photo.description || photo.alt_description || searchTerm,
      tags: photo.tags ? photo.tags.map((tag) => tag.title) : [],
      source: "unsplash",
      sourceId: photo.id,
      license: {
        type: "unsplash",
        commercial: true,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
        url: photo.links.html,
      },
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profile: photo.user.links.html,
        portfolio: photo.user.portfolio_url,
      },
      stats: {
        likes: photo.likes,
        downloads: photo.downloads,
      },
      colors: {
        primary: photo.color,
        dominant: photo.color,
      },
      downloadUrl: photo.links.download_location,
      createdAt: photo.created_at,
      originalData: photo,
    };
  }

  async getImageDetails(imageId) {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/photos/${imageId}`);
      });

      return this.formatUnsplashImage(response.data, "");
    } catch (error) {
      logger.error("Failed to get Unsplash image details", {
        imageId,
        error: error.message,
      });
      throw error;
    }
  }

  async getCollections(query, options = {}) {
    const { page = 1, perPage = 10 } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get("/search/collections", {
          params: {
            query,
            page,
            per_page: perPage,
          },
        });
      });

      return {
        collections: response.data.results.map((collection) => ({
          id: collection.id,
          title: collection.title,
          description: collection.description,
          totalPhotos: collection.total_photos,
          tags: collection.tags ? collection.tags.map((tag) => tag.title) : [],
          coverPhoto: collection.cover_photo
            ? this.formatUnsplashImage(collection.cover_photo, query)
            : null,
          user: collection.user,
          links: collection.links,
        })),
        total: response.data.total,
        hasMore: page < response.data.total_pages,
      };
    } catch (error) {
      logger.error("Unsplash collections search failed", {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  async getCollectionPhotos(collectionId, options = {}) {
    const { page = 1, perPage = 30 } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/collections/${collectionId}/photos`, {
          params: {
            page,
            per_page: perPage,
          },
        });
      });

      return response.data.map((photo) => this.formatUnsplashImage(photo, ""));
    } catch (error) {
      logger.error("Failed to get Unsplash collection photos", {
        collectionId,
        error: error.message,
      });
      throw error;
    }
  }

  // Enhanced search with multiple strategies
  async enhancedSearch(itemName, category, options = {}) {
    const searchStrategies = [
      // Direct item search
      { query: itemName, weight: 1.0 },
      // Category + item
      { query: `${itemName} ${category}`, weight: 0.9 },
      // Professional/stock variants
      { query: `${itemName} professional`, weight: 0.8 },
      { query: `${itemName} isolated white background`, weight: 0.8 },
      { query: `${itemName} stock photo`, weight: 0.7 },
    ];

    const allResults = [];

    for (const strategy of searchStrategies) {
      try {
        const results = await this.search(strategy.query, {
          ...options,
          perPage: Math.min(options.perPage || 10, 15),
        });

        // Add weight to results for ranking
        const weightedImages = results.images.map((img) => ({
          ...img,
          searchWeight: strategy.weight,
          searchQuery: strategy.query,
        }));

        allResults.push(...weightedImages);
      } catch (error) {
        logger.warn(
          `Unsplash strategy failed: ${strategy.query}`,
          error.message
        );
      }
    }

    // Deduplicate by image ID and sort by relevance
    const uniqueResults = this.deduplicateAndRank(allResults, itemName);

    return {
      images: uniqueResults.slice(0, options.maxResults || 20),
      totalStrategies: searchStrategies.length,
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
    };
  }

  deduplicateAndRank(images, itemName) {
    const seen = new Set();
    const unique = images.filter((img) => {
      if (seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });

    // Simple ranking algorithm
    return unique.sort((a, b) => {
      // Higher search weight is better
      const weightDiff = b.searchWeight - a.searchWeight;
      if (Math.abs(weightDiff) > 0.1) return weightDiff;

      // More likes is better
      const likesDiff = (b.stats?.likes || 0) - (a.stats?.likes || 0);
      if (Math.abs(likesDiff) > 10) return likesDiff * 0.1;

      // Better dimensions (closer to square, reasonable size)
      const aRatio = Math.abs(1 - a.width / a.height);
      const bRatio = Math.abs(1 - b.width / b.height);
      const ratioDiff = aRatio - bRatio;

      return ratioDiff;
    });
  }

  // Get trending/popular images for a category
  async getTrendingImages(category, options = {}) {
    try {
      const response = await this.client.get("/photos", {
        params: {
          page: options.page || 1,
          per_page: Math.min(options.perPage || 10, 30),
          order_by: "popular",
        },
      });

      // Filter by category relevance
      const categoryKeywords = category.toLowerCase().split(" ");
      const relevantImages = response.data.filter((photo) => {
        const photoText = (
          photo.description ||
          photo.alt_description ||
          ""
        ).toLowerCase();
        const photoTags = photo.tags
          ? photo.tags.map((tag) => tag.title.toLowerCase())
          : [];
        const allText = [photoText, ...photoTags].join(" ");

        return categoryKeywords.some((keyword) => allText.includes(keyword));
      });

      return relevantImages.map((photo) =>
        this.formatUnsplashImage(photo, category)
      );
    } catch (error) {
      logger.error("Failed to get trending Unsplash images", {
        category,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = UnsplashClient;