const AuditLog = require('../../models/AuditLog');

/**
 * Middleware to check if user has required permission
 * @param {string} permission - Required permission (e.g., 'categories.create')
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    try {
      // Check if user is authenticated
      if (!req.user) {
        await AuditLog.logAction({
          userId: 'anonymous',
          userEmail: 'anonymous',
          action: 'view',
          resourceType: 'system',
          resourceId: 'permission_check',
          description: `Permission denied - not authenticated (required: ${permission})`,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'medium',
          success: false,
          errorMessage: 'User not authenticated',
          duration: Date.now() - startTime
        });

        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin role has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check specific permission
      if (!req.user.hasPermission(permission)) {
        await AuditLog.logAction({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'view',
          resourceType: 'system',
          resourceId: 'permission_check',
          description: `Permission denied - insufficient permissions (required: ${permission}, has: ${req.user.permissions.join(', ')})`,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'medium',
          success: false,
          errorMessage: `Missing permission: ${permission}`,
          duration: Date.now() - startTime
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission,
          userRole: req.user.role,
          userPermissions: req.user.permissions
        });
      }

      next();

    } catch (error) {
      await AuditLog.logAction({
        userId: req.user?.id || 'system',
        userEmail: req.user?.email || 'system',
        action: 'view',
        resourceType: 'system',
        resourceId: 'permission_check',
        description: `Permission check error for ${permission}`,
        ipAddress: req.auditMeta?.ipAddress || req.ip,
        userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
        severity: 'high',
        success: false,
        errorMessage: error.message,
        duration: Date.now() - startTime
      });

      console.error('Permission check error:', error);

      return res.status(500).json({
        success: false,
        error: 'Permission system error',
        code: 'PERMISSION_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin role has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some(permission =>
        req.user.hasPermission(permission)
      );

      if (!hasPermission) {
        await AuditLog.logAction({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'view',
          resourceType: 'system',
          resourceId: 'permission_check',
          description: `Permission denied - none of required permissions (required: ${permissions.join(' OR ')}, has: ${req.user.permissions.join(', ')})`,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'medium',
          success: false,
          errorMessage: `Missing any of permissions: ${permissions.join(', ')}`,
          duration: Date.now() - startTime
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permissions,
          userRole: req.user.role,
          userPermissions: req.user.permissions
        });
      }

      next();

    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission system error',
        code: 'PERMISSION_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} Express middleware
 */
const requireRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    const startTime = Date.now();

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!requiredRoles.includes(req.user.role)) {
        await AuditLog.logAction({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'view',
          resourceType: 'system',
          resourceId: 'role_check',
          description: `Role denied - insufficient role (required: ${requiredRoles.join(' OR ')}, has: ${req.user.role})`,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'medium',
          success: false,
          errorMessage: `Missing role: ${requiredRoles.join(' or ')}`,
          duration: Date.now() - startTime
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient role',
          code: 'ROLE_DENIED',
          required: requiredRoles,
          userRole: req.user.role
        });
      }

      next();

    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Role system error',
        code: 'ROLE_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user can access their own resources or is admin
 * @param {string} userIdParam - Parameter name containing user ID (e.g., 'userId')
 * @returns {Function} Express middleware
 */
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const targetUserId = req.params[userIdParam];
      const isOwner = req.user.id === targetUserId;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        await AuditLog.logAction({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'view',
          resourceType: 'user',
          resourceId: targetUserId,
          description: `Access denied - not owner or admin (target: ${targetUserId})`,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'medium',
          success: false,
          errorMessage: 'Not owner or admin',
          duration: Date.now() - Date.now()
        });

        return res.status(403).json({
          success: false,
          error: 'Can only access your own resources or be an admin',
          code: 'OWNERSHIP_REQUIRED'
        });
      }

      next();

    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Access control error',
        code: 'ACCESS_CONTROL_ERROR'
      });
    }
  };
};

/**
 * Middleware to add audit logging for successful requests
 * @param {string} action - Action being performed
 * @param {string} resourceType - Type of resource
 * @returns {Function} Express middleware
 */
const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store audit info for logging after request completes
    req.auditLog = {
      action,
      resourceType,
      resourceId: req.params.id || req.params.categoryId || req.params.itemId || 'unknown',
      startTime: Date.now()
    };

    // Override res.json to log after response
    const originalJson = res.json;
    res.json = function(data) {
      // Log successful requests
      if (res.statusCode < 400 && req.user && req.auditLog) {
        const description = `${action} ${resourceType}${req.auditLog.resourceId !== 'unknown' ? ` (${req.auditLog.resourceId})` : ''}`;

        AuditLog.logAction({
          userId: req.user.id,
          userEmail: req.user.email,
          action: req.auditLog.action,
          resourceType: req.auditLog.resourceType,
          resourceId: req.auditLog.resourceId,
          resourceName: data?.data?.name || data?.data?.title || null,
          description,
          ipAddress: req.auditMeta?.ipAddress || req.ip,
          userAgent: req.auditMeta?.userAgent || req.headers['user-agent'],
          severity: 'low',
          success: true,
          duration: Date.now() - req.auditLog.startTime
        }).catch(err => {
          console.error('Audit logging error:', err);
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Helper function to create permission constants
 */
const PERMISSIONS = {
  // Categories
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  // Items
  ITEMS_READ: 'items.read',
  ITEMS_CREATE: 'items.create',
  ITEMS_UPDATE: 'items.update',
  ITEMS_DELETE: 'items.delete',
  ITEMS_APPROVE: 'items.approve',

  // Users
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Analytics & Settings
  ANALYTICS_READ: 'analytics.read',
  SETTINGS_UPDATE: 'settings.update'
};

/**
 * Helper function to create role constants
 */
const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  MODERATOR: 'moderator'
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireOwnershipOrAdmin,
  auditLog,
  PERMISSIONS,
  ROLES
};