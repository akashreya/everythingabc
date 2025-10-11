import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import apiService from '../services/api.js';
import { getImageUrl } from '../utils/imageUtils.js';

// Helper function to convert Tailwind gradient colors to actual CSS colors
const getCategoryGradient = (gradientString) => {
  const colorMap = {
    "from-blue-400 to-cyan-300": "#60a5fa, #67e8f9",
    "from-green-400 to-emerald-300": "#4ade80, #6ee7b7",
    "from-purple-400 to-pink-300": "#c084fc, #f9a8d4",
    "from-yellow-400 to-orange-300": "#facc15, #fdba74",
    "from-indigo-400 to-purple-300": "#818cf8, #d8b4fe",
  };
  return colorMap[gradientString] || "#60a5fa, #67e8f9";
};

const CategoriesSection = () => {
  const [categoryImages, setCategoryImages] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getCategories();

        // TODO: Add other categories later (automotive-parts, clothing-accessories, construction-tools, etc.)
        // For now, only show these 5 categories
        const allowedCategories = [
          "animals",
          "birds",
          "plants",
          "vegetables",
          "fruits",
          "flowers",
        ];
        const filteredCategories = (response.data || []).filter((cat) =>
          allowedCategories.includes(cat.id)
        );

        setCategories(filteredCategories);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError(err.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Get all images from a category for slideshow
  const getCategoryImagesArray = (category) => {
    // Use sampleImages from API if available, otherwise extract from items
    if (category.sampleImages && category.sampleImages.length > 0) {
      return category.sampleImages;
    }

    const images = [];
    if (category.items) {
      Object.values(category.items).forEach((letterItems) => {
        if (Array.isArray(letterItems)) {
          letterItems.forEach((item) => {
            if (item && item.image) {
              images.push(item.image);
            }
          });
        }
      });
    }
    return images;
  };

  // Initialize category images with one random image per category (static until refresh)
  useEffect(() => {
    if (loading || categories.length === 0) return;

    categories.forEach((category) => {
      const images = getCategoryImagesArray(category);
      if (images.length > 0) {
        // Set one random image and keep it static
        const randomIndex = Math.floor(Math.random() * images.length);
        setCategoryImages((prev) => ({
          ...prev,
          [category.id]: images[randomIndex],
        }));
      }
    });
  }, [loading, categories]);

  return (
    <section id="categories-section" className="py-20 px-4 bg-background/50 dark:bg-gray-800/50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white transition-colors duration-300">
            Explore Learning Categories
          </h3>
          <p className="text-xl text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
            Each category is carefully designed to build vocabulary through
            visual learning and interactive play.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 text-lg font-medium transition-colors duration-300">Error: {error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="group cursor-pointer card-hover border-0 overflow-hidden"
              >
                <div
                  className="h-32 flex items-center justify-center relative overflow-hidden rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryGradient(
                      category.color
                    )})`,
                  }}
                >
                  {categoryImages[category.id] &&
                  getImageUrl(categoryImages[category.id]) ? (
                    <div className="relative w-full h-full">
                      {/* Category Preview Image */}
                      <img
                        src={getImageUrl(categoryImages[category.id])}
                        alt={`${category.name} preview`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      {/* Fallback icon */}
                      <div
                        className="w-full h-full flex items-center justify-center text-6xl animate-bounce-gentle group-hover:animate-wiggle absolute top-0 left-0"
                        style={{ display: "none" }}
                      >
                        {category.icon}
                      </div>
                      {/* Gentle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20"></div>
                    </div>
                  ) : (
                    <div className="text-6xl animate-bounce-gentle group-hover:animate-wiggle">
                      {category.icon}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white border-0 backdrop-blur-sm"
                    >
                      {category.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="text-2xl opacity-80">{category.icon}</div>
                  </div>
                </div>
                <CardContent className="p-6 bg-white dark:bg-gray-800 transition-colors duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-xl font-semibold group-hover:text-primary dark:text-white dark:group-hover:text-blue-400 transition-colors">
                      {category.name}
                    </h4>
                    <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                      {category.metadata?.totalItems || 0} items
                    </Badge>
                  </div>
                  <p className="text-muted-foreground dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
                    {category.description}
                  </p>
                </CardContent>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoriesSection;