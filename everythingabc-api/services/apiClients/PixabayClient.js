const BaseClient = require("./BaseClient");
const logger = require("../../utils/logger");

class PixabayClient extends BaseClient {
  constructor(config, rateLimiter) {
    super(config, rateLimiter);
    this.apiKey = config.apiKey;
  }

  async search(query, options = {}) {
    const {
      page = 1,
      perPage = 20,
      imageType = "photo", // photo, illustration, vector
      orientation = "all", // horizontal, vertical
      category = "", // backgrounds, fashion, nature, science, education, etc.
      minWidth = 800,
      minHeight = 600,
      editors_choice = false,
      safesearch = true,
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get("/", {
          params: {
            key: this.apiKey,
            q: query,
            image_type: imageType,
            orientation,
            category,
            min_width: minWidth,
            min_height: minHeight,
            // Pixabay requires per_page between 3 and 200
            per_page: Math.max(3, Math.min(perPage, 200)),
            page,
            safesearch: safesearch ? "true" : "false",
            editors_choice: editors_choice ? "true" : "false",
            order: "popular", // popular, latest
          },
        });
      });

      const images = response.data.hits.map((hit) =>
        this.formatPixabayImage(hit, query)
      );

      return {
        images,
        total: response.data.total,
        totalHits: response.data.totalHits,
        currentPage: page,
        hasMore: page * perPage < response.data.totalHits,
      };
    } catch (error) {
      logger.error("Pixabay search failed", {
        query,
        page,
        error: error.message,
      });
      throw error;
    }
  }

  async downloadImage(imageData) {
    try {
      const imageResponse = await this.client({
        method: "GET",
        url: imageData.url,
        responseType: "stream",
        timeout: 60000,
        // Pixabay doesn't require special auth for image downloads
        headers: {
          "User-Agent": "Visual-Vocabulary-Platform/1.0",
          Accept: "image/*",
        },
      });

      return {
        stream: imageResponse.data,
        headers: imageResponse.headers,
        size: parseInt(imageResponse.headers["content-length"]) || 0,
      };
    } catch (error) {
      logger.error("Pixabay image download failed", {
        imageId: imageData.id,
        url: imageData.url,
        error: error.message,
      });
      throw error;
    }
  }

  formatPixabayImage(hit, searchTerm) {
    // Pixabay provides multiple sizes
    const urls = {
      webformatURL: hit.webformatURL, // 640px wide
      largeImageURL: hit.largeImageURL, // Up to 1920px
      fullHDURL: hit.fullHDURL, // Full HD (if available)
      vectorURL: hit.vectorURL, // Vector format (if vector)
    };

    return {
      id: hit.id.toString(),
      url: hit.largeImageURL || hit.webformatURL,
      urlLarge: hit.fullHDURL || hit.largeImageURL,
      urlSmall: hit.webformatURL,
      width: hit.imageWidth || hit.webformatWidth,
      height: hit.imageHeight || hit.webformatHeight,
      description: searchTerm,
      tags: hit.tags ? hit.tags.split(", ").map((tag) => tag.trim()) : [],
      source: "pixabay",
      sourceId: hit.id.toString(),
      license: {
        type: "pixabay",
        commercial: true,
        attribution: `Image by ${hit.user} from Pixabay`,
        url: hit.pageURL,
      },
      photographer: {
        name: hit.user,
        id: hit.user_id,
        profile: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
      },
      stats: {
        views: hit.views,
        downloads: hit.downloads,
        likes: hit.likes,
        comments: hit.comments,
        favorites: hit.collections,
      },
      colors: {
        primary: null, // Pixabay doesn't provide color info
      },
      fileSize: hit.imageSize,
      type: hit.type, // photo, illustration, vector
      createdAt: null, // Pixabay doesn't provide creation date
      originalData: hit,
    };
  }

  async enhancedSearch(itemName, category, options = {}) {
    // Map categories to Pixabay's category system
    const categoryMap = {
      animals: "animals",
      nature: "nature",
      food: "food",
      fruits: "food",
      vegetables: "food",
      education: "education",
      science: "science",
      transportation: "transportation",
      sports: "sports",
      health: "health",
      business: "business",
      computer: "computer",
      places: "places",
      backgrounds: "backgrounds",
      fashion: "fashion",
      people: "people",
      religion: "religion",
      travel: "travel",
      buildings: "buildings",
      music: "music",
    };

    const pixabayCategory = categoryMap[category.toLowerCase()] || "";

    const searchStrategies = [
      // Direct search with category
      {
        query: itemName,
        options: { category: pixabayCategory, editors_choice: true },
        weight: 1.0,
      },
      // Combined search
      {
        query: `${itemName} ${category}`,
        options: { safesearch: true },
        weight: 0.9,
      },
      // High quality search
      {
        query: itemName,
        options: { minWidth: 1920, minHeight: 1080, editors_choice: true },
        weight: 0.8,
      },
      // Illustration search (for difficult items)
      {
        query: itemName,
        options: { image_type: "illustration", category: pixabayCategory },
        weight: 0.7,
      },
    ];

    const allResults = [];

    for (const strategy of searchStrategies) {
      try {
        const results = await this.search(strategy.query, {
          ...options,
          ...strategy.options,
          perPage: Math.min(options.perPage || 10, 20),
        });

        const weightedImages = results.images.map((img) => ({
          ...img,
          searchWeight: strategy.weight,
          searchQuery: strategy.query,
          searchOptions: strategy.options,
        }));

        allResults.push(...weightedImages);
      } catch (error) {
        logger.warn(
          `Pixabay strategy failed: ${strategy.query}`,
          error.message
        );
      }
    }

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

    return unique.sort((a, b) => {
      // Higher search weight
      const weightDiff = b.searchWeight - a.searchWeight;
      if (Math.abs(weightDiff) > 0.1) return weightDiff;

      // Higher view count
      const viewsDiff = (b.stats?.views || 0) - (a.stats?.views || 0);
      if (Math.abs(viewsDiff) > 1000) return viewsDiff * 0.001;

      // Higher downloads
      const downloadsDiff =
        (b.stats?.downloads || 0) - (a.stats?.downloads || 0);
      if (Math.abs(downloadsDiff) > 100) return downloadsDiff * 0.01;

      // Better aspect ratio (prefer closer to square for thumbnails)
      const aRatio = Math.abs(1 - a.width / a.height);
      const bRatio = Math.abs(1 - b.width / b.height);

      return aRatio - bRatio;
    });
  }

  async getVideosByQuery(query, options = {}) {
    const {
      page = 1,
      perPage = 20,
      category = "",
      minWidth = 1280,
      minHeight = 720,
    } = options;

    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get("/videos/", {
          params: {
            key: this.apiKey,
            q: query,
            category,
            min_width: minWidth,
            min_height: minHeight,
            per_page: Math.min(perPage, 200),
            page,
            safesearch: "true",
            order: "popular",
          },
        });
      });

      return {
        videos: response.data.hits.map((hit) => ({
          id: hit.id.toString(),
          url: hit.videos.large.url,
          thumbnail: hit.userImageURL,
          duration: hit.duration,
          width: hit.videos.large.width,
          height: hit.videos.large.height,
          size: hit.videos.large.size,
          tags: hit.tags ? hit.tags.split(", ") : [],
          user: hit.user,
          views: hit.views,
          downloads: hit.downloads,
          likes: hit.likes,
        })),
        total: response.data.total,
        hasMore: page * perPage < response.data.totalHits,
      };
    } catch (error) {
      logger.error("Pixabay video search failed", {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  // Get images by specific Pixabay categories
  async getImagesByCategory(categoryName, options = {}) {
    const validCategories = [
      "backgrounds",
      "fashion",
      "nature",
      "science",
      "education",
      "feelings",
      "health",
      "people",
      "religion",
      "places",
      "animals",
      "industry",
      "computer",
      "food",
      "sports",
      "transportation",
      "travel",
      "buildings",
      "business",
      "music",
    ];

    if (!validCategories.includes(categoryName)) {
      throw new Error(
        `Invalid category. Valid categories: ${validCategories.join(", ")}`
      );
    }

    return await this.search("", {
      ...options,
      category: categoryName,
    });
  }

  // Get editor's choice images
  async getEditorsChoice(query = "", options = {}) {
    return await this.search(query, {
      ...options,
      editors_choice: true,
      minWidth: 1920,
      minHeight: 1080,
    });
  }
}

module.exports = PixabayClient;
