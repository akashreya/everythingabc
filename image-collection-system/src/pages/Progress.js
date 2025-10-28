import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  RefreshCw,
  ChevronDown,
  Search,
} from "lucide-react";
import { useApi } from "../contexts/ApiContext";
import { showNotification } from "../components/Common/Notification";

const Progress = () => {
  const {
    getProgress,
    loading,
  } = useApi();

  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryData, setCategoryData] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch all available categories with pagination support
  const fetchAllCategories = async () => {
    try {
      const allCategories = [];
      let nextUrl = "http://localhost:3003/api/v2/categories/";

      while (nextUrl) {
        const response = await fetch(nextUrl);
        const data = await response.json();

        allCategories.push(...data.results);
        nextUrl = data.next; // Continue if there are more pages
      }

      setAvailableCategories(allCategories.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching categories:", error);
      showNotification("error", "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Filtered categories based on search term with debouncing
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return availableCategories;
    return availableCategories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableCategories, searchTerm]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Search logic is handled by filteredCategories memo
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.category-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load categories on mount
  useEffect(() => {
    fetchAllCategories();
  }, []);

  // Handle category selection
  const handleCategorySelect = (categoryId, categoryName) => {
    setSelectedCategory(categoryId);
    setSearchTerm(categoryName);
    setIsDropdownOpen(false);
  };

  // Get selected category name for display
  const getSelectedCategoryName = () => {
    if (!selectedCategory) return "";
    const category = availableCategories.find(cat => cat.id === selectedCategory);
    return category ? category.name : "";
  };

  // Load category data
  const loadCategoryData = async () => {
    if (!selectedCategory) {
      showNotification("error", "Please select a category first");
      return;
    }

    setLoadingCategory(true);
    try {
      // Get the selected category info from fetched categories
      const category = availableCategories.find(cat => cat.id === selectedCategory);
      if (!category) {
        throw new Error("Category not found");
      }

      // Fetch progress data for this category
      const categoryProgressResponse = await getProgress({ categoryId: selectedCategory }, 1, 1000);
      const categoryItems = categoryProgressResponse?.data || [];

      const completed = [];
      const inProgress = [];
      const notStarted = [];

      categoryItems.forEach((item) => {
        const itemData = {
          name: item.itemName,
          letter: item.letter,
          status: item.status,
          imageCount: item.imageCount || 0,
          collectionStatus: item.collectionStatus,
          progress: item.progress || 0,
        };

        if (item.collectionStatus === "complete") {
          completed.push(itemData);
        } else if (item.collectionStatus === "pending") {
          // Check if item has some images but isn't complete (true "in progress")
          if (item.imageCount > 0) {
            inProgress.push(itemData);
          } else {
            // No images = not started
            notStarted.push(itemData);
          }
        } else {
          // Items with no defined collection status
          notStarted.push(itemData);
        }
      });

      setCategoryData({
        category,
        totalItems: categoryItems.length,
        completed,
        inProgress,
        notStarted,
        completionRate: Math.round((completed.length / categoryItems.length) * 100)
      });

    } catch (error) {
      console.error("Error loading category data:", error);
      showNotification("error", "Failed to load category data");
    } finally {
      setLoadingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select a category to view detailed progress breakdown
        </p>
      </div>

      {/* Category Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Select Category</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative category-dropdown">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) {
                      setSelectedCategory("");
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={loadingCategories ? "Loading categories..." : "Search categories..."}
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-2 top-2.5 p-1 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && !loadingCategories && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id, category.name)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          {category.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No categories found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={loadCategoryData}
              disabled={!selectedCategory || loadingCategory}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingCategory ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Progress"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Progress Results */}
      {categoryData && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {categoryData.totalItems}
                </div>
                <div className="text-sm font-medium text-gray-600">Total Items</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body text-center">
                <div className="text-2xl font-bold text-green-600">
                  {categoryData.completed.length}
                </div>
                <div className="text-sm font-medium text-gray-600">Completed</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {categoryData.inProgress.length}
                </div>
                <div className="text-sm font-medium text-gray-600">In Progress</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {categoryData.notStarted.length}
                </div>
                <div className="text-sm font-medium text-gray-600">Not Started</div>
              </div>
            </div>
          </div>

          {/* Category Header */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryData.category.icon}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {categoryData.category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {categoryData.completionRate}% completed ({categoryData.completed.length}/{categoryData.totalItems})
                    </p>
                  </div>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        categoryData.completionRate > 80
                          ? "bg-green-500"
                          : categoryData.completionRate > 50
                          ? "bg-yellow-500"
                          : categoryData.completionRate > 0
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      }`}
                      style={{
                        width: `${categoryData.completionRate}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Detailed Items Breakdown
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Completed Items */}
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Completed ({categoryData.completed.length})
                  </h4>
                  {categoryData.completed.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                        .split("")
                        .map((letter) => {
                          const letterItems = categoryData.completed.filter(
                            (item) => item.letter === letter
                          );
                          if (letterItems.length === 0) return null;

                          return (
                            <div key={letter}>
                              <div className="text-xs font-semibold text-gray-600 mb-1">
                                {letter}:
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {letterItems.map((item) => (
                                  <span
                                    key={item.name}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-800"
                                    title={`${item.name} - ${item.imageCount} images`}
                                  >
                                    {item.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No items completed yet.
                    </p>
                  )}
                </div>

                {/* In Progress Items */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    In Progress ({categoryData.inProgress.length})
                  </h4>
                  {categoryData.inProgress.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                        .split("")
                        .map((letter) => {
                          const letterItems = categoryData.inProgress.filter(
                            (item) => item.letter === letter
                          );
                          if (letterItems.length === 0) return null;

                          return (
                            <div key={letter}>
                              <div className="text-xs font-semibold text-gray-600 mb-1">
                                {letter}:
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {letterItems.map((item) => (
                                  <span
                                    key={item.name}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800"
                                    title={`${item.name} - ${item.imageCount} images`}
                                  >
                                    {item.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No items in progress.
                    </p>
                  )}
                </div>

                {/* Not Started Items */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <X className="h-4 w-4 mr-2" />
                    Not Started ({categoryData.notStarted.length})
                  </h4>
                  {categoryData.notStarted.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                        .split("")
                        .map((letter) => {
                          const letterItems = categoryData.notStarted.filter(
                            (item) => item.letter === letter
                          );
                          if (letterItems.length === 0) return null;

                          return (
                            <div key={letter}>
                              <div className="text-xs font-semibold text-gray-600 mb-1">
                                {letter}:
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {letterItems.map((item) => (
                                  <span
                                    key={item.name}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800"
                                    title={`${item.name} - ${item.imageCount} images`}
                                  >
                                    {item.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      All items have been started!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Progress;