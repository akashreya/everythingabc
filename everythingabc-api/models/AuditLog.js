const mongoose = require('mongoose');

// Audit Log Schema for tracking all admin actions
const AuditLogSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'approve', 'reject',
      'login', 'logout', 'view',
      'publish', 'unpublish', 'bulk_publish', 'update_status', 'bulk_update_status'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['category', 'item', 'user', 'settings', 'system'],
    index: true
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  resourceName: {
    type: String, // Human-readable name of the resource
    trim: true
  },
  // Store the changes made (for update actions)
  changes: {
    before: mongoose.Schema.Types.Mixed, // Previous state
    after: mongoose.Schema.Types.Mixed,  // New state
    fields: [String] // Array of changed field names
  },
  // Request metadata
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Additional context
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Success/failure tracking
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  // Performance tracking
  duration: {
    type: Number, // Milliseconds
    min: 0
  },
  // Batch operation tracking
  batchId: {
    type: String,
    index: true,
    sparse: true // Only create index for non-null values
  },
  batchSize: {
    type: Number,
    min: 1
  }
}, {
  timestamps: true,
  collection: 'auditLogs'
});

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // For general chronological queries

// TTL index to automatically delete old logs after 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Pre-save middleware to generate ID
AuditLogSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Pre-validate middleware to ensure ID is generated before validation
AuditLogSchema.pre('validate', function(next) {
  if (!this.id) {
    this.id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Instance Methods
AuditLogSchema.methods.toSummary = function() {
  return {
    id: this.id,
    userId: this.userId,
    userEmail: this.userEmail,
    action: this.action,
    resourceType: this.resourceType,
    resourceId: this.resourceId,
    resourceName: this.resourceName,
    description: this.description,
    success: this.success,
    createdAt: this.createdAt
  };
};

// Static Methods
AuditLogSchema.statics.logAction = async function({
  userId,
  userEmail,
  action,
  resourceType,
  resourceId,
  resourceName = null,
  changes = null,
  ipAddress,
  userAgent,
  description = null,
  severity = 'medium',
  success = true,
  errorMessage = null,
  duration = null,
  batchId = null,
  batchSize = null
}) {
  const logEntry = new this({
    userId,
    userEmail,
    action,
    resourceType,
    resourceId,
    resourceName,
    changes,
    ipAddress,
    userAgent,
    description,
    severity,
    success,
    errorMessage,
    duration,
    batchId,
    batchSize
  });

  return logEntry.save();
};

AuditLogSchema.statics.getRecentActivity = function(limit = 50) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('userId userEmail action resourceType resourceName description success createdAt');
};

AuditLogSchema.statics.getUserActivity = function(userId, limit = 100) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

AuditLogSchema.statics.getResourceActivity = function(resourceType, resourceId, limit = 50) {
  return this.find({ resourceType, resourceId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

AuditLogSchema.statics.getFailedActions = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    success: false,
    createdAt: { $gte: since }
  }).sort({ createdAt: -1 });
};

AuditLogSchema.statics.getActionStats = async function(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          action: '$action',
          resourceType: '$resourceType',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: ['$success', 1, 0] }
        },
        failureCount: {
          $sum: { $cond: ['$success', 0, 1] }
        }
      }
    },
    { $sort: { '_id.date': -1, '_id.action': 1 } }
  ]);

  return stats;
};

AuditLogSchema.statics.getMostActiveUsers = async function(days = 30, limit = 10) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          userId: '$userId',
          userEmail: '$userEmail'
        },
        actionCount: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        actions: {
          $addToSet: '$action'
        }
      }
    },
    { $sort: { actionCount: -1 } },
    { $limit: limit }
  ]);
};

AuditLogSchema.statics.searchLogs = function({
  userId = null,
  action = null,
  resourceType = null,
  resourceId = null,
  success = null,
  startDate = null,
  endDate = null,
  search = null,
  page = 1,
  limit = 50
}) {
  const query = {};

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (resourceId) query.resourceId = resourceId;
  if (success !== null) query.success = success;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { userEmail: new RegExp(search, 'i') },
      { resourceName: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

AuditLogSchema.statics.createBatchLogger = function(batchId, batchSize) {
  return (logData) => {
    return this.logAction({
      ...logData,
      batchId,
      batchSize
    });
  };
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);