const express = require('express');
const router = express.Router();
const AdminUser = require('../../models/AdminUser');
const AuditLog = require('../../models/AuditLog');
const { generateTokenPair, verifyToken, hashToken } = require('../utils/jwt');
const { authenticateAdmin, authRateLimit } = require('../middleware/adminAuth');

// Helper function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /admin/auth/login
 * Authenticate admin user and return JWT tokens
 */
router.post('/login', authRateLimit, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    // Validate input
    if (!email || !password) {
      await AuditLog.logAction({
        userId: 'anonymous',
        userEmail: email || 'unknown',
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Login attempt with missing credentials',
        ipAddress,
        userAgent,
        severity: 'low',
        success: false,
        errorMessage: 'Missing email or password',
        duration: Date.now() - startTime
      });

      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const user = await AdminUser.findByEmail(email);

    if (!user) {
      await AuditLog.logAction({
        userId: 'unknown',
        userEmail: email,
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Login attempt with non-existent email',
        ipAddress,
        userAgent,
        severity: 'medium',
        success: false,
        errorMessage: 'User not found',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
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
        description: 'Login attempt on locked account',
        ipAddress,
        userAgent,
        severity: 'medium',
        success: false,
        errorMessage: 'Account is locked',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      // Increment login attempts
      await user.incLoginAttempts();

      await AuditLog.logAction({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        resourceType: 'system',
        resourceId: 'auth',
        description: 'Login attempt with invalid password',
        ipAddress,
        userAgent,
        severity: 'medium',
        success: false,
        errorMessage: 'Invalid password',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token pair
    const tokens = generateTokenPair(user);

    // Store refresh token (hashed)
    await user.addRefreshToken(hashToken(tokens.refreshToken));

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateLastLogin();

    // Log successful login
    await AuditLog.logAction({
      userId: user.id,
      userEmail: user.email,
      action: 'login',
      resourceType: 'system',
      resourceId: 'auth',
      description: 'Successful login',
      ipAddress,
      userAgent,
      severity: 'low',
      success: true,
      duration: Date.now() - startTime
    });

    // Return tokens and user info
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        ...tokens
      }
    });

  } catch (error) {
    await AuditLog.logAction({
      userId: 'system',
      userEmail: 'system',
      action: 'login',
      resourceType: 'system',
      resourceId: 'auth',
      description: 'Login system error',
      ipAddress,
      userAgent,
      severity: 'critical',
      success: false,
      errorMessage: error.message,
      duration: Date.now() - startTime
    });

    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      error: 'Login system error',
      code: 'LOGIN_SYSTEM_ERROR'
    });
  }
}));

/**
 * POST /admin/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { refreshToken } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Hash the provided refresh token to match stored version
    const hashedRefreshToken = hashToken(refreshToken);

    // Find user with this refresh token
    const user = await AdminUser.findOne({
      'refreshTokens.token': hashedRefreshToken,
      isActive: true
    });

    if (!user) {
      await AuditLog.logAction({
        userId: 'unknown',
        userEmail: 'unknown',
        action: 'login',
        resourceType: 'system',
        resourceId: 'token_refresh',
        description: 'Token refresh with invalid refresh token',
        ipAddress,
        userAgent,
        severity: 'high',
        success: false,
        errorMessage: 'Invalid refresh token',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if user is still active and not locked
    if (!user.isActive || user.isLocked) {
      await AuditLog.logAction({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        resourceType: 'system',
        resourceId: 'token_refresh',
        description: 'Token refresh for inactive or locked user',
        ipAddress,
        userAgent,
        severity: 'medium',
        success: false,
        errorMessage: 'User account is inactive or locked',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'User account is inactive or locked',
        code: 'USER_INACTIVE_OR_LOCKED'
      });
    }

    // Generate new token pair
    const newTokens = generateTokenPair(user);

    // Replace old refresh token with new one
    await user.removeRefreshToken(hashedRefreshToken);
    await user.addRefreshToken(hashToken(newTokens.refreshToken));

    // Log successful token refresh
    await AuditLog.logAction({
      userId: user.id,
      userEmail: user.email,
      action: 'login',
      resourceType: 'system',
      resourceId: 'token_refresh',
      description: 'Successful token refresh',
      ipAddress,
      userAgent,
      severity: 'low',
      success: true,
      duration: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: user.toSafeObject(),
        ...newTokens
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(500).json({
      success: false,
      error: 'Token refresh system error',
      code: 'REFRESH_SYSTEM_ERROR'
    });
  }
}));

/**
 * POST /admin/auth/logout
 * Logout admin user and invalidate refresh token
 */
router.post('/logout', authenticateAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove the specific refresh token
      const hashedRefreshToken = hashToken(refreshToken);
      await req.user.removeRefreshToken(hashedRefreshToken);
    }

    // Log successful logout
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'logout',
      resourceType: 'system',
      resourceId: 'auth',
      description: 'User logout',
      ipAddress: req.auditMeta.ipAddress,
      userAgent: req.auditMeta.userAgent,
      severity: 'low',
      success: true,
      duration: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      error: 'Logout system error',
      code: 'LOGOUT_SYSTEM_ERROR'
    });
  }
}));

/**
 * POST /admin/auth/logout-all
 * Logout from all devices by clearing all refresh tokens
 */
router.post('/logout-all', authenticateAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    // Clear all refresh tokens
    req.user.refreshTokens = [];
    await req.user.save();

    // Log logout from all devices
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'logout',
      resourceType: 'system',
      resourceId: 'auth',
      description: 'User logout from all devices',
      ipAddress: req.auditMeta.ipAddress,
      userAgent: req.auditMeta.userAgent,
      severity: 'low',
      success: true,
      duration: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'Logout from all devices successful'
    });

  } catch (error) {
    console.error('Logout all error:', error);

    res.status(500).json({
      success: false,
      error: 'Logout system error',
      code: 'LOGOUT_SYSTEM_ERROR'
    });
  }
}));

/**
 * GET /admin/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticateAdmin, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toSafeObject()
    }
  });
}));

/**
 * POST /admin/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Verify current password
    const isValidPassword = await req.user.comparePassword(currentPassword);

    if (!isValidPassword) {
      await AuditLog.logAction({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'update',
        resourceType: 'user',
        resourceId: req.user.id,
        description: 'Password change attempt with invalid current password',
        ipAddress: req.auditMeta.ipAddress,
        userAgent: req.auditMeta.userAgent,
        severity: 'medium',
        success: false,
        errorMessage: 'Invalid current password',
        duration: Date.now() - startTime
      });

      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    req.user.passwordHash = newPassword;
    req.user.lastModifiedBy = req.user.id;
    await req.user.save();

    // Clear all refresh tokens to force re-login
    req.user.refreshTokens = [];
    await req.user.save();

    // Log password change
    await AuditLog.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'update',
      resourceType: 'user',
      resourceId: req.user.id,
      description: 'Password changed successfully',
      ipAddress: req.auditMeta.ipAddress,
      userAgent: req.auditMeta.userAgent,
      severity: 'medium',
      success: true,
      duration: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });

  } catch (error) {
    console.error('Password change error:', error);

    res.status(500).json({
      success: false,
      error: 'Password change system error',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
}));

/**
 * GET /admin/auth/sessions
 * Get user's active sessions (refresh tokens)
 */
router.get('/sessions', authenticateAdmin, asyncHandler(async (req, res) => {
  const sessions = req.user.refreshTokens.map((tokenData, index) => ({
    id: index,
    createdAt: tokenData.createdAt,
    // Don't expose actual tokens
    isActive: true
  }));

  res.json({
    success: true,
    data: {
      sessions,
      count: sessions.length
    }
  });
}));

module.exports = router;