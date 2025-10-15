// CDN configuration for production
const CDN_URL = import.meta.env.VITE_CDN_URL || 'https://dl0gmrcy5edt5.cloudfront.net';

// Check if we should use local images (development mode)
const USE_LOCAL_IMAGES = import.meta.env.DEV;

/**
 * Image size definitions with breakpoints and use cases
 */
export const IMAGE_SIZES = {
  thumbnail: { maxWidth: 100, maxHeight: 100, breakpoint: 0 },     // Always smallest
  small: { maxWidth: 300, maxHeight: 300, breakpoint: 480 },      // Mobile
  medium: { maxWidth: 600, maxHeight: 600, breakpoint: 768 },     // Tablet
  large: { maxWidth: 1200, maxHeight: 1200, breakpoint: 1024 },   // Desktop
  original: { maxWidth: Infinity, maxHeight: Infinity, breakpoint: 1440 } // Large screens
};

/**
 * Determine optimal image size based on viewport width and container size
 * @param {number} viewportWidth - Current viewport width
 * @param {number} containerWidth - Expected container width (optional)
 * @param {string} context - Usage context: 'grid', 'hero', 'detail', 'thumbnail'
 * @returns {string} Optimal image size key
 */
export const getOptimalImageSize = (viewportWidth, containerWidth = null, context = 'grid') => {
  // Context-based sizing rules
  const contextRules = {
    thumbnail: 'thumbnail',
    grid: {
      mobile: 'small',      // Category grid on mobile
      tablet: 'medium',     // Category grid on tablet
      desktop: 'medium'     // Category grid on desktop
    },
    hero: {
      mobile: 'medium',     // Large hero images
      tablet: 'large',
      desktop: 'large'
    },
    detail: {
      mobile: 'medium',     // Item detail pages
      tablet: 'large',
      desktop: 'large'
    }
  };

  // Handle thumbnail context
  if (context === 'thumbnail') {
    return contextRules.thumbnail;
  }

  // Determine device category
  let deviceCategory;
  if (viewportWidth < 768) {
    deviceCategory = 'mobile';
  } else if (viewportWidth < 1024) {
    deviceCategory = 'tablet';
  } else {
    deviceCategory = 'desktop';
  }

  // Get size from context rules
  const contextRule = contextRules[context];
  if (contextRule && typeof contextRule === 'object') {
    return contextRule[deviceCategory] || 'medium';
  }

  // Fallback to breakpoint-based sizing
  if (viewportWidth < 480) return 'small';
  if (viewportWidth < 768) return 'medium';
  if (viewportWidth < 1024) return 'medium';
  return 'large';
};

/**
 * Get responsive image URL with optimal size selection
 * @param {string|object} imageData - Image path string or item object with images array
 * @param {object} options - Configuration options
 * @param {number} options.viewportWidth - Current viewport width
 * @param {string} options.size - Force specific size ('thumbnail', 'small', 'medium', 'large', 'original')
 * @param {string} options.context - Usage context ('grid', 'hero', 'detail', 'thumbnail')
 * @param {number} options.containerWidth - Expected container width
 * @returns {string} Optimized image URL
 */
export const getResponsiveImageUrl = (imageData, options = {}) => {
  const {
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
    size = null,
    context = 'grid',
    containerWidth = null
  } = options;

  // Handle simple string path (backward compatibility)
  if (typeof imageData === 'string') {
    return getImageUrl(imageData);
  }

  // Handle item object with images array
  if (imageData && imageData.images && Array.isArray(imageData.images)) {
    const primaryImage = imageData.images.find(img => img.isPrimary) || imageData.images[0];

    if (primaryImage && primaryImage.processedSizes && Array.isArray(primaryImage.processedSizes)) {
      // Determine optimal size
      const targetSize = size || getOptimalImageSize(viewportWidth, containerWidth, context);

      // Find exact size match or best fallback
      let selectedImage = primaryImage.processedSizes.find(ps => ps.size === targetSize);

      // Fallback strategy: medium -> small -> large -> original -> thumbnail
      if (!selectedImage) {
        const fallbackOrder = ['medium', 'small', 'large', 'original', 'thumbnail'];
        for (const fallbackSize of fallbackOrder) {
          selectedImage = primaryImage.processedSizes.find(ps => ps.size === fallbackSize);
          if (selectedImage) break;
        }
      }

      if (selectedImage) {
        return getImageUrl(selectedImage.path);
      }
    }

    // Fallback to primary image file path
    if (primaryImage && primaryImage.filePath) {
      return getImageUrl(primaryImage.filePath);
    }
  }

  // Fallback to main image field
  if (imageData && imageData.image) {
    return getImageUrl(imageData.image);
  }

  return '';
};

/**
 * Generate srcSet for responsive images
 * @param {object} imageData - Item object with images array
 * @param {Array} sizes - Array of size names to include in srcSet
 * @returns {string} srcSet string for img element
 */
export const generateSrcSet = (imageData, sizes = ['small', 'medium', 'large']) => {
  if (!imageData || !imageData.images || !Array.isArray(imageData.images)) {
    return '';
  }

  const primaryImage = imageData.images.find(img => img.isPrimary) || imageData.images[0];
  if (!primaryImage || !primaryImage.processedSizes) {
    return '';
  }

  const srcSetEntries = [];

  sizes.forEach(sizeName => {
    const sizeData = primaryImage.processedSizes.find(ps => ps.size === sizeName);
    if (sizeData && sizeData.width) {
      const url = getImageUrl(sizeData.path);
      srcSetEntries.push(`${url} ${sizeData.width}w`);
    }
  });

  return srcSetEntries.join(', ');
};

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
