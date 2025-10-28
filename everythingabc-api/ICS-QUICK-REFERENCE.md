# ICS V2 Migration - Quick Reference Guide

## For Developers Working with ICS APIs

### What Changed?

Items and images are now stored in **separate collections** instead of embedded in Category documents.

```javascript
// OLD WAY (Don't use this anymore)
const category = await Category.findOne({ id: 'animals' });
const item = category.items['A'].find(i => i.name === 'Ant');
item.images.push(newImage);
await category.save();

// NEW WAY (Use this)
const item = await Item.findOne({ id: 'ant', categoryId: 'animals' });
const categoryImage = new CategoryImage({
  itemId: item.id,
  categoryId: 'animals',
  ...imageData
});
await categoryImage.save();
item.imageIds.push(categoryImage._id);
await item.save();
```

## Common Patterns

### 1. Finding Items

**By Category and Letter**:
```javascript
const items = await Item.find({
  categoryId: 'animals',
  letter: 'A',
  status: 'published'
}).sort({ name: 1 });
```

**Search Across All Items**:
```javascript
const items = await Item.find({
  $or: [
    { name: { $regex: searchTerm, $options: 'i' } },
    { description: { $regex: searchTerm, $options: 'i' } },
    { tags: { $in: [new RegExp(searchTerm, 'i')] } }
  ]
}).limit(20);
```

### 2. Creating Items

**Always include denormalized category data**:
```javascript
const category = await Category.findOne({ id: categoryId });

const newItem = new Item({
  id: generateItemId(name),
  name: name,
  letter: name[0].toUpperCase(),
  categoryId: category.id,
  categoryName: category.name,      // Required for efficient sorting
  categoryIcon: category.icon,       // Required for display
  categoryColor: category.color,     // Required for theming
  description: description,
  status: 'draft',
  imageIds: []
});

await newItem.save();
```

### 3. Adding Images to Items

**Complete workflow**:
```javascript
// 1. Process/upload image (your existing logic)
const processedImage = await processImage(imageData);

// 2. Create CategoryImage document
const categoryImage = new CategoryImage({
  itemId: item.id,
  categoryId: item.categoryId,
  letter: item.letter,
  filePath: processedImage.path,
  fileName: processedImage.filename,
  altText: `${item.name} image`,
  isPrimary: false,  // Set to true for primary image
  status: 'approved',
  source: {
    provider: 'unsplash',
    sourceId: processedImage.sourceId,
    sourceUrl: processedImage.url,
    license: 'unsplash',
    attribution: processedImage.attribution,
    commercial: true
  },
  metadata: {
    width: processedImage.width,
    height: processedImage.height,
    fileSize: processedImage.size,
    format: 'webp'
  },
  qualityScore: {
    overall: 8.5,
    breakdown: { technical: 9, relevance: 8, aesthetic: 8, usability: 9 }
  }
});

await categoryImage.save();

// 3. Update Item with image reference
item.imageIds.push(categoryImage._id);
item.metadata.imageCount = item.imageIds.length;

// 4. Set as primary if it's the first image
if (!item.primaryImageId) {
  item.primaryImageId = categoryImage._id;
  item.image = categoryImage.filePath; // Legacy field
}

await item.save();
```

### 4. Calculating Category Statistics

**Use the separated collections**:
```javascript
async function getCategoryStats(categoryId) {
  const items = await Item.find({ categoryId });

  return {
    totalItems: items.length,
    publishedItems: items.filter(i => i.status === 'published').length,
    itemsWithImages: items.filter(i => i.imageIds.length > 0).length,
    totalImages: items.reduce((sum, i) => sum + (i.imageIds?.length || 0), 0)
  };
}
```

### 5. Querying with Images (Populate)

**Get items with primary image**:
```javascript
const items = await Item.find({ categoryId: 'animals', letter: 'A' })
  .populate('primaryImageId')
  .lean();

// Access primary image
items.forEach(item => {
  console.log(item.primaryImageId?.filePath);
  console.log(item.primaryImageId?.isPrimary); // true
});
```

**Get items with all images**:
```javascript
const items = await Item.find({ categoryId: 'animals' })
  .populate('imageIds')
  .lean();

// Access all images
items.forEach(item => {
  item.imageIds.forEach(img => {
    console.log(img.filePath, img.isPrimary);
  });
});
```

## Field Mapping Reference

### Legacy Category.items[letter] → Item Model

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `item.id` | `Item.id` | Same |
| `item.name` | `Item.name` | Same |
| `item.description` | `Item.description` | Same |
| `item.tags` | `Item.tags` | Same |
| `item.difficulty` | `Item.difficulty` | Same |
| `item.images` | `Item.imageIds` | Now references, not embedded |
| `item.image` | `Item.image` | Legacy field, maintained |
| `item.collectionStatus` | Derived from `Item.imageIds.length` | 'complete' if > 0 |
| `item.publishingStatus` | `Item.status` | Renamed field |
| N/A | `Item.letter` | NEW - extracted from name |
| N/A | `Item.categoryId` | NEW - parent reference |
| N/A | `Item.categoryName` | NEW - denormalized |
| N/A | `Item.primaryImageId` | NEW - quick access |

### Legacy item.images[i] → CategoryImage Model

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `img.sourceUrl` | `CategoryImage.source.sourceUrl` | Nested |
| `img.sourceProvider` | `CategoryImage.source.provider` | Nested |
| `img.sourceId` | `CategoryImage.source.sourceId` | Nested |
| `img.filePath` | `CategoryImage.filePath` | Same |
| `img.fileName` | `CategoryImage.fileName` | Same |
| `img.status` | `CategoryImage.status` | Same |
| `img.isPrimary` | `CategoryImage.isPrimary` | Same |
| `img.qualityScore` | `CategoryImage.qualityScore` | Same |
| N/A | `CategoryImage.itemId` | NEW - parent reference |
| N/A | `CategoryImage.categoryId` | NEW - denormalized |
| N/A | `CategoryImage.letter` | NEW - denormalized |

## Performance Tips

### DO's

✅ Use indexed fields in queries:
```javascript
// Good - uses indexes
Item.find({ letter: 'A', status: 'published', categoryId: 'animals' });
```

✅ Limit populated fields:
```javascript
// Good - only populate what you need
Item.find({...}).populate('primaryImageId', 'filePath isPrimary');
```

✅ Use lean() for read-only data:
```javascript
// Good - 30% faster
Item.find({...}).lean();
```

### DON'Ts

❌ Don't query Category.items anymore:
```javascript
// Bad - old structure
const category = await Category.findOne({ id: 'animals' });
const items = category.items['A'];
```

❌ Don't forget denormalized fields:
```javascript
// Bad - missing category metadata
const item = new Item({
  id: 'ant',
  name: 'Ant',
  categoryId: 'animals'
  // Missing: categoryName, categoryIcon, categoryColor
});
```

❌ Don't manually calculate imageCount:
```javascript
// Bad - should use Item.metadata.imageCount
const count = item.imageIds.length;

// Good - use cached value
const count = item.metadata.imageCount;
```

## Debugging Common Issues

### Issue: "Item not found"
**Cause**: Query on old Category.items structure
**Fix**: Query Item collection directly

### Issue: "Images not displaying"
**Cause**: Item.imageIds not populated
**Fix**: Use `.populate('imageIds')` or `.populate('primaryImageId')`

### Issue: "Stats don't match"
**Cause**: Using Category.metadata counters
**Fix**: Query Item collection for accurate counts

### Issue: "Slow queries"
**Cause**: Not using indexed fields
**Fix**: Include `letter`, `status`, or `categoryId` in queries

## Migration Status

### ✅ Completed (Use New Structure)
- icsCompat.js `/collect/selected`
- icsCompat.js `/categories/search/:query`
- cms-categories.js (all statistics)
- cms-items.js (all CRUD operations)

### ⏳ Pending (Use Old Structure for Now)
- icsCompat.js `/collect/item`
- icsCompat.js `/collect/category`
- imageCollection.js (review workflow)

### 📝 Test Before Production
- All ICS dashboard image collection workflows
- Admin CMS category statistics
- Admin CMS item management
- Search functionality

## Need Help?

- **Database Schema**: Check `models/Item.js` and `models/CategoryImage.js`
- **Migration Details**: See `ICS-V2-MIGRATION-SUMMARY.md`
- **V2 API Docs**: See `V2-API-DOCUMENTATION.md`
- **Issues**: Create ticket with "ICS-V2" label
