const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Admin User Schema for CMS authentication
const AdminUserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'moderator'],
    default: 'editor',
    required: true
  },
  permissions: [{
    type: String,
    enum: [
      'categories.read',
      'categories.create',
      'categories.update',
      'categories.delete',
      'items.read',
      'items.create',
      'items.update',
      'items.delete',
      'items.approve',
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      'analytics.read',
      'settings.update'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lockUntil: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d' // Auto-delete after 7 days
    }
  }],
  // Profile information
  avatar: {
    type: String, // URL to profile image
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },
  // Security settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  // Activity tracking
  createdBy: {
    type: String, // Admin user ID who created this user
    default: null
  },
  lastModifiedBy: {
    type: String, // Admin user ID who last modified this user
    default: null
  }
}, {
  timestamps: true,
  collection: 'adminUsers'
});

// Indexes for performance and security
AdminUserSchema.index({ email: 1 }, { unique: true });
AdminUserSchema.index({ id: 1 }, { unique: true });
AdminUserSchema.index({ role: 1 });
AdminUserSchema.index({ isActive: 1 });
AdminUserSchema.index({ lastLogin: 1 });

// Virtual for full name
AdminUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if account is locked
AdminUserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
AdminUserSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
AdminUserSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    this.permissions = this.getDefaultPermissions(this.role);
  }
  next();
});

// Instance Methods
AdminUserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

AdminUserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

AdminUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

AdminUserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

AdminUserSchema.methods.addRefreshToken = function(token) {
  // Remove old tokens (keep max 5)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }

  this.refreshTokens.push({
    token,
    createdAt: new Date()
  });

  return this.save();
};

AdminUserSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(
    refreshToken => refreshToken.token !== token
  );
  return this.save();
};

AdminUserSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'admin';
};

AdminUserSchema.methods.getDefaultPermissions = function(role) {
  const permissionMap = {
    admin: [
      'categories.read', 'categories.create', 'categories.update', 'categories.delete',
      'items.read', 'items.create', 'items.update', 'items.delete', 'items.approve',
      'users.read', 'users.create', 'users.update', 'users.delete',
      'analytics.read', 'settings.update'
    ],
    editor: [
      'categories.read', 'categories.create', 'categories.update',
      'items.read', 'items.create', 'items.update',
      'analytics.read'
    ],
    moderator: [
      'categories.read',
      'items.read', 'items.update', 'items.approve',
      'analytics.read'
    ]
  };

  return permissionMap[role] || [];
};

AdminUserSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.refreshTokens;
  delete userObject.twoFactorSecret;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;

  return {
    ...userObject,
    fullName: this.fullName,
    isLocked: this.isLocked
  };
};

// Static Methods
AdminUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

AdminUserSchema.statics.findById = function(id) {
  return this.findOne({ id, isActive: true });
};

AdminUserSchema.statics.createUser = async function(userData, createdBy = null) {
  // Generate unique ID
  const id = userData.email.split('@')[0] + '_' + Date.now();

  const user = new this({
    ...userData,
    id,
    createdBy
  });

  return user.save();
};

AdminUserSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true })
    .select('-passwordHash -refreshTokens -twoFactorSecret -loginAttempts -lockUntil')
    .sort({ createdAt: -1 });
};

AdminUserSchema.statics.getUserStats = async function() {
  const totalUsers = await this.countDocuments({ isActive: true });
  const activeUsers = await this.countDocuments({
    isActive: true,
    lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  });

  const usersByRole = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  return {
    totalUsers,
    activeUsers,
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('AdminUser', AdminUserSchema);