import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Loader2 } from "lucide-react";
import apiService from "../services/api.js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import { getImageUrl } from "../utils/imageUtils.js";
import { Helmet } from "react-helmet-async";
import { useTheme } from '../contexts/ThemeContext.jsx';

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
  const { isDarkMode, toggleDarkMode } = useTheme();
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
    return (category?.items[letter] || []).filter(item => getImageUrl(item.image));
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 text-lg font-medium">Error: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Category not found.</p>
      </div>
    );
  }

  const pageTitle = `${category.name} A to Z | Visual Vocabulary Learning`;
  const pageDescription = `Explore the ${category.name} category with clear pictures. Learn ${category.name} names from A to Z. Perfect for kids, ESL learners, and visual education.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://everythingabc.com/categories/${categoryId}`} />
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

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-sm text-gray-600">{category.description}</p>
          </div>
        </div>
      </header>

      {/* A-Z Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Randomize Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={randomizeCategory}
            className="flex items-center space-x-2 px-6 py-3 bg-white border-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
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
            const displayItem = letterHasItems
              ? randomizedItems[letter]
              : null;

            return (
              <React.Fragment key={letter}>
                {letterHasItems && displayItem ? (
                  <Link
                    to={`/categories/${category.id}/${letter}/${displayItem.id}`}
                    className={`
                      aspect-square rounded-2xl border-2 transition-all duration-200 overflow-hidden
                      ${
                        letterHasItems
                          ? "bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:scale-105 cursor-pointer group"
                          : "bg-gray-50 border-gray-100 opacity-50 pointer-events-none"
                      }
                    `}
                  >
                    <div className="h-full flex flex-col">
                      <div className="flex-1 relative min-h-0">
                        {displayItem.image && getImageUrl(displayItem.image) ? (
                          <img
                            src={getImageUrl(displayItem.image)}
                            alt={displayItem.imageAlt || `Image of ${displayItem.name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex items-center justify-center text-4xl"
                          style={{
                            backgroundColor:
                              getCategoryGradient(category.color).split(",")[0] +
                              "20",
                            display: displayItem.image && getImageUrl(displayItem.image) ? "none" : "flex",
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
                      <div className="p-2 bg-white h-10 flex-shrink-0 flex items-center justify-center">
                        <div className="text-center w-full">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {displayItem?.name || "No name"}
                          </div>
                          {items.length > 1 && (
                            <div className="text-xs text-gray-500">
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
                      bg-gray-50 border-gray-100 opacity-50 pointer-events-none
                    `}
                  >
                    <div className="h-full flex flex-col items-center justify-center">
                      <div
                        className={`
                        text-2xl font-bold mb-2
                        text-gray-400
                      `}
                      >
                        {letter}
                      </div>
                      <div className="text-xs text-gray-400">Coming soon</div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default CategoryPage;
