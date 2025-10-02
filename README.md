# EverythingABC (AtoZ)

A visual vocabulary learning platform with A-Z categorized content, featuring a React frontend, Node.js API backend, and automated image collection system.

## Project Structure

```
everythingabc/
├── everythingabc-app/          # React 19 frontend with CMS admin
├── everythingabc-api/          # Node.js/Express backend API
└── image-collection-system/    # Automated image collection dashboard
```

## Components

### 1. EverythingABC App (Frontend)
**Location:** `everythingabc-app/`

React 19 application for visual vocabulary learning:
- **Public Learning Interface** - Visual vocabulary browsing with A-Z grids
- Category exploration and item viewing
- Responsive design for all devices

**Tech Stack:**
- React 19 + Vite
- Tailwind CSS + shadcn/ui components
- React Router

**Run:**
```bash
cd everythingabc-app
npm install
npm run dev  # Runs on port 5174
```

### 2. EverythingABC API (Backend)
**Location:** `everythingabc-api/`

Node.js/Express backend with MongoDB, providing:
- RESTful APIs for categories and items
- Admin authentication with JWT
- Image collection and processing
- Quality assessment system
- Background job queues

**Tech Stack:**
- Node.js + Express
- MongoDB with Mongoose
- Sharp for image processing
- Bull queue system

**Run:**
```bash
cd everythingabc-api
npm install
# Configure .env file with MongoDB URI and API keys
npm start  # Runs on port 3003
```

**Key APIs:**
- `/api/v1/categories` - Category management
- `/api/v1/admin/*` - Admin CMS operations
- `/api/v1/seed` - Data seeding
- `/health` - Health check

### 3. Image Collection System (ICS)
**Location:** `image-collection-system/`

React dashboard for automated image collection and management:
- Multi-source image search (Unsplash, Pixabay, Pexels)
- Manual image selection and approval
- Batch category processing
- Quality scoring and filtering
- Progress tracking

**Run:**
```bash
cd image-collection-system
npm install
npm start  # Runs on port 3001
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- API Keys (optional): Unsplash, Pixabay, Pexels

### Quick Start

1. **Clone and install:**
```bash
git clone https://github.com/akashreya/everythingabc.git
cd everythingabc
```

2. **Setup API:**
```bash
cd everythingabc-api
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm start
```

3. **Seed database:**
```bash
cd everythingabc-api
node scripts/seed-from-json.js
```

4. **Run frontend:**
```bash
cd ../everythingabc-app
npm install
npm run dev
```

5. **Run ICS (optional):**
```bash
cd ../image-collection-system
npm install
npm start
```

## Environment Variables

### everythingabc-api/.env
```env
MONGODB_URI=mongodb://localhost:27017/everythingabc
JWT_SECRET=your-secret-key
PORT=3003

# Optional - for image collection
UNSPLASH_ACCESS_KEY=
PIXABAY_API_KEY=
PEXELS_API_KEY=
```

### everythingabc-app/.env
```env
VITE_API_URL=http://localhost:3003/api/v1
VITE_ADMIN_API_URL=http://localhost:3003/admin
```

### image-collection-system/.env
```env
REACT_APP_ICS_API_URL=http://localhost:3003/api/v1
```

## Development Workflow

1. **Backend Development:** Work in `everythingabc-api/` - handles all data, auth, and image processing
2. **Frontend Development:** Work in `everythingabc-app/` - main user-facing application
3. **Image Collection:** Use `image-collection-system/` for bulk image gathering

## Admin Access

**Create admin user:**
```bash
cd everythingabc-api
node scripts/createAdminUser.js [email] [password] [firstName] [lastName]
```

## Database Management

**Seed from JSON:**
```bash
node scripts/seed-from-json.js
```

**View categories:**
```bash
node -e "require('dotenv').config(); const m=require('mongoose'); const C=require('./models/Category'); m.connect(process.env.MONGODB_URI).then(async()=>{const c=await C.find({},'id name'); console.log(c); await m.disconnect();})"
```

## Documentation

- See individual component READMEs for detailed documentation
- API documentation: `everythingabc-api/CLAUDE.md`
- ICS documentation: `image-collection-system/CLAUDE.md`
- Frontend guide: `everythingabc-app/CLAUDE.md`

## Architecture

```
┌─────────────────┐
│  React App      │ Port 5174
│  (Frontend)     │
└────────┬────────┘
         │
         └─── Public Learning Interface

         │ REST API
         ▼
┌─────────────────┐
│  Express API    │ Port 3003
│  (Backend)      │
└────────┬────────┘
         │
         ├─── MongoDB (Categories, Users, Images)
         ├─── Image Processing (Sharp)
         └─── Queue System (Bull)

         │ API
         ▼
┌─────────────────┐
│  ICS Dashboard  │ Port 3001
│  (Image Mgmt)   │
└─────────────────┘
```

## License

MIT
