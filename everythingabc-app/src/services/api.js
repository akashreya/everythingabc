// API service for EverythingABC backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Categories API
  async getCategories() {
    return this.request('/categories');
  }

  async getCategory(categoryId) {
    return this.request(`/categories/${categoryId}`);
  }

  async getCategoryLetter(categoryId, letter) {
    return this.request(`/categories/${categoryId}/letters/${letter}`);
  }

  async searchItems(query) {
    return this.request(`/categories/search/${encodeURIComponent(query)}`);
  }

  async getStats() {
    return this.request('/categories/stats/overview');
  }

  // Admin functions (for future use)
  async createCategory(categoryData) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(categoryId, updateData) {
    return this.request(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async addItemToLetter(categoryId, letter, itemData) {
    return this.request(`/categories/${categoryId}/letters/${letter}`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export both the class and instance
export default apiService;
export { ApiService };

// Helper functions for easier imports
export const {
  getCategories,
  getCategory,
  getCategoryLetter,
  searchItems,
  getStats,
  createCategory,
  updateCategory,
  addItemToLetter
} = apiService;