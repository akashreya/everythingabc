import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Database,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Info,
  Check,
} from "lucide-react";
import { useApi } from "../contexts/ApiContext";
import { showNotification } from "../components/Common/Notification";

const Collections = () => {
  const {
    collectItem,
    collectSelectedImages,
    enhancedSearch,
    getHealth,
    getAllCategories,
    getCategoryById,
    loading,
  } = useApi();

  const [activeTab, setActiveTab] = useState("collect");
  const [serviceHealth, setServiceHealth] = useState(null);
  const [servicesReady, setServicesReady] = useState(false);
  const [collectForm, setCollectForm] = useState({
    category: "",
    letter: "",
    itemName: "",
    targetCount: 3,
  });
  const [categoryForm, setCategoryForm] = useState({
    category: "",
    maxConcurrent: 3,
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  });
  // Fetch categories from database instead of static JSON
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryDetailsCache, setCategoryDetailsCache] = useState(new Map());
  const [loadingCategoryDetails, setLoadingCategoryDetails] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [categoryStats, setCategoryStats] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [categoryPreviewResults, setCategoryPreviewResults] = useState(null);
  const [categorySelectedImages, setCategorySelectedImages] = useState({});
  const [failedDownloads, setFailedDownloads] = useState([]);

  // Load categories from database on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const result = await getAllCategories();
        if (result && Array.isArray(result)) {
          setFetchedCategories(result);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        showNotification("error", "Failed to load categories from database");
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [getAllCategories]);

  // Get available categories from database
  const availableCategories = fetchedCategories.map((cat) => cat.name);

  const getCategoryInfo = useCallback(
    (categoryId) => {
      return fetchedCategories.find((cat) => cat.name === categoryId) || null;
    },
    [fetchedCategories]
  );

  const getTotalItems = useCallback(() => {
    return fetchedCategories.reduce((total, category) => {
      return (
        total +
        Object.values(category.items).reduce(
          (catTotal, items) => catTotal + items.length,
          0
        )
      );
    }, 0);
  }, [fetchedCategories]);

  const fetchCategoryDetails = useCallback(
    async (categoryName) => {
      // Find category ID from name
      const category = fetchedCategories.find((cat) => cat.name === categoryName);
      if (!category) return null;

      const categoryId = category.id;

      // Check if already cached
      if (categoryDetailsCache.has(categoryId)) {
        return categoryDetailsCache.get(categoryId);
      }

      setLoadingCategoryDetails(true);

      try {
        const categoryDetails = await getCategoryById(categoryId);

        // Update cache
        setCategoryDetailsCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(categoryId, categoryDetails);
          return newCache;
        });

        return categoryDetails;
      } catch (error) {
        console.error(`Failed to fetch category details for ${categoryId}:`, error);
        showNotification("error", `Failed to load items for ${categoryName}`);
        return null;
      } finally {
        setLoadingCategoryDetails(false);
      }
    },
    [fetchedCategories, categoryDetailsCache, getCategoryById]
  );

  const getItemsForCategoryLetter = useCallback(
    (categoryName, letter) => {
      // Find category ID from name
      const category = fetchedCategories.find((cat) => cat.name === categoryName);
      if (!category) return [];

      // Look in the details cache
      const categoryDetails = categoryDetailsCache.get(category.id);

      if (!categoryDetails || !categoryDetails.items || !categoryDetails.items[letter]) {
        return [];
      }

      // Items are objects in DB, not strings - return item names
      const items = categoryDetails.items[letter] || [];
      return items.map((item) => (typeof item === "string" ? item : item.name));
    },
    [fetchedCategories, categoryDetailsCache]
  );

  const getFlowerAlternatives = (flowerName) => {
    const alternatives = [];

    // Add generic flower term
    alternatives.push(`${flowerName} flower`);

    // Add specific alternatives for common flowers
    const flowerMap = {
      "Baby's Breath": ["gypsophila"],
      "Black-eyed Susan": ["rudbeckia"],
      "Bleeding Heart": ["dicentra"],
      "Bird of Paradise": ["strelitzia"],
      "Calla Lily": ["zantedeschia", "arum lily"],
      "Dusty Miller": ["silver dust"],
      "Easter Lily": ["white lily"],
      "Evening Primrose": ["oenothera"],
      "Forget-me-not": ["myosotis"],
      "Four O'Clock": ["mirabilis"],
      "Gerbera Daisy": ["gerbera"],
      Gypsophila: ["baby breath"],
      "Indian Paintbrush": ["castilleja"],
      "Iceland Poppy": ["papaver"],
      "Jack-in-the-Pulpit": ["arisaema"],
      "Johnny Jump Up": ["viola", "pansy"],
      "Kangaroo Paw": ["anigozanthos"],
      "Kiss-me-over-the-garden-gate": ["polygonum"],
      "King Protea": ["protea"],
      "Kaffir Lily": ["clivia"],
      "Morning Glory": ["ipomoea"],
      Moonflower: ["ipomoea alba"],
      "Moss Rose": ["portulaca"],
      "Night-blooming Cereus": ["epiphyllum"],
      "Queen Anne's Lace": ["wild carrot", "daucus"],
    };

    if (flowerMap[flowerName]) {
      alternatives.push(...flowerMap[flowerName]);
    }

    // Add simpler versions (remove complex parts)
    const simplified = flowerName
      .replace(/[''-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (simplified !== flowerName) {
      alternatives.push(simplified);
      alternatives.push(`${simplified} flower`);
    }

    // Split compound names and use first part
    const firstWord = flowerName.split(" ")[0];
    if (firstWord !== flowerName && firstWord.length > 3) {
      alternatives.push(firstWord);
      alternatives.push(`${firstWord} flower`);
    }

    return alternatives.slice(0, 3); // Limit to 3 alternatives to avoid too many API calls
  };

  // Check service health on component mount
  // COMMENTED OUT - Health checks causing hangs, disable for ICS
  useEffect(() => {
    // const checkServiceHealth = async () => {
    //   try {
    //     console.log("🔍 Checking service health...");
    //     const health = await getHealth(true);
    //     console.log("📊 Health response:", health);

    //     setServiceHealth(health);

    //     // Check if services are ready based on health response structure
    //     const isHealthy = health.status === "healthy" || health.healthy;
    //     const hasApiClients =
    //       health.components?.apis?.healthy || health.services?.apiClients;
    //     const hasDatabase =
    //       health.components?.database?.healthy || health.database;

    //     const ready = isHealthy && hasApiClients && hasDatabase;
    //     console.log("✅ Services ready:", ready, {
    //       healthy: isHealthy,
    //       apiClients: hasApiClients,
    //       database: hasDatabase,
    //     });

    //     setServicesReady(ready);
    //   } catch (error) {
    //     console.error("❌ Failed to check service health:", error);
    //     setServicesReady(false);
    //   }
    // };

    // checkServiceHealth();
    // // Re-check health every 10 seconds if not ready (reduced from 30s for faster feedback)
    // const healthCheckInterval = servicesReady
    //   ? null
    //   : setInterval(checkServiceHealth, 10000);

    // return () => {
    //   if (healthCheckInterval) clearInterval(healthCheckInterval);
    // };

    // Set default mock state for ICS
    setServicesReady(true);
    setServiceHealth({ status: "healthy", mock: true });
  }, []); // Removed getHealth and servicesReady dependencies


  // Load progress data on mount
  useEffect(() => {
    // Calculate category statistics based on local categories
    const stats = {
      totalCategories: fetchedCategories.length,
      totalItems: fetchedCategories.reduce(
        (total, category) =>
          total +
          Object.values(category.items).reduce(
            (catTotal, items) => catTotal + items.length,
            0
          ),
        0
      ),
      priorityCategories: fetchedCategories
        .filter((cat) => cat.priority <= 5)
        .sort((a, b) => a.priority - b.priority),
      completenessStats: fetchedCategories.reduce((acc, cat) => {
        acc[cat.completeness] = (acc[cat.completeness] || 0) + 1;
        return acc;
      }, {}),
    };
    setCategoryStats(stats);
  }, []); // Run once on mount

  // Update available items when category or letter changes
  useEffect(() => {
    const loadItemsForSelection = async () => {
      if (collectForm.category && collectForm.letter) {
        // Fetch category details if not cached
        await fetchCategoryDetails(collectForm.category);

        // getItemsForCategoryLetter will now read from cache
        const items = getItemsForCategoryLetter(
          collectForm.category,
          collectForm.letter
        );
        setAvailableItems(items);

        // Reset item name if current selection is not in new list
        if (collectForm.itemName && !items.includes(collectForm.itemName)) {
          setCollectForm((prev) => ({
            ...prev,
            itemName: "",
          }));
        }
      } else {
        setAvailableItems([]);
      }
    };

    loadItemsForSelection();
  }, [collectForm.category, collectForm.letter, fetchCategoryDetails, getItemsForCategoryLetter, collectForm.itemName]);

  const handlePreviewItem = async (e) => {
    e.preventDefault();

    if (!collectForm.category || !collectForm.itemName) {
      showNotification("error", "Please fill in item name and category");
      return;
    }

    try {
      const result = await enhancedSearch(
        collectForm.itemName,
        collectForm.category.toLowerCase(),
        { maxTotalResults: 100 }
      );

      setPreviewResults(result.result);
      setSelectedImages(new Set());
      showNotification(
        "info",
        `Found ${result.result.totalImages} images for preview`,
        "Preview Ready"
      );
    } catch (error) {
      showNotification("error", "Failed to preview images", "Error");
    }
  };

  const handleCollectSelected = async () => {
    if (selectedImages.size === 0) {
      showNotification("error", "Please select at least one image");
      return;
    }

    if (!collectForm.category || !collectForm.letter || !collectForm.itemName) {
      showNotification(
        "error",
        "Please fill in category, letter, and item name"
      );
      return;
    }

    try {
      // Get selected images
      const selectedImagesList = Array.from(selectedImages).map(
        (index) => previewResults.images[index]
      );

      // Call the API to collect selected images
      // Convert category name to lowercase ID for API compatibility
      const result = await collectSelectedImages(
        collectForm.category.toLowerCase(),
        collectForm.letter,
        collectForm.itemName,
        selectedImagesList
      );

      // Check if any images were actually collected
      if (result.collectedCount === 0 && result.errors.length > 0) {
        // All downloads failed
        const errorMessages = result.errors
          .map((err) => `${err.source}: ${err.error}`)
          .join("; ");
        throw new Error(`All downloads failed: ${errorMessages}`);
      } else if (result.collectedCount < selectedImages.size) {
        // Partial success
        showNotification(
          "warning",
          `Downloaded ${result.collectedCount} of ${selectedImages.size} images. ${result.errors.length} failed.`,
          "Partial Success"
        );
      } else {
        // Full success
        showNotification(
          "success",
          `Successfully downloaded ${result.collectedCount} images for ${collectForm.itemName}`,
          "Collection Complete"
        );
      }

      // Reset
      setPreviewResults(null);
      setSelectedImages(new Set());
      setCollectForm({
        category: "",
        letter: "",
        itemName: "",
        targetCount: 3,
      });
    } catch (error) {
      console.error("Collection error:", error);
      showNotification(
        "error",
        error.response?.data?.message || "Failed to collect selected images",
        "Collection Error"
      );
    }
  };

  const handleCollectItem = async (e) => {
    e.preventDefault();

    if (!collectForm.category || !collectForm.letter || !collectForm.itemName) {
      showNotification("error", "Please fill in all required fields");
      return;
    }

    try {
      if (
        !window.confirm(
          `Start automatic collection for "${collectForm.itemName}"?\n\nThis will automatically collect ${collectForm.targetCount} high-quality images from multiple sources.\n\nContinue?`
        )
      ) {
        return;
      }

      const result = await collectItem(
        collectForm.category.toLowerCase(),
        collectForm.letter,
        collectForm.itemName,
        { targetCount: collectForm.targetCount }
      );

      showNotification(
        "success",
        `Auto collection started for ${collectForm.itemName}. Target: ${collectForm.targetCount} images.`,
        "Collection Started"
      );

      // Reset form after successful start
      setCollectForm({
        category: "",
        letter: "",
        itemName: "",
        targetCount: 3,
      });
    } catch (error) {
      console.error("Item collection error:", error);
      showNotification(
        "error",
        error.response?.data?.message || "Failed to start collection",
        "Collection Error"
      );
    }
  };

  const toggleImageSelection = (index) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedImages(newSelection);
  };

  const handleCollectCategory = async (e) => {
    e.preventDefault();

    if (!categoryForm.category) {
      showNotification("error", "Please select a category");
      return;
    }

    try {
      const categoryInfo = getCategoryInfo(categoryForm.category);
      const totalItems = Object.values(categoryInfo?.items || {}).reduce(
        (total, items) => total + items.length,
        0
      );

      if (
        !window.confirm(
          `Start collection for ${categoryInfo?.name} category?\n\nThis will collect images for ${totalItems} items across ${categoryForm.letters.length} letters.\n\nThis may take a while. Continue?`
        )
      ) {
        return;
      }

      // Category collection removed - use preview instead
      showNotification(
        "info",
        "Use preview in Collect Items tab for manual selection",
        "Feature Removed"
      );
      return;

      showNotification(
        "success",
        `Category collection started for ${categoryInfo?.name}. Processing ${totalItems} items...`,
        "Collection Started"
      );

      // Reset form after successful start
      setCategoryForm({
        category: "",
        maxConcurrent: 3,
        letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      });
    } catch (error) {
      console.error("Category collection error:", error);
      showNotification(
        "error",
        error.response?.data?.message || "Failed to start category collection",
        "Collection Error"
      );
    }
  };

  const handlePreviewCategory = async (e) => {
    e.preventDefault();

    if (!categoryForm.category) {
      showNotification("error", "Please select a category");
      return;
    }

    try {
      const categoryInfo = getCategoryInfo(categoryForm.category);

      if (!categoryInfo) {
        showNotification(
          "error",
          `Category "${categoryForm.category}" not found`
        );
        return;
      }

      // Fetch full category details with items
      const categoryDetails = await fetchCategoryDetails(categoryForm.category);

      if (!categoryDetails) {
        showNotification(
          "error",
          `Category "${categoryForm.category}" not found in database`
        );
        return;
      }

      if (!categoryDetails.items) {
        showNotification(
          "error",
          `No items found for ${categoryForm.category}. Database may need seeding.`
        );
        return;
      }

      // Normalize items to strings (items can be strings or objects with name property)
      const allItems = Object.values(categoryDetails.items)
        .flat()
        .map((item) => (typeof item === "string" ? item : item.name))
        .filter(Boolean); // Remove any null/undefined values

      showNotification(
        "info",
        `Searching for ${allItems.length} items in ${categoryInfo.name}...`,
        "Searching"
      );

      // Process items in batches to avoid overwhelming the API
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < allItems.length; i += batchSize) {
        batches.push(allItems.slice(i, i + batchSize));
      }

      const allResults = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        showNotification(
          "info",
          `Searching batch ${batchIndex + 1}/${batches.length} (${
            batch.length
          } items)...`,
          "Searching"
        );

        const searchPromises = batch.map(async (item) => {
          try {
            // First try the exact item name
            let result = await enhancedSearch(item, categoryForm.category.toLowerCase(), {
              maxTotalResults: 10,
            });
            let itemResult = {
              itemName: item,
              letter: Object.keys(categoryDetails.items).find((letter) =>
                categoryDetails.items[letter].some((i) =>
                  (typeof i === "string" ? i : i.name) === item
                )
              ),
              results: result.result.images || [],
              totalFound: result.result.totalImages || 0,
            };

            // If no results and it's a flower category, try alternative search terms
            if (
              itemResult.results.length === 0 &&
              categoryForm.category === "flowers"
            ) {
              const alternativeTerms = getFlowerAlternatives(item);

              for (const altTerm of alternativeTerms) {
                try {
                  const altResult = await enhancedSearch(
                    altTerm,
                    categoryForm.category.toLowerCase(),
                    { maxTotalResults: 10 }
                  );
                  if (
                    altResult.result.images &&
                    altResult.result.images.length > 0
                  ) {
                    itemResult.results = altResult.result.images;
                    itemResult.totalFound = altResult.result.totalImages || 0;
                    break;
                  }
                } catch (altError) {
                  continue;
                }
              }
            }

            if (itemResult.results.length > 0) {
            } else {
            }

            return itemResult;
          } catch (error) {
            console.error(`Failed to search for ${item}:`, error);
            return {
              itemName: item,
              letter: Object.keys(categoryDetails.items).find((letter) =>
                categoryDetails.items[letter].some((i) =>
                  (typeof i === "string" ? i : i.name) === item
                )
              ),
              results: [],
              totalFound: 0,
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(searchPromises);
        allResults.push(...batchResults);

        // Small delay between batches to be respectful to APIs
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const searchResults = allResults;
      const totalImagesFound = searchResults.reduce(
        (sum, item) => sum + item.totalFound,
        0
      );

      const itemsWithResults = searchResults.filter(
        (item) => item.results.length > 0
      );

      setCategoryPreviewResults({
        category: categoryForm.category,
        categoryName: categoryInfo.name,
        items: itemsWithResults, // Only show items with results
        totalItems: allItems.length,
        totalImagesFound,
        searchedItems: searchResults.length, // Total items searched
        itemsWithImages: itemsWithResults.length, // Items that found images
      });

      setCategorySelectedImages({}); // Reset selections

      showNotification(
        "success",
        `Found ${totalImagesFound} images across ${
          searchResults.filter((item) => item.results.length > 0).length
        } items`,
        "Search Complete"
      );
    } catch (error) {
      showNotification("error", "Category search failed", "Error");
      console.error("Category search error:", error);
    }
  };

  const toggleCategoryImageSelection = (itemName, imageIndex) => {
    setCategorySelectedImages((prev) => ({
      ...prev,
      [itemName]: imageIndex,
    }));
  };

  const handleCollectCategorySelected = async () => {
    const selectedCount = Object.keys(categorySelectedImages).length;
    if (selectedCount === 0) {
      showNotification("error", "Please select at least one image");
      return;
    }

    try {
      if (!window.confirm(`Download ${selectedCount} selected images?`)) {
        return;
      }

      const selectedImagesList = [];
      Object.entries(categorySelectedImages).forEach(
        ([itemName, imageIndex]) => {
          const item = categoryPreviewResults.items.find(
            (i) => i.itemName === itemName
          );
          if (item && item.results[imageIndex]) {
            selectedImagesList.push({
              ...item.results[imageIndex],
              itemName,
              letter: item.letter,
            });
          }
        }
      );

      // Download each selected image with detailed progress
      let successCount = 0;
      let failedItems = [];
      const totalCount = selectedImagesList.length;

      for (let i = 0; i < selectedImagesList.length; i++) {
        const imageData = selectedImagesList[i];
        let downloaded = false;
        let lastError = null;

        // Retry up to 3 times for network errors
        for (let retry = 0; retry < 3 && !downloaded; retry++) {
          try {
            if (retry > 0) {
              showNotification(
                "info",
                `Retrying ${i + 1}/${totalCount}: ${
                  imageData.itemName
                } (attempt ${retry + 1}/3)`,
                "Progress"
              );
              // Add delay before retry
              await new Promise((resolve) => setTimeout(resolve, 2000 * retry));
            } else {
              showNotification(
                "info",
                `Downloading ${i + 1}/${totalCount}: ${imageData.itemName}`,
                "Progress"
              );
            }

            await collectSelectedImages(
              categoryPreviewResults.category.toLowerCase(),
              imageData.letter,
              imageData.itemName,
              [imageData]
            );

            successCount++;
            downloaded = true;
            if (retry > 0) {
            } else {
            }
          } catch (error) {
            lastError = error;
          }
        }

        if (!downloaded) {
          failedItems.push({
            item: imageData.itemName,
            error: lastError.message,
          });
          console.error(
            `✗ Failed to download ${imageData.itemName} after 3 attempts:`,
            lastError
          );
        }

        // Small delay between downloads to be respectful
        if (i < selectedImagesList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (failedItems.length > 0) {
        // Store failed downloads for retry option
        const failedDownloadData = failedItems
          .map((failedItem) => {
            const originalImageData = selectedImagesList.find(
              (img) => img.itemName === failedItem.item
            );
            return originalImageData;
          })
          .filter(Boolean);

        setFailedDownloads(failedDownloadData);

        failedItems.forEach((item) =>
          console.log(`  - ${item.item}: ${item.error}`)
        );

        showNotification(
          failedItems.length < successCount ? "warning" : "error",
          `Downloaded ${successCount}/${totalCount} images. ${failedItems.length} failed. Check console for details.`,
          "Download Complete"
        );
      } else {
        setFailedDownloads([]);
        showNotification(
          "success",
          `Successfully downloaded all ${successCount}/${totalCount} images!`,
          "Download Complete"
        );
      }

      // Reset after successful download
      setCategoryPreviewResults(null);
      setCategorySelectedImages({});
      setCategoryForm({
        category: "",
        maxConcurrent: 3,
        letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      });
    } catch (error) {
      showNotification("error", "Download failed", "Error");
      console.error("Category download error:", error);
    }
  };

  const handleRetryFailedDownloads = async () => {
    if (failedDownloads.length === 0) {
      showNotification("info", "No failed downloads to retry");
      return;
    }

    try {
      showNotification(
        "info",
        `Retrying ${failedDownloads.length} failed downloads...`,
        "Retrying"
      );

      let successCount = 0;
      let stillFailed = [];

      for (let i = 0; i < failedDownloads.length; i++) {
        const imageData = failedDownloads[i];
        let downloaded = false;
        let lastError = null;

        // Try 3 times with longer delays for network issues
        for (let retry = 0; retry < 3 && !downloaded; retry++) {
          try {
            showNotification(
              "info",
              `Retry ${i + 1}/${failedDownloads.length}: ${
                imageData.itemName
              } (attempt ${retry + 1}/3)`,
              "Progress"
            );

            if (retry > 0) {
              // Longer delays for retry
              await new Promise((resolve) =>
                setTimeout(resolve, 3000 + retry * 2000)
              );
            }

            await collectSelectedImages(
              (categoryPreviewResults?.category || "flowers").toLowerCase(),
              imageData.letter,
              imageData.itemName,
              [imageData]
            );

            successCount++;
            downloaded = true;
          } catch (error) {
            lastError = error;
          }
        }

        if (!downloaded) {
          stillFailed.push(imageData);
          console.error(`✗ Still failed after retry: ${imageData.itemName}`);
        }

        // Longer delay between retry downloads
        if (i < failedDownloads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setFailedDownloads(stillFailed);

      if (stillFailed.length === 0) {
        showNotification(
          "success",
          `All ${failedDownloads.length} failed downloads now successful!`,
          "Retry Complete"
        );
      } else {
        showNotification(
          "warning",
          `${successCount}/${failedDownloads.length} retries successful. ${stillFailed.length} still failed.`,
          "Retry Complete"
        );
      }
    } catch (error) {
      showNotification("error", "Retry process failed", "Error");
      console.error("Retry error:", error);
    }
  };

  const tabs = [
    { id: "collect", label: "Collect Items", icon: Play },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start new image collection tasks and manage categories
        </p>
        {categoryStats && (
          <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center">
              <Database className="h-4 w-4 mr-1" />
              {categoryStats.totalCategories} categories
            </span>
            <span className="flex items-center">
              <Info className="h-4 w-4 mr-1" />
              {categoryStats.totalItems} total items
            </span>
            <span className="flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
              Ready for production-scale collection
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "collect" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Item Collection */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Collect Single Item
              </h3>
              <p className="text-sm text-gray-500">
                Collect images for a specific item
              </p>
            </div>

            <div className="card-body">
              <form onSubmit={handleCollectItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={collectForm.category}
                    onChange={(e) =>
                      setCollectForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select category</option>
                    {availableCategories.map((cat) => {
                      const categoryInfo = getCategoryInfo(cat);
                      return (
                        <option key={cat} value={cat}>
                          {categoryInfo?.icon} {categoryInfo?.name} (
                          {categoryInfo?.completeness}/26)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Letter
                  </label>
                  <select
                    value={collectForm.letter}
                    onChange={(e) =>
                      setCollectForm((prev) => ({
                        ...prev,
                        letter: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select letter</option>
                    {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Item Name
                  </label>
                  <select
                    value={collectForm.itemName}
                    onChange={(e) =>
                      setCollectForm((prev) => ({
                        ...prev,
                        itemName: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={!collectForm.category || !collectForm.letter || loadingCategoryDetails}
                  >
                    <option value="">
                      {loadingCategoryDetails
                        ? "Loading items..."
                        : !collectForm.category || !collectForm.letter
                        ? "Select category and letter first"
                        : availableItems.length === 0
                        ? "No items available"
                        : "Select item"}
                    </option>
                    {!loadingCategoryDetails && availableItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {collectForm.category && collectForm.letter && (
                    <p className="mt-1 text-xs text-gray-500">
                      {availableItems.length} items available for{" "}
                      {collectForm.category}/{collectForm.letter}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Target Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={collectForm.targetCount}
                    onChange={(e) =>
                      setCollectForm((prev) => ({
                        ...prev,
                        targetCount: parseInt(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePreviewItem}
                    disabled={loading}
                    className="w-full btn-secondary"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Preview & Choose Images
                      </>
                    )}
                  </button>

                  {/* Auto collect removed - use preview instead */}
                </div>
              </form>
            </div>
          </div>

          {/* Preview Results */}
          {previewResults && (
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    Choose Images to Collect
                  </h3>
                  <p className="text-sm text-gray-500">
                    {previewResults.totalImages} images found •{" "}
                    {selectedImages.size} selected
                  </p>
                </div>

                <div className="card-body">
                  <div className="max-h-96 overflow-y-auto mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewResults.images.map((image, index) => (
                        <div
                          key={index}
                          className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden ${
                            selectedImages.has(index)
                              ? "border-primary-500"
                              : "border-gray-200"
                          }`}
                          onClick={() => toggleImageSelection(index)}
                        >
                          <img
                            src={image.url}
                            alt={image.description}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                          />

                          {/* Source badge */}
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                              {image.source.toUpperCase()}
                            </span>
                          </div>

                          {/* Selection indicator */}
                          {selectedImages.has(index) && (
                            <div className="absolute top-2 right-2">
                              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* Image info on hover */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                            <div className="p-3 text-white text-xs">
                              <div>
                                {image.width}×{image.height}
                              </div>
                              {image.description && (
                                <div className="truncate mt-1">
                                  {image.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          setSelectedImages(
                            new Set(previewResults.images.map((_, i) => i))
                          )
                        }
                        className="btn-secondary text-sm"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedImages(new Set())}
                        className="btn-secondary text-sm"
                      >
                        Clear Selection
                      </button>
                    </div>

                    <button
                      onClick={handleCollectSelected}
                      disabled={
                        selectedImages.size === 0 || loading || !servicesReady
                      }
                      className="btn-primary"
                      title={
                        !servicesReady
                          ? "Services are initializing, please wait..."
                          : ""
                      }
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Collecting...
                        </>
                      ) : !servicesReady ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Initializing Services...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Collect Selected ({selectedImages.size})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Collection */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Collect Entire Category
              </h3>
              <p className="text-sm text-gray-500">
                Collect images for all items in a category
              </p>
            </div>

            <div className="card-body">
              <form onSubmit={handlePreviewCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={categoryForm.category}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select category</option>
                    {availableCategories.map((cat) => {
                      const categoryInfo = getCategoryInfo(cat);
                      return (
                        <option key={cat} value={cat}>
                          {categoryInfo?.icon} {categoryInfo?.name} (
                          {categoryInfo?.completeness}/26)
                        </option>
                      );
                    })}
                  </select>
                  {categoryForm.category && (
                    <p className="mt-1 text-xs text-gray-500">
                      {Object.values(
                        getCategoryInfo(categoryForm.category)?.items || {}
                      ).reduce((total, items) => total + items.length, 0)}{" "}
                      items in this category
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching Category...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Preview Category Images
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Category Preview Results */}
          {categoryPreviewResults && (
            <div className="lg:col-span-3">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    Choose Images for {categoryPreviewResults.categoryName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {categoryPreviewResults.totalImagesFound} images found
                    across {categoryPreviewResults.items.length} items (searched{" "}
                    {categoryPreviewResults.searchedItems}/
                    {categoryPreviewResults.totalItems}) •{" "}
                    {Object.keys(categorySelectedImages).length} selected
                  </p>
                </div>

                <div className="card-body">
                  <div className="max-h-96 overflow-y-auto mb-6">
                    <div className="space-y-6">
                      {categoryPreviewResults.items
                        .sort((a, b) => a.itemName.localeCompare(b.itemName))
                        .map((item) => (
                          <div
                            key={item.itemName}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-sm">
                                  {item.itemName}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {item.letter} • {item.results.length} images
                                  found
                                </p>
                              </div>
                              {categorySelectedImages[item.itemName] !==
                                undefined && (
                                <div className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                                  Selected
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                              {item.results.map((image, imageIndex) => (
                                <div
                                  key={imageIndex}
                                  className={`relative group cursor-pointer border-2 rounded overflow-hidden ${
                                    categorySelectedImages[item.itemName] ===
                                    imageIndex
                                      ? "border-primary-500 ring-2 ring-primary-200"
                                      : "border-gray-200"
                                  }`}
                                  onClick={() =>
                                    toggleCategoryImageSelection(
                                      item.itemName,
                                      imageIndex
                                    )
                                  }
                                >
                                  <img
                                    src={image.url}
                                    alt={image.description}
                                    className="w-full h-16 object-cover"
                                    loading="lazy"
                                  />

                                  {/* Source badge */}
                                  <div className="absolute top-1 left-1">
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-800 text-white">
                                      {image.source.charAt(0).toUpperCase()}
                                    </span>
                                  </div>

                                  {/* Selection indicator */}
                                  {categorySelectedImages[item.itemName] ===
                                    imageIndex && (
                                    <div className="absolute top-1 right-1">
                                      <div className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const autoSelections = {};
                          categoryPreviewResults.items.forEach((item) => {
                            if (item.results.length > 0) {
                              autoSelections[item.itemName] = 0; // Select first image for each item
                            }
                          });
                          setCategorySelectedImages(autoSelections);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Auto Select First
                      </button>
                      <button
                        onClick={() => setCategorySelectedImages({})}
                        className="btn-secondary text-sm"
                      >
                        Clear All
                      </button>
                      {failedDownloads.length > 0 && (
                        <button
                          onClick={handleRetryFailedDownloads}
                          className="btn-warning text-sm"
                          disabled={loading}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry Failed ({failedDownloads.length})
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleCollectCategorySelected}
                      disabled={
                        Object.keys(categorySelectedImages).length === 0 ||
                        loading
                      }
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Download Selected (
                          {Object.keys(categorySelectedImages).length})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review tab removed - use preview for manual selection */}
      {/* Progress tab moved to dedicated /progress route */}

      {/* Search tab removed - use preview in collect tab instead */}

      {/* Manage Data tab removed - moved to dedicated /manage-category page */}
    </div>
  );
};

export default Collections;
