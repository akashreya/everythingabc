const AdminUser = require('../../models/AdminUser');
const AuditLog = require('../../models/AuditLog');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Middleware to authenticate admin users using JWT
 */
const authenticateAdmin = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // DEVELOPMENT MODE BYPASS - Skip authentication in development
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      console.log('⚠️  DEV MODE: Skipping authentication (SKIP_AUTH=true)');

      // Create a mock admin user for development
      req.user = {
        id: 'dev-admin',
        email: 'dev@everythingabc.com',
        firstName: 'Dev',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
      };

      req.auditMeta = {
        userId: 'dev-admin',
        userEmail: 'dev@everythingabc.com',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        startTime
      };

      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // Log failed authentication attempt
      await AuditLog.logAction({
        userId: 'anonymous',
        userEmail: 'anonymous',
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - no token provided',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'medium',
        success: false,
        errorMessage: 'No authentication token provided',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      // Log failed token verification
      await AuditLog.logAction({
        userId: 'anonymous',
        userEmail: 'anonymous',
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - invalid token',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'high',
        success: false,
        errorMessage: error.message,
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    // Check if token is an access token
    if (decoded.tokenType !== 'access') {
      await AuditLog.logAction({
        userId: decoded.userId || 'unknown',
        userEmail: decoded.email || 'unknown',
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - wrong token type',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'high',
        success: false,
        errorMessage: 'Wrong token type',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'TOKEN_WRONG_TYPE'
      });
    }

    // Find user in database
    const user = await AdminUser.findById(decoded.userId);

    if (!user) {
      await AuditLog.logAction({
        userId: decoded.userId || 'unknown',
        userEmail: decoded.email || 'unknown',
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - user not found',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'high',
        success: false,
        errorMessage: 'User not found',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await AuditLog.logAction({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - inactive user',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'medium',
        success: false,
        errorMessage: 'User account is inactive',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      await AuditLog.logAction({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Failed authentication - account locked',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'medium',
        success: false,
        errorMessage: 'User account is locked',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'User account is locked',
        code: 'USER_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Add user to request object
    req.user = user;
    req.authToken = token;
    req.tokenPayload = decoded;

    // Add request metadata for audit logging
    req.auditMeta = {
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      startTime
    };

    next();

  } catch (error) {
    await AuditLog.logAction({
      userId: 'system',
      userEmail: 'system',
      action: 'login',
      resourceType: 'system',
      resourceId: 'auth',
      description: 'Authentication middleware error',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'critical',
      success: false,
      errorMessage: error.message,
      duration: Date.now() - startTime
    });

    console.error('Admin authentication error:', error);

    return res.status(500).json({
      success: false,
      error: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

/**
 * Middleware to check if user is authenticated (optional authentication)
 * Continues even if no token is provided, but sets req.user if valid token exists
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.tokenType === 'access') {
      const user = await AdminUser.findById(decoded.userId);

      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.authToken = token;
        req.tokenPayload = decoded;
      }
    }
  } catch (error) {
    // Ignore token errors in optional auth
    console.warn('Optional auth token error:', error.message);
  }

  next();
};

/**
 * Middleware to refresh user data from database
 * Useful for long-running requests where user data might have changed
 */
const refreshUserData = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    const freshUser = await AdminUser.findById(req.user.id);

    if (!freshUser || !freshUser.isActive || freshUser.isLocked) {
      return res.status(401).json({
        success: false,
        error: 'User status changed',
        code: 'USER_STATUS_CHANGED'
      });
    }

    req.user = freshUser;
    next();
  } catch (error) {
    console.error('Error refreshing user data:', error);
    next(); // Continue with cached user data
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (req, res, next) => {
  // This is a simple in-memory rate limiter
  // In production, use Redis or a proper rate limiting solution

  if (!global.authRateLimitStore) {
    global.authRateLimitStore = new Map();
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Clean old entries
  const cutoff = now - windowMs;
  for (const [ip, data] of global.authRateLimitStore.entries()) {
    if (data.firstAttempt < cutoff) {
      global.authRateLimitStore.delete(ip);
    }
  }

  // Get current attempts
  const current = global.authRateLimitStore.get(clientIP) || {
    count: 0,
    firstAttempt: now
  };

  if (current.count >= maxAttempts && current.firstAttempt > cutoff) {
    return res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((current.firstAttempt + windowMs - now) / 1000)
    });
  }

  // Increment counter on failed requests
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 400) {
      current.count++;
      global.authRateLimitStore.set(clientIP, current);
    } else if (res.statusCode === 200) {
      // Reset on successful login
      global.authRateLimitStore.delete(clientIP);
    }
  });

  next();
};

module.exports = {
  authenticateAdmin,
  optionalAuth,
  refreshUserData,
  authRateLimit
};