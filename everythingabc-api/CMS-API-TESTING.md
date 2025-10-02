# CMS API Testing Guide

This document provides cURL examples for testing the CMS API endpoints.

## Prerequisites

1. Start the server: `npm start` or `npm run dev`
2. Server should be running on: `http://localhost:3003`
3. Get an authentication token (if authentication is enabled)

## Authentication

Most admin endpoints require authentication. Get a token first:

```bash
# Login to get JWT token
curl -X POST http://localhost:3003/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@everythingabc.com",
    "password": "admin123456"
  }'

# Response will include: { "accessToken": "..." }
# Use this token in subsequent requests
```

## Category Management Endpoints

### 1. List All Categories

```bash
curl -X GET "http://localhost:3003/api/v1/admin/categories?include_stats=true&sort=name&order=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Single Category

```bash
curl -X GET "http://localhost:3003/api/v1/admin/categories/animals?include_items=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create New Category

```bash
curl -X POST http://localhost:3003/api/v1/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Sports Equipment",
    "description": "Athletic gear and equipment",
    "icon": "⚽",
    "group": "everyday",
    "priority": 15,
    "color": "from-orange-400 to-red-300"
  }'
```

### 4. Update Category

```bash
curl -X PUT http://localhost:3003/api/v1/admin/categories/sports-equipment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Sports Equipment Updated",
    "description": "Updated description",
    "icon": "🏀",
    "priority": 10
  }'
```

### 5. Delete Category

```bash
curl -X DELETE "http://localhost:3003/api/v1/admin/categories/sports-equipment?confirm=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Get Category Statistics

```bash
curl -X GET http://localhost:3003/api/v1/admin/categories/animals/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Item Management Endpoints

### 1. List Items by Category

```bash
# All items in a category
curl -X GET "http://localhost:3003/api/v1/admin/categories/animals/items" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by letter
curl -X GET "http://localhost:3003/api/v1/admin/categories/animals/items?letter=A" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:3003/api/v1/admin/categories/animals/items?collectionStatus=pending&publishingStatus=draft" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search and filter
curl -X GET "http://localhost:3003/api/v1/admin/categories/animals/items?search=dog&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Items by Letter

```bash
curl -X GET http://localhost:3003/api/v1/admin/categories/animals/items/A \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create New Item

```bash
curl -X POST http://localhost:3003/api/v1/admin/categories/animals/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "letter": "A",
    "name": "Archery Bow",
    "description": "Equipment used in archery sport",
    "tags": ["sport", "archery", "equipment"],
    "difficulty": 2,
    "facts": [
      "Modern bows can shoot arrows over 200 mph",
      "Archery has been an Olympic sport since 1900"
    ]
  }'
```

### 4. Update Item

```bash
curl -X PUT http://localhost:3003/api/v1/admin/items/archery-bow-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Archery Bow Updated",
    "description": "Updated description",
    "tags": ["sport", "archery", "equipment", "target"],
    "difficulty": 3
  }'
```

### 5. Delete Item

```bash
curl -X DELETE "http://localhost:3003/api/v1/admin/items/archery-bow-001?deleteImages=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Publishing Workflow Endpoints

### 1. Update Item Publishing Status

```bash
# Change to review status
curl -X PATCH http://localhost:3003/api/v1/admin/items/ant-001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "publishingStatus": "review"
  }'

# Publish item (only works if collectionStatus is "complete")
curl -X PATCH http://localhost:3003/api/v1/admin/items/ant-001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "publishingStatus": "published"
  }'
```

### 2. Bulk Update Publishing Status

```bash
curl -X POST http://localhost:3003/api/v1/admin/items/bulk-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemIds": ["ant-001", "bear-001", "cat-001"],
    "publishingStatus": "published"
  }'
```

### 3. Get Items Pending Review

```bash
curl -X GET "http://localhost:3003/api/v1/admin/items/pending-review?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by category
curl -X GET "http://localhost:3003/api/v1/admin/items/pending-review?categoryId=animals" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Publish Item (Shortcut)

```bash
curl -X POST http://localhost:3003/api/v1/admin/items/ant-001/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Unpublish Item

```bash
curl -X POST http://localhost:3003/api/v1/admin/items/ant-001/unpublish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Bulk Publish

```bash
curl -X POST http://localhost:3003/api/v1/admin/items/bulk-publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemIds": ["ant-001", "bear-001", "cat-001"]
  }'
```

## CSV Import/Export Endpoints

### 1. Validate CSV

```bash
curl -X POST http://localhost:3003/api/v1/admin/import/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@items.csv"
```

### 2. Import CSV

```bash
# Basic import (skip duplicates)
curl -X POST http://localhost:3003/api/v1/admin/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@items.csv" \
  -F "skipDuplicates=true"

# Import with options
curl -X POST http://localhost:3003/api/v1/admin/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@items.csv" \
  -F "createCategories=true" \
  -F "skipDuplicates=false" \
  -F "updateExisting=true"
```

### 3. Download CSV Template

```bash
curl -X GET http://localhost:3003/api/v1/admin/import/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o import-template.csv
```

### 4. Export CSV

```bash
# Export all items
curl -X GET http://localhost:3003/api/v1/admin/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o export-all.csv

# Export specific category
curl -X GET "http://localhost:3003/api/v1/admin/export/csv?categoryId=animals" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o export-animals.csv

# Export with filters and metadata
curl -X GET "http://localhost:3003/api/v1/admin/export/csv?categoryId=animals&publishingStatus=published&includeMetadata=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o export-animals-published.csv
```

## CSV File Format

### Basic CSV Format

```csv
category,letter,itemName,description,tags,difficulty
animals,A,Ant,"Small insect that lives in colonies","insect,colony,worker",1
animals,A,Alligator,"Large reptile","reptile,water,predator",2
animals,B,Bear,"Large mammal","mammal,forest,hibernate",1
```

### CSV with Metadata

```csv
category,letter,itemName,description,tags,difficulty,collectionStatus,publishingStatus,imageCount,createdAt,updatedAt
animals,A,Ant,"Small insect","insect,colony",1,complete,published,3,2024-01-02T10:00:00Z,2024-01-15T14:30:00Z
animals,A,Alligator,"Large reptile","reptile,water",2,complete,published,5,2024-01-02T11:00:00Z,2024-01-16T09:00:00Z
```

## Integration with Image Collection

When images are downloaded via the Collections page, the system automatically updates item status:

```bash
# This endpoint is called by the Collections page
curl -X POST http://localhost:3003/api/v1/collect/selected \
  -H "Content-Type: application/json" \
  -d '{
    "category": "animals",
    "letter": "A",
    "itemName": "Ant",
    "selectedImages": [
      {
        "id": "img123",
        "url": "https://example.com/ant.jpg",
        "source": "unsplash"
      }
    ]
  }'

# This will:
# 1. Download and process images
# 2. Add images to item.images array
# 3. Auto-update collectionStatus from "pending" to "complete"
# 4. Update category metadata counts
```

## Testing Workflow

### Complete Testing Flow

1. **Create a Category**
```bash
curl -X POST http://localhost:3003/api/v1/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Category",
    "description": "Testing category",
    "icon": "🧪",
    "group": "educational",
    "color": "from-blue-400 to-cyan-300"
  }'
```

2. **Create Items**
```bash
curl -X POST http://localhost:3003/api/v1/admin/categories/test-category/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "letter": "A",
    "name": "Apple",
    "description": "Red fruit",
    "tags": ["fruit", "food"],
    "difficulty": 1
  }'
```

3. **Collect Images** (via Collections page or direct API)
```bash
curl -X POST http://localhost:3003/api/v1/collect/selected \
  -H "Content-Type: application/json" \
  -d '{
    "category": "test-category",
    "letter": "A",
    "itemName": "Apple",
    "selectedImages": [...]
  }'
```

4. **Verify Status Update**
```bash
curl -X GET http://localhost:3003/api/v1/admin/categories/test-category/items/A \
  -H "Authorization: Bearer YOUR_TOKEN"
```

5. **Change to Review**
```bash
curl -X PATCH http://localhost:3003/api/v1/admin/items/apple-xxx/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"publishingStatus": "review"}'
```

6. **Publish Item**
```bash
curl -X POST http://localhost:3003/api/v1/admin/items/apple-xxx/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

7. **Export Data**
```bash
curl -X GET "http://localhost:3003/api/v1/admin/export/csv?categoryId=test-category&includeMetadata=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o test-export.csv
```

## Error Handling

### Expected Error Responses

1. **Validation Error (400)**
```json
{
  "success": false,
  "error": "Invalid publishingStatus. Must be one of: draft, review, published"
}
```

2. **Not Found (404)**
```json
{
  "success": false,
  "error": "Category not found"
}
```

3. **Publishing Validation Error (400)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot publish item with pending collection status. Please add images first."
  }
}
```

4. **Unauthorized (401)**
```json
{
  "success": false,
  "error": "Access token required",
  "code": "TOKEN_MISSING"
}
```

## Performance Testing

### Bulk Operations

Test with larger datasets:

```bash
# Create 100 items via CSV
curl -X POST http://localhost:3003/api/v1/admin/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large-import.csv"

# Bulk publish 50 items
curl -X POST http://localhost:3003/api/v1/admin/items/bulk-publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemIds": ["item1", "item2", ..., "item50"]
  }'
```

## Notes

- Replace `YOUR_TOKEN` with actual JWT access token
- Replace `archery-bow-001` with actual item IDs from your database
- Ensure server is running on port 3003
- Check server logs for detailed error messages
- All admin endpoints require authentication unless disabled in development mode
