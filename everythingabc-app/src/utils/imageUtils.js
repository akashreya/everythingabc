// CDN configuration
const CDN_URL = import.meta.env.VITE_CDN_URL || 'https://dl0gmrcy5edt5.cloudfront.net';

/**
 * Get the full image URL by prepending CDN domain to the image path
 * @param {string} imagePath - The relative image path from the database
 * @returns {string} Full CDN URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';

  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  return `${CDN_URL}/${cleanPath}`;
};

export default getImageUrl;
