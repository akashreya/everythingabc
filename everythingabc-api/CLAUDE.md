# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **EverythingABC API** - a Node.js/Express backend for a visual vocabulary learning platform. The system manages categories (like Animals, Fruits, Transportation) with A-Z item collections. It includes both public APIs for the learning platform and an integrated admin CMS for content management.

## Architecture

### Core Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB with Mongoose ODM (dual setup with native MongoDB client)
- **Authentication**: JWT with bcrypt password hashing
- **File Processing**: Sharp for image manipulation, Multer for uploads
- **Background Jobs**: Bull queue system with Redis
- **Logging**: Winston with file and console transports

### Project Structure
```
├── server.js                 # Main application entry point
├── db.js                     # Database connection and configuration
├── models/                   # Mongoose schemas
│   ├── Category.js           # Core category model with A-Z items
│   ├── UnifiedCategory.js    # Enhanced category model (migration target)
│   ├── AdminUser.js          # Admin authentication and authorization
│   └── AuditLog.js           # Admin action tracking
├── routes/                   # Public API endpoints
│   ├── categories.js         # Category and item retrieval
│   ├── imageCollection.js    # Image management
│   └── unified-collection.js # New unified system endpoints
├── admin/                    # Content Management System
│   ├── routes/               # Admin-only endpoints with auth middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── categories.js     # Category CRUD operations
│   │   ├── items.js          # Item management and approval
│   │   └── dashboard.js      # Analytics and overview
│   ├── middleware/           # Authentication and permission checks
│   └── utils/                # Admin-specific utilities
├── services/                 # Business logic layer
│   ├── ImageCollectionService.js    # Image processing and metadata
│   └── QualityAssessmentService.js  # Content quality evaluation
├── scripts/                  # Database operations and utilities
│   ├── seed.js               # Initial data seeding
│   ├── migrate.js            # Schema migrations
│   ├── createAdminUser.js    # Admin user creation
│   └── migration/            # Multi-step migration scripts
└── tests/                    # Test files (Jest framework)
```

### Database Schema Highlights
- **Categories**: Core content organized in A-Z structure with embedded items
- **Admin System**: JWT-based authentication with role-based permissions (admin/editor/moderator)
- **Audit Trail**: Complete action logging with before/after states for compliance

## Development Commands

### Essential Commands
```bash
# Development server with hot reload
npm run dev

# Production server
npm start

# Run tests
npm test

# Database operations
npm run seed              # Seed initial category data
npm run migrate           # Run schema migrations

# Admin user management
node scripts/createAdminUser.js [email] [password] [firstName] [lastName]
```

### Database Scripts
```bash
# Create default admin user (admin@everythingabc.com / admin123456)
node scripts/createAdminUser.js

# Test unified system migration
node scripts/test-unified-system.js

# Migration scripts (run in order)
node scripts/migration/01-schema-migration.js
node scripts/migration/02-data-migration.js
node scripts/migration/03-cleanup.js
```

## Key Implementation Details

### Dual Database Architecture
The system uses both native MongoDB client and Mongoose for different purposes:
- **Mongoose**: Schema validation, model relationships, admin operations
- **Native MongoDB**: High-performance reads, bulk operations, migrations

### Authentication Flow
- **Public APIs**: No authentication required for vocabulary content
- **Admin APIs**: JWT access tokens (1h) + refresh tokens (7d) with role-based permissions
- **Account Security**: 5 failed login attempts trigger 2-hour lockout

### Content Management Workflow
1. **Creation**: Admin creates categories/items with draft status
2. **Approval**: Content goes through approval workflow
3. **Publishing**: Approved content becomes publicly available
4. **Audit**: All actions logged with user attribution and change tracking

### Image Processing Pipeline
- Upload handling via Multer
- Image optimization and resizing with Sharp
- Quality assessment scoring (0-10 scale)
- Multiple format support (WebP, JPEG, PNG)

## Environment Configuration

Required environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/everythingabc
USE_MEMORY_DB=false

# JWT Security
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
NODE_ENV=development
PORT=3003
CORS_ORIGIN=http://localhost:5173

# Redis (for background jobs)
REDIS_URL=redis://localhost:6379
```

## Testing Strategy

- **Framework**: Jest with MongoDB Memory Server for isolated tests
- **Coverage**: Models, routes, services, and integration tests
- **Test Data**: Isolated test database with cleanup between tests

## Current Migration Status

The system is undergoing migration from a simple category structure to a unified content management system:
- **Legacy**: Basic categories with embedded A-Z items
- **Target**: Enhanced categories with improved image handling, quality scores, and admin workflow
- **Status**: Both systems running in parallel during transition

## Development Guidelines

### Working with Categories
- Use `Category.js` model for existing functionality
- Use `UnifiedCategory.js` for new features
- Always include admin tracking fields (createdBy, lastModifiedBy)

### Admin API Development
- All admin routes require authentication middleware
- Include permission checks for sensitive operations
- Log all data modifications to audit trail
- Use proper HTTP status codes and error messages

### Image Handling
- Process images through ImageCollectionService
- Generate quality scores for content assessment
- Support multiple image sizes and formats
- Include proper metadata tracking

## Common Development Tasks

### Adding New Category Types
1. Update schema enums in models
2. Add validation rules
3. Update seeding scripts
4. Add admin interface support

### Creating Admin Endpoints
1. Add route to `admin/routes/`
2. Include authentication middleware
3. Add permission checks
4. Implement audit logging
5. Register in `server.js`

### Database Migrations
1. Create migration script in `scripts/migration/`
2. Test with development data
3. Run in sequence: schema → data → cleanup
4. Update `migrate.js` main script