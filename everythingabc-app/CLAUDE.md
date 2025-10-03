# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EverythingABC is a visual vocabulary learning platform built with React 19 and Vite. It features a public learning interface and a comprehensive admin CMS for content management.

## Development Commands

- `npm run dev` - Start development server (runs on port 5174)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Architecture

### Application Structure

The app uses a dual-mode architecture:

1. **Public App** (`/`) - Main vocabulary learning interface
2. **Admin App** (`/admin/*`) - Content Management System with protected routes
3. **Admin Demo** (`/admin-demo`) - Demonstration page showcasing admin features

### Key Components

- **AppRouter.jsx** - Main router handling public/admin route separation
- **App.jsx** - Public learning interface with category browsing and A-Z grids
- **AdminApp.jsx** - Admin application with protected routing
- **AdminLayout.jsx** - Admin dashboard layout with navigation

### State Management

- **AdminAuthContext.jsx** - Global admin authentication state
- Local state with React hooks for component-level state
- No external state management library (intentionally lean)

### API Integration

Two separate API services:

- **api.js** - Public API for category/item data (`/api/v1/*`)
- **adminApi.js** - Admin API with authentication (`/admin/*`)

Both services include fallback mock data when API is unavailable.

### Environment Variables

- `VITE_API_URL` - Public API base URL (default: `http://localhost:3003/api/v1`)
- `VITE_ADMIN_API_URL` - Admin API base URL (default: `http://localhost:3003/admin`)

## UI Components

Uses shadcn/ui components with Radix UI primitives:
- Components defined in `src/components/ui/`
- Path alias `@/` maps to `./src`
- Tailwind CSS for styling with custom design system

## Data Structure

Categories follow this schema:
```javascript
{
  id: "category-id",
  name: "Category Name",
  description: "Description",
  icon: "🎯",
  items: {
    A: [{ id, name, image, description, tags, facts }],
    B: [...],
    // etc for available letters
  }
}
```

## Admin System

### Authentication
- JWT-based authentication with localStorage persistence
- Demo credentials for development:
  - Admin: `admin@everythingabc.com` / `admin123456`
  - Manager: `manager@everythingabc.com` / `manager123`

### Admin Routes
- `/admin/login` - Authentication
- `/admin/dashboard` - Overview with statistics
- `/admin/categories` - Category management
- `/admin/items` - Item review and approval
- `/admin/analytics` - Performance metrics
- `/admin/settings` - System configuration

## Development Guidelines

### File Organization
- Admin components in `src/components/admin/`
- Reusable UI components in `src/components/ui/`
- Services in `src/services/`
- Contexts in `src/contexts/`

### Styling Conventions
- Uses Tailwind utility classes
- Custom CSS variables for theming
- Responsive-first design approach
- Dark mode support prepared

### API Error Handling
- Graceful fallback to mock data during development
- Comprehensive error states and loading indicators
- Automatic retry mechanisms for failed requests

## Content Management

### Mock Data Integration
When backend is unavailable, both public and admin interfaces use comprehensive mock data for:
- Category listings with realistic completion rates
- Sample items with proper metadata
- Analytics data for dashboard metrics
- User activity feeds

### Image Management
- Supports external image URLs
- Graceful fallback to icon/placeholder when images fail
- Optimized loading with error handling

## Performance Considerations

- Lazy loading for large datasets
- Image slideshow with fade transitions for category previews
- Efficient re-renders with React.memo where appropriate
- Client-side search and filtering for responsive UX

## Testing Access

To test the admin system:
1. Start dev server: `npm run dev`
2. Visit `/admin-demo` for feature overview
3. Visit `/admin/login` and use demo credentials
4. All admin features work with mock data when API unavailable