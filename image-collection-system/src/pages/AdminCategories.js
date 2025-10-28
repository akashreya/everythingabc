import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Use V2 categories endpoint with direct URL
      const response = await axios.get(
        "http://localhost:3003/api/v2/categories/"
      );

      // Transform V2 response to match expected format
      const categories = response.data.results || response.data || [];
      const transformedCategories = categories.map((category) => ({
        id: category.id,
        name: category.name,
        status: category.status || "active",
        icon: category.icon || "📁",
        items: { total: category.metadata?.totalItems || 0 },
        lastModified:
          category.lastModified ||
          category.createdAt ||
          new Date().toISOString(),
      }));

      setCategories(transformedCategories);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const updateCategoryStatus = async (categoryId, newStatus) => {
    try {
      await axios.patch(`/admin/categories/${categoryId}`, {
        status: newStatus,
      });
      await fetchCategories();
    } catch (err) {
      console.error("Failed to update category status:", err);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this category? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await axios.delete(`/admin/categories/${categoryId}`);
      await fetchCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || category.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "draft":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "inactive":
        return <EyeOff className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[status] || "bg-red-100 text-red-800"
        }`}
      >
        {status}
      </span>
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
            Category Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage content categories and their configuration
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </button>
        </div>
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
                  placeholder="Search categories..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Categories ({filteredCategories.length})
          </h3>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchCategories}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <li key={category.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-lg">{category.icon || "📁"}</span>
                      </div>
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {category.name}
                        </p>
                        <div className="ml-2">
                          {getStatusBadge(category.status)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>ID: {category.id}</span>
                        <span className="mx-2">•</span>
                        <span>{category.items?.total || 0} items</span>
                        <span className="mx-2">•</span>
                        <span>
                          Modified{" "}
                          {new Date(category.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateCategoryStatus(
                          category.id,
                          category.status === "active" ? "inactive" : "active"
                        )
                      }
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        category.status === "active"
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {category.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button className="p-1 rounded-md text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {filteredCategories.length === 0 && !error && (
          <div className="p-6 text-center text-gray-500">
            No categories found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
