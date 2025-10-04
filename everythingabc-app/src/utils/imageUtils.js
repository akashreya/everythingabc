// CDN configuration for production
const CDN_URL = import.meta.env.VITE_CDN_URL || 'https://dl0gmrcy5edt5.cloudfront.net';

// Check if we should use local images (development mode)
const USE_LOCAL_IMAGES = import.meta.env.DEV;

/**
 * Get the full image URL - uses local images in dev, CDN in production
 * @param {string} imagePath - The relative image path from the database
 * @returns {string} Full image URL (local path in dev, CDN URL in prod)
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';

  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  // Development: serve from local public folder
  if (USE_LOCAL_IMAGES) {
    // Images are in public/images/categories/
    // API returns paths like "categories/animals/A/..." or "images/animals/A/..."
    // We need to ensure the path is "/images/categories/..."

    if (cleanPath.startsWith('images/categories/')) {
      // Already has correct prefix
      return `/${cleanPath}`;
    } else if (cleanPath.startsWith('categories/')) {
      // Add images prefix
      return `/images/${cleanPath}`;
    } else if (cleanPath.startsWith('images/')) {
      // Old format, needs categories
      return `/${cleanPath}`;
    } else {
      // Fallback: assume it's a relative path and add full prefix
      return `/images/categories/${cleanPath}`;
    }
  }

  // Production: use CDN
  return `${CDN_URL}/${cleanPath}`;
};

export default getImageUrl;
