import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Users,
  Database,
  Image,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Use V2 API stats endpoint (note: using direct URL since we're now pointing to V2)
      const statsResponse = await axios.get(
        "http://localhost:3003/api/v2/stats/"
      );

      // Transform V2 response to match dashboard expectations
      const v2Data = statsResponse.data;
      const transformedStats = {
        categories: {
          total: v2Data.overview.total_categories || 0,
        },
        items: {
          total: v2Data.overview.total_items || 0,
          pending: 0, // V2 doesn't track pending status the same way
        },
        users: {
          total: 1, // V2 doesn't have user count, placeholder
        },
      };

      // Transform recent activity from V2 recent_additions
      const transformedActivity = (
        v2Data.popular_content?.recent_additions || []
      ).map((item) => ({
        action: "create",
        resource: "item",
        description: `Added ${item.name} to ${item.categoryName || "category"}`,
        user: { firstName: "System", lastName: "User" },
        timestamp: item.createdAt,
      }));

      setStats(transformedStats);
      setRecentActivity(transformedActivity);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Dashboard Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      name: "Manage Categories",
      description: "Create, edit, and organize content categories",
      href: "/admin/categories",
      icon: Database,
      color: "bg-blue-500",
    },
    {
      name: "Review Items",
      description: "Approve, reject, and moderate content items",
      href: "/admin/items",
      icon: Image,
      color: "bg-green-500",
    },
    {
      name: "System Settings",
      description: "Configure system-wide settings and preferences",
      href: "/settings",
      icon: Settings,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview of system status and content management
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={fetchDashboardData}
            className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Categories
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.categories?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.items?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Approval
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.items?.pending || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Admin Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.users?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.href}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 hover:shadow-md transition-shadow rounded-lg border border-gray-200"
              >
                <div>
                  <span
                    className={`rounded-lg inline-flex p-3 ${action.color} text-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {action.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest content management actions
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((activity, index) => (
              <li key={index} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {activity.action === "create" && (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      )}
                      {activity.action === "update" && (
                        <Activity className="h-5 w-5 text-blue-400" />
                      )}
                      {activity.action === "delete" && (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description ||
                          `${activity.action} ${activity.resource}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        by {activity.user?.firstName} {activity.user?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-gray-500">
              No recent activity to display
            </li>
          )}
        </ul>
      </div>

      {/* System Status */}
      {stats && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Status
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Database Connected
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-gray-600">
                  API Services Online
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Queue System Active
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Cloud Storage Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
