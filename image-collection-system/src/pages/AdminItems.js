import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Check,
  X,
  Eye,
  Search,
  Filter,
  Star,
  AlertCircle,
  Image as ImageIcon,
  Calendar,
  User,
} from "lucide-react";

const AdminItems = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Use V2 API endpoints
      const [itemsResponse, categoriesResponse] = await Promise.all([
        axios.get("http://localhost:3003/api/v2/items/", {
          params: {
            status: statusFilter === "all" ? undefined : statusFilter,
            categoryId: categoryFilter === "all" ? undefined : categoryFilter,
            limit: 50,
          },
        }),
        axios.get("http://localhost:3003/api/v2/categories/"),
      ]);

      // Transform V2 items response
      const items = (
        itemsResponse.data.results ||
        itemsResponse.data ||
        []
      ).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.categoryName || item.categoryId,
        letter: item.letter,
        status: item.status || "approved", // V2 uses 'published' vs 'approved'
        qualityScore: item.metadata?.qualityScore,
        image: item.image
          ? { thumbnail: item.image.thumbnail, url: item.image.url }
          : null,
        createdBy: { firstName: "System", lastName: "User" },
        createdAt: item.createdAt,
      }));

      // Transform V2 categories response
      const categories = (
        categoriesResponse.data.results ||
        categoriesResponse.data ||
        []
      ).map((category) => ({
        id: category.id,
        name: category.name,
      }));

      setItems(items);
      setCategories(categories);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleItemAction = async (itemId, action) => {
    try {
      await axios.post(`/admin/items/${itemId}/${action}`);
      await fetchData();
      setSelectedItems(new Set());
    } catch (err) {
      console.error(`Failed to ${action} item:`, err);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.size === 0) return;

    const confirmMessage =
      action === "approve"
        ? `Approve ${selectedItems.size} items?`
        : `Reject ${selectedItems.size} items?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          axios.post(`/admin/items/${itemId}/${action}`)
        )
      );
      await fetchData();
      setSelectedItems(new Set());
    } catch (err) {
      console.error(`Failed to ${action} items:`, err);
    }
  };

  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItems = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      draft: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  const getQualityStars = (score) => {
    const stars = Math.round((score / 10) * 5);
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < stars ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-gray-500">({score}/10)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Content Review
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and moderate content items awaiting approval
          </p>
        </div>
        {selectedItems.size > 0 && (
          <div className="mt-4 flex space-x-2 md:mt-0 md:ml-4">
            <button
              onClick={() => handleBulkAction("approve")}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve ({selectedItems.size})
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-4 w-4 mr-1" />
              Reject ({selectedItems.size})
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Items ({filteredItems.length})
            </h3>
            {filteredItems.length > 0 && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.size === filteredItems.length &&
                    filteredItems.length > 0
                  }
                  onChange={selectAllItems}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Select all</span>
              </label>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />

                  <div className="flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image.thumbnail || item.image.url}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.category} • {item.letter}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    <div className="mt-2">
                      {item.qualityScore && getQualityStars(item.qualityScore)}
                    </div>

                    <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {item.createdBy?.firstName} {item.createdBy?.lastName}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleItemAction(item.id, "approve")}
                          className="p-2 text-green-600 hover:text-green-800"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleItemAction(item.id, "reject")}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !error && (
          <div className="p-6 text-center text-gray-500">
            No items found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminItems;
