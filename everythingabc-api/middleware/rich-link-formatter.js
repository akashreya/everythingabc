/**
 * Rich Linking Response Formatter Middleware
 *
 * Transforms responses to follow modern REST API conventions:
 * - List responses: { count, next, previous, results }
 * - Detail responses: Add resource URLs and related links
 * - Consistent error format
 * - Rich cross-resource linking
 */

const formatRichLinkResponse = (req, res, next) => {
  const originalJson = res.json;
  const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

  res.json = function(data) {
    // Handle error responses
    if (data.error || res.statusCode >= 400) {
      const errorResponse = {
        error: {
          code: data.code || getErrorCode(res.statusCode),
          message: data.error || data.message || 'An error occurred',
          details: data.details || null,
          request_id: req.id || generateRequestId(),
          timestamp: new Date().toISOString(),
          docs_url: `${baseUrl}/docs/errors`
        }
      };
      return originalJson.call(this, errorResponse);
    }

    // Handle list responses (arrays or objects with count/results)
    if (Array.isArray(data) || (data.results && Array.isArray(data.results))) {
      const results = Array.isArray(data) ? data : data.results;
      const count = data.count || results.length;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const formatted = {
        count: count,
        next: generateNextUrl(req, count, limit, offset),
        previous: generatePrevUrl(req, limit, offset),
        results: results.map(item => addResourceUrls(item, req, baseUrl))
      };

      // Add metadata if provided
      if (data.meta) {
        formatted.meta = data.meta;
      }

      return originalJson.call(this, formatted);
    }

    // Handle detail responses (single objects)
    if (data && typeof data === 'object') {
      const formatted = addResourceUrls(data, req, baseUrl);
      return originalJson.call(this, formatted);
    }

    // Return unchanged for primitives
    return originalJson.call(this, data);
  };

  next();
};

function addResourceUrls(item, req, baseUrl) {
  if (!item || typeof item !== 'object') return item;

  // Create a copy to avoid modifying original
  const enhanced = { ...item };

  // Add self URL based on item type
  if (enhanced.id) {
    const resourceType = detectResourceType(req.path, enhanced);
    enhanced.url = `${baseUrl}/${resourceType}/${enhanced.id}/`;
  }

  // Add category-specific links
  if (enhanced.categoryId) {
    enhanced.category = {
      id: enhanced.categoryId,
      name: enhanced.categoryName,
      url: `${baseUrl}/categories/${enhanced.categoryId}/`
    };
  }

  // Add item-specific links (only if not already set by endpoint)
  if (enhanced.letter && enhanced.categoryId && !enhanced.related_resources) {
    enhanced.related_resources = {
      category: `${baseUrl}/categories/${enhanced.categoryId}/`,
      same_letter: `${baseUrl}/letters/${enhanced.letter}/items/`,
      images: `${baseUrl}/items/${enhanced.id}/images/`
    };

    // Add similar items links if we have tags
    if (enhanced.tags && enhanced.tags.length > 0) {
      enhanced.related_resources.similar_tags = `${baseUrl}/items/?tags=${enhanced.tags.slice(0, 3).join(',')}`;
    }

    // Add same difficulty link
    if (enhanced.difficulty) {
      enhanced.related_resources.same_difficulty = `${baseUrl}/items/?difficulty=${enhanced.difficulty}`;
    }
  }

  // Add image-specific links
  if (enhanced.itemId) {
    enhanced.item = {
      id: enhanced.itemId,
      url: `${baseUrl}/items/${enhanced.itemId}/`
    };
  }

  // Add category links for categories
  if (req.path.includes('/categories') && enhanced.id) {
    enhanced.related_resources = {
      items: `${baseUrl}/categories/${enhanced.id}/items/`,
      letters: `${baseUrl}/categories/${enhanced.id}/letters/`,
      random: `${baseUrl}/categories/${enhanced.id}/random/`,
      stats: `${baseUrl}/categories/${enhanced.id}/stats/`
    };
  }

  // Add letter-specific links
  if (req.path.includes('/letters') && enhanced.letter) {
    enhanced.related_resources = {
      items: `${baseUrl}/letters/${enhanced.letter}/items/`,
      categories: `${baseUrl}/letters/${enhanced.letter}/categories/`,
      images: `${baseUrl}/letters/${enhanced.letter}/images/`,
      random: `${baseUrl}/letters/${enhanced.letter}/random/`,
      previous_letter: getPreviousLetter(enhanced.letter) ? `${baseUrl}/letters/${getPreviousLetter(enhanced.letter)}/` : null,
      next_letter: getNextLetter(enhanced.letter) ? `${baseUrl}/letters/${getNextLetter(enhanced.letter)}/` : null
    };
  }

  return enhanced;
}

function detectResourceType(path, item) {
  if (path.includes('/categories')) return 'categories';
  if (path.includes('/items')) return 'items';
  if (path.includes('/images')) return 'images';
  if (path.includes('/letters')) return 'letters';

  // Fallback: detect by item properties
  if (item.categoryId && item.letter) return 'items';
  if (item.itemId && item.filePath) return 'images';
  if (item.icon && item.color) return 'categories';

  return 'items'; // default
}

function generateNextUrl(req, totalCount, limit, offset) {
  const nextOffset = offset + limit;
  if (nextOffset >= totalCount) return null;

  const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
  url.searchParams.set('offset', nextOffset);
  url.searchParams.set('limit', limit);
  return url.toString();
}

function generatePrevUrl(req, limit, offset) {
  if (offset <= 0) return null;

  const prevOffset = Math.max(0, offset - limit);
  const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
  url.searchParams.set('offset', prevOffset);
  url.searchParams.set('limit', limit);
  return url.toString();
}

function getPreviousLetter(letter) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const index = alphabet.indexOf(letter);
  return index > 0 ? alphabet[index - 1] : null;
}

function getNextLetter(letter) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const index = alphabet.indexOf(letter);
  return index < 25 ? alphabet[index + 1] : null;
}

function getErrorCode(statusCode) {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
}

function generateRequestId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = formatRichLinkResponse;