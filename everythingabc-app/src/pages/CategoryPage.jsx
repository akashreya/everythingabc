import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import apiService from "../services/api.js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import AppHeader from "../components/AppHeader.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { getResponsiveImageUrl } from "../utils/imageUtils.js";
import { Helmet } from "react-helmet-async";
import { useTheme } from "../contexts/ThemeContext.jsx";

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

function CategoryPage() {
  const { isDarkMode } = useTheme();
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [randomizedItems, setRandomizedItems] = useState({});
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    const loadCategory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getCategory(categoryId);
        setCategory(response.data);
      } catch (err) {
        console.error("Failed to load category details:", err);
        setError(err.message || "Failed to load category");
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [categoryId]);

  useEffect(() => {
    if (category) {
      randomizeCategory();
    }
  }, [category]);

  const getLetterItems = (letter) => {
    return (category?.items[letter] || []).filter((item) =>
      getResponsiveImageUrl(item, { size: "medium" })
    );
  };

  const hasItems = (letter) => {
    return category?.items[letter] && category.items[letter].length > 0;
  };

  const randomizeCategory = () => {
    if (!category) return;
    const newRandomizedItems = {};
    alphabet.forEach((letter) => {
      const items = getLetterItems(letter);
      if (items.length > 0) {
        const randomIndex = Math.floor(Math.random() * items.length);
        newRandomizedItems[letter] = items[randomIndex];
      }
    });
    setRandomizedItems(newRandomizedItems);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col items-center justify-center transition-colors duration-300">
        <p className="text-red-600 dark:text-red-400 text-lg font-medium">
          Error: {error}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <p className="text-muted-foreground dark:text-gray-400">
          Category not found.
        </p>
      </div>
    );
  }

  const pageTitle = `${category.name} A to Z | Visual Vocabulary Learning`;
  const pageDescription = `Explore the ${category.name} category with clear pictures. Learn ${category.name} names from A to Z. Perfect for kids, ESL learners, and visual education.`;

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link
          rel="canonical"
          href={`https://everythingabc.com/categories/${categoryId}`}
        />
        {category && (
          <script type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "LearningResource",
                "name": "${category.name} A to Z Visual Vocabulary",
                "description": "Complete ${category.name} vocabulary with pictures from A to Z on EverythingABC",
                "educationalLevel": "K-12, Adult Education",
                "learningResourceType": "Visual Learning Tool",
                "teaches": "${category.name} identification and vocabulary",
                "accessibilityFeature": "Visual content, Clear labeling",
                "isAccessibleForFree": "True"
              }
            `}
          </script>
        )}
      </Helmet>

      {/* Main App Header */}
      <AppHeader />

      {/* Secondary Breadcrumb Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Breadcrumb Row */}
          <div className="flex items-center space-x-4 mb-3">
            <Breadcrumb
              items={[
                { label: "Home", path: "/" },
                {
                  label: category.name,
                  path: `/categories/${category.id}`,
                  icon: category.icon,
                },
              ]}
            />
          </div>

          {/* Category Info */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {category.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
              {category.description}
            </p>
          </div>
        </div>
      </header>

      {/* A-Z Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Randomize Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={randomizeCategory}
            className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium shadow-sm"
            style={{
              borderColor: getCategoryGradient(category.color).split(",")[0],
            }}
          >
            <span className="text-lg">🎲</span>
            <span
              style={{
                color: getCategoryGradient(category.color).split(",")[0],
              }}
            >
              Randomize Items
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {alphabet.map((letter) => {
            const letterHasItems = hasItems(letter);
            const items = getLetterItems(letter);
            const displayItem = letterHasItems ? randomizedItems[letter] : null;

            return (
              <React.Fragment key={letter}>
                {letterHasItems && displayItem ? (
                  <Link
                    to={`/categories/${category.id}/${letter}/${displayItem.id}`}
                    className={`
                      aspect-square rounded-2xl border-2 transition-all duration-200 overflow-hidden
                      ${
                        letterHasItems
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg hover:scale-105 cursor-pointer group"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 opacity-50 pointer-events-none"
                      }
                    `}
                  >
                    <div className="h-full flex flex-col">
                      <div className="flex-1 relative min-h-0">
                        {(() => {
                          const mediumUrl = getResponsiveImageUrl(displayItem, {
                            size: "medium",
                          });
                          return mediumUrl ? (
                            <img
                              src={mediumUrl}
                              alt={
                                displayItem.imageAlt ||
                                `Image of ${displayItem.name}`
                              }
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null;
                        })()}
                        <div
                          className="w-full h-full flex items-center justify-center text-4xl"
                          style={{
                            backgroundColor:
                              getCategoryGradient(category.color).split(
                                ","
                              )[0] + "20",
                            display: getResponsiveImageUrl(displayItem, {
                              size: "mediuum",
                            })
                              ? "none"
                              : "flex",
                          }}
                        >
                          📷
                        </div>
                        <div className="absolute top-3 left-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                            style={{
                              backgroundColor: getCategoryGradient(
                                category.color
                              ).split(",")[0],
                            }}
                          >
                            {letter}
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800 h-10 flex-shrink-0 flex items-center justify-center transition-colors duration-300">
                        <div className="text-center w-full">
                          <div className="text-xs font-medium text-gray-900 dark:text-white truncate transition-colors duration-300">
                            {displayItem?.name || "No name"}
                          </div>
                          {items.length > 1 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                              +{items.length - 1} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    className={`
                      aspect-square rounded-2xl border-2 transition-all duration-200 overflow-hidden
                      bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 opacity-50 pointer-events-none
                    `}
                  >
                    <div className="h-full flex flex-col items-center justify-center">
                      <div
                        className={`
                        text-2xl font-bold mb-2
                        text-gray-400 dark:text-gray-500
                      `}
                      >
                        {letter}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Coming soon
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <AppFooter />
    </div>
  );
}

export default CategoryPage;
