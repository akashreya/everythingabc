import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { showNotification } from '../components/Common/Notification';

const Dashboard = () => {
  const { getHealth, getSystemStatus, getClientStats, getActivityFeed, loading } = useApi();

  const [healthData, setHealthData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [clientStats, setClientStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [health, status, clients, activities] = await Promise.all([
        getHealth(true),
        getSystemStatus(),
        getClientStats(),
        getActivityFeed(15)
      ]);

      setHealthData(health);
      setSystemStatus(status?.data || status);
      setClientStats(clients?.data || clients);
      setActivityFeed(activities?.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('error', 'Failed to load dashboard data');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB`;
  };

  const formatTimestamp = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getStatusColor = (status) => {
    if (status === 'OK' || status === 'operational' || status === 'available' || status === 'active' || status === 'initialized') {
      return 'text-green-600 bg-green-100';
    }
    if (status === 'mock' || status === 'pending') {
      return 'text-yellow-600 bg-yellow-100';
    }
    if (status === 'not_initialized') {
      return 'text-gray-600 bg-gray-100';
    }
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (status) => {
    if (status === 'OK' || status === 'operational' || status === 'available' || status === 'active' || status === 'initialized') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status === 'mock' || status === 'pending') {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
    if (status === 'not_initialized') {
      return <XCircle className="h-5 w-5 text-gray-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            System health and activity monitoring
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Updated {formatTimestamp(lastUpdate)}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-secondary text-sm ${autoRefresh ? 'bg-blue-50 text-blue-700' : ''}`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Health Status */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health Status
          </h2>
        </div>
        <div className="card-body">
          {healthData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overall Status */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Status</span>
                  {getStatusIcon(healthData.status)}
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(healthData.status)}`}>
                  {healthData.status}
                </div>
              </div>

              {/* Database */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Database</span>
                  {getStatusIcon(healthData.database?.connected ? 'OK' : 'ERROR')}
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(healthData.database?.connected ? 'OK' : 'ERROR')}`}>
                  {healthData.database?.connected ? 'Connected' : 'Disconnected'}
                </div>
                {healthData.database?.stats && (
                  <div className="mt-2 text-xs text-gray-600">
                    Collections: {healthData.database.stats.collections || 0}
                  </div>
                )}
              </div>

              {/* Services */}
              {healthData.services && Object.entries(healthData.services).map(([service, status]) => {
                // Format service names
                const serviceNameMap = {
                  imageCollection: 'Image Collection',
                  enhancedCollection: 'Enhanced Collection',
                  adminInterface: 'Admin Interface',
                  aiGeneration: 'AI Generation',
                  unsplash: 'Unsplash API',
                  pixabay: 'Pixabay API',
                  pexels: 'Pexels API'
                };

                const displayName = serviceNameMap[service] || service.replace(/([A-Z])/g, ' $1').trim();

                return (
                  <div key={service} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {displayName}
                      </span>
                      {getStatusIcon(status)}
                    </div>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
                      {status === 'initialized' ? 'Active' : status === 'not_initialized' ? 'Inactive' : status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Server className="h-5 w-5 mr-2" />
            System Information
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Uptime */}
            {systemStatus && (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Uptime</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatUptime(systemStatus.uptime)}
                  </div>
                </div>

                {/* Version */}
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">API Version</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {systemStatus.version || '1.0.0'}
                  </div>
                </div>

                {/* Environment */}
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Environment</div>
                  <div className="text-2xl font-bold text-gray-900 capitalize">
                    {systemStatus.environment || 'development'}
                  </div>
                </div>

                {/* Categories */}
                {systemStatus.database && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Categories</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {systemStatus.database.activeCategories}/{systemStatus.database.totalCategories}
                    </div>
                    <div className="text-xs text-gray-500">Active / Total</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Memory Usage */}
          {clientStats?.systemStats?.memory && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">Memory Usage</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">RSS:</span>
                  <span className="ml-2 font-medium">{formatBytes(clientStats.systemStats.memory.rss)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Heap Used:</span>
                  <span className="ml-2 font-medium">{formatBytes(clientStats.systemStats.memory.heapUsed)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Heap Total:</span>
                  <span className="ml-2 font-medium">{formatBytes(clientStats.systemStats.memory.heapTotal)}</span>
                </div>
                <div>
                  <span className="text-gray-500">External:</span>
                  <span className="ml-2 font-medium">{formatBytes(clientStats.systemStats.memory.external)}</span>
                </div>
              </div>
              {clientStats.systemStats.nodeVersion && (
                <div className="mt-4 text-sm text-gray-600">
                  Node.js: {clientStats.systemStats.nodeVersion}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </h2>
        </div>
        <div className="card-body">
          {activityFeed.length > 0 ? (
            <div className="space-y-4">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                    activity.severity === 'success' ? 'bg-green-500' :
                    activity.severity === 'warning' ? 'bg-yellow-500' :
                    activity.severity === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    {activity.category && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span className="mr-2">{activity.category.icon}</span>
                        <span>{activity.category.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
