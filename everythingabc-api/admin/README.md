# EverythingABC Admin CMS

A custom content management system built specifically for the EverythingABC vocabulary platform. This admin system provides comprehensive tools for managing categories, items, users, and content moderation.

## Architecture Overview

The admin CMS is integrated into the main API server, sharing the same MongoDB database and Express.js infrastructure. This approach provides:

- Single codebase maintenance
- Shared database connections
- Unified authentication system
- Lower infrastructure complexity

## Features

### Authentication & Security
- JWT-based authentication with access/refresh token pairs
- Role-based access control (admin, editor, moderator)
- Permission-based authorization system
- Account lockout protection after failed login attempts
- Rate limiting on authentication endpoints
- Comprehensive audit logging for all admin actions

### User Management
- Admin user creation and management
- Role assignment and permission control
- Session management with refresh tokens
- Password change functionality with validation

### Content Management
- Category creation, editing, and publishing
- Item management within categories
- Approval workflow for content moderation
- Bulk operations for efficient content updates
- Status management (draft, published, archived)

### Audit & Analytics
- Complete action logging with user attribution
- Performance tracking and duration metrics
- IP address and user agent tracking
- Change history with before/after snapshots

## Setup Instructions

### Prerequisites
- Node.js 16+
- MongoDB (or in-memory for development)
- npm or yarn package manager

### Environment Configuration

Ensure these environment variables are set in your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/everythingabc
USE_MEMORY_DB=true  # For development only

# Server Configuration
NODE_ENV=development
PORT=3003
CORS_ORIGIN=http://localhost:5173
```

### Database Setup

The admin system extends the existing Category model with admin fields and adds new models:

1. **AdminUser** - Authentication and user management
2. **AuditLog** - Action tracking and audit trails

These models are automatically created when the server starts.

### Initial Admin User

Create your first admin user using the provided script:

```bash
# Using default credentials
node scripts/createAdminUser.js

# With custom credentials
node scripts/createAdminUser.js admin@yoursite.com yourpassword Admin User
```

Default credentials (if no arguments provided):
- Email: admin@everythingabc.com
- Password: admin123456
- Role: admin

### Starting the Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The admin API will be available at:
# http://localhost:3003/admin/auth/*
```

## API Endpoints

### Authentication Routes

All authentication routes are prefixed with `/admin/auth`:

#### POST /admin/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@everythingabc.com",
  "password": "admin123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "admin-001",
    "email": "admin@everythingabc.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "permissions": ["categories.create", "categories.read", ...]
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "ref_...",
    "accessTokenExpiresAt": "2025-01-01T12:00:00.000Z",
    "refreshTokenExpiresAt": "2025-01-08T12:00:00.000Z"
  }
}
```

#### POST /admin/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "ref_..."
}
```

#### POST /admin/auth/logout
Logout and invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "ref_..."
}
```

#### POST /admin/auth/change-password
Change user password (requires authentication).

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### GET /admin/auth/me
Get current user information (requires authentication).

## Middleware System

### Authentication Middleware (`adminAuth.js`)
- Validates JWT tokens
- Loads user information
- Tracks login attempts and account lockouts
- Logs authentication events

### Permission Middleware (`permissions.js`)
- Enforces role-based access control
- Validates specific permissions for actions
- Supports permission inheritance and combinations

## Permission System

### Roles and Default Permissions

**Admin Role:**
- Full access to all features
- User management capabilities
- System configuration access

**Editor Role:**
- Content creation and editing
- Category and item management
- Limited user information access

**Moderator Role:**
- Content approval and rejection
- Comment and user moderation
- Read-only analytics access

### Permission Constants

```javascript
PERMISSIONS = {
  // Category permissions
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',
  CATEGORIES_PUBLISH: 'categories.publish',

  // Item permissions
  ITEMS_CREATE: 'items.create',
  ITEMS_READ: 'items.read',
  ITEMS_UPDATE: 'items.update',
  ITEMS_DELETE: 'items.delete',
  ITEMS_APPROVE: 'items.approve',

  // User permissions
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Analytics permissions
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_EXPORT: 'analytics.export'
}
```

## Security Features

### Rate Limiting
- Authentication endpoints are rate-limited
- 5 attempts per 15 minutes per IP address
- Account lockout after 5 failed login attempts

### Token Security
- Short-lived access tokens (1 hour)
- Secure refresh tokens (7 days)
- Automatic token rotation on refresh
- Token invalidation on logout

### Audit Logging
All admin actions are logged with:
- User ID and role
- Action type and resource affected
- IP address and user agent
- Before/after change snapshots
- Request duration and performance metrics

## Database Schema Extensions

### Category Model Extensions
```javascript
// Added admin fields to existing Category schema
{
  createdBy: String,        // Admin user ID
  lastModifiedBy: String,   // Admin user ID
  publishedBy: String,      // Admin user ID
  publishedAt: Date         // Publication timestamp
}
```

### Item Model Extensions
```javascript
// Added admin fields to existing Item schema
{
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  createdBy: String,
  lastModifiedBy: String,
  approvedBy: String,
  approvedAt: Date
}
```

## Development Workflow

### Testing Authentication
1. Start the API server: `npm run dev`
2. Create an admin user: `node scripts/createAdminUser.js`
3. Test login endpoint with Postman or curl
4. Verify token validation on protected routes

### Adding New Admin Routes
1. Create route file in `admin/routes/`
2. Add authentication middleware
3. Add permission checks as needed
4. Include audit logging for data modifications
5. Register routes in `server.js`

### Debugging
- Check server logs for authentication errors
- Verify JWT secret configuration
- Ensure MongoDB connection is active
- Review audit logs for user action history

## Future Enhancements

### Planned Features
- Frontend React admin dashboard
- Bulk content import/export
- Advanced analytics and reporting
- Real-time notifications
- Multi-language support
- Content scheduling and automation

### Database Optimizations
- Consider PostgreSQL for analytics
- Implement Redis caching
- Add search indexing for content discovery
- Optimize query performance for large datasets

## Support and Troubleshooting

### Common Issues

**"Path `id` is required" error:**
- Ensure admin user creation script and API server use same database
- Check MongoDB connection string consistency
- Verify in-memory database settings

**JWT token errors:**
- Check JWT_SECRET environment variable
- Verify token expiration times
- Ensure system clock synchronization

**Permission denied errors:**
- Verify user role and permissions
- Check middleware order in routes
- Review audit logs for permission failures

### Getting Help
- Check server logs in `logs/` directory
- Review audit logs for user action history
- Verify environment variable configuration
- Test API endpoints with curl or Postman

---

This documentation provides a comprehensive guide for setting up, using, and extending the EverythingABC admin CMS system.