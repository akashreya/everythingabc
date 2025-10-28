# Image Collection System - CMS Requirements

## Overview

Transform the Image Collection System's "Manage Category" page into a full-featured Content Management System (CMS) for creating, managing, and publishing vocabulary content for the EverythingABC platform.

## Core Principles

1. **Database as Source of Truth**: CMS database is the single source of truth, no JSON file comparisons
2. **Separation of Concerns**:
   - **Collections Page**: Image search, preview, and download
   - **Manage Category (CMS)**: Content structure, items, and publishing workflow
   - **Backend**: Status tracking, completion calculations, business logic

## Feature Requirements

### 1. Category Management

#### Create Category
- Input fields:
  - Category ID (auto-generated from name, e.g., "sports-equipment")
  - Category Name (e.g., "Sports Equipment")
  - Icon/Emoji (emoji picker or text input)
  - Description
  - Group (Educational, Nature & Science, Everyday Objects, Professional, etc.)
  - Priority (1-100, for ordering)
  - Color theme (for UI representation)

#### Edit Category
- Modify any category metadata
- Update icon, description, grouping
- Change priority/ordering

#### Delete Category
- Confirmation dialog with warning
- Show count of items that will be deleted
- Cascade delete all items and associated images (with backend confirmation)

#### View Category Statistics
- Total items in category
- Items per letter breakdown
- Collection status: X/Y items complete (%)
- Publishing status: X items published, Y in review, Z as draft
- Last updated timestamp

### 2. Item Management

#### Add Item
- Select category
- Select letter (A-Z)
- Enter item name
- Optional metadata:
  - Description
  - Tags (comma-separated or multi-select)
  - Difficulty level (1-3: Easy, Medium, Hard)
  - Fun facts (multiple entries)
- Initial status: `pending` (no images yet)
- Initial publishing status: `draft`

#### Edit Item
- Modify item name
- Update metadata (description, tags, difficulty, facts)
- Cannot manually change collection status (auto-managed by backend)
- Can change publishing status (draft/review/published)

#### Delete Item
- Confirmation dialog
- Option to also delete associated images
- Backend handles cleanup

#### View Item Details
- Collection status badge (pending/complete)
- Publishing status badge (draft/review/published)
- Image count and thumbnails
- Created date, last updated date
- Quick action: "Collect Images" (navigates to Collections page with pre-filled form)

#### Item Filtering & Sorting
- Filter by:
  - Collection status (pending/complete/all)
  - Publishing status (draft/review/published/all)
  - Letter
- Sort by:
  - Alphabetical
  - Creation date
  - Last updated
  - Image count

### 3. Item Status System

#### Two-Track Status System

**Track 1: Collection Status** (Automatic - Backend Managed)
- `pending`: Item created but no images downloaded
- `complete`: Item has at least one image downloaded

Backend automatically transitions `pending` → `complete` when images are downloaded via Collections page.

**Track 2: Publishing Status** (Manual - CMS Managed)
- `draft`: Initial state when item created, not ready for review
- `review`: Item ready for editorial review and approval
- `published`: Item approved and visible in public app

Frontend can manually transition between draft/review/published.

#### Status Display
- Visual badges with color coding:
  - Pending: Yellow badge
  - Complete: Green badge
  - Draft: Gray badge
  - Review: Blue badge
  - Published: Green badge with checkmark
- Filters to show items by status
- Bulk status changes (select multiple items, change status)

### 4. Publishing Workflow

#### Single Item Publishing
- View item details
- Preview how item appears in public app (modal or separate preview pane)
- Change status: draft → review → published
- Confirmation dialog for publishing
- Unpublish option (published → draft)

#### Bulk Publishing
- Multi-select items
- Bulk actions dropdown:
  - Mark as Review
  - Publish Selected
  - Unpublish Selected
  - Set to Draft
- Confirmation dialog showing count of items affected

#### Publishing Rules
- Can only publish items with `complete` collection status
- Warning if trying to publish `pending` items
- Public app API only returns `published` items
- Unpublished items remain in database but not visible to public

#### Preview Mode
- Preview single item card as it appears in main app
- Preview full category A-Z grid with only published items
- Side-by-side comparison (before/after publishing)

### 5. Import/Export Features

#### CSV Import - Bulk Item Creation
**Upload CSV File**:
- Format: `category, letter, itemName, description, tags, difficulty`
- Example:
  ```csv
  animals,A,Ant,"Small insect in colonies","insect,colony,worker",1
  animals,A,Alligator,"Large reptile","reptile,water,predator",2
  animals,B,Bear,"Large mammal","mammal,forest,hibernate",1
  ```

**Import Process**:
1. Upload CSV file
2. Validate format and data
3. Show preview table with validation errors highlighted
4. Confirm import
5. Backend creates items with status `pending` and `draft`
6. Show import summary (X items created, Y errors)

**Validation Rules**:
- Category must exist (or option to create new)
- Letter must be A-Z
- Item name required and unique within category+letter
- Difficulty must be 1-3 (default: 1)

**CSV Template Download**:
- Provide downloadable CSV template with headers and example rows

#### CSV Export - Backup/Share
**Export Options**:
- Export entire database (all categories)
- Export single category
- Export filtered items (e.g., only published items)

**Export Format**:
```csv
category,letter,itemName,description,tags,difficulty,collectionStatus,publishingStatus,imageCount,createdAt,updatedAt
animals,A,Ant,"Small insect","insect,colony",1,complete,published,3,2024-01-15,2024-01-20
```

**Export Button**:
- Available in main CMS header
- Available per category
- Generates downloadable CSV file

### 6. Data Operations (Existing)

#### Seed Categories
- Populate database from JSON file (initial setup only)
- Bulk seed all categories
- Individual category seed
- Confirmation dialog with item counts

#### Clear Categories
- Remove data from database
- Clear all categories (dangerous operation)
- Clear single category
- Strong confirmation dialogs with warnings

### 7. User Interface Requirements

#### Navigation Structure
```
Manage Category (Main Page)
├── Manage Content (Tab)
│   ├── Category List (Sidebar)
│   └── Item Management (Main Area)
│       ├── Letter Selector Grid (A-Z)
│       ├── Item List
│       ├── Add Item Form
│       ├── Filters & Sorting
│       └── Bulk Actions
├── Publishing (Tab)
│   ├── Items Pending Review
│   ├── Published Items
│   └── Draft Items
├── Import/Export (Tab)
│   ├── CSV Import
│   └── CSV Export
└── Data Operations (Tab)
    ├── Seed Categories
    └── Clear Categories
```

#### Key UI Components
- **Category Selector**: List view with icons, stats, completion bars
- **Letter Grid**: A-Z buttons showing item counts, highlighting selected letter
- **Item Cards**: Compact view with name, status badges, image thumbnails, actions
- **Status Badges**: Color-coded pills for collection and publishing status
- **Action Buttons**: Icons for edit, delete, preview, quick collect
- **Bulk Selection**: Checkboxes with select all/none
- **Filter Bar**: Dropdowns for status filters
- **Search Bar**: Filter items by name
- **Statistics Dashboard**: Category overview with charts/numbers

#### Responsive Design
- Desktop-first (this is an admin tool)
- Tablet support for basic operations
- Mobile: Read-only viewing, limited editing

### 8. API Endpoints Needed (Backend)

#### Categories
- `GET /api/v1/admin/categories` - List all categories with stats
- `POST /api/v1/admin/categories` - Create new category
- `PUT /api/v1/admin/categories/:id` - Update category
- `DELETE /api/v1/admin/categories/:id` - Delete category
- `GET /api/v1/admin/categories/:id/stats` - Detailed category statistics

#### Items
- `GET /api/v1/admin/categories/:categoryId/items` - List all items for category
- `GET /api/v1/admin/categories/:categoryId/items/:letter` - Items for specific letter
- `POST /api/v1/admin/categories/:categoryId/items` - Create new item
- `PUT /api/v1/admin/items/:id` - Update item
- `DELETE /api/v1/admin/items/:id` - Delete item
- `PATCH /api/v1/admin/items/:id/status` - Update publishing status
- `POST /api/v1/admin/items/bulk-status` - Bulk status update

#### Import/Export
- `POST /api/v1/admin/import/csv` - Upload and import CSV
- `POST /api/v1/admin/import/validate` - Validate CSV before import
- `GET /api/v1/admin/export/csv` - Export data as CSV
- `GET /api/v1/admin/export/template` - Download CSV template

#### Publishing
- `GET /api/v1/admin/items/pending-review` - Items in review status
- `POST /api/v1/admin/items/:id/publish` - Publish item
- `POST /api/v1/admin/items/:id/unpublish` - Unpublish item
- `POST /api/v1/admin/items/bulk-publish` - Bulk publish

### 9. Database Schema Updates

#### Categories Collection
```javascript
{
  _id: ObjectId,
  id: "animals", // slug
  name: "Animals",
  description: "Explore the wonderful world of animals",
  icon: "🐾",
  iconEmoji: "🐾",
  group: "educational", // educational, nature, everyday, professional
  priority: 1,
  color: "from-blue-400 to-cyan-300",
  metadata: {
    totalItems: 156,
    completedItems: 142,
    publishedItems: 120,
    lastUpdated: Date,
    createdBy: "admin",
    createdAt: Date
  },
  items: {
    A: [/* item objects */],
    B: [/* item objects */],
    // ... Z
  }
}
```

#### Item Schema (nested in category)
```javascript
{
  id: "ant-001",
  name: "Ant",
  description: "Small insect that lives in colonies",
  tags: ["insect", "colony", "worker"],
  difficulty: 1, // 1=Easy, 2=Medium, 3=Hard
  facts: [
    "Ants can lift 50 times their own body weight",
    "Some ant colonies have millions of members"
  ],

  // Collection Status (auto-managed)
  collectionStatus: "complete", // pending | complete

  // Publishing Status (manual)
  publishingStatus: "published", // draft | review | published

  // Images
  images: [
    {
      imageId: ObjectId,
      url: "https://...",
      cdnUrl: "https://cdn...",
      source: "unsplash",
      isPrimary: true,
      status: "approved"
    }
  ],

  // Metadata
  metadata: {
    imageCount: 3,
    createdAt: Date,
    updatedAt: Date,
    createdBy: "admin",
    publishedAt: Date,
    publishedBy: "admin"
  }
}
```

### 10. Success Metrics

#### CMS Usability
- Time to create new category: <2 minutes
- Time to add 10 items: <5 minutes
- CSV import of 100 items: <1 minute
- Publishing workflow: <30 seconds per item

#### Content Quality
- 95%+ items have images before publishing
- 100% published items meet quality standards
- Zero published items with pending status

#### System Performance
- Page load: <2 seconds
- Category switching: <500ms
- Item filtering: <300ms
- CSV import (100 items): <5 seconds

## Implementation Phases

### Phase 1: Core Item Management (Current)
- ✅ Category selection
- ✅ Letter grid navigation
- ✅ Add/Edit/Delete items
- ✅ Basic statistics
- ✅ Data operations (seed/clear)

### Phase 2: Status & Publishing (Next)
- Add two-track status system
- Status badges and filters
- Single item publishing workflow
- Bulk status changes
- Preview functionality

### Phase 3: Import/Export
- CSV template creation
- CSV import with validation
- CSV export with filters
- Error handling and reporting

### Phase 4: Enhanced UX
- Advanced filtering and search
- Item reordering within letters
- Category grouping and organization
- Batch operations
- Keyboard shortcuts

### Phase 5: Analytics & Insights
- Content completion dashboard
- Publishing pipeline analytics
- Category performance metrics
- User activity tracking

## Technical Considerations

### Frontend (React)
- State management: React Context API + useReducer
- Form validation: Custom hooks or Formik
- File upload: react-dropzone for CSV
- CSV parsing: papaparse library
- UI components: Existing component library + lucide-react icons

### Backend (Node.js + Express)
- CSV parsing: csv-parser, papaparse
- Validation: Joi or express-validator
- Status transitions: State machine logic
- Bulk operations: MongoDB bulk write operations
- Export: json2csv library

### Database (MongoDB)
- Indexes on: category.id, items.collectionStatus, items.publishingStatus
- Compound index: (category, letter) for fast letter queries
- Text index on item.name for search

### Security
- Admin-only endpoints (authentication required)
- Rate limiting on import endpoints
- File size limits for CSV (max 10MB)
- Input sanitization for item names and descriptions
- CSRF protection

### Performance
- Lazy loading for large category lists
- Virtual scrolling for long item lists
- Debounced search and filters
- Cached statistics (Redis if needed)
- Background processing for large imports

## Future Enhancements

### Content Versioning
- Track item history
- Rollback changes
- Compare versions

### Collaboration Features
- Multiple admin users
- Activity log (who did what, when)
- Comments on items
- Approval workflow with roles

### AI Assistance
- Suggest item names for letters
- Auto-generate descriptions
- Tag recommendations
- Image quality scoring

### Advanced Publishing
- Scheduled publishing (publish at specific date/time)
- A/B testing (multiple versions of items)
- Localization (multi-language support)

### Content Insights
- Most popular items
- User engagement metrics
- Content gaps analysis
- Recommendation engine for what to create next

---

## Conclusion

This CMS transforms the Image Collection System from a simple image downloader into a complete content management platform. By separating content structure (CMS) from media collection (Collections page), we create a scalable, maintainable system that supports the full content lifecycle from creation to publishing.

The database-as-source-of-truth approach eliminates complexity and provides a single, authoritative view of all content, making it easier to manage, track, and publish high-quality vocabulary content for the EverythingABC platform.
