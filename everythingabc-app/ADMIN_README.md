# EverythingABC Admin Dashboard

A comprehensive React-based Content Management System (CMS) for the EverythingABC vocabulary learning platform.

## Features

### 🔐 Authentication System
- Secure JWT-based login system
- Protected routes for admin areas
- Role-based access control ready
- Session management with automatic logout

### 📊 Dashboard Overview
- Real-time statistics and metrics
- Recent activity feed
- System health indicators
- Quick action buttons for common tasks
- Performance insights

### 📁 Category Management
- Create, edit, and delete vocabulary categories
- Visual gap analysis for A-Z completion
- Bulk operations for multiple categories
- Category status management (Active, Draft, Review, Archived)
- Completion tracking and progress visualization

### 📝 Item Management
- Review and approve vocabulary items
- Advanced filtering by category, letter, status
- Bulk approve/reject operations
- Quality scoring system
- Image preview and management
- Tag-based organization

### 📈 Analytics Dashboard
- Content health metrics
- Performance charts with Recharts
- Category performance analysis
- Letter distribution visualization
- Export capabilities (CSV, PDF)
- Time-range filtering

### ⚙️ System Settings
- General system configuration
- Content policy settings
- API configuration
- Notification preferences
- Security settings
- Performance optimization

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- React 19

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the admin dashboard:**
   - Visit: `http://localhost:5174`
   - Click "Admin Demo" in the header
   - Or go directly to: `http://localhost:5174/admin-demo`

### Demo Access

For testing purposes, you can use these demo credentials:

**Admin User:**
- Email: `admin@everythingabc.com`
- Password: `admin123`

**Content Manager:**
- Email: `manager@everythingabc.com`
- Password: `manager123`

## Navigation

### Public Routes
- `/` - Main vocabulary learning interface
- `/admin-demo` - Admin dashboard demonstration page

### Admin Routes (Protected)
- `/admin/login` - Admin login page
- `/admin/dashboard` - Main dashboard overview
- `/admin/categories` - Category management
- `/admin/items` - Item management and review
- `/admin/analytics` - Performance analytics
- `/admin/settings` - System configuration

## API Integration

The admin dashboard is designed to work with the EverythingABC API:

### Base URLs
- **Public API:** `http://localhost:3003/api/v1`
- **Admin API:** `http://localhost:3003/admin`

### Key Endpoints

**Authentication:**
- `POST /admin/auth/login` - Admin login
- `POST /admin/auth/logout` - Admin logout
- `GET /admin/auth/me` - Get current user

**Dashboard:**
- `GET /admin/dashboard/stats` - Dashboard statistics
- `GET /admin/dashboard/activity` - Recent activity feed

**Categories:**
- `GET /admin/categories` - List categories
- `POST /admin/categories` - Create category
- `PUT /admin/categories/:id` - Update category
- `DELETE /admin/categories/:id` - Delete category

**Items:**
- `GET /admin/categories/:id/items` - List items
- `POST /admin/categories/:id/items` - Create item
- `PUT /admin/categories/:id/items/:itemId` - Update item
- `POST /admin/categories/:id/items/approve` - Bulk approve items

## Technology Stack

### Frontend
- **React 19** - Modern React with latest features
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization charts

### Development Tools
- **Vite** - Fast build tool
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Architecture

### Component Structure
```
src/
├── components/
│   ├── admin/
│   │   ├── AdminApp.jsx          # Admin app router
│   │   ├── AdminLayout.jsx       # Main admin layout
│   │   ├── AdminLogin.jsx        # Login page
│   │   ├── Dashboard.jsx         # Dashboard overview
│   │   ├── Categories.jsx        # Category management
│   │   ├── Items.jsx            # Item management
│   │   ├── Analytics.jsx        # Analytics dashboard
│   │   ├── Settings.jsx         # System settings
│   │   ├── ProtectedRoute.jsx   # Route protection
│   │   └── AdminDemo.jsx        # Demo page
│   └── ui/                      # Reusable UI components
├── contexts/
│   └── AdminAuthContext.jsx     # Authentication context
├── services/
│   ├── api.js                   # Public API service
│   └── adminApi.js              # Admin API service
└── AppRouter.jsx                # Main app router
```

### State Management
- **React Context** - Global admin authentication state
- **Local State** - Component-level state with hooks
- **API Integration** - Centralized API service classes

### Styling
- **Tailwind CSS** - Utility classes for rapid styling
- **CSS Variables** - Theme customization
- **Responsive Design** - Mobile-first approach
- **Dark Mode Ready** - Theme switching prepared

## Development Features

### Mock Data
When the API is unavailable, the dashboard falls back to comprehensive mock data:
- Sample categories with realistic completion rates
- Demo items with various statuses
- Simulated analytics data
- Activity feed examples

### Error Handling
- Graceful API error handling
- Loading states for all data fetching
- User-friendly error messages
- Automatic retry mechanisms

### Performance
- Lazy loading for large datasets
- Optimized re-renders with React.memo
- Efficient state updates
- Image optimization

## Customization

### Theming
The dashboard uses CSS variables and Tailwind for easy theming:

```css
:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --accent: #8b5cf6;
  --background: #ffffff;
  --foreground: #0f172a;
}
```

### Adding New Features
1. Create components in `src/components/admin/`
2. Add routes in `AdminApp.jsx`
3. Update navigation in `AdminLayout.jsx`
4. Add API endpoints in `adminApi.js`

## Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
Create a `.env` file:
```env
VITE_API_URL=https://api.everythingabc.com/api/v1
VITE_ADMIN_API_URL=https://api.everythingabc.com/admin
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the EverythingABC platform.

## Support

For support with the admin dashboard:
- Create an issue in the repository
- Contact the development team
- Check the demo at `/admin-demo` for feature examples