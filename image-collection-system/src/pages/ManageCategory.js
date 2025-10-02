import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Save,
  X,
  Eye,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Upload,
  Download,
  FileText,
  Filter,
  Search,
  Layers,
  FolderOpen,
} from "lucide-react";
import { useApi } from "../contexts/ApiContext";
import { showNotification } from "../components/Common/Notification";
import categoriesData from "../data/phase1-categories-complete.json";

const ManageCategory = () => {
  const {
    seedCategories,
    clearCategories,
    createItem,
    updateItem,
    deleteItem,
    getItemsByLetter,
    updateItemStatus,
    bulkUpdateStatus,
    getItemsPendingReview,
    publishItem,
    unpublishItem,
    bulkPublish,
    updatePublishingStatus,
    bulkUpdatePublishingStatus,
    exportCSV,
    downloadImportTemplate,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    loading,
  } = useApi();

  const [activeTab, setActiveTab] = useState("manage");
  const [fetchedCategories, setFetchedCategories] = useState(Object.values(categoriesData.categories));
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemTags, setNewItemTags] = useState("");
  const [newItemDifficulty, setNewItemDifficulty] = useState(1);
  const [categoryStats, setCategoryStats] = useState(null);
  const [letterItems, setLetterItems] = useState([]); // Real items from backend
  const [loadingItems, setLoadingItems] = useState(false);

  // Publishing filters
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, complete
  const [publishingFilter, setPublishingFilter] = useState("all"); // all, draft, review, published
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  // Publishing tab state
  const [pendingReviewItems, setPendingReviewItems] = useState([]);
  const [publishingCategoryFilter, setPublishingCategoryFilter] = useState(null);
  const [selectedPublishingItems, setSelectedPublishingItems] = useState([]);
  const [loadingPublishing, setLoadingPublishing] = useState(false);

  // Import/Export state
  const [exportOptions, setExportOptions] = useState({
    categoryId: null,
    publishingStatus: null,
    collectionStatus: null,
    includeMetadata: false
  });
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Categories Management state
  const [categoriesList, setCategoriesList] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '',
    group: 'educational',
    priority: 50
  });
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const availableCategories = fetchedCategories.map((cat) => cat.name);

  useEffect(() => {
    // Calculate category statistics
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
    };
    setCategoryStats(stats);
  }, [fetchedCategories]);

  const getCategoryInfo = useCallback(
    (categoryName) => {
      return fetchedCategories.find((cat) => cat.name === categoryName) || null;
    },
    [fetchedCategories]
  );

  const handleSeedCategories = async (categories = null) => {
    try {
      const result = await seedCategories(categories);

      showNotification(
        "success",
        `Seeded ${result.result.totalItems} items across ${result.result.totalCategories} categories`,
        "Categories Seeded"
      );
    } catch (error) {
      showNotification("error", "Failed to seed categories", "Error");
    }
  };

  const handleClearCategories = async (category = null) => {
    const confirmMessage = category
      ? `Are you sure you want to clear the ${category} category?`
      : "Are you sure you want to clear ALL categories?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await clearCategories(category);

      showNotification(
        "warning",
        `Cleared ${result.result.deletedCount} items`,
        "Categories Cleared"
      );
    } catch (error) {
      showNotification("error", "Failed to clear categories", "Error");
    }
  };

  const handleSelectCategory = (categoryName) => {
    const category = getCategoryInfo(categoryName);
    setSelectedCategory(categoryName);
    setSelectedCategoryId(category?.id || null);
    setSelectedLetter("");
    setEditMode(false);
    setSelectedItems([]);
    setLetterItems([]);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemDescription.trim() || !selectedCategory || !selectedLetter || !selectedCategoryId) {
      showNotification("error", "Please enter item name, description, and select letter");
      return;
    }

    try {
      const itemData = {
        letter: selectedLetter,
        name: newItemName.trim(),
        description: newItemDescription.trim(),
        tags: newItemTags.split(',').map(t => t.trim()).filter(t => t),
        difficulty: newItemDifficulty,
      };

      const result = await createItem(selectedCategoryId, itemData);

      if (result.success) {
        showNotification(
          "success",
          `Item "${newItemName}" added successfully`,
          "Item Created"
        );
        // Clear form
        setNewItemName("");
        setNewItemDescription("");
        setNewItemTags("");
        setNewItemDifficulty(1);
        // Reload items for this letter
        await loadItemsForLetter(selectedCategoryId, selectedLetter);
      } else {
        showNotification("error", result.message || "Failed to add item");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      showNotification(
        "error",
        error.response?.data?.message || error.message || "Failed to add item"
      );
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditMode(true);
    // TODO: Implement edit modal/form
    showNotification("info", "Edit functionality coming soon");
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) {
      return;
    }

    try {
      const result = await deleteItem(selectedCategoryId, item.id);

      if (result.success) {
        showNotification("success", `Item "${item.name}" deleted successfully`);
        // Reload items for this letter
        await loadItemsForLetter(selectedCategoryId, selectedLetter);
      } else {
        showNotification("error", result.message || "Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showNotification(
        "error",
        error.response?.data?.message || error.message || "Failed to delete item"
      );
    }
  };

  const handleChangePublishingStatus = async (item, newStatus) => {
    try {
      // Map publishing status to backend status
      const backendStatus = newStatus === 'published' ? 'approved' : 'pending';

      const result = await updateItemStatus(selectedCategoryId, item.id, backendStatus);

      if (result.success) {
        showNotification("success", `Status changed to "${newStatus}"`);
        // Reload items for this letter
        await loadItemsForLetter(selectedCategoryId, selectedLetter);
      } else {
        showNotification("error", result.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification(
        "error",
        error.response?.data?.message || error.message || "Failed to update status"
      );
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedItems.length === 0) {
      showNotification("error", "No items selected");
      return;
    }

    if (!window.confirm(`Change publishing status of ${selectedItems.length} items to "${newStatus}"?`)) {
      return;
    }

    try {
      // Map publishing status to backend status
      const backendStatus = newStatus === 'published' ? 'approved' : 'pending';

      // Extract item IDs from selected items
      const itemIds = selectedItems.map(item => item.id);

      const result = await bulkUpdateStatus(selectedCategoryId, itemIds, backendStatus);

      if (result.success) {
        showNotification("success", `Bulk update completed for ${selectedItems.length} items`);
        setSelectedItems([]);
        // Reload items for this letter
        await loadItemsForLetter(selectedCategoryId, selectedLetter);
      } else {
        showNotification("error", result.message || "Failed to bulk update");
      }
    } catch (error) {
      console.error("Error bulk updating:", error);
      showNotification(
        "error",
        error.response?.data?.message || error.message || "Failed to bulk update"
      );
    }
  };

  // Load items for a letter from backend
  const loadItemsForLetter = async (categoryId, letter) => {
    if (!categoryId || !letter) return;

    setLoadingItems(true);
    try {
      const result = await getItemsByLetter(categoryId, letter);
      if (result.success && result.data) {
        setLetterItems(result.data.items || []);
      } else {
        setLetterItems([]);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      setLetterItems([]);
      showNotification("error", "Failed to load items for this letter");
    } finally {
      setLoadingItems(false);
    }
  };

  // Load items when letter changes
  useEffect(() => {
    if (selectedLetter && selectedCategoryId) {
      loadItemsForLetter(selectedCategoryId, selectedLetter);
    } else {
      setLetterItems([]);
    }
  }, [selectedLetter, selectedCategoryId]);

  const getItemsForLetter = (categoryName, letter) => {
    const category = getCategoryInfo(categoryName);
    if (!category || !category.items || !category.items[letter]) {
      return [];
    }
    return category.items[letter] || [];
  };

  const getFilteredItems = (items) => {
    return items.filter(item => {
      // Get real status from backend item
      const itemStatus = item.quality?.status || 'pending';
      const collectionStatus = item.image ? 'complete' : 'pending';

      // Map backend status to publishing status
      const publishingStatus = itemStatus === 'approved' ? 'published' :
                               itemStatus === 'rejected' ? 'draft' : 'review';

      const matchesStatus = statusFilter === "all" || collectionStatus === statusFilter;
      const matchesPublishing = publishingFilter === "all" || publishingStatus === publishingFilter;
      const matchesSearch = searchQuery === "" ||
                           item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesPublishing && matchesSearch;
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock, label: "Pending" },
      complete: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle, label: "Complete" },
    };
    return badges[status] || badges.pending;
  };

  const getPublishingBadge = (status) => {
    const badges = {
      draft: { color: "bg-gray-100 text-gray-800 border-gray-300", icon: Edit, label: "Draft" },
      review: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Eye, label: "Review" },
      published: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle, label: "Published" },
    };
    return badges[status] || badges.draft;
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(si => si.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Load items pending review
  const loadPendingReviewItems = async () => {
    setLoadingPublishing(true);
    try {
      const result = await getItemsPendingReview(publishingCategoryFilter);
      if (result.success && result.data) {
        setPendingReviewItems(result.data.items || []);
      } else {
        setPendingReviewItems([]);
      }
    } catch (error) {
      console.error("Error loading pending review items:", error);
      showNotification("error", "Failed to load pending review items");
      setPendingReviewItems([]);
    } finally {
      setLoadingPublishing(false);
    }
  };

  // Load pending items when publishing tab is active
  useEffect(() => {
    if (activeTab === "publishing") {
      loadPendingReviewItems();
    }
  }, [activeTab, publishingCategoryFilter]);

  // Publishing actions
  const handlePublishItem = async (item) => {
    try {
      const result = await publishItem(item.id);
      if (result.success) {
        showNotification("success", `"${item.name}" published successfully`);
        loadPendingReviewItems();
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || "Failed to publish item");
    }
  };

  const handleUnpublishItem = async (item) => {
    try {
      const result = await unpublishItem(item.id);
      if (result.success) {
        showNotification("success", `"${item.name}" unpublished successfully`);
        loadPendingReviewItems();
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || "Failed to unpublish item");
    }
  };

  const handleBulkPublishItems = async () => {
    if (selectedPublishingItems.length === 0) {
      showNotification("error", "No items selected");
      return;
    }

    if (!window.confirm(`Publish ${selectedPublishingItems.length} items?`)) {
      return;
    }

    try {
      const itemIds = selectedPublishingItems.map(item => item.id);
      const result = await bulkPublish(itemIds);
      if (result.success) {
        showNotification("success", `${selectedPublishingItems.length} items published successfully`);
        setSelectedPublishingItems([]);
        loadPendingReviewItems();
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || "Failed to bulk publish");
    }
  };

  const handleChangeItemPublishingStatus = async (item, newStatus) => {
    try {
      const result = await updatePublishingStatus(item.id, newStatus);
      if (result.success) {
        showNotification("success", `Status changed to "${newStatus}"`);
        loadPendingReviewItems();
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || "Failed to update status");
    }
  };

  const togglePublishingItemSelection = (item) => {
    setSelectedPublishingItems(prev => {
      const isSelected = prev.some(si => si.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Import/Export handlers
  const handleExportAll = async () => {
    try {
      await exportCSV(exportOptions);
      showNotification("success", "Export started - file will download shortly");
    } catch (error) {
      showNotification("error", "Failed to export data");
    }
  };

  const handleExportSelected = async () => {
    if (!exportOptions.categoryId) {
      showNotification("error", "Please select a category from the dropdown");
      return;
    }

    try {
      await exportCSV(exportOptions);
      showNotification("success", "Export started - file will download shortly");
    } catch (error) {
      showNotification("error", "Failed to export category");
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadImportTemplate();
      showNotification("success", "Template download started");
    } catch (error) {
      showNotification("error", "Failed to download template");
    }
  };

  // Categories Management handlers
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const result = await getAllCategories();
      if (result.success && result.data) {
        setCategoriesList(result.data.categories || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      showNotification("error", "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      description: '',
      icon: '',
      color: '',
      group: 'educational',
      priority: 50
    });
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      group: category.group || 'educational',
      priority: category.priority || 50
    });
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name || !categoryFormData.description || !categoryFormData.icon || !categoryFormData.color) {
      showNotification("error", "Please fill in all required fields");
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const result = await updateCategory(editingCategory.id, categoryFormData);
        if (result.success) {
          showNotification("success", "Category updated successfully");
          setShowCategoryForm(false);
          loadCategories();
        }
      } else {
        // Create new category
        const result = await createCategory(categoryFormData);
        if (result.success) {
          showNotification("success", "Category created successfully");
          setShowCategoryForm(false);
          loadCategories();
        }
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || `Failed to ${editingCategory ? 'update' : 'create'} category`);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This will delete all items in this category.`)) {
      return;
    }

    try {
      const result = await deleteCategory(category.id);
      if (result.success) {
        showNotification("success", `Category "${category.name}" deleted successfully`);
        loadCategories();
      }
    } catch (error) {
      showNotification("error", error.response?.data?.message || "Failed to delete category");
    }
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  // Load categories when categories tab is active
  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [activeTab]);

  // Filter categories based on search query
  const filteredCategories = categoriesList.filter(category => {
    if (!categorySearchQuery) return true;

    const query = categorySearchQuery.toLowerCase();
    return (
      category.name?.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query) ||
      category.id?.toLowerCase().includes(query) ||
      category.group?.toLowerCase().includes(query)
    );
  });

  const tabs = [
    { id: "manage", label: "Manage Content", icon: Edit },
    { id: "publishing", label: "Publishing", icon: Send },
    { id: "import-export", label: "Import/Export", icon: Upload },
    { id: "categories", label: "Categories", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Category</h1>
        <p className="mt-1 text-sm text-gray-500">
          Content Management System - Manage categories, items, and publishing workflow
        </p>
        {categoryStats && (
          <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center">
              <Database className="h-4 w-4 mr-1" />
              {categoryStats.totalCategories} categories
            </span>
            <span className="flex items-center">
              <ImageIcon className="h-4 w-4 mr-1" />
              {categoryStats.totalItems} total items
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

      {/* Manage Content Tab */}
      {activeTab === "manage" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Select Category
              </h3>
              <p className="text-sm text-gray-500">
                Choose a category to manage
              </p>
            </div>

            <div className="card-body">
              <div className="space-y-2">
                {fetchedCategories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleSelectCategory(category.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedCategory === category.name
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.completeness}/26 letters •{" "}
                            {Object.values(category.items).reduce(
                              (total, items) => total + items.length,
                              0
                            )}{" "}
                            items
                          </div>
                        </div>
                      </div>
                      {selectedCategory === category.name && (
                        <CheckCircle className="h-5 w-5 text-primary-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Letter & Items Management */}
          {selectedCategory && (
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Manage Items - {selectedCategory}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Select a letter and manage items
                      </p>
                    </div>
                    {selectedItems.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
                        <button onClick={() => handleBulkStatusChange("review")} className="btn-secondary text-xs">
                          Mark as Review
                        </button>
                        <button onClick={() => handleBulkStatusChange("published")} className="btn-primary text-xs">
                          Publish
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-body space-y-4">
                  {/* Letter Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Letter
                    </label>
                    <div className="grid grid-cols-13 gap-2">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
                        const itemCount = getItemsForLetter(selectedCategory, letter).length;
                        return (
                          <button
                            key={letter}
                            onClick={() => setSelectedLetter(letter)}
                            className={`p-2 text-center rounded border-2 transition-all ${
                              selectedLetter === letter
                                ? "border-primary-500 bg-primary-50 text-primary-700 font-bold"
                                : itemCount > 0
                                ? "border-green-300 bg-green-50 hover:border-green-400"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            title={`${letter} - ${itemCount} items`}
                          >
                            <div className="text-sm font-medium">{letter}</div>
                            {itemCount > 0 && (
                              <div className="text-xs text-gray-500">{itemCount}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Items List with Filters */}
                  {selectedLetter && (
                    <div>
                      {/* Filters Bar */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                            <div className="relative">
                              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Collection Status</label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="all">All Status</option>
                              <option value="pending">Pending</option>
                              <option value="complete">Complete</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Publishing Status</label>
                            <select
                              value={publishingFilter}
                              onChange={(e) => setPublishingFilter(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="all">All Status</option>
                              <option value="draft">Draft</option>
                              <option value="review">Review</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Add New Item Form */}
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Item</h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <input
                                type="text"
                                placeholder="Item name *"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleAddItem();
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <select
                                value={newItemDifficulty}
                                onChange={(e) => setNewItemDifficulty(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              >
                                <option value={1}>Easy</option>
                                <option value={2}>Medium</option>
                                <option value={3}>Hard</option>
                              </select>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Description (required)"
                            value={newItemDescription}
                            onChange={(e) => setNewItemDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Tags (comma-separated, optional)"
                            value={newItemTags}
                            onChange={(e) => setNewItemTags(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <button
                            onClick={handleAddItem}
                            className="btn-primary w-full"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item (Status: Pending, Publishing: Draft)
                          </button>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Items for Letter {selectedLetter}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {loadingItems ? "Loading..." : `${getFilteredItems(letterItems).length} items`}
                        </span>
                      </div>

                      {loadingItems ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary-500 animate-spin" />
                          <p className="text-sm text-gray-500">Loading items...</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {getFilteredItems(letterItems).map((item, index) => {
                            // Get real statuses from backend
                            const itemStatus = item.quality?.status || 'pending';
                            const collectionStatus = item.image ? 'complete' : 'pending';
                            const publishingStatus = itemStatus === 'approved' ? 'published' :
                                                     itemStatus === 'rejected' ? 'draft' : 'review';

                            const statusBadge = getStatusBadge(collectionStatus);
                            const publishingBadge = getPublishingBadge(publishingStatus);
                            const StatusIcon = statusBadge.icon;
                            const PublishingIcon = publishingBadge.icon;

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.some(si => si.id === item.id)}
                                  onChange={() => toggleItemSelection(item)}
                                  className="h-4 w-4 text-primary-600 rounded"
                                />
                                <span className="text-gray-600">{index + 1}.</span>
                                <span className="font-medium text-gray-900">{item.name}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusBadge.label}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${publishingBadge.color}`}>
                                  <PublishingIcon className="h-3 w-3 mr-1" />
                                  {publishingBadge.label}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="relative group">
                                  <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Send className="h-4 w-4" />
                                  </button>
                                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                    <button onClick={() => handleChangePublishingStatus(item, "draft")} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Draft</button>
                                    <button onClick={() => handleChangePublishingStatus(item, "review")} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Review</button>
                                    <button onClick={() => handleChangePublishingStatus(item, "published")} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Published</button>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit item"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                          {getFilteredItems(letterItems).length === 0 && !loadingItems && (
                            <div className="text-center py-8 text-gray-500">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">No items match the current filters</p>
                              <p className="text-xs">Try adjusting your filters or add new items</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedLetter && (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">Select a letter to view and manage items</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedCategory && (
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-body text-center py-12">
                  <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Category
                  </h3>
                  <p className="text-sm text-gray-500">
                    Choose a category from the list to start managing items
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publishing Tab */}
      {activeTab === "publishing" && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Publishing Workflow</h3>
                <p className="text-sm text-gray-500">Review and publish items across all categories</p>
              </div>
              {selectedPublishingItems.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{selectedPublishingItems.length} selected</span>
                  <button onClick={handleBulkPublishItems} className="btn-primary text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Publish Selected
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card-body">
            {/* Category Filter */}
            <div className="mb-4 flex items-center space-x-3">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={publishingCategoryFilter || ""}
                onChange={(e) => setPublishingCategoryFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Categories</option>
                {fetchedCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <button
                onClick={() => loadPendingReviewItems()}
                className="btn-secondary text-sm"
                disabled={loadingPublishing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingPublishing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Items List */}
            {loadingPublishing ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary-500 animate-spin" />
                <p className="text-sm text-gray-500">Loading items...</p>
              </div>
            ) : pendingReviewItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-sm text-gray-500">
                  No items pending review{publishingCategoryFilter ? " in this category" : ""}
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Items Pending Review ({pendingReviewItems.length})
                  </h4>
                  <button
                    onClick={() => {
                      if (selectedPublishingItems.length === pendingReviewItems.length) {
                        setSelectedPublishingItems([]);
                      } else {
                        setSelectedPublishingItems(pendingReviewItems);
                      }
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {selectedPublishingItems.length === pendingReviewItems.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingReviewItems.map((item, index) => {
                    const collectionStatus = item.image ? 'complete' : 'pending';
                    const publishingStatus = item.quality?.status === 'approved' ? 'published' :
                                             item.quality?.status === 'rejected' ? 'draft' : 'review';
                    const statusBadge = getStatusBadge(collectionStatus);
                    const publishingBadge = getPublishingBadge(publishingStatus);
                    const StatusIcon = statusBadge.icon;
                    const PublishingIcon = publishingBadge.icon;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedPublishingItems.some(si => si.id === item.id)}
                            onChange={() => togglePublishingItemSelection(item)}
                            className="h-4 w-4 text-primary-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <span className="text-xs text-gray-500">
                                {item.categoryName} / {item.letter}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${publishingBadge.color}`}>
                                <PublishingIcon className="h-3 w-3 mr-1" />
                                {publishingBadge.label}
                              </span>
                              {item.imageCount && (
                                <span className="text-xs text-gray-500">
                                  {item.imageCount} images
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Status Change Dropdown */}
                          <div className="relative group">
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                              <Send className="h-4 w-4" />
                            </button>
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                onClick={() => handleChangeItemPublishingStatus(item, "draft")}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                              >
                                <Edit className="h-3 w-3 inline mr-1" />
                                Move to Draft
                              </button>
                              <button
                                onClick={() => handleChangeItemPublishingStatus(item, "review")}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                              >
                                <Eye className="h-3 w-3 inline mr-1" />
                                Keep in Review
                              </button>
                              <button
                                onClick={() => handleChangeItemPublishingStatus(item, "published")}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-green-600"
                              >
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Publish
                              </button>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          {collectionStatus === 'complete' && (
                            <button
                              onClick={() => handlePublishItem(item)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Publish item"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {publishingStatus === 'published' && (
                            <button
                              onClick={() => handleUnpublishItem(item)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                              title="Unpublish item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import/Export Tab */}
      {activeTab === "import-export" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CSV Import */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">CSV Import</h3>
              <p className="text-sm text-gray-500">Bulk create items from CSV file</p>
            </div>
            <div className="card-body text-center py-12">
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Items</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV file to create multiple items at once
              </p>
              <button className="btn-primary mb-2" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </button>
              <div className="mt-4">
                <button onClick={handleDownloadTemplate} className="btn-secondary text-sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-4">CSV Import coming soon</p>
            </div>
          </div>

          {/* CSV Export */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">CSV Export</h3>
              <p className="text-sm text-gray-500">Export category data for backup</p>
            </div>
            <div className="card-body">
              <Download className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">Export Data</h3>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Download your category data as CSV
              </p>

              {/* Export Options */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Selection
                  </label>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Category</label>
                      <select
                        value={exportOptions.categoryId || ''}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, categoryId: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">All Categories</option>
                        {fetchedCategories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.id || cat.name.toLowerCase()}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter Options
                  </label>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Publishing Status</label>
                      <select
                        value={exportOptions.publishingStatus || ''}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, publishingStatus: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">All</option>
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="published">Published</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Collection Status</label>
                      <select
                        value={exportOptions.collectionStatus || ''}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, collectionStatus: e.target.value || null }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="complete">Complete</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="includeMetadata"
                        checked={exportOptions.includeMetadata}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="includeMetadata" className="ml-2 text-sm text-gray-700">
                        Include metadata (status, dates, image count)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleExportAll}
                  className="btn-primary w-full"
                  disabled={exportOptions.categoryId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportOptions.categoryId ? 'Select "All Categories" to export all' : 'Export with Filters'}
                </button>
                <button
                  onClick={handleExportSelected}
                  className="btn-secondary w-full"
                  disabled={!exportOptions.categoryId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportOptions.categoryId
                    ? `Export ${fetchedCategories.find(c => (c.id || c.name.toLowerCase()) === exportOptions.categoryId)?.name || 'Category'}`
                    : 'Select a category to export'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Management Tab */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">All Categories</h3>
                    <p className="text-sm text-gray-500">Manage your content categories</p>
                  </div>
                  <button
                    onClick={handleCreateCategory}
                    className="btn-primary"
                    disabled={showCategoryForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Category
                  </button>
                </div>
              </div>

              <div className="card-body">
                {loadingCategories ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Loading categories...</p>
                  </div>
                ) : categoriesList.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500 mb-4">No categories found</p>
                    <button onClick={handleCreateCategory} className="btn-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Category
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search Box */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="Search categories by name, description, group..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {categorySearchQuery && (
                          <button
                            onClick={() => setCategorySearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {categorySearchQuery && (
                        <p className="text-xs text-gray-500 mt-2">
                          Found {filteredCategories.length} of {categoriesList.length} categories
                        </p>
                      )}
                    </div>

                    {filteredCategories.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm text-gray-500 mb-2">No categories match your search</p>
                        <button
                          onClick={() => setCategorySearchQuery('')}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Icon
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Group
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Items
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCategories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-2xl">
                              {category.icon}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{category.name}</div>
                              <div className="text-xs text-gray-500">{category.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-700 max-w-xs truncate">
                                {category.description}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {category.group || 'educational'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {category.metadata?.totalItems || 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditCategory(category)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit category"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete category"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Create/Edit Form */}
          {showCategoryForm && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingCategory ? 'Update category information' : 'Add a new category'}
                </p>
              </div>

              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="e.g., Animals"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    rows="3"
                    placeholder="Brief description of the category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (Emoji) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.icon}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="🐾"
                    maxLength="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="from-blue-400 to-blue-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tailwind gradient or color</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group
                  </label>
                  <select
                    value={categoryFormData.group}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, group: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="educational">Educational</option>
                    <option value="nature-science">Nature & Science</option>
                    <option value="everyday-objects">Everyday Objects</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={categoryFormData.priority}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">1-100 (higher = appears first)</p>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={handleSaveCategory}
                    className="flex-1 btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingCategory ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelCategoryForm}
                    className="flex-1 btn-secondary"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageCategory;
