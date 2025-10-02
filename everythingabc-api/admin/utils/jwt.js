const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'everythingabc-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateAccessToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Generate refresh token
 * @returns {string} Refresh token
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Decode JWT token without verification (useful for extracting expired token data)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error(`Token decoding failed: ${error.message}`);
  }
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} Token pair with expiration info
 */
const generateTokenPair = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    tokenType: 'access'
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  // Calculate expiration times
  const accessTokenExpiresAt = new Date(Date.now() + parseExpirationTime(JWT_EXPIRES_IN));
  const refreshTokenExpiresAt = new Date(Date.now() + parseExpirationTime(REFRESH_TOKEN_EXPIRES_IN));

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    tokenType: 'Bearer'
  };
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Parse expiration time string to milliseconds
 * @param {string} timeStr - Time string (e.g., '1h', '7d', '30m')
 * @returns {number} Time in milliseconds
 */
const parseExpirationTime = (timeStr) => {
  const timeMap = {
    s: 1000,          // seconds
    m: 60 * 1000,     // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000 // weeks
  };

  const match = timeStr.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  return value * timeMap[unit];
};

/**
 * Check if token is expired
 * @param {Object} decodedToken - Decoded JWT payload
 * @returns {boolean} True if expired
 */
const isTokenExpired = (decodedToken) => {
  if (!decodedToken.exp) return true;
  return Date.now() >= decodedToken.exp * 1000;
};

/**
 * Get token expiration date
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Validate token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid format
 */
const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;

  // Basic JWT format validation (header.payload.signature)
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Create token blacklist key (for Redis or in-memory storage)
 * @param {string} token - JWT token
 * @returns {string} Blacklist key
 */
const createBlacklistKey = (token) => {
  const decoded = decodeToken(token);
  return `blacklist:${decoded.jti || decoded.userId}:${decoded.iat}`;
};

/**
 * Generate secure random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token for storage (useful for refresh tokens)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify hashed token
 * @param {string} token - Original token
 * @param {string} hashedToken - Hashed token to compare
 * @returns {boolean} True if tokens match
 */
const verifyHashedToken = (token, hashedToken) => {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hashedToken, 'hex')
  );
};

/**
 * Create JWT payload from user
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {Object} JWT payload
 */
const createTokenPayload = (user, options = {}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    fullName: user.fullName,
    tokenType: options.tokenType || 'access',
    iat: Math.floor(Date.now() / 1000)
  };

  // Add JTI (JWT ID) for token blacklisting if needed
  if (options.includeJti) {
    payload.jti = generateSecureRandom(16);
  }

  return payload;
};

module.exports = {
  // Core JWT functions
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokenPair,

  // Token utilities
  extractTokenFromHeader,
  parseExpirationTime,
  isTokenExpired,
  getTokenExpiration,
  isValidTokenFormat,
  createBlacklistKey,

  // Security utilities
  generateSecureRandom,
  hashToken,
  verifyHashedToken,
  createTokenPayload,

  // Constants
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};