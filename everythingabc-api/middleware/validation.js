/**
 * Validation Middleware
 *
 * Provides reusable validation functions for API endpoints
 */

/**
 * Validate letter parameter (A-Z)
 */
const validateLetter = (req, res, next) => {
  const { letter } = req.params;

  if (!letter || !/^[A-Z]$/i.test(letter)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid letter parameter',
      message: 'Letter must be a single character from A-Z',
      code: 'INVALID_LETTER'
    });
  }

  // Ensure uppercase for consistency
  req.params.letter = letter.toUpperCase();
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;

  // Validate limit
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter',
        message: 'Limit must be a number between 1 and 100',
        code: 'INVALID_LIMIT'
      });
    }
  }

  // Validate offset
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offset parameter',
        message: 'Offset must be a non-negative number',
        code: 'INVALID_OFFSET'
      });
    }
  }

  next();
};

/**
 * Validate difficulty parameter (1-5)
 */
const validateDifficulty = (req, res, next) => {
  const { difficulty } = req.query;

  if (difficulty !== undefined) {
    const parsedDifficulty = parseInt(difficulty);
    if (isNaN(parsedDifficulty) || parsedDifficulty < 1 || parsedDifficulty > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty parameter',
        message: 'Difficulty must be a number between 1 and 5',
        code: 'INVALID_DIFFICULTY'
      });
    }
  }

  next();
};

/**
 * Validate quality score parameter (0-10)
 */
const validateQualityScore = (req, res, next) => {
  const { quality_min, quality_max } = req.query;

  if (quality_min !== undefined) {
    const parsedMin = parseFloat(quality_min);
    if (isNaN(parsedMin) || parsedMin < 0 || parsedMin > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality_min parameter',
        message: 'Quality score must be a number between 0 and 10',
        code: 'INVALID_QUALITY'
      });
    }
  }

  if (quality_max !== undefined) {
    const parsedMax = parseFloat(quality_max);
    if (isNaN(parsedMax) || parsedMax < 0 || parsedMax > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality_max parameter',
        message: 'Quality score must be a number between 0 and 10',
        code: 'INVALID_QUALITY'
      });
    }
  }

  next();
};

/**
 * Validate status parameter
 */
const validateStatus = (allowedStatuses = ['published', 'draft', 'archived']) => {
  return (req, res, next) => {
    const { status } = req.query;

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status parameter',
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }

    next();
  };
};

/**
 * Validate sort parameter
 */
const validateSort = (allowedSorts) => {
  return (req, res, next) => {
    const { sort } = req.query;

    if (sort !== undefined && !allowedSorts.includes(sort)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sort parameter',
        message: `Sort must be one of: ${allowedSorts.join(', ')}`,
        code: 'INVALID_SORT'
      });
    }

    next();
  };
};

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    if (id && !objectIdPattern.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'The provided ID is not a valid MongoDB ObjectId',
        code: 'INVALID_OBJECT_ID'
      });
    }

    next();
  };
};

/**
 * Sanitize query parameters (prevent injection attacks)
 */
const sanitizeQuery = (req, res, next) => {
  // Remove any MongoDB operators from query parameters
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove keys that start with $ or contain dots (MongoDB operators)
      if (!key.startsWith('$') && !key.includes('.')) {
        sanitized[key] = typeof value === 'object' ? sanitizeObject(value) : value;
      }
    }
    return sanitized;
  };

  req.query = sanitizeObject(req.query);
  req.body = sanitizeObject(req.body);

  next();
};

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis-based rate limiting
 */
const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get requests for this IP
    const ipRequests = requests.get(ip) || [];

    // Remove old requests outside the window
    const recentRequests = ipRequests.filter(time => time > windowStart);

    // Check if rate limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests from this IP. Maximum ${maxRequests} requests per ${windowMs / 60000} minutes`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(ip, recentRequests);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - recentRequests.length);
    res.setHeader('X-RateLimit-Reset', new Date(recentRequests[0] + windowMs).toISOString());

    next();
  };
};

/**
 * Request timing middleware (for performance monitoring)
 */
const requestTiming = (req, res, next) => {
  req.startTime = Date.now();

  // Override res.json to add response time
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;

    // Add response time header
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Optionally add to response body if meta exists
    if (data && typeof data === 'object' && data.meta) {
      data.meta.responseTime = `${responseTime}ms`;
    }

    return originalJson(data);
  };

  next();
};

/**
 * CORS preflight handler
 */
const handleCorsPrelight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

module.exports = {
  validateLetter,
  validatePagination,
  validateDifficulty,
  validateQualityScore,
  validateStatus,
  validateSort,
  validateObjectId,
  sanitizeQuery,
  createRateLimiter,
  requestTiming,
  handleCorsPrelight
};
