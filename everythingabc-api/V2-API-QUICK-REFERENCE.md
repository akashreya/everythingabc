# V2 API Quick Reference

## Base URL
```
http://localhost:3003/api/v2/
```

## Most Common Endpoints

### 🏠 API Discovery
```bash
curl http://localhost:3003/api/v2/
```

### 📚 Categories
```bash
# List all categories
curl http://localhost:3003/api/v2/categories/

# Get specific category
curl http://localhost:3003/api/v2/categories/animals/

# Get category items
curl http://localhost:3003/api/v2/categories/animals/items/
```

### 📝 Items
```bash
# List all items
curl http://localhost:3003/api/v2/items/

# Get specific item
curl http://localhost:3003/api/v2/items/ant/

# Filter by category
curl "http://localhost:3003/api/v2/items/?category=animals"

# Filter by letter
curl "http://localhost:3003/api/v2/items/?letter=A"
```

### 🔤 Letters (Cross-Category Browsing)
```bash
# List all letters
curl http://localhost:3003/api/v2/letters/

# Get all items starting with 'A'
curl http://localhost:3003/api/v2/letters/A/items/

# Get categories that have 'A' items
curl http://localhost:3003/api/v2/letters/A/categories/
```

### 🖼️ Images
```bash
# List images
curl http://localhost:3003/api/v2/images/

# Get specific image
curl http://localhost:3003/api/v2/images/68f0e57ffe2cf6b4e861fe95/

# Get images for an item
curl http://localhost:3003/api/v2/items/ant/images/
```

### 🔍 Search
```bash
# Search for items
curl "http://localhost:3003/api/v2/search/?q=ant"

# Search with filters
curl "http://localhost:3003/api/v2/search/?q=ant&category=animals"
```

### 📊 Statistics
```bash
# Global stats
curl http://localhost:3003/api/v2/stats/

# Category stats
curl http://localhost:3003/api/v2/categories/animals/stats/
```

### 🎲 Random
```bash
# Random item
curl http://localhost:3003/api/v2/random/item/

# Random item from letter A
curl http://localhost:3003/api/v2/letters/A/random/
```

## Key Features

### ⚡ Performance
- **99.2% smaller responses** (291KB → 2.4KB)
- **Rich linking** instead of embedded data
- **Efficient pagination** with next/previous URLs

### 🔗 Rich Linking
Every response includes:
- `url` - Resource's own URL
- `related_resources` - Cross-reference URLs
- Category objects with URLs
- Pagination with next/previous links

### 🌐 Cross-Category Browsing
Navigate by letters across all categories:
```bash
# All A items from any category
curl http://localhost:3003/api/v2/letters/A/items/

# All categories that have A items
curl http://localhost:3003/api/v2/letters/A/categories/
```

## Response Examples

### Item Response
```json
{
  "id": "ant",
  "name": "Ant",
  "letter": "A",
  "category": {
    "id": "animals",
    "name": "Animals",
    "url": "http://localhost:3003/api/v2/categories/animals/"
  },
  "images": {
    "count": 8,
    "primary_image_url": "http://localhost:3003/api/v2/images/68f0e57ffe2cf6b4e861fe95/",
    "all_images_url": "http://localhost:3003/api/v2/items/ant/images/"
  },
  "related_resources": {
    "category": "http://localhost:3003/api/v2/categories/animals/",
    "same_letter": "http://localhost:3003/api/v2/letters/A/items/",
    "images": "http://localhost:3003/api/v2/items/ant/images/"
  },
  "url": "http://localhost:3003/api/v2/items/ant/"
}
```

### Paginated List Response
```json
{
  "count": 90,
  "next": "http://localhost:3003/api/v2/letters/A/items/?offset=20",
  "previous": null,
  "results": [/* items */]
}
```