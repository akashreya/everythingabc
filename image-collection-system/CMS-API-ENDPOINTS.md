# CMS API Endpoints Documentation

## Overview

This document defines all backend API endpoints needed for the Image Collection System CMS. These endpoints support category management, item CRUD operations, publishing workflow, and import/export functionality.

## Base URL

```
http://localhost:3003/api/v1/admin
```

## Authentication

All admin endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

For development, authentication can be bypassed if configured in environment variables.

---

## Categories Endpoints

### List All Categories

Get all categories with statistics and completion data.

**Endpoint:** `GET /categories`

**Query Parameters:**
- `include_stats` (boolean, optional): Include detailed statistics (default: true)
- `group` (string, optional): Filter by group (educational, nature, everyday, professional)
- `sort` (string, optional): Sort by field (name, priority, completeness, created_at)
- `order` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "id": "animals",
        "name": "Animals",
        "description": "Explore the wonderful world of animals",
        "icon": "🐾",
        "group": "educational",
        "priority": 1,
        "color": "from-blue-400 to-cyan-300",
        "completeness": 23,
        "metadata": {
          "totalItems": 156,
          "completedItems": 142,
          "publishedItems": 120,
          "pendingItems": 14,
          "draftItems": 22,
          "reviewItems": 14,
          "lastUpdated": "2024-01-15T10:30:00Z",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      }
    ],
    "total": 30,
    "summary": {
      "totalCategories": 30,
      "totalItems": 2500,
      "completedItems": 2100,
      "publishedItems": 1800
    }
  }
}
```

---

### Get Single Category

Get detailed information about a specific category.

**Endpoint:** `GET /categories/:categoryId`

**URL Parameters:**
- `categoryId` (string, required): Category ID (e.g., "animals")

**Query Parameters:**
- `include_items` (boolean, optional): Include all items (default: false)
- `letter` (string, optional): Filter items by letter (A-Z)

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439011",
      "id": "animals",
      "name": "Animals",
      "description": "Explore the wonderful world of animals",
      "icon": "🐾",
      "group": "educational",
      "priority": 1,
      "color": "from-blue-400 to-cyan-300",
      "completeness": 23,
      "items": {
        "A": [
          {
            "id": "ant-001",
            "name": "Ant",
            "description": "Small insect that lives in colonies",
            "tags": ["insect", "colony", "worker"],
            "difficulty": 1,
            "collectionStatus": "complete",
            "publishingStatus": "published",
            "imageCount": 3,
            "createdAt": "2024-01-02T10:00:00Z",
            "updatedAt": "2024-01-15T14:30:00Z"
          }
        ],
        "B": []
      },
      "metadata": {
        "totalItems": 156,
        "completedItems": 142,
        "publishedItems": 120
      }
    }
  }
}
```

---

### Create Category

Create a new category.

**Endpoint:** `POST /categories`

**Request Body:**
```json
{
  "name": "Sports Equipment",
  "description": "Athletic gear and equipment",
  "icon": "⚽",
  "group": "everyday",
  "priority": 15,
  "color": "from-orange-400 to-red-300"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439011",
      "id": "sports-equipment",
      "name": "Sports Equipment",
      "description": "Athletic gear and equipment",
      "icon": "⚽",
      "group": "everyday",
      "priority": 15,
      "color": "from-orange-400 to-red-300",
      "completeness": 0,
      "items": {},
      "metadata": {
        "totalItems": 0,
        "completedItems": 0,
        "publishedItems": 0,
        "createdAt": "2024-01-20T10:00:00Z"
      }
    }
  },
  "message": "Category created successfully"
}
```

---

### Update Category

Update an existing category.

**Endpoint:** `PUT /categories/:categoryId`

**URL Parameters:**
- `categoryId` (string, required): Category ID

**Request Body:**
```json
{
  "name": "Sports Equipment Updated",
  "description": "Updated description",
  "icon": "🏀",
  "priority": 10,
  "color": "from-blue-400 to-green-300"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439011",
      "id": "sports-equipment",
      "name": "Sports Equipment Updated",
      "description": "Updated description",
      "icon": "🏀",
      "priority": 10,
      "metadata": {
        "updatedAt": "2024-01-20T12:00:00Z"
      }
    }
  },
  "message": "Category updated successfully"
}
```

---

### Delete Category

Delete a category and all its items.

**Endpoint:** `DELETE /categories/:categoryId`

**URL Parameters:**
- `categoryId` (string, required): Category ID

**Query Parameters:**
- `confirm` (boolean, required): Must be true to confirm deletion

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCategory": "sports-equipment",
    "deletedItems": 45,
    "deletedImages": 120
  },
  "message": "Category and all associated data deleted successfully"
}
```

---

### Get Category Statistics

Get detailed statistics for a category.

**Endpoint:** `GET /categories/:categoryId/stats`

**URL Parameters:**
- `categoryId` (string, required): Category ID

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "animals",
    "categoryName": "Animals",
    "stats": {
      "totalItems": 156,
      "completedItems": 142,
      "pendingItems": 14,
      "publishedItems": 120,
      "reviewItems": 14,
      "draftItems": 22,
      "itemsByLetter": {
        "A": { "total": 8, "completed": 7, "published": 6 },
        "B": { "total": 6, "completed": 6, "published": 5 },
        "C": { "total": 7, "completed": 6, "published": 5 }
      },
      "completeness": 23,
      "completionRate": 91.03,
      "publishRate": 76.92,
      "avgImagesPerItem": 2.8
    }
  }
}
```

---

## Items Endpoints

### List Items by Category

Get all items for a specific category.

**Endpoint:** `GET /categories/:categoryId/items`

**URL Parameters:**
- `categoryId` (string, required): Category ID

**Query Parameters:**
- `letter` (string, optional): Filter by letter (A-Z)
- `collectionStatus` (string, optional): Filter by collection status (pending, complete)
- `publishingStatus` (string, optional): Filter by publishing status (draft, review, published)
- `search` (string, optional): Search items by name
- `sort` (string, optional): Sort by (name, created_at, updated_at, imageCount)
- `limit` (number, optional): Limit results (default: 100)
- `offset` (number, optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ant-001",
        "categoryId": "animals",
        "letter": "A",
        "name": "Ant",
        "description": "Small insect that lives in colonies",
        "tags": ["insect", "colony", "worker"],
        "difficulty": 1,
        "collectionStatus": "complete",
        "publishingStatus": "published",
        "imageCount": 3,
        "images": [
          {
            "imageId": "img-001",
            "url": "https://storage.example.com/animals/A/ant/ant-001.webp",
            "isPrimary": true
          }
        ],
        "metadata": {
          "createdAt": "2024-01-02T10:00:00Z",
          "updatedAt": "2024-01-15T14:30:00Z",
          "publishedAt": "2024-01-16T09:00:00Z"
        }
      }
    ],
    "total": 156,
    "page": {
      "limit": 100,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### Get Items by Letter

Get all items for a specific letter within a category.

**Endpoint:** `GET /categories/:categoryId/items/:letter`

**URL Parameters:**
- `categoryId` (string, required): Category ID
- `letter` (string, required): Letter (A-Z)

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "animals",
    "letter": "A",
    "items": [
      {
        "id": "ant-001",
        "name": "Ant",
        "description": "Small insect that lives in colonies",
        "collectionStatus": "complete",
        "publishingStatus": "published",
        "imageCount": 3
      },
      {
        "id": "alligator-001",
        "name": "Alligator",
        "description": "Large reptile",
        "collectionStatus": "complete",
        "publishingStatus": "published",
        "imageCount": 5
      }
    ],
    "total": 8
  }
}
```

---

### Create Item

Add a new item to a category.

**Endpoint:** `POST /categories/:categoryId/items`

**URL Parameters:**
- `categoryId` (string, required): Category ID

**Request Body:**
```json
{
  "letter": "A",
  "name": "Archery Bow",
  "description": "Equipment used in archery sport",
  "tags": ["sport", "archery", "equipment"],
  "difficulty": 2,
  "facts": [
    "Modern bows can shoot arrows over 200 mph",
    "Archery has been an Olympic sport since 1900"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "archery-bow-001",
      "categoryId": "sports-equipment",
      "letter": "A",
      "name": "Archery Bow",
      "description": "Equipment used in archery sport",
      "tags": ["sport", "archery", "equipment"],
      "difficulty": 2,
      "facts": [
        "Modern bows can shoot arrows over 200 mph",
        "Archery has been an Olympic sport since 1900"
      ],
      "collectionStatus": "pending",
      "publishingStatus": "draft",
      "imageCount": 0,
      "metadata": {
        "createdAt": "2024-01-20T10:00:00Z",
        "createdBy": "admin@example.com"
      }
    }
  },
  "message": "Item created successfully with status=pending, publishingStatus=draft"
}
```

---

### Update Item

Update an existing item.

**Endpoint:** `PUT /items/:itemId`

**URL Parameters:**
- `itemId` (string, required): Item ID

**Request Body:**
```json
{
  "name": "Archery Bow Updated",
  "description": "Updated description",
  "tags": ["sport", "archery", "equipment", "target"],
  "difficulty": 3,
  "facts": [
    "Updated fact 1",
    "Updated fact 2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "archery-bow-001",
      "name": "Archery Bow Updated",
      "description": "Updated description",
      "tags": ["sport", "archery", "equipment", "target"],
      "difficulty": 3,
      "metadata": {
        "updatedAt": "2024-01-20T11:00:00Z"
      }
    }
  },
  "message": "Item updated successfully"
}
```

---

### Delete Item

Delete an item from a category.

**Endpoint:** `DELETE /items/:itemId`

**URL Parameters:**
- `itemId` (string, required): Item ID

**Query Parameters:**
- `deleteImages` (boolean, optional): Also delete associated images (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedItem": "archery-bow-001",
    "deletedImages": 3
  },
  "message": "Item deleted successfully"
}
```

---

## Publishing Endpoints

### Update Item Publishing Status

Change the publishing status of an item.

**Endpoint:** `PATCH /items/:itemId/status`

**URL Parameters:**
- `itemId` (string, required): Item ID

**Request Body:**
```json
{
  "publishingStatus": "published"
}
```

**Validation:**
- Can only publish items with `collectionStatus: "complete"`
- Status must be one of: "draft", "review", "published"

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "ant-001",
      "name": "Ant",
      "collectionStatus": "complete",
      "publishingStatus": "published",
      "metadata": {
        "publishedAt": "2024-01-20T12:00:00Z",
        "publishedBy": "admin@example.com"
      }
    }
  },
  "message": "Item published successfully"
}
```

**Error Response (if trying to publish pending item):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot publish item with pending collection status. Please add images first."
  }
}
```

---

### Bulk Update Publishing Status

Update publishing status for multiple items at once.

**Endpoint:** `POST /items/bulk-status`

**Request Body:**
```json
{
  "itemIds": [
    "ant-001",
    "bear-001",
    "cat-001"
  ],
  "publishingStatus": "published"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0,
    "results": [
      {
        "itemId": "ant-001",
        "status": "success",
        "newStatus": "published"
      },
      {
        "itemId": "bear-001",
        "status": "success",
        "newStatus": "published"
      },
      {
        "itemId": "cat-001",
        "status": "success",
        "newStatus": "published"
      }
    ]
  },
  "message": "3 items updated successfully"
}
```

**Partial Success Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 1,
    "results": [
      {
        "itemId": "ant-001",
        "status": "success",
        "newStatus": "published"
      },
      {
        "itemId": "bear-001",
        "status": "success",
        "newStatus": "published"
      },
      {
        "itemId": "zebra-001",
        "status": "failed",
        "error": "Cannot publish item with pending collection status"
      }
    ]
  },
  "message": "2 items updated, 1 failed"
}
```

---

### Get Items Pending Review

Get all items with publishingStatus = "review" across all categories.

**Endpoint:** `GET /items/pending-review`

**Query Parameters:**
- `categoryId` (string, optional): Filter by category
- `limit` (number, optional): Limit results (default: 50)
- `offset` (number, optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ant-001",
        "categoryId": "animals",
        "categoryName": "Animals",
        "letter": "A",
        "name": "Ant",
        "collectionStatus": "complete",
        "publishingStatus": "review",
        "imageCount": 3,
        "metadata": {
          "updatedAt": "2024-01-19T10:00:00Z"
        }
      }
    ],
    "total": 14,
    "page": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Publish Item

Shortcut endpoint to publish a single item (changes status from any state to published).

**Endpoint:** `POST /items/:itemId/publish`

**URL Parameters:**
- `itemId` (string, required): Item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "ant-001",
      "publishingStatus": "published",
      "metadata": {
        "publishedAt": "2024-01-20T12:00:00Z",
        "publishedBy": "admin@example.com"
      }
    }
  },
  "message": "Item published successfully"
}
```

---

### Unpublish Item

Change item status from published to draft.

**Endpoint:** `POST /items/:itemId/unpublish`

**URL Parameters:**
- `itemId` (string, required): Item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "ant-001",
      "publishingStatus": "draft",
      "metadata": {
        "unpublishedAt": "2024-01-20T12:00:00Z",
        "unpublishedBy": "admin@example.com"
      }
    }
  },
  "message": "Item unpublished successfully"
}
```

---

### Bulk Publish

Publish multiple items at once.

**Endpoint:** `POST /items/bulk-publish`

**Request Body:**
```json
{
  "itemIds": [
    "ant-001",
    "bear-001",
    "cat-001"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "published": 3,
    "failed": 0,
    "results": [
      {
        "itemId": "ant-001",
        "status": "success"
      },
      {
        "itemId": "bear-001",
        "status": "success"
      },
      {
        "itemId": "cat-001",
        "status": "success"
      }
    ]
  },
  "message": "3 items published successfully"
}
```

---

## Import/Export Endpoints

### Validate CSV

Validate a CSV file before import.

**Endpoint:** `POST /import/validate`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file, required): CSV file to validate

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "rowCount": 100,
    "errors": [],
    "warnings": [
      {
        "row": 15,
        "field": "difficulty",
        "message": "Missing difficulty, will default to 1"
      }
    ],
    "preview": [
      {
        "row": 1,
        "category": "animals",
        "letter": "A",
        "itemName": "Ant",
        "description": "Small insect",
        "tags": "insect,colony",
        "difficulty": 1
      }
    ]
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "data": {
    "valid": false,
    "rowCount": 100,
    "errors": [
      {
        "row": 5,
        "field": "category",
        "message": "Category 'invalid-category' does not exist"
      },
      {
        "row": 12,
        "field": "letter",
        "message": "Letter must be A-Z"
      },
      {
        "row": 20,
        "field": "itemName",
        "message": "Item name is required"
      }
    ],
    "warnings": []
  },
  "message": "Validation failed with 3 errors"
}
```

---

### Import CSV

Import items from a validated CSV file.

**Endpoint:** `POST /import/csv`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file, required): CSV file to import
- `createCategories` (boolean, optional): Create categories if they don't exist (default: false)
- `skipDuplicates` (boolean, optional): Skip items that already exist (default: true)
- `updateExisting` (boolean, optional): Update existing items (default: false)

**CSV Format:**
```csv
category,letter,itemName,description,tags,difficulty
animals,A,Ant,"Small insect that lives in colonies","insect,colony,worker",1
animals,A,Alligator,"Large reptile","reptile,water,predator",2
animals,B,Bear,"Large mammal","mammal,forest,hibernate",1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 95,
    "skipped": 5,
    "failed": 0,
    "summary": {
      "totalRows": 100,
      "created": 95,
      "updated": 0,
      "skipped": 5,
      "errors": 0
    },
    "results": [
      {
        "row": 1,
        "status": "created",
        "itemId": "ant-001",
        "itemName": "Ant"
      },
      {
        "row": 6,
        "status": "skipped",
        "reason": "Item already exists",
        "itemName": "Frog"
      }
    ]
  },
  "message": "Import completed: 95 created, 5 skipped"
}
```

---

### Download CSV Template

Download a CSV template file with headers and example rows.

**Endpoint:** `GET /import/template`

**Query Parameters:**
- `format` (string, optional): Template format (basic, advanced) (default: basic)

**Response:**
- Content-Type: `text/csv`
- File download with name: `import-template.csv`

**File Contents:**
```csv
category,letter,itemName,description,tags,difficulty
animals,A,Ant,"Small insect that lives in colonies","insect,colony,worker",1
animals,B,Bear,"Large mammal that hibernates","mammal,forest,hibernate",2
fruits,A,Apple,"Sweet red fruit","fruit,sweet,healthy",1
```

---

### Export CSV

Export category data as CSV.

**Endpoint:** `GET /export/csv`

**Query Parameters:**
- `categoryId` (string, optional): Export specific category (omit for all)
- `publishingStatus` (string, optional): Filter by publishing status
- `collectionStatus` (string, optional): Filter by collection status
- `includeMetadata` (boolean, optional): Include metadata columns (default: false)

**Response:**
- Content-Type: `text/csv`
- File download with name: `export-{categoryId}-{date}.csv` or `export-all-{date}.csv`

**Basic Export Format:**
```csv
category,letter,itemName,description,tags,difficulty
animals,A,Ant,"Small insect that lives in colonies","insect,colony,worker",1
animals,A,Alligator,"Large reptile","reptile,water,predator",2
```

**With Metadata (includeMetadata=true):**
```csv
category,letter,itemName,description,tags,difficulty,collectionStatus,publishingStatus,imageCount,createdAt,updatedAt
animals,A,Ant,"Small insect","insect,colony",1,complete,published,3,2024-01-02T10:00:00Z,2024-01-15T14:30:00Z
animals,A,Alligator,"Large reptile","reptile,water",2,complete,published,5,2024-01-02T11:00:00Z,2024-01-16T09:00:00Z
```

---

## Data Operations Endpoints

### Seed Categories

Populate database with categories from JSON file.

**Endpoint:** `POST /seed/categories`

**Request Body:**
```json
{
  "categories": ["animals", "fruits"],
  "source": "phase1-categories-complete.json",
  "overwrite": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "seeded": 2,
    "totalItems": 312,
    "totalCategories": 2,
    "results": [
      {
        "categoryId": "animals",
        "itemsSeeded": 156,
        "status": "success"
      },
      {
        "categoryId": "fruits",
        "itemsSeeded": 156,
        "status": "success"
      }
    ]
  },
  "message": "Seeded 312 items across 2 categories"
}
```

---

### Clear Categories

Remove category data from database.

**Endpoint:** `DELETE /categories/clear`

**Request Body:**
```json
{
  "categoryId": "animals",
  "confirm": true
}
```

**For all categories:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCategories": 1,
    "deletedItems": 156,
    "deletedImages": 420
  },
  "message": "Cleared 156 items from 1 category"
}
```

---

## Automatic Status Management

### Collection Status Auto-Update

The backend automatically updates `collectionStatus` when images are downloaded via the Collections page.

**Triggered by:** `POST /collect/selected` endpoint (from Collections page)

**Logic:**
1. When images are successfully downloaded for an item
2. Backend checks if item exists in database
3. If item exists and has `collectionStatus: "pending"`
4. Automatically updates to `collectionStatus: "complete"`
5. Updates `metadata.updatedAt` timestamp
6. Increments `metadata.imageCount`

**Database Update Example:**
```javascript
// When images downloaded via Collections page
await Item.findOneAndUpdate(
  {
    categoryId: "animals",
    letter: "A",
    name: "Ant"
  },
  {
    $set: {
      collectionStatus: "complete",
      "metadata.updatedAt": new Date()
    },
    $inc: {
      "metadata.imageCount": downloadedImages.length
    }
  }
);
```

---

## Error Responses

### Standard Error Format

All endpoints use a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context if applicable"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `ALREADY_EXISTS` - Resource already exists
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `SERVER_ERROR` - Internal server error
- `DATABASE_ERROR` - Database operation failed

---

## Rate Limiting

Admin endpoints have relaxed rate limiting:

- **Category Operations**: 100 requests per minute
- **Item CRUD**: 200 requests per minute
- **Bulk Operations**: 20 requests per minute
- **Import/Export**: 10 requests per minute

Rate limit headers included in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit` (number): Items per page (default: 50, max: 100)
- `offset` (number): Number of items to skip (default: 0)

**Response includes pagination info:**
```json
{
  "data": {
    "items": [...],
    "total": 1000,
    "page": {
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## WebSocket Events (Optional Future Enhancement)

Real-time updates for collaborative editing:

**Events:**
- `item:created` - New item added
- `item:updated` - Item modified
- `item:deleted` - Item removed
- `item:status-changed` - Publishing status changed
- `category:updated` - Category modified

**Event Payload:**
```json
{
  "event": "item:status-changed",
  "data": {
    "itemId": "ant-001",
    "categoryId": "animals",
    "oldStatus": "review",
    "newStatus": "published",
    "changedBy": "admin@example.com",
    "timestamp": "2024-01-20T12:00:00Z"
  }
}
```

---

## Implementation Priority

### Phase 1 (MVP)
1. ✅ Categories CRUD endpoints
2. ✅ Items CRUD endpoints
3. ✅ Basic publishing status update
4. ✅ Collection status auto-update on image download

### Phase 2
5. Bulk operations
6. CSV import/export
7. Publishing workflow endpoints
8. Advanced filtering

### Phase 3
9. Statistics and analytics endpoints
10. WebSocket real-time updates
11. Advanced validation
12. Audit logging

---

## Testing

### Example cURL Commands

**Create Category:**
```bash
curl -X POST http://localhost:3003/api/v1/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Sports Equipment",
    "description": "Athletic gear",
    "icon": "⚽",
    "group": "everyday"
  }'
```

**Create Item:**
```bash
curl -X POST http://localhost:3003/api/v1/admin/categories/sports-equipment/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "letter": "A",
    "name": "Archery Bow",
    "description": "Equipment for archery",
    "difficulty": 2
  }'
```

**Publish Item:**
```bash
curl -X PATCH http://localhost:3003/api/v1/admin/items/archery-bow-001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "publishingStatus": "published"
  }'
```

**Import CSV:**
```bash
curl -X POST http://localhost:3003/api/v1/admin/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@items.csv"
```

---

## Database Indexes Required

For optimal performance, create these MongoDB indexes:

```javascript
// Categories collection
db.categories.createIndex({ "id": 1 }, { unique: true });
db.categories.createIndex({ "group": 1 });
db.categories.createIndex({ "priority": 1 });

// Items (nested in categories)
db.categories.createIndex({ "items.A.collectionStatus": 1 });
db.categories.createIndex({ "items.A.publishingStatus": 1 });
db.categories.createIndex({ "items.A.name": "text" }); // Text search

// Compound indexes
db.categories.createIndex({ "id": 1, "items.A.letter": 1 });
```

---

## Security Considerations

1. **Input Validation**: All inputs sanitized and validated
2. **SQL Injection Prevention**: Using parameterized queries
3. **XSS Prevention**: All outputs escaped
4. **File Upload Security**:
   - File size limits (max 10MB for CSV)
   - MIME type validation
   - Virus scanning for production
5. **Authentication**: JWT token required for all endpoints
6. **Authorization**: Role-based access control
7. **Rate Limiting**: Prevent abuse
8. **Audit Logging**: Track all CMS operations

---

## Conclusion

This API specification provides complete backend support for the Image Collection System CMS. It enables:

- Full CRUD operations on categories and items
- Two-track status management (collection + publishing)
- Bulk operations for efficiency
- CSV import/export for data management
- Automatic status updates based on image collection

The API is designed to be RESTful, scalable, and secure, with clear error handling and comprehensive validation.
