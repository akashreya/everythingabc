# EverythingABC V2 API Documentation

## Overview

The V2 API is a **Rich-Linked REST Architecture** designed for optimal performance and resource discoverability. It eliminates database bloat while providing comprehensive cross-resource linking.

### Performance Improvements
- **Response Size**: 291KB → 2.4KB (99.2% reduction)
- **Architecture**: Separated collections with denormalized data
- **Linking**: Rich cross-resource URLs for navigation and discovery

---

## Base URL

```
http://localhost:3003/api/v2/
```

### API Discovery Endpoint

**GET** `/api/v2/`

Returns the API overview with all available resource endpoints.

```json
{
  "version": "2.0.0",
  "description": "EverythingABC Rich Linked REST API",
  "resources": {
    "categories": "http://localhost:3003/api/v2/categories/",
    "items": "http://localhost:3003/api/v2/items/",
    "images": "http://localhost:3003/api/v2/images/",
    "letters": "http://localhost:3003/api/v2/letters/",
    "search": "http://localhost:3003/api/v2/search/",
    "stats": "http://localhost:3003/api/v2/stats/"
  }
}
```

---

## Categories API

### List All Categories

**GET** `/api/v2/categories/`

Returns paginated list of all vocabulary categories with **minimal data for optimal performance**.

> **Note**: This endpoint returns only essential fields for category grid/list display PLUS a representative image randomly selected from category items. Use `/api/v2/categories/{id}/` for full category details.

```json
{
  "count": 20,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "animals",
      "name": "Animals",
      "icon": "🐾",
      "color": "from-blue-400 to-cyan-300",
      "status": "active",
      "completeness": 26,
      "representative_image": {
        "url": "/categories/animals/A/ant/medium/ant_unsplash_amb0tvcbymi_1754816352684_medium.webp",
        "item_name": "Ant",
        "image_url": "http://localhost:3003/api/v2/images/68f0e57ffe2cf6b4e861fe95/"
      },
      "url": "http://localhost:3003/api/v2/categories/animals/"
    }
  ]
}
```

### Get Specific Category

**GET** `/api/v2/categories/{category_id}/`

Returns complete information about a specific category including detailed statistics.

**Query Parameters:**
- `include_stats` - Include detailed statistics (default: true)

```json
{
  "id": "animals",
  "name": "Animals",
  "icon": "🐾",
  "color": "from-blue-400 to-cyan-300",
  "difficulty": "Easy",
  "description": "Meet amazing creatures from around the world!",
  "status": "active",
  "completeness": 26,
  "tags": ["educational", "nature", "popular"],
  "ageRange": "2-8",
  "learningObjectives": [
    "Animal recognition",
    "Vocabulary building",
    "Letter-sound association"
  ],
  "metadata": {
    "totalItems": 125,
    "viewCount": 120,
    "avgSessionTime": 0,
    "lastUpdated": "2025-10-16T19:00:29.942Z"
  },
  "statistics": {
    "items": {
      "total": 125,
      "by_letter": {
        "A": 8, "B": 5, "C": 7, "D": 4, "E": 6,
        "F": 4, "G": 3, "H": 5, "I": 2, "J": 1,
        "K": 2, "L": 6, "M": 8, "N": 3, "O": 4,
        "P": 7, "Q": 1, "R": 5, "S": 9, "T": 6,
        "U": 1, "V": 2, "W": 4, "X": 0, "Y": 2, "Z": 3
      },
      "letters_covered": 23,
      "completion_percentage": 88,
      "average_difficulty": 2.3
    },
    "engagement": {
      "total_views": 1250,
      "total_images": 456,
      "popular_items": [
        {"id": "ant", "name": "Ant", "views": 45},
        {"id": "bear", "name": "Bear", "views": 38}
      ]
    }
  },
  "related_resources": {
    "items": "http://localhost:3003/api/v2/categories/animals/items/",
    "letters": "http://localhost:3003/api/v2/categories/animals/letters/",
    "images": "http://localhost:3003/api/v2/categories/animals/images/",
    "stats": "http://localhost:3003/api/v2/categories/animals/stats/",
    "all_categories": "http://localhost:3003/api/v2/categories/",
    "search_in_category": "http://localhost:3003/api/v2/search/?category=animals",
    "random_item": "http://localhost:3003/api/v2/categories/animals/random/"
  },
  "url": "http://localhost:3003/api/v2/categories/animals/"
}
```

### Category Items

**GET** `/api/v2/categories/{category_id}/items/`

Returns **lightweight item references** for all items within a specific category. Each item includes a direct URL for rich linking PLUS a random image for immediate grid display without additional API calls.

**Query Parameters:**
- `letter` - Filter by starting letter (A-Z)
- `difficulty` - Filter by maximum difficulty level
- `sort` - Sort order: `name`, `difficulty`, `letter` (default: `letter`)
- `offset` - Pagination offset (default: 0)
- `limit` - Items per page (default: 50)
- `status` - Item status filter (default: `published`)

**Response Format:**
```json
{
  "count": 125,
  "next": "http://localhost:3003/api/v2/categories/animals/items/?offset=50&limit=50",
  "previous": null,
  "items": [
    {
      "id": "alligator",
      "name": "Alligator",
      "letter": "A",
      "difficulty": 2,
      "image_url": "/categories/animals/A/alligator/medium/alligator_123.webp",
      "url": "http://localhost:3003/api/v2/items/alligator/"
    },
    {
      "id": "alpaca",
      "name": "Alpaca",
      "letter": "A",
      "difficulty": 2,
      "image_url": "/categories/animals/A/alpaca/medium/alpaca_456.webp",
      "url": "http://localhost:3003/api/v2/items/alpaca/"
    },
    {
      "id": "ant",
      "name": "Ant",
      "letter": "A",
      "difficulty": 2,
      "image_url": "/categories/animals/A/ant/medium/ant_789.webp",
      "url": "http://localhost:3003/api/v2/items/ant/"
    }
  ],
  "grouped_by_letter": {
    "A": [
      {"id": "alligator", "name": "Alligator", "difficulty": 2, "image_url": "...", "url": "..."},
      {"id": "alpaca", "name": "Alpaca", "difficulty": 2, "image_url": "...", "url": "..."},
      {"id": "ant", "name": "Ant", "difficulty": 2, "image_url": "...", "url": "..."}
    ],
    "B": [
      {"id": "bear", "name": "Bear", "difficulty": 1, "image_url": "...", "url": "..."}
    ]
  },
  "meta": {
    "response_size": "lightweight with direct URLs + random images",
    "performance_gain": "Minimal fields + rich linking + images ready for grid display",
    "category": {
      "id": "animals",
      "name": "Animals",
      "icon": "🐾",
      "color": "from-blue-400 to-cyan-300",
      "url": "http://localhost:3003/api/v2/categories/animals/"
    },
    "filters": {"letter": null, "difficulty": null, "sort": "letter"}
  }
}
```

> **Performance Note**: This endpoint returns only essential fields (id, name, letter, difficulty, image_url, url) for optimal performance. The random image_url enables immediate grid display without additional API calls. Use individual item URLs for complete details.

---

## Items API

### List Items

**GET** `/api/v2/items/`

Returns paginated list of all vocabulary items.

**Query Parameters:**
- `category` - Filter by category ID
- `letter` - Filter by starting letter
- `difficulty` - Filter by difficulty level
- `tags` - Filter by comma-separated tags
- `offset` - Pagination offset
- `limit` - Items per page

### Get Specific Item

**GET** `/api/v2/items/{item_id}/`

Returns detailed information about a specific vocabulary item.

```json
{
  "id": "ant",
  "name": "Ant",
  "description": "Learn about Ant",
  "letter": "A",
  "category": {
    "id": "animals",
    "name": "Animals",
    "icon": "🐾",
    "color": "from-blue-400 to-cyan-300",
    "url": "http://localhost:3003/api/v2/categories/animals/"
  },
  "difficulty": 2,
  "ageRange": "All Ages",
  "learningLevel": "beginner",
  "tags": ["auto-created"],
  "facts": [],
  "images": {
    "count": 8,
    "primary_image_url": "http://localhost:3003/api/v2/images/68f0e57ffe2cf6b4e861fe95/",
    "all_images_url": "http://localhost:3003/api/v2/items/ant/images/"
  },
  "related_resources": {
    "category": "http://localhost:3003/api/v2/categories/animals/",
    "same_letter": "http://localhost:3003/api/v2/letters/A/items/",
    "images": "http://localhost:3003/api/v2/items/ant/images/",
    "related_items": "http://localhost:3003/api/v2/items/ant/related/",
    "similar_tags": "http://localhost:3003/api/v2/items/?tags=auto-created",
    "same_difficulty": "http://localhost:3003/api/v2/items/?difficulty=2",
    "random": "http://localhost:3003/api/v2/random/item/",
    "search": "http://localhost:3003/api/v2/search/",
    "stats": "http://localhost:3003/api/v2/stats/"
  },
  "metadata": {
    "view_count": 16,
    "image_count": 8,
    "popularity_score": 28,
    "last_viewed": "2025-10-16T19:20:56.978Z",
    "last_updated": "2025-10-16T19:30:33.428Z"
  },
  "status": "published",
  "created_at": "2025-09-30T15:35:04.502Z",
  "updated_at": "2025-10-16T19:30:33.428Z",
  "url": "http://localhost:3003/api/v2/items/ant/"
}
```

### Item Images

**GET** `/api/v2/items/{item_id}/images/`

Returns all images associated with a specific item.

### Related Items

**GET** `/api/v2/items/{item_id}/related/`

Returns items related to the specified item based on category, tags, and difficulty.

---

## Letters API (Cross-Category Browsing)

### List All Letters

**GET** `/api/v2/letters/`

Returns all available letters with item counts.

```json
{
  "count": 26,
  "results": [
    {
      "letter": "A",
      "item_count": 90,
      "category_count": 15,
      "url": "http://localhost:3003/api/v2/letters/A/"
    }
  ]
}
```

### Get Letter Details

**GET** `/api/v2/letters/{letter}/`

Returns summary information for a specific letter across all categories.

### Letter Items (Cross-Category)

**GET** `/api/v2/letters/{letter}/items/`

Returns all items starting with the specified letter across all categories.

**Query Parameters:**
- `category` - Filter by specific category
- `offset` - Pagination offset
- `limit` - Items per page

```json
{
  "count": 90,
  "next": "http://localhost:3003/api/v2/letters/A/items/?offset=20&limit=20",
  "previous": null,
  "letter": "A",
  "results": [
    {
      "id": "ant",
      "name": "Ant",
      "letter": "A",
      "category": {
        "id": "animals",
        "name": "Animals",
        "url": "http://localhost:3003/api/v2/categories/animals/"
      },
      "url": "http://localhost:3003/api/v2/items/ant/"
    }
  ],
  "related_resources": {
    "previous_letter": "http://localhost:3003/api/v2/letters/Z/",
    "next_letter": "http://localhost:3003/api/v2/letters/B/",
    "categories": "http://localhost:3003/api/v2/letters/A/categories/",
    "images": "http://localhost:3003/api/v2/letters/A/images/",
    "random": "http://localhost:3003/api/v2/letters/A/random/"
  }
}
```

### Letter Categories

**GET** `/api/v2/letters/{letter}/categories/`

Returns all categories that have items starting with the specified letter.

### Letter Images

**GET** `/api/v2/letters/{letter}/images/`

Returns all images for items starting with the specified letter.

### Random Letter Item

**GET** `/api/v2/letters/{letter}/random/`

Returns a random item starting with the specified letter.

---

## Images API

### List Images

**GET** `/api/v2/images/`

Returns paginated list of all images.

**Query Parameters:**
- `category` - Filter by category
- `letter` - Filter by starting letter
- `item` - Filter by specific item
- `offset` - Pagination offset
- `limit` - Images per page

### Get Specific Image

**GET** `/api/v2/images/{image_id}/`

Returns detailed information about a specific image.

```json
{
  "id": "68f0e57ffe2cf6b4e861fe95",
  "filename": "ant_unsplash_amb0tvcbymi_1754816352684_medium.webp",
  "url": "http://localhost:3003/api/v2/images/68f0e57ffe2cf6b4e861fe95/",
  "item": {
    "id": "ant",
    "name": "Ant",
    "url": "http://localhost:3003/api/v2/items/ant/"
  },
  "category": {
    "id": "animals",
    "name": "Animals",
    "url": "http://localhost:3003/api/v2/categories/animals/"
  },
  "metadata": {
    "width": 400,
    "height": 267,
    "fileSize": 26475,
    "format": "webp"
  },
  "source": {
    "provider": "unsplash",
    "sourceUrl": "https://images.unsplash.com/photo-example",
    "license": "unsplash",
    "commercial": true
  },
  "related_resources": {
    "item": "http://localhost:3003/api/v2/items/ant/",
    "category": "http://localhost:3003/api/v2/categories/animals/",
    "similar_images": "http://localhost:3003/api/v2/images/?item=ant"
  }
}
```

---

## Search API

### Global Search

**GET** `/api/v2/search/`

Search across all vocabulary items, categories, and content.

**Query Parameters:**
- `q` - Search query (required)
- `type` - Filter by content type (items, categories, images)
- `category` - Filter by category
- `letter` - Filter by starting letter
- `offset` - Pagination offset
- `limit` - Results per page

```json
{
  "query": "ant",
  "count": 5,
  "results": [
    {
      "type": "item",
      "id": "ant",
      "name": "Ant",
      "description": "Learn about Ant",
      "category": "animals",
      "url": "http://localhost:3003/api/v2/items/ant/"
    },
    {
      "type": "item",
      "id": "antelope",
      "name": "Antelope",
      "description": "Learn about Antelope",
      "category": "animals",
      "url": "http://localhost:3003/api/v2/items/antelope/"
    }
  ],
  "related_resources": {
    "letter_a": "http://localhost:3003/api/v2/letters/A/items/",
    "animals_category": "http://localhost:3003/api/v2/categories/animals/",
    "advanced_search": "http://localhost:3003/api/v2/search/advanced/"
  }
}
```

---

## Stats API

### Global Statistics

**GET** `/api/v2/stats/`

Returns platform-wide statistics and metrics.

```json
{
  "totals": {
    "categories": 20,
    "items": 2450,
    "images": 8500,
    "letters_covered": 26
  },
  "popular": {
    "categories": [
      {"id": "animals", "name": "Animals", "views": 1250}
    ],
    "items": [
      {"id": "ant", "name": "Ant", "views": 16}
    ],
    "letters": [
      {"letter": "A", "views": 890}
    ]
  },
  "completeness": {
    "avg_items_per_letter": 94.2,
    "categories_with_full_alphabet": 18,
    "total_coverage_percentage": 92.5
  },
  "related_resources": {
    "categories": "http://localhost:3003/api/v2/categories/",
    "items": "http://localhost:3003/api/v2/items/",
    "letters": "http://localhost:3003/api/v2/letters/"
  }
}
```

### Category Statistics

**GET** `/api/v2/categories/{category_id}/stats/`

Returns detailed statistics for a specific category.

---

## Random Endpoints

### Random Item

**GET** `/api/v2/random/item/`

Returns a random vocabulary item from across all categories.

### Random Category

**GET** `/api/v2/random/category/`

Returns a random category.

---

## Rich Linking Architecture

### Response Format

All V2 API responses follow consistent patterns:

1. **Resource URLs**: Every object includes its own URL
2. **Related Resources**: Cross-reference URLs for navigation
3. **Pagination**: Next/previous links for list endpoints
4. **Category References**: Lightweight category objects with URLs
5. **Metadata**: Performance and usage statistics

### URL Patterns

```
Base:           /api/v2/
Categories:     /api/v2/categories/{id}/
Items:          /api/v2/items/{id}/
Letters:        /api/v2/letters/{letter}/
Images:         /api/v2/images/{id}/
Search:         /api/v2/search/?q={query}
Stats:          /api/v2/stats/

Cross-References:
- Letter Items:    /api/v2/letters/{letter}/items/
- Category Items:  /api/v2/categories/{id}/items/
- Item Images:     /api/v2/items/{id}/images/
- Related Items:   /api/v2/items/{id}/related/
```

### Performance Benefits

- **Minimal List Responses**: List endpoints return only essential display fields
- **Lightweight Data**: No embedded image data or detailed metadata in lists
- **Representative Images**: Random images from category items (fresh on each request)
- **Efficient Caching**: Resource URLs enable smart caching strategies
- **Lazy Loading**: Fetch additional data only when needed
- **Parallel Requests**: Multiple related resources can be fetched concurrently

### Representative Image Strategy

Categories list includes randomized representative images:

- **Dynamic Selection**: Images are randomly chosen from published items within each category
- **Visual Variety**: Different images on each API call for engaging user experience
- **Content Authenticity**: Shows actual items users will find in the category
- **Automatic Updates**: New items automatically become eligible as representative images
- **Fallback Handling**: Categories without images gracefully return `null` for representative_image

### List vs Detail Endpoint Strategy

The V2 API follows REST best practices with different data levels:

- **List Endpoints** (`/categories/`, `/items/`): Minimal data for grid/list display
- **Detail Endpoints** (`/categories/{id}/`, `/items/{id}/`): Complete data for full views

```
List Response (minimal):     Detail Response (complete):
├── id                      ├── id
├── name                    ├── name
├── icon                    ├── icon
├── color                   ├── color
├── status                  ├── status
├── completeness            ├── completeness
├── representative_image    ├── description (full)
│   ├── url                 ├── tags (array)
│   ├── item_name           ├── ageRange
│   └── image_url           ├── learningObjectives (array)
└── url                     ├── metadata (detailed)
                           ├── statistics (comprehensive)
                           │   ├── items (A-Z breakdown)
                           │   └── engagement (views, popular items)
                           ├── related_resources (7 navigation links)
                           │   ├── items, letters, images, stats
                           │   ├── all_categories, search_in_category
                           │   └── random_item
                           └── url (self reference)
```

---

## Migration from V1

### Key Differences

| Feature | V1 | V2 |
|---------|----|----|
| Response Size | 291KB | 2.4KB |
| Embedded Data | Full image objects | Resource URLs only |
| Cross-Category Browsing | Limited | Full letter-based navigation |
| Resource Discovery | Manual URL construction | Rich linking |
| Caching | Difficult | URL-based caching friendly |

### Backward Compatibility

V1 endpoints remain available for existing integrations:
- V1: `http://localhost:3003/api/v1/categories/animals`
- V2: `http://localhost:3003/api/v2/categories/animals/`

---

## Authentication & Rate Limiting

- **Rate Limit**: 100 requests per 15 minutes per IP
- **Authentication**: Not required for read operations
- **CORS**: Enabled for frontend applications

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Item with id 'invalid' not found",
    "details": {
      "resource": "items",
      "id": "invalid"
    }
  },
  "meta": {
    "api_version": "2.0.0",
    "timestamp": "2025-10-16T19:30:00.000Z"
  }
}
```

---

## Example Usage Flows

### 1. Browse Categories
```
GET /api/v2/categories/
→ GET /api/v2/categories/animals/
→ GET /api/v2/categories/animals/items/
```

### 2. Letter-Based Navigation
```
GET /api/v2/letters/A/
→ GET /api/v2/letters/A/items/
→ GET /api/v2/items/ant/
→ GET /api/v2/items/ant/images/
```

### 3. Search and Discovery
```
GET /api/v2/search/?q=ant
→ GET /api/v2/items/ant/
→ GET /api/v2/categories/animals/
→ GET /api/v2/letters/A/items/
```