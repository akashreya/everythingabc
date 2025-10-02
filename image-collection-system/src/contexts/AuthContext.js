import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Create admin API instance
const adminApi = axios.create({
  baseURL: process.env.REACT_APP_ADMIN_API_URL || "http://localhost:3003/admin",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete adminApi.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Check if user is authenticated on app start
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await adminApi.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token, logout]);

  const login = async (email, password) => {
    try {
      const response = await adminApi.post('/auth/login', {
        email,
        password
      });

      const { accessToken, refreshToken, user: userData } = response.data.data;

      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await adminApi.post('/auth/refresh', {
        refreshToken
      });

      const { accessToken } = response.data.data;
      localStorage.setItem('adminToken', accessToken);
      setToken(accessToken);

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  }, [logout]);

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshAccessToken();
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken, logout]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};