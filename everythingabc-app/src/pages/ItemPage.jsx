import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import apiService from "../services/api.js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import AppHeader from "../components/AppHeader.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { getResponsiveImageUrl } from "../utils/imageUtils.js";
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

function ItemPage() {
  const { isDarkMode } = useTheme();
  const { categoryId, letter, itemId } = useParams();
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    const loadItemData = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoryResponse = await apiService.getCategory(categoryId);
        setCategory(categoryResponse.data);

        const letterItems = categoryResponse.data?.items[letter] || [];
        setItems(letterItems);

        const initialIndex = letterItems.findIndex((i) => i.id === itemId);
        if (initialIndex !== -1) {
          setCurrentItemIndex(initialIndex);
        } else if (letterItems.length > 0) {
          setCurrentItemIndex(0); // Fallback to first item if not found
        }
      } catch (err) {
        console.error("Failed to load item details:", err);
        setError(err.message || "Failed to load item");
      } finally {
        setLoading(false);
      }
    };

    loadItemData();
  }, [categoryId, letter, itemId]);

  const hasMultiple = items.length > 1;
  const currentItem = items[currentItemIndex];

  const handleNextItem = () => {
    const nextIndex = (currentItemIndex + 1) % items.length;
    setCurrentItemIndex(nextIndex);
  };

  const handlePrevItem = () => {
    const prevIndex =
      currentItemIndex === 0 ? items.length - 1 : currentItemIndex - 1;
    setCurrentItemIndex(prevIndex);
  };

  // Letter navigation functions
  const getLettersWithItems = () => {
    return alphabet.filter(
      (l) => category?.items[l] && category.items[l].length > 0
    );
  };

  const lettersWithItems = getLettersWithItems();
  const currentLetterIndex = lettersWithItems.indexOf(letter);

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
        <p className="text-red-600 dark:text-red-400 text-lg font-medium">Error: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!category || !currentItem) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <p className="text-muted-foreground dark:text-gray-400">Item or category not found.</p>
      </div>
    );
  }

  const pageTitle = `${currentItem.name} - ${category.name} | Visual Vocabulary`;
  const pageDescription = currentItem.description || `Learn about ${currentItem.name} in the ${category.name} category.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://everythingabc.com/categories/${categoryId}/${letter}/${itemId}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={`https://everythingabc.com/categories/${categoryId}/${letter}/${itemId}`} />
        <meta property="og:type" content="article" />
        {currentItem.image && (
          <meta property="og:image" content={getResponsiveImageUrl(currentItem, { context: 'detail' })} />
        )}
        {/* Image Schema */}
        {currentItem.image && (
          <script type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "ImageObject",
                "contentUrl": "${getResponsiveImageUrl(currentItem, { context: 'detail' })}",
                "description": "Clear picture of ${currentItem.name} for educational vocabulary learning on EverythingABC",
                "name": "${currentItem.name}",
                "educationalUse": "Vocabulary building"
              }
            `}
          </script>
        )}
        {/* Add more Open Graph and Twitter Card tags as needed */}
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
                { label: currentItem.name, path: `/categories/${category.id}/${letter}/${currentItem.id}` },
              ]}
            />
          </div>

          {/* Item Info */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
              {currentItem.name}
            </h1>
            {hasMultiple && (
              <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                {currentItemIndex + 1} of {items.length} items
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Item Display with Carousel Navigation */}
      <div className="max-w-full mx-auto px-2 sm:px-4 py-6 sm:py-12">
        <div className="flex items-center justify-center space-x-2 sm:space-x-8 md:space-x-16">
          {/* Previous Letter Button */}
          <Link
            to={currentLetterIndex > 0 ? `/categories/${categoryId}/${lettersWithItems[currentLetterIndex - 1]}/${category.items[lettersWithItems[currentLetterIndex - 1]][0].id}` : '#'}
            onClick={(e) => currentLetterIndex === 0 && e.preventDefault()}
            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              currentLetterIndex === 0
                ? "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 shadow-lg hover:shadow-xl dark:shadow-gray-900/50"
            }`}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          {/* Item Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl dark:shadow-gray-900/50 overflow-hidden w-full max-w-6xl transition-colors duration-300">
            <div className="aspect-[4/3] relative">
              {(() => {
                const responsiveImageUrl = getResponsiveImageUrl(currentItem, { context: 'detail' });
                return responsiveImageUrl ? (
                  <img
                    src={responsiveImageUrl}
                    alt={`${currentItem.name} picture for ${category.name} category on EverythingABC`}
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
                className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl"
                style={{
                  backgroundColor:
                    getCategoryGradient(category.color).split(",")[0] + "20",
                  display: getResponsiveImageUrl(currentItem, { context: 'detail' }) ? "none" : "flex",
                }}
              >
                📷
              </div>
              <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl md:text-3xl font-bold shadow-lg"
                  style={{
                    backgroundColor: getCategoryGradient(category.color).split(
                      ","
                    )[0],
                  }}
                >
                  {letter}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-8 md:p-12 text-center">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-6 transition-colors duration-300">
                {currentItem.name}
              </h2>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-4 sm:mb-8 leading-relaxed transition-colors duration-300">
                {currentItem.description}
              </p>

              {currentItem.facts && currentItem.facts.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-8 transition-colors duration-300">
                  <p className="text-blue-800 dark:text-blue-200 font-medium text-sm sm:text-base md:text-lg transition-colors duration-300">
                    💡 {currentItem.facts[0]}
                  </p>
                </div>
              )}

              {currentItem.tags && currentItem.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-8">
                  {currentItem.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm sm:text-base transition-colors duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {hasMultiple && (
                <div className="flex items-center justify-center space-x-3 sm:space-x-4 mt-4 sm:mt-8">
                  <button
                    onClick={handlePrevItem}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium text-sm sm:text-base"
                  >
                    Previous
                  </button>
                  <div className="flex space-x-2">
                    {items.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          index === currentItemIndex
                            ? "bg-blue-500 dark:bg-blue-400"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleNextItem}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm sm:text-base"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Next Letter Button */}
          <Link
            to={currentLetterIndex < lettersWithItems.length - 1 ? `/categories/${categoryId}/${lettersWithItems[currentLetterIndex + 1]}/${category.items[lettersWithItems[currentLetterIndex + 1]][0].id}` : '#'}
            onClick={(e) => currentLetterIndex === lettersWithItems.length - 1 && e.preventDefault()}
            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              currentLetterIndex === lettersWithItems.length - 1
                ? "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 shadow-lg hover:shadow-xl dark:shadow-gray-900/50"
            }`}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Letter Indicator */}
        <div className="text-center mt-4 sm:mt-6">
          <div className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border dark:border-gray-700 transition-colors duration-300">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">
              Letter {letter} • {currentLetterIndex + 1} of{" "}
              {lettersWithItems.length}
            </span>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}

export default ItemPage;
