import React, { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useApi } from "../contexts/ApiContext";
import { showNotification } from "../components/Common/Notification";
import categoriesData from "../data/phase1-categories-complete.json";

const Progress = () => {
  const {
    getProgressStats,
    getCategoryStats,
    getProgress,
    loading,
  } = useApi();

  const [fetchedCategories] = useState(Object.values(categoriesData.categories));
  const [realProgressStats, setRealProgressStats] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [progressDetails, setProgressDetails] = useState({});

  // Load progress data on mount
  useEffect(() => {
    const loadProgressData = async () => {
      try {
        // Fetch real progress stats from backend
        const [progressStatsResponse, categoryStatsResponse] = await Promise.all([
          getProgressStats(),
          getCategoryStats(),
        ]);

        // Backend returns { success: true, data: [...], summary: {...} }
        const progressStats = progressStatsResponse?.summary || {};
        const categoryStats = categoryStatsResponse?.data || [];

        setRealProgressStats({
          progressStats,
          categoryStats,
        });

        // Fetch detailed progress for each category
        const details = {};
        const progressResponse = await getProgress({}, 1, 1000);
        const progressItems = progressResponse?.data || [];

        // Group progress items by category
        for (const category of fetchedCategories) {
          const categoryItems = progressItems.filter(
            item => item.categoryId === category.id
          );

          const completed = [];
          const inProgress = [];
          const failed = [];

          categoryItems.forEach((item) => {
            const itemData = {
              name: item.itemName,
              letter: item.letter,
              status: item.status,
              approvedCount: item.approvedCount,
              targetCount: item.targetCount,
              completionPercentage: item.completionPercent || 0,
            };

            if (item.status === "completed") {
              completed.push(itemData);
            } else if (item.status === "in_progress" || item.status === "collecting") {
              inProgress.push(itemData);
            } else if (item.status === "failed") {
              failed.push(itemData);
            }
          });

          details[category.id] = { completed, inProgress, failed };
        }

        setProgressDetails(details);
      } catch (error) {
        console.error("Error loading progress data:", error);
        showNotification("error", "Failed to load progress data");
      }
    };

    loadProgressData();
  }, [getProgressStats, getCategoryStats, getProgress, fetchedCategories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track collection progress across all categories
        </p>
      </div>

      {/* Progress Overview Stats */}
      {realProgressStats?.progressStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-blue-600">
                {fetchedCategories.length}
              </div>
              <div className="text-sm text-gray-500">Total Categories</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-green-600">
                {realProgressStats.categoryStats?.filter(
                  (cat) => cat.completedItems > 0
                ).length || 0}
              </div>
              <div className="text-sm text-gray-500">
                Categories Started
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-purple-600">
                {realProgressStats.categoryStats?.reduce(
                  (sum, cat) => sum + (cat.totalImages || 0),
                  0
                ) || 0}
              </div>
              <div className="text-sm text-gray-500">Images Collected</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-orange-600">
                {realProgressStats.categoryStats?.reduce(
                  (sum, cat) => sum + (cat.completedItems || 0),
                  0
                ) || 0}
              </div>
              <div className="text-sm text-gray-500">Items Completed</div>
            </div>
          </div>
        </div>
      )}

      {/* All Categories Progress */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Collection Progress - All Categories
          </h3>
          <p className="text-sm text-gray-500">
            Track your progress across all 20 categories
            {!realProgressStats?.categoryStats?.length && (
              <>
                <br />
                <span className="text-orange-600">
                  No collection progress yet - start collecting images to
                  see progress here
                </span>
              </>
            )}
          </p>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fetchedCategories
              .sort((a, b) => a.priority - b.priority)
              .map((category) => {
                // Find real progress data for this category
                const categoryStatsArray = Array.isArray(
                  realProgressStats?.categoryStats
                )
                  ? realProgressStats.categoryStats
                  : [];

                const backendStats = categoryStatsArray.find(
                  (stat) => stat.categoryId === category.id
                );

                // Calculate stats using JSON as source of truth for total
                const jsonTotalItems = Object.values(category.items).reduce(
                  (total, items) => total + items.length,
                  0
                );

                const completionPercentage = backendStats && jsonTotalItems > 0
                  ? Math.round((backendStats.completedItems / jsonTotalItems) * 100)
                  : 0;

                const imageCount = backendStats?.totalImages || 0;
                const completedItems = backendStats?.completedItems || 0;

                return (
                  <div
                    key={category.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          Priority #{category.priority}
                        </span>
                        <br />
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            completionPercentage > 80
                              ? "bg-green-100 text-green-800"
                              : completionPercentage > 50
                              ? "bg-yellow-100 text-yellow-800"
                              : completionPercentage > 0
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {category.group}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-semibold text-base mb-2">
                      {category.name}
                    </h4>

                    <div className="space-y-2 mb-3">
                      <p className="text-sm text-gray-600">
                        {jsonTotalItems} items • {category.completeness}/26
                        letters
                      </p>
                      {imageCount > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          📸 {imageCount} images collected
                        </p>
                      )}
                      {completedItems > 0 && (
                        <p className="text-sm text-blue-600">
                          ✅ {completedItems} items completed
                        </p>
                      )}
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${
                          completionPercentage > 80
                            ? "bg-green-500"
                            : completionPercentage > 50
                            ? "bg-yellow-500"
                            : completionPercentage > 0
                            ? "bg-blue-500"
                            : "bg-gray-300"
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm font-semibold ${
                          completionPercentage > 80
                            ? "text-green-600"
                            : completionPercentage > 50
                            ? "text-yellow-600"
                            : completionPercentage > 0
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {completionPercentage}% Complete
                      </span>

                      {backendStats && jsonTotalItems > 0 && (
                        <span className="text-xs text-gray-500">
                          {backendStats.completedItems}/{jsonTotalItems}
                        </span>
                      )}
                    </div>

                    {backendStats?.averageCompletion && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Avg Quality:{" "}
                          {backendStats.averageCompletion?.toFixed(1)}/10
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Detailed Progress Accordion */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Detailed Progress Breakdown
          </h3>
          <p className="text-sm text-gray-500">
            Click on any category to see which items are collected vs missing
          </p>
        </div>

        <div className="card-body p-0">
          <div className="divide-y divide-gray-200">
            {fetchedCategories
              .sort((a, b) => a.priority - b.priority)
              .map((category) => {
                const categoryStatsArray = Array.isArray(
                  realProgressStats?.categoryStats
                )
                  ? realProgressStats.categoryStats
                  : [];

                const backendStats = categoryStatsArray.find(
                  (stat) => stat.categoryId === category.id
                );

                // Calculate using JSON total as source of truth
                const jsonTotalItems = Object.values(category.items).reduce(
                  (total, items) => total + items.length,
                  0
                );

                const completionPercentage = backendStats && jsonTotalItems > 0
                  ? Math.round((backendStats.completedItems / jsonTotalItems) * 100)
                  : 0;

                const completedItems = backendStats?.completedItems || 0;
                const isExpanded = expandedCategories.has(category.id);

                const toggleExpanded = () => {
                  const newExpanded = new Set(expandedCategories);
                  if (newExpanded.has(category.id)) {
                    newExpanded.delete(category.id);
                  } else {
                    newExpanded.add(category.id);
                  }
                  setExpandedCategories(newExpanded);
                };

                // Get collected and missing items from real progress data
                const getItemStatus = () => {
                  const categoryProgress = progressDetails[category.id] || {
                    completed: [],
                    inProgress: [],
                    failed: [],
                  };

                  // Normalize name for comparison (lowercase, remove special chars/spaces)
                  const normalizeName = (name) => {
                    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  };

                  // Create sets for quick lookup with normalized names
                  const completedItems = new Set();
                  const inProgressItems = new Set();

                  categoryProgress.completed.forEach((item) => {
                    completedItems.add(normalizeName(item.name));
                  });

                  categoryProgress.inProgress.forEach((item) => {
                    inProgressItems.add(normalizeName(item.name));
                  });

                  const allItems = [];
                  const collected = [];
                  const inProgress = [];
                  const missing = [];

                  Object.entries(category.items).forEach(
                    ([letter, items]) => {
                      items.forEach((item) => {
                        const itemData = { letter, name: item };
                        allItems.push(itemData);

                        const normalizedItem = normalizeName(item);
                        if (completedItems.has(normalizedItem)) {
                          collected.push({
                            ...itemData,
                            status: "completed",
                          });
                        } else if (inProgressItems.has(normalizedItem)) {
                          inProgress.push({
                            ...itemData,
                            status: "in_progress",
                          });
                        } else {
                          missing.push({
                            ...itemData,
                            status: "not_started",
                          });
                        }
                      });
                    }
                  );

                  return {
                    collected,
                    inProgress,
                    missing,
                    total: allItems,
                  };
                };

                const itemStatus = getItemStatus();

                return (
                  <div key={category.id}>
                    {/* Accordion Header */}
                    <button
                      onClick={toggleExpanded}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                    >
                      <div className="flex items-center flex-1">
                        <div className="flex items-center mr-4">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>

                        <span className="text-xl mr-4">
                          {category.icon}
                        </span>

                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {category.group}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 mr-4">
                          {/* Progress Bar */}
                          <div className="w-32">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  completionPercentage > 80
                                    ? "bg-green-500"
                                    : completionPercentage > 50
                                    ? "bg-yellow-500"
                                    : completionPercentage > 0
                                    ? "bg-blue-500"
                                    : "bg-gray-300"
                                }`}
                                style={{
                                  width: `${completionPercentage}%`,
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {completionPercentage}%
                            </div>
                          </div>

                          {/* Items Count */}
                          <div className="text-sm text-gray-900 min-w-16 text-center">
                            {completedItems}/{jsonTotalItems}
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full min-w-20 text-center ${
                              completionPercentage === 100
                                ? "bg-green-100 text-green-800"
                                : completionPercentage > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {completionPercentage === 100
                              ? "Complete"
                              : completionPercentage > 0
                              ? "In Progress"
                              : "Not Started"}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="px-6 pb-6 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Completed Items */}
                          <div>
                            <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                              <Check className="h-4 w-4 mr-2" />
                              Completed ({itemStatus.collected.length})
                            </h4>
                            {itemStatus.collected.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                                  .split("")
                                  .map((letter) => {
                                    const letterItems =
                                      itemStatus.collected.filter(
                                        (item) => item.letter === letter
                                      );
                                    if (letterItems.length === 0)
                                      return null;

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
                                              title="Completed"
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
                              In Progress ({itemStatus.inProgress.length})
                            </h4>
                            {itemStatus.inProgress.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                                  .split("")
                                  .map((letter) => {
                                    const letterItems =
                                      itemStatus.inProgress.filter(
                                        (item) => item.letter === letter
                                      );
                                    if (letterItems.length === 0)
                                      return null;

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
                                              title="In Progress"
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
                              Not Started ({itemStatus.missing.length})
                            </h4>
                            {itemStatus.missing.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                                  .split("")
                                  .map((letter) => {
                                    const letterItems =
                                      itemStatus.missing.filter(
                                        (item) => item.letter === letter
                                      );
                                    if (letterItems.length === 0)
                                      return null;

                                    return (
                                      <div key={letter}>
                                        <div className="text-xs font-semibold text-gray-600 mb-1">
                                          {letter}:
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {letterItems.map((item) => (
                                            <span
                                              key={item.name}
                                              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                                              title="Not Started"
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
                                All items started! 🎉
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">
                                {itemStatus.total.length}
                              </div>
                              <div className="text-xs text-gray-500">
                                Total Items
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-green-600">
                                {itemStatus.collected.length}
                              </div>
                              <div className="text-xs text-gray-500">
                                Completed
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-blue-600">
                                {itemStatus.inProgress.length}
                              </div>
                              <div className="text-xs text-gray-500">
                                In Progress
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-gray-600">
                                {itemStatus.missing.length}
                              </div>
                              <div className="text-xs text-gray-500">
                                Not Started
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
