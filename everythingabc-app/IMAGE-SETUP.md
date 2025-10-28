# Image Loading Setup

This app uses environment-based image loading:
- **Development**: Images served from local `public/images/categories/` folder
- **Production**: Images served from CloudFront CDN

## Initial Setup for New Developers

Run this command once to copy images to the public folder:

```bash
npm run setup:images
```

For Unix/Mac systems:
```bash
npm run setup:images:unix
```

This copies all images from `../image-collection-system/images/categories/` to `public/images/categories/`.

## How It Works

### Development Mode (`npm run dev`)
- `imageUtils.js` detects `import.meta.env.DEV === true`
- Converts API paths to local paths:
  - API: `/categories/animals/A/...` → Local: `/images/categories/animals/A/...`
  - API: `/images/animals/A/...` → Local: `/images/animals/A/...`
- Vite dev server serves these from the `public/` folder
- **Benefits**: Fast loading, no CDN latency, works offline

### Production Mode (`npm run build`)
- `imageUtils.js` detects `import.meta.env.DEV === false`
- Returns CDN URLs: `https://dl0gmrcy5edt5.cloudfront.net/images/categories/...`
- **Benefits**: Optimized delivery, reduced server load

## Environment Variables

### `.env.development` (local dev)
```
VITE_API_URL=http://localhost:3003/api/v1
VITE_ADMIN_API_URL=http://localhost:3003/admin
# No VITE_CDN_URL needed - uses local images automatically
```

### `.env.production` (production build)
```
VITE_API_URL=http://13.235.117.48:3003/api/v1
VITE_CDN_URL=https://dl0gmrcy5edt5.cloudfront.net
```

## Git Ignore

The `public/images/categories/` folder is ignored in git to prevent committing large image files. Each developer must run `npm run setup:images` after cloning the repo.

## Image Structure

Images follow this structure:
```
public/images/categories/
  animals/
    A/
      alligator/
        medium/alligator_*.webp
        large/alligator_*.webp
        ...
  birds/
  plants/
  ...
```

## Troubleshooting

**Images not loading in development?**
1. Run `npm run setup:images` to copy images
2. Restart dev server: `npm run dev`
3. Check browser console for 404 errors

**Images should use CDN in production?**
- Ensure `.env.production` has `VITE_CDN_URL` set
- Build uses production env automatically: `npm run build`
