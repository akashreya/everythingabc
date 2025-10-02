# EverythingABC Database Documentation

## Overview

**Database Type:** MongoDB
**Database Name:** `everythingabc`
**Connection:** Dual setup with MongoDB native client and Mongoose ODM
**Version:** MongoDB 7.0

## Database Configuration

### Connection Details
- **Local Development:** `mongodb://localhost:27017/everythingabc`
- **Memory DB Support:** Available for development/testing
- **Connection Pooling:** Max 10 connections
- **Timeouts:** 5s server selection, 45s socket timeout

### Environment Configuration
```env
MONGODB_URI=mongodb://localhost:27017/everythingabc
USE_MEMORY_DB=false
NODE_ENV=development
```

## Collections Overview

| Collection | Purpose | Documents | Indexes |
|------------|---------|-----------|---------|
| `categories` | Vocabulary categories with A-Z items | ~100-1000 | 7 indexes |
| `adminUsers` | CMS authentication & user management | ~5-50 | 6 indexes |
| `auditLogs` | Admin action tracking & compliance | Growing | 5 indexes + TTL |

---

## Collection Schemas

### 1. Categories Collection

**Purpose:** Core vocabulary learning content organized by categories and letters A-Z

#### Schema Structure

```javascript
{
  // Identity
  id: String (unique, required),           // "animals", "fruits", etc.
  name: String (required),                 // "Animals", "Fruits & Vegetables"

  // Presentation
  icon: String (required),                 // "🐾", "🍎"
  color: String (required),                // "#4F46E5"

  // Classification
  difficulty: String (enum),               // "Easy", "Medium", "Hard"
  description: String (required),          // Category description
  tags: [String],                          // ["nature", "wildlife"]
  ageRange: String,                        // "3-12 years"
  learningObjectives: [String],            // Educational goals

  // Status & Metrics
  status: String (enum),                   // "active", "inactive", "draft"
  completeness: Number (0-26),             // Letters with items

  // Items organized by letter (A-Z)
  items: {
    A: [ItemSchema],
    B: [ItemSchema],
    // ... through Z
  },

  // Analytics
  metadata: {
    totalItems: Number,
    lastUpdated: Date,
    viewCount: Number,
    avgSessionTime: Number
  },

  // Admin tracking
  createdBy: String,                       // Admin user ID
  lastModifiedBy: String,
  publishedBy: String,
  publishedAt: Date,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### Item Sub-Schema

```javascript
{
  // Identity
  id: String (required),                   // "ant", "alligator"
  name: String (required),                 // "Ant", "Alligator"

  // Media
  image: String (required),                // URL to image
  imageAlt: String,                        // Alt text (defaults to name)

  // Content
  description: String (required),          // Item description
  pronunciation: String,                   // Phonetic guide
  facts: [String],                         // Interesting facts
  tags: [String],                          // Item-specific tags

  // Difficulty
  difficulty: Number (1-5),                // Item complexity

  // Category-specific metadata
  nutritionFacts: {
    vitamins: [String],
    minerals: [String],
    benefits: [String]
  },
  technicalFacts: {
    speed: String,
    environment: String,
    passengers: String
  },
  colorInfo: {
    hex: String,
    rgb: String,
    family: String,
    mood: String
  },
  roomLocation: String,
  uses: [String],

  // Admin fields
  status: String (enum),                   // "draft", "published", "archived"
  approvalStatus: String (enum),           // "pending", "approved", "rejected"
  createdBy: String,
  lastModifiedBy: String,
  approvedBy: String,
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
```javascript
// Primary indexes
{ id: 1 } (unique)
{ name: 1 }
{ status: 1 }
{ difficulty: 1 }
{ tags: 1 }

// Text search index
{
  name: "text",
  description: "text",
  "items.A.name": "text",
  "items.B.name": "text",
  // ... through Z
}
```

#### Sample Document
```javascript
{
  "_id": ObjectId("..."),
  "id": "animals",
  "name": "Animals",
  "icon": "🐾",
  "color": "#4F46E5",
  "difficulty": "Easy",
  "description": "Meet amazing creatures from around the world!",
  "status": "active",
  "completeness": 4,
  "tags": ["educational", "nature", "popular"],
  "ageRange": "3-12 years",
  "learningObjectives": [
    "Identify common animals and their names",
    "Learn about animal habitats and behaviors"
  ],
  "items": {
    "A": [{
      "id": "alligator",
      "name": "Alligator",
      "image": "https://images.unsplash.com/photo-1596195689404-24d8a8d1c6ea?w=400",
      "description": "Large reptiles that live in water...",
      "facts": ["Can hold breath for 24 hours"],
      "tags": ["reptile", "water", "predator"],
      "difficulty": 2,
      "status": "published",
      "approvalStatus": "approved"
    }],
    "B": [/* bear items */],
    "C": [/* cat items */],
    "D": [/* dog items */]
  },
  "metadata": {
    "totalItems": 4,
    "lastUpdated": "2024-09-28T...",
    "viewCount": 0,
    "avgSessionTime": 0
  },
  "createdAt": "2024-09-28T...",
  "updatedAt": "2024-09-28T..."
}
```

---

### 2. AdminUsers Collection

**Purpose:** Content Management System authentication and authorization

#### Schema Structure

```javascript
{
  // Identity
  id: String (unique, required),           // "admin-user-001"
  email: String (unique, required),        // "admin@everythingabc.com"

  // Authentication
  passwordHash: String (required),         // Bcrypt hashed password

  // Profile
  firstName: String (required),            // "Admin"
  lastName: String (required),             // "User"
  avatar: String,                          // Profile image URL
  bio: String,                             // User bio (max 500 chars)

  // Authorization
  role: String (enum, required),           // "admin", "editor", "moderator"
  permissions: [String],                   // Granular permissions array

  // Account Status
  isActive: Boolean,                       // Account enabled/disabled

  // Security
  lastLogin: Date,                         // Last successful login
  loginAttempts: Number (max 5),           // Failed login counter
  lockUntil: Date,                         // Account lock expiration

  // Session Management
  refreshTokens: [{
    token: String,
    createdAt: Date (expires: 7d)          // Auto-delete after 7 days
  }],

  // Two-Factor Authentication
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,

  // Audit Trail
  createdBy: String,                       // Creator admin user ID
  lastModifiedBy: String,                  // Last modifier admin user ID

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### Permission System
```javascript
// Available permissions
[
  "categories.read",
  "categories.create",
  "categories.update",
  "categories.delete",
  "items.read",
  "items.create",
  "items.update",
  "items.delete",
  "items.approve",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "analytics.read",
  "settings.update"
]

// Role-based default permissions
admin: [/* all permissions */]
editor: ["categories.read", "categories.create", "categories.update", "items.*", "analytics.read"]
moderator: ["categories.read", "items.read", "items.update", "items.approve", "analytics.read"]
```

#### Indexes
```javascript
{ email: 1 } (unique)
{ id: 1 } (unique)
{ role: 1 }
{ isActive: 1 }
{ lastLogin: 1 }
```

#### Sample Document
```javascript
{
  "_id": ObjectId("..."),
  "id": "admin-user-001",
  "email": "admin@everythingabc.com",
  "passwordHash": "$2a$12$...",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "permissions": ["categories.read", "categories.create", /* ... */],
  "isActive": true,
  "lastLogin": null,
  "loginAttempts": 0,
  "refreshTokens": [],
  "twoFactorEnabled": false,
  "createdAt": "2024-09-28T...",
  "updatedAt": "2024-09-28T..."
}
```

---

### 3. AuditLogs Collection

**Purpose:** Complete audit trail of all admin actions for security and compliance

#### Schema Structure

```javascript
{
  // Identity
  id: String (unique),                     // "audit_1727555200_abc123def"

  // Actor
  userId: String (required, indexed),      // Admin user ID who performed action
  userEmail: String (required),            // Admin user email

  // Action Details
  action: String (enum, required),         // "create", "update", "delete", "approve", etc.
  resourceType: String (enum, required),   // "category", "item", "user", "settings", "system"
  resourceId: String (required),           // ID of affected resource
  resourceName: String,                    // Human-readable resource name

  // Change Tracking
  changes: {
    before: Mixed,                         // Previous state (for updates)
    after: Mixed,                          // New state (for updates)
    fields: [String]                       // Changed field names
  },

  // Request Context
  ipAddress: String (required),            // Client IP address
  userAgent: String (required),            // Client user agent

  // Metadata
  description: String,                     // Human-readable action description
  severity: String (enum),                 // "low", "medium", "high", "critical"
  success: Boolean,                        // Action success/failure
  errorMessage: String,                    // Error details if failed
  duration: Number,                        // Action duration in milliseconds

  // Batch Operations
  batchId: String (indexed),               // Group related operations
  batchSize: Number,                       // Total operations in batch

  // Timestamps
  createdAt: Date (indexed, TTL 2 years)  // Auto-delete after 2 years
}
```

#### Indexes
```javascript
{ userId: 1, createdAt: -1 }               // User activity timeline
{ resourceType: 1, resourceId: 1, createdAt: -1 }  // Resource history
{ action: 1, createdAt: -1 }               // Action type queries
{ createdAt: -1 }                          // Chronological queries
{ batchId: 1 } (sparse)                    // Batch operation tracking
{ createdAt: 1 } (TTL: 2 years)           // Auto-deletion
```

#### Sample Document
```javascript
{
  "_id": ObjectId("..."),
  "id": "audit_1727555200_abc123def",
  "userId": "admin-user-001",
  "userEmail": "admin@everythingabc.com",
  "action": "create",
  "resourceType": "category",
  "resourceId": "animals",
  "resourceName": "Animals",
  "changes": {
    "after": { "name": "Animals", "status": "active" },
    "fields": ["name", "status", "description"]
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "description": "Created new category: Animals",
  "severity": "medium",
  "success": true,
  "duration": 234,
  "createdAt": "2024-09-28T12:00:00.000Z"
}
```

---

## Database Operations

### Initialization Scripts

```bash
# Seed initial data
npm run seed

# Create admin users
node scripts/createAdminUser.js [email] [password] [firstName] [lastName]

# Migration support
npm run migrate
```

### Current Data State

**Categories:** 3 seeded categories
- Animals (4/26 letters, 4 items)
- Fruits & Vegetables (2/26 letters, 2 items)
- Transportation (2/26 letters, 2 items)

**Admin Users:** None created (scripts available)

**Audit Logs:** Empty (will populate with admin activity)

---

## Performance Considerations

### Indexing Strategy
- **Primary keys** for fast lookups
- **Compound indexes** for common query patterns
- **Text search** for content discovery
- **TTL indexes** for automatic cleanup

### Query Patterns
```javascript
// Common queries optimized by indexes
Category.find({ status: 'active' }).sort({ completeness: -1 })
Category.findOne({ id: 'animals' })
Category.find({ $text: { $search: 'dog cat' } })
AdminUser.findByEmail('admin@example.com')
AuditLog.find({ userId: 'admin-001' }).sort({ createdAt: -1 })
```

### Scaling Considerations
- **Embedded items** work well for current A-Z structure
- **Text search indexes** may need tuning with large datasets
- **Audit logs** auto-expire to prevent unbounded growth
- **Connection pooling** configured for concurrent access

---

## Security Features

### Authentication
- **Bcrypt password hashing** (cost factor 12)
- **JWT tokens** with configurable expiration
- **Refresh token rotation** (7-day expiration)
- **Account locking** after 5 failed attempts (2-hour lockout)

### Authorization
- **Role-based access control** (RBAC)
- **Granular permissions** system
- **Resource-level security** checks

### Audit Trail
- **Complete action logging** with before/after states
- **IP and user agent tracking**
- **Automatic log retention** (2-year TTL)
- **Failed action logging** for security monitoring

---

## Known Issues & TODOs

### Image Management
🔴 **Critical:** Single image field needs enhancement for multiple sizes
- Current: Single `image` URL field
- Needed: `thumbnail`, `small`, `medium`, `large`, `original` sizes
- Impact: Performance, responsive design, bandwidth optimization

### Schema Improvements
- Add image metadata (dimensions, file size, format)
- Consider separating items into their own collection for very large datasets
- Add user progress tracking collections for future features

### Monitoring
- Add database health checks
- Implement query performance monitoring
- Set up automated backup strategies

---

## Migration Planning

### Image Size Enhancement
```javascript
// Proposed new image schema
images: {
  thumbnail: String,    // 150x150
  small: String,       // 300x300
  medium: String,      // 600x600
  large: String,       // 1200x1200
  original: String     // Source image
},
imageMetadata: {
  originalWidth: Number,
  originalHeight: Number,
  aspectRatio: Number,
  fileSize: Number,
  format: String,
  uploadedAt: Date,
  source: String,
  alt: String
}
```

### Future Collections
```javascript
// User progress tracking (future)
userProgress: {
  userId: String,
  categoryId: String,
  completedLetters: [String],
  lastAccessed: Date,
  sessionTime: Number
}

// Analytics aggregation (future)
analyticsDaily: {
  date: Date,
  categoryViews: Map,
  userSessions: Number,
  averageSessionTime: Number
}
```

---

**Last Updated:** September 28, 2024
**Database Version:** MongoDB 7.0
**API Version:** 1.0.0