import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

const ApiContext = createContext();

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};

// ICS is now pure React - all APIs go to EverythingABC API V2 on port 3003
const ICS_API_URL =
  process.env.REACT_APP_ICS_API_URL || "http://localhost:3003/api/v2";
const ICS_ROOT_URL =
  process.env.REACT_APP_ICS_ROOT_URL || "http://localhost:3003";

// Create axios instance for Image Collection System - NO AUTHENTICATION NEEDED
const icsApi = axios.create({
  baseURL: ICS_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create axios instance for root API calls (health, etc.)
const rootApi = axios.create({
  baseURL: ICS_ROOT_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Use ICS API for all operations (no admin auth needed)

// Request interceptor for ICS API (no auth needed)
icsApi.interceptors.request.use(
  (config) => {
    // No authentication needed for ICS endpoints
    // Add timestamp to prevent caching (only for GET requests)
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
icsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const ApiProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequest = useCallback(async (requestFn) => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Collection API methods (Enhanced)
  const collectItem = useCallback(
    async (category, letter, itemName, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post(
          `/collect/selected`, // Use ICS-compatible endpoint
          { category, letter, itemName, options }
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const collectCategory = useCallback(
    async (category, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post(
          `/collection/categories/${category}/start`,
          options
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  // Enhanced Collection API methods
  const startEnhancedCollection = useCallback(
    async (categoryId, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post(
          `/collection/categories/${categoryId}/start`,
          options
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const getCloudStats = useCallback(async () => {
    return handleRequest(async () => {
      // Cloud stats not needed for ICS - return mock data
      const response = {
        data: { stats: { uploaded: 0, pending: 0, failed: 0 } },
      };
      return response.data;
    });
  }, [handleRequest]);

  const getQueueStatus = useCallback(async () => {
    return handleRequest(async () => {
      // Queue status not needed for ICS - return mock data
      const response = { data: { status: "idle", pending: 0, active: 0 } };
      return response.data;
    });
  }, [handleRequest]);

  const getEnhancedStatus = useCallback(async () => {
    return handleRequest(async () => {
      // Enhanced status not needed for ICS - return mock data
      const response = { data: { status: "ready", features: [] } };
      return response.data;
    });
  }, [handleRequest]);

  const uploadToCloud = useCallback(
    async (imagePath, metadata, options = {}) => {
      return handleRequest(async () => {
        // Cloud upload not needed for ICS - return mock success
        const response = { data: { success: true, url: imagePath, metadata } };
        return response.data;
      });
    },
    [handleRequest]
  );

  const warmCDNCache = useCallback(
    async (urls) => {
      return handleRequest(async () => {
        // CDN warming not needed for ICS - return mock success
        const response = { data: { warmed: urls.length, success: true } };
        return response.data;
      });
    },
    [handleRequest]
  );

  const invalidateCDNCache = useCallback(
    async (s3Keys) => {
      return handleRequest(async () => {
        // CDN invalidation not needed for ICS - return mock success
        const response = {
          data: { invalidated: s3Keys.length, success: true },
        };
        return response.data;
      });
    },
    [handleRequest]
  );

  const collectSelectedImages = useCallback(
    async (category, letter, itemName, selectedImages) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/collect/selected", {
          category,
          letter,
          itemName,
          selectedImages,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Search API methods
  const searchImages = useCallback(
    async (query, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.get(`/search`, {
          params: { query, ...options },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const enhancedSearch = useCallback(
    async (itemName, category, options = {}) => {
      return handleRequest(async () => {
        // Use V1 enhanced search endpoint for image collection
        const response = await axios.get(`${ICS_ROOT_URL}/api/v1/search/enhanced`, {
          params: {
            query: itemName,
            category: category,
            maxTotalResults: options.maxTotalResults || 100,
            ...options
          },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Database API methods
  const seedCategories = useCallback(
    async (categories = null, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/seed/categories", {
          categories,
          options,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const clearCategories = useCallback(
    async (category = null) => {
      return handleRequest(async () => {
        const response = await icsApi.delete("/seed/categories", {
          data: { category },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Stats API methods
  const getStats = useCallback(async () => {
    return handleRequest(async () => {
      // Dashboard analytics not needed for ICS - return mock data
      const response = { data: { stats: {} } };
      return response.data;
    });
  }, [handleRequest]);

  const getCategoryStats = useCallback(async () => {
    return handleRequest(async () => {
      const response = await icsApi.get("/progress/summary");
      return response.data;
    });
  }, [handleRequest]);

  const getProgressStats = useCallback(
    async (category = null) => {
      return handleRequest(async () => {
        const params = category ? { categoryId: category, limit: 1000 } : { limit: 1000 };
        const response = await icsApi.get("/progress", { params });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Image API methods
  const getImages = useCallback(
    async (filters = {}, page = 1, limit = 50) => {
      return handleRequest(async () => {
        const response = await icsApi.get("/images", {
          params: {
            ...filters,
            page,
            limit,
          },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const updateImageStatus = useCallback(
    async (imageId, status, reason = null, notes = null) => {
      return handleRequest(async () => {
        const response = await icsApi.patch(`/images/${imageId}/status`, {
          status,
          reason,
          notes,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Progress API methods
  const getProgress = useCallback(
    async (filters = {}, page = 1, limit = 100) => {
      return handleRequest(async () => {
        const response = await icsApi.get("/progress", {
          params: {
            ...filters,
            page,
            limit,
          },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const getPendingItems = useCallback(
    async (limit = 50) => {
      return handleRequest(async () => {
        const response = await icsApi.get("/progress", {
          params: {
            collectionStatus: "pending",
            limit,
          },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Client API methods
  const getClientStats = useCallback(async () => {
    return handleRequest(async () => {
      const response = await icsApi.get("/clients");
      return response.data;
    });
  }, [handleRequest]);

  const getSystemStatus = useCallback(async () => {
    return handleRequest(async () => {
      const response = await icsApi.get("/status");
      return response.data;
    });
  }, [handleRequest]);

  const getActivityFeed = useCallback(
    async (limit = 15) => {
      return handleRequest(async () => {
        const response = await icsApi.get("/dashboard/activity-feed", {
          params: { limit },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Generation API methods
  const generateImages = useCallback(
    async (itemName, category, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/generate/images", {
          itemName,
          category,
          options,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const downloadPreview = useCallback(
    async (previewData, itemName, category, options = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/generate/download-preview", {
          previewData,
          itemName,
          category,
          options,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const getGenerationStats = useCallback(async () => {
    return handleRequest(async () => {
      const response = await icsApi.get("/generate/stats");
      return response.data;
    });
  }, [handleRequest]);

  const generateVariations = useCallback(
    async (imageId, count = 2) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/generate/variations", {
          imageId,
          count,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Health API methods
  const getHealth = useCallback(
    async (detailed = false) => {
      return handleRequest(async () => {
        // Health endpoints are not under /api, so use absolute path
        const endpoint = detailed
          ? `${ICS_ROOT_URL}/health/detailed`
          : `${ICS_ROOT_URL}/health`;
        const response = await axios.get(endpoint, {
          timeout: 10000,
          params: { _t: Date.now() }, // prevent caching
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Category API methods
  const getAllCategories = useCallback(
    async (filters = {}) => {
      return handleRequest(async () => {
        const response = await icsApi.get("/categories", {
          params: filters,
        });
        return response.data.data || response.data; // ICS API may have different response structure
      });
    },
    [handleRequest]
  );

  const getCategoryById = useCallback(
    async (categoryId) => {
      return handleRequest(async () => {
        const response = await icsApi.get(`/categories/${categoryId}`);
        return response.data.data || response.data;
      });
    },
    [handleRequest]
  );

  // ============================================================================
  // CMS ADMIN API METHODS
  // TODO: Add JWT authentication when admin system is ready
  // For now, backend allows unauthenticated admin API calls in dev mode
  // ============================================================================

  // Category Management
  const createCategory = useCallback(
    async (categoryData) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/admin/categories", categoryData);
        return response.data;
      });
    },
    [handleRequest]
  );

  const updateCategory = useCallback(
    async (categoryId, categoryData) => {
      return handleRequest(async () => {
        const response = await icsApi.put(
          `/admin/categories/${categoryId}`,
          categoryData
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const deleteCategory = useCallback(
    async (categoryId, permanent = false) => {
      return handleRequest(async () => {
        const response = await icsApi.delete(
          `/admin/categories/${categoryId}`,
          {
            params: { permanent },
          }
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const getCategoryDetails = useCallback(
    async (categoryId, includeAnalytics = false) => {
      return handleRequest(async () => {
        const response = await icsApi.get(`/admin/categories/${categoryId}`, {
          params: { includeAnalytics },
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  // Item Management
  const createItem = useCallback(
    async (categoryId, itemData) => {
      return handleRequest(async () => {
        const response = await icsApi.post(
          `/admin/categories/${categoryId}/items`,
          itemData
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const updateItem = useCallback(
    async (categoryId, itemId, itemData) => {
      return handleRequest(async () => {
        const response = await icsApi.put(
          `/admin/categories/${categoryId}/items/${itemId}`,
          itemData
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const deleteItem = useCallback(
    async (categoryId, itemId) => {
      return handleRequest(async () => {
        const response = await icsApi.delete(
          `/admin/categories/${categoryId}/items/${itemId}`
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  const getItemsByLetter = useCallback(
    async (categoryId, letter) => {
      return handleRequest(async () => {
        // Use V2 items API instead of admin endpoint
        // Note: V2 API uses 'category' parameter, not 'categoryId'
        const response = await icsApi.get("/items/", {
          params: {
            category: categoryId,
            letter: letter,
          },
        });
        // Return items array from V2 response structure
        return response.data.results || response.data || [];
      });
    },
    [handleRequest]
  );

  // Item Status Management
  const updateItemStatus = useCallback(
    async (categoryId, itemId, status) => {
      return handleRequest(async () => {
        // Use approve/reject endpoints for status changes
        if (status === "approved") {
          const response = await icsApi.post(
            `/admin/categories/${categoryId}/items/${itemId}/approve`,
            { score: 5 }
          );
          return response.data;
        } else if (status === "rejected") {
          const response = await icsApi.post(
            `/admin/categories/${categoryId}/items/${itemId}/reject`,
            { reason: "Quality issues" }
          );
          return response.data;
        } else {
          throw new Error('Invalid status. Use "approved" or "rejected"');
        }
      });
    },
    [handleRequest]
  );

  const bulkUpdateStatus = useCallback(
    async (categoryId, itemIds, status) => {
      return handleRequest(async () => {
        const response = await icsApi.post(
          `/admin/categories/${categoryId}/items/bulk`,
          {
            operation: "update_status",
            items: itemIds,
            data: { status },
          }
        );
        return response.data;
      });
    },
    [handleRequest]
  );

  // Publishing Management
  const getItemsPendingReview = useCallback(
    async (categoryId = null, limit = 50, offset = 0) => {
      return handleRequest(async () => {
        const params = { limit, offset };
        if (categoryId) params.categoryId = categoryId;

        const response = await icsApi.get("/admin/items/pending-review", {
          params,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const publishItem = useCallback(
    async (itemId) => {
      return handleRequest(async () => {
        const response = await icsApi.post(`/admin/items/${itemId}/publish`);
        return response.data;
      });
    },
    [handleRequest]
  );

  const unpublishItem = useCallback(
    async (itemId) => {
      return handleRequest(async () => {
        const response = await icsApi.post(`/admin/items/${itemId}/unpublish`);
        return response.data;
      });
    },
    [handleRequest]
  );

  const bulkPublish = useCallback(
    async (itemIds) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/admin/items/bulk-publish", {
          itemIds,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const updatePublishingStatus = useCallback(
    async (itemId, publishingStatus) => {
      return handleRequest(async () => {
        const response = await icsApi.patch(`/admin/items/${itemId}/status`, {
          publishingStatus,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const bulkUpdatePublishingStatus = useCallback(
    async (itemIds, publishingStatus) => {
      return handleRequest(async () => {
        const response = await icsApi.post("/admin/items/bulk-status", {
          itemIds,
          publishingStatus,
        });
        return response.data;
      });
    },
    [handleRequest]
  );

  const value = {
    // State
    loading,
    error,
    clearError,

    // Collection methods
    collectItem,
    collectCategory,
    collectSelectedImages,

    // Enhanced Collection methods
    startEnhancedCollection,
    getCloudStats,
    getQueueStatus,
    getEnhancedStatus,
    uploadToCloud,
    warmCDNCache,
    invalidateCDNCache,

    // Search methods
    searchImages,
    enhancedSearch,

    // Database methods
    seedCategories,
    clearCategories,

    // Stats methods
    getStats,
    getCategoryStats,
    getProgressStats,

    // Image methods
    getImages,
    updateImageStatus,

    // Progress methods
    getProgress,
    getPendingItems,

    // Client methods
    getClientStats,
    getSystemStatus,
    getActivityFeed,

    // Generation methods
    generateImages,
    downloadPreview,
    getGenerationStats,
    generateVariations,

    // Health methods
    getHealth,

    // Category methods
    getAllCategories,
    getCategoryById,

    // CMS Admin methods
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryDetails,
    createItem,
    updateItem,
    deleteItem,
    getItemsByLetter,
    updateItemStatus,
    bulkUpdateStatus,

    // Publishing methods
    getItemsPendingReview,
    publishItem,
    unpublishItem,
    bulkPublish,
    updatePublishingStatus,
    bulkUpdatePublishingStatus,

    // Import/Export methods
    exportCSV: useCallback(async (options = {}) => {
      const {
        categoryId,
        publishingStatus,
        collectionStatus,
        includeMetadata = false,
      } = options;
      const params = new URLSearchParams();

      if (categoryId) params.append("categoryId", categoryId);
      if (publishingStatus) params.append("publishingStatus", publishingStatus);
      if (collectionStatus) params.append("collectionStatus", collectionStatus);
      if (includeMetadata) params.append("includeMetadata", "true");

      const url = `${ICS_API_URL}/admin/import-export/export/csv?${params.toString()}`;

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    }, []),

    downloadImportTemplate: useCallback(() => {
      const url = `${ICS_API_URL}/admin/import-export/import/template`;
      const link = document.createElement("a");
      link.href = url;
      link.download = "import-template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }, []),

    // Category Management
    getAllCategories: useCallback(async () => {
      return handleRequest(async () => {
        const response = await icsApi.get("/admin/categories");
        return (
          response.data.data?.categories || response.data.data || response.data
        );
      });
    }, [handleRequest]),

    createCategory: useCallback(
      async (categoryData) => {
        return handleRequest(async () => {
          const response = await icsApi.post("/admin/categories", categoryData);
          return response.data;
        });
      },
      [handleRequest]
    ),

    updateCategory: useCallback(
      async (categoryId, categoryData) => {
        return handleRequest(async () => {
          const response = await icsApi.put(
            `/admin/categories/${categoryId}`,
            categoryData
          );
          return response.data;
        });
      },
      [handleRequest]
    ),

    deleteCategory: useCallback(
      async (categoryId) => {
        return handleRequest(async () => {
          const response = await icsApi.delete(
            `/admin/categories/${categoryId}?confirm=true`
          );
          return response.data;
        });
      },
      [handleRequest]
    ),

    // Direct API access
    icsApi,
    rootApi,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};
