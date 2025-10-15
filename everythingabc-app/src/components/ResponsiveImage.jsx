import React, { useState, useEffect } from 'react';
import { getResponsiveImageUrl, generateSrcSet } from '../utils/imageUtils.js';

/**
 * ResponsiveImage component that automatically selects optimal image size
 * based on viewport and usage context
 */
const ResponsiveImage = ({
  imageData,
  alt,
  className = '',
  context = 'grid',
  size = null,
  loading = 'lazy',
  onLoad = null,
  onError = null,
  fallbackIcon = null,
  ...props
}) => {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get optimal image URL
  const imageUrl = getResponsiveImageUrl(imageData, {
    viewportWidth,
    size,
    context
  });

  // Generate srcSet for responsive images (when using new API structure)
  const srcSet = typeof imageData === 'object' && imageData.images
    ? generateSrcSet(imageData, ['small', 'medium', 'large'])
    : '';

  const handleLoad = (e) => {
    setImageLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setImageError(true);
    if (onError) onError(e);
  };

  // Render fallback if image failed to load
  if (imageError || !imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}
        {...props}
      >
        {fallbackIcon ? (
          <span className="text-2xl opacity-50">{fallbackIcon}</span>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 text-sm font-medium">
            Image not available
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      srcSet={srcSet || undefined}
      sizes={srcSet ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
      alt={alt || ''}
      className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default ResponsiveImage;