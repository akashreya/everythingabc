import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Image,
  Database,
  TrendingUp,
  Settings,
  Menu,
  X,
  Activity,
  Sparkles,
  Shield,
  Edit3,
  // Users, // COMMENTED OUT - Not used in ICS
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext'; // COMMENTED OUT - No admin auth needed for ICS
import ErrorBoundary from '../Common/ErrorBoundary';
import Notification from '../Common/Notification';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    name: 'Collections',
    href: '/collections',
    icon: Database
  },
  {
    name: 'Images',
    href: '/images',
    icon: Image
  },
  {
    name: 'Generate',
    href: '/generate',
    icon: Sparkles
  },
  {
    name: 'Progress',
    href: '/progress',
    icon: TrendingUp
  },
  {
    name: 'Manage Category',
    href: '/manage-category',
    icon: Edit3
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

const adminNavigation = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    icon: Shield
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: Database
  },
  {
    name: 'Items',
    href: '/admin/items',
    icon: Image
  }
];

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <Sidebar navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <Sidebar navigation={navigation} isActive={isActive} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
      
      <Notification />
    </div>
  );
};

const Sidebar = ({ navigation, isActive }) => {
  // const { user, logout } = useAuth(); // COMMENTED OUT - No admin auth needed for ICS
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-primary-600" />
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">
                EverythingABC
              </h1>
              <p className="text-xs text-gray-500">
                Content Management
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-8 flex-1 px-2 space-y-1">
          {/* Main navigation */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Collection System
            </div>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Admin navigation - COMMENTED OUT - No admin needed for ICS */}
          {/*
          <div className="mt-6 space-y-1">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administration
            </div>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-red-50 border-r-2 border-red-600 text-red-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      active ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
          */}
        </nav>
      </div>

      {/* User menu - COMMENTED OUT - No admin auth needed for ICS */}
      {/*
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="relative">
          <button
            className="group w-full flex items-center text-sm text-left font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform ${
                  userMenuOpen ? 'transform rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <button
                onClick={() => {
                  logout();
                  setUserMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      */}
    </div>
  );
};

export default Layout;