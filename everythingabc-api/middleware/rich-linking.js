/**
 * Rich API Linking Middleware
 *
 * This middleware transforms responses to include comprehensive resource linking,
 * consistent pagination, and cross-references for better API discoverability.
 *
 * Features:
 * - Adds resource URLs to all objects
 * - Transforms arrays into paginated list format
 * - Includes related_resources for discoverability
 * - Adds meta information
 * - Consistent error formatting
 */

/**
 * Main rich linking middleware
 * Intercepts res.json() to add resource URLs and relationships
 */
const addRichLinking = (req, res, next) => {
  const originalJson = res.json;
  const baseUrl = `${req.protocol}://${req.get('host')}/api/v1`;

  res.json = function(data) {
    try {
      // Handle error responses
      if (!data.success && data.error) {
        const formattedError = formatError(data, req);
        return originalJson.call(this, formattedError);
      }

      // Handle successful responses (clean format without success wrapper)
      const formatted = formatSuccessResponse(data, req, baseUrl);
      return originalJson.call(this, formatted);

      // Fallback for other response types
      return originalJson.call(this, data);
    } catch (error) {
      console.error('Error in rich linking middleware:', error);
      // Fallback to original response if formatting fails
      return originalJson.call(this, data);
    }
  };

  next();
};

/**
 * Format successful responses with rich linking enhancements
 */
function formatSuccessResponse(data, req, baseUrl) {
  // If it's already a list response with count/results, enhance it
  if (data.count !== undefined && Array.isArray(data.results)) {
    return formatListResponse(data, req, baseUrl);
  }

  // If it's a legacy response with data.data and pagination, enhance it
  if (data.data && Array.isArray(data.data) && data.pagination) {
    return formatListResponse(data, req, baseUrl);
  }

  // If it's an array without pagination, convert to paginated list
  if (Array.isArray(data.results || data.data || data)) {
    return formatArrayToList(data, req, baseUrl);
  }

  // If it's a single resource, enhance with links
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return formatDetailResponse(data, req, baseUrl);
  }

  // Return as-is for other response types
  return data;
}

/**
 * Format list responses (with existing pagination)
 */
function formatListResponse(data, req, baseUrl) {
  // Handle clean format with count/results
  if (data.count !== undefined && Array.isArray(data.results)) {
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map(item => addResourceUrls(item, req, baseUrl)),
      meta: {
        ...data.meta,
        api_version: '1.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Handle legacy format with pagination object
  const { pagination } = data;
  return {
    count: pagination.total,
    next: pagination.hasMore ?
      buildPaginationUrl(req, { offset: pagination.nextOffset, limit: pagination.limit }) : null,
    previous: pagination.previousOffset !== null ?
      buildPaginationUrl(req, { offset: pagination.previousOffset, limit: pagination.limit }) : null,
    results: data.data.map(item => addResourceUrls(item, req, baseUrl)),
    meta: {
      ...data.meta,
      api_version: '1.0',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Convert array responses to paginated list format
 */
function formatArrayToList(data, req, baseUrl) {
  const items = data.data || data;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  return {
    count: items.length,
    next: offset + limit < items.length ?
      buildPaginationUrl(req, { offset: offset + limit, limit }) : null,
    previous: offset > 0 ?
      buildPaginationUrl(req, { offset: Math.max(0, offset - limit), limit }) : null,
    results: items.map(item => addResourceUrls(item, req, baseUrl)),
    meta: {
      api_version: '1.0',
      timestamp: new Date().toISOString(),
      ...(data.meta || {})
    }
  };
}

/**
 * Format detail responses (single resources)
 */
function formatDetailResponse(data, req, baseUrl) {
  // Handle clean format (direct object)
  if (!data.data) {
    const enhancedData = addResourceUrls(data, req, baseUrl);
    return {
      ...enhancedData,
      meta: {
        api_version: '1.0',
        timestamp: new Date().toISOString(),
        ...(data.meta || {})
      }
    };
  }

  // Handle legacy format with data.data wrapper
  const enhancedData = addResourceUrls(data.data, req, baseUrl);
  return {
    ...enhancedData,
    meta: {
      api_version: '1.0',
      timestamp: new Date().toISOString(),
      ...(data.meta || {})
    }
  };
}

/**
 * Add resource URLs and related_resources to objects
 */
function addResourceUrls(item, req, baseUrl) {
  if (!item || typeof item !== 'object') return item;

  // Create a copy to avoid mutating original
  const enhanced = { ...item };

  // Add self URL based on resource type
  if (item.id) {
    enhanced.url = determineResourceUrl(item, baseUrl);
  }

  // Add related_resources based on object type
  enhanced.related_resources = buildRelatedResources(item, baseUrl);

  // Enhance nested objects
  enhanceNestedObjects(enhanced, baseUrl);

  return enhanced;
}

/**
 * Determine the resource URL based on object type
 */
function determineResourceUrl(item, baseUrl) {
  // Item resource
  if (item.letter && item.categoryId) {
    return `${baseUrl}/items/${item.id}`;
  }

  // Category resource
  if (item.items || item.metadata?.totalItems !== undefined) {
    return `${baseUrl}/categories/${item.id}`;
  }

  // Image resource
  if (item.filePath && item.itemId) {
    return `${baseUrl}/images/${item._id || item.id}`;
  }

  // Letter resource
  if (item.letter && !item.categoryId) {
    return `${baseUrl}/letters/${item.letter}`;
  }

  // Collection resource
  if (item.type === 'collection' || item.items?.length > 0) {
    return `${baseUrl}/collections/${item.id}`;
  }

  // Generic fallback
  return `${baseUrl}/resources/${item.id}`;
}

/**
 * Build related_resources object based on item type
 */
function buildRelatedResources(item, baseUrl) {
  const related = {};

  // Item resources
  if (item.letter && item.categoryId) {
    related.category = `${baseUrl}/categories/${item.categoryId}`;
    related.same_letter = `${baseUrl}/letters/${item.letter}/items`;
    related.same_category = `${baseUrl}/categories/${item.categoryId}/items`;
    related.images = `${baseUrl}/items/${item.id}/images`;

    if (item.tags && item.tags.length > 0) {
      related.similar_tags = `${baseUrl}/items?tags=${item.tags.slice(0, 3).join(',')}`;
    }

    if (item.difficulty) {
      related.same_difficulty = `${baseUrl}/items?difficulty=${item.difficulty}`;
    }
  }

  // Category resources
  if (item.items || item.metadata?.totalItems !== undefined) {
    related.items = `${baseUrl}/categories/${item.id}/items`;
    related.images = `${baseUrl}/categories/${item.id}/images`;
    related.stats = `${baseUrl}/categories/${item.id}/stats`;
    related.random_item = `${baseUrl}/categories/${item.id}/random`;

    if (item.group) {
      related.same_group = `${baseUrl}/categories?group=${item.group}`;
    }

    if (item.difficulty) {
      related.same_difficulty = `${baseUrl}/categories?difficulty=${item.difficulty}`;
    }

    // Letter breakdown
    related.letters = `${baseUrl}/categories/${item.id}/letters`;
  }

  // Image resources
  if (item.filePath && item.itemId) {
    related.item = `${baseUrl}/items/${item.itemId}`;

    if (item.categoryId) {
      related.category = `${baseUrl}/categories/${item.categoryId}`;
    }

    if (item.letter) {
      related.same_letter_images = `${baseUrl}/images?letter=${item.letter}`;
    }

    if (item.source?.provider) {
      related.same_provider = `${baseUrl}/images?provider=${item.source.provider}`;
    }
  }

  // Letter resources
  if (item.letter && !item.categoryId) {
    related.items = `${baseUrl}/letters/${item.letter}/items`;
    related.categories = `${baseUrl}/letters/${item.letter}/categories`;
    related.images = `${baseUrl}/images?letter=${item.letter}`;
    related.random_item = `${baseUrl}/letters/${item.letter}/random`;

    // Navigation
    const letterCode = item.letter.charCodeAt(0);
    related.previous_letter = letterCode > 65 ?
      `${baseUrl}/letters/${String.fromCharCode(letterCode - 1)}` :
      `${baseUrl}/letters/Z`;
    related.next_letter = letterCode < 90 ?
      `${baseUrl}/letters/${String.fromCharCode(letterCode + 1)}` :
      `${baseUrl}/letters/A`;
  }

  // Collection resources
  if (item.type === 'collection') {
    related.items = `${baseUrl}/collections/${item.id}/items`;

    if (item.tags && item.tags.length > 0) {
      related.similar_collections = `${baseUrl}/collections?tags=${item.tags.join(',')}`;
    }

    if (item.difficulty) {
      related.same_difficulty = `${baseUrl}/collections?difficulty=${item.difficulty}`;
    }
  }

  // Global related resources
  related.random = `${baseUrl}/random`;
  related.search = `${baseUrl}/search`;
  related.stats = `${baseUrl}/stats`;

  return related;
}

/**
 * Enhance nested objects with URLs
 */
function enhanceNestedObjects(obj, baseUrl) {
  // Enhance category references
  if (obj.category && obj.category.id) {
    obj.category.url = `${baseUrl}/categories/${obj.category.id}`;
  }

  // Enhance item references
  if (obj.item && obj.item.id) {
    obj.item.url = `${baseUrl}/items/${obj.item.id}`;
  }

  // Enhance image references
  if (obj.primaryImage && obj.primaryImage.id) {
    obj.primaryImage.url = `${baseUrl}/images/${obj.primaryImage.id}`;
  }

  // Enhance images array
  if (obj.images && Array.isArray(obj.images)) {
    obj.images.forEach(image => {
      if (image.id || image._id) {
        image.url = `${baseUrl}/images/${image.id || image._id}`;
      }
    });
  }

  // Enhance categories array (in letter responses)
  if (obj.categories && Array.isArray(obj.categories)) {
    obj.categories.forEach(category => {
      if (category.categoryId) {
        category.url = `${baseUrl}/categories/${category.categoryId}`;
        category.itemsUrl = `${baseUrl}/categories/${category.categoryId}/items`;
      }
    });
  }

  // Enhance most popular item
  if (obj.stats?.mostPopularItem?.id) {
    obj.stats.mostPopularItem.url = `${baseUrl}/items/${obj.stats.mostPopularItem.id}`;
  }
}

/**
 * Build pagination URL with query parameters
 */
function buildPaginationUrl(req, params) {
  const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);

  // Update pagination parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.pathname + url.search;
}

/**
 * Format error responses consistently
 */
function formatError(data, req) {
  return {
    error: {
      code: data.error || 'UNKNOWN_ERROR',
      message: data.message || 'An unknown error occurred',
      details: data.details || null,
      request_id: req.headers['x-request-id'] || generateRequestId(),
      timestamp: new Date().toISOString(),
      documentation_url: 'https://docs.everythingabc.com/api/errors/',
      api_version: '1.0'
    }
  };
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId() {
  return 'req_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Middleware to add request timing
 */
const addRequestTiming = (req, res, next) => {
  req.startTime = Date.now();

  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;

    // Add timing to meta if data has meta object
    if (data && typeof data === 'object' && data.meta) {
      data.meta.response_time_ms = responseTime;
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to add API version header
 */
const addApiHeaders = (req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Powered-By', 'EverythingABC-API');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes default cache
  next();
};

module.exports = {
  addRichLinking,
  addRequestTiming,
  addApiHeaders
};