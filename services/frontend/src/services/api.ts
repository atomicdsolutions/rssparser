import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
interface Feed {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  active: boolean;
  last_updated?: string;
  item_count: number;
  created_at: string;
}

interface FeedItem {
  id: string;
  feed_id: string;
  title: string;
  description: string;
  link: string;
  published?: string;
  author?: string;
  content?: string;
  images: string[];
  media_urls: string[];
  tags: string[];
  created_at: string;
}

interface DashboardStats {
  total_feeds: number;
  total_items: number;
  active_feeds: number;
  recent_items: number;
  categories: Record<string, number>;
}

interface FeedSubscription {
  url: string;
  name: string;
  description?: string;
  category?: string;
  active?: boolean;
}

interface FeedUpdate {
  name?: string;
  description?: string;
  category?: string;
  active?: boolean;
}

interface GetItemsParams {
  feed_id?: string;
  limit?: number;
  offset?: number;
}

interface GetFeedsParams {
  category?: string;
  active_only?: boolean;
}

// API Service
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard');
    return response.data;
  },

  // Feeds
  async getFeeds(params: GetFeedsParams = {}): Promise<Feed[]> {
    const response = await api.get('/feeds', { params });
    return response.data;
  },

  async getFeed(feedId: string): Promise<Feed> {
    const response = await api.get(`/feeds/${feedId}`);
    return response.data;
  },

  async createFeed(feedData: FeedSubscription): Promise<Feed> {
    const response = await api.post('/feeds', feedData);
    return response.data;
  },

  async updateFeed(feedId: string, updateData: FeedUpdate): Promise<Feed> {
    const response = await api.put(`/feeds/${feedId}`, updateData);
    return response.data;
  },

  async deleteFeed(feedId: string): Promise<{ message: string }> {
    const response = await api.delete(`/feeds/${feedId}`);
    return response.data;
  },

  async refreshFeed(feedId: string): Promise<{ message: string; items_processed: number }> {
    const response = await api.post(`/feeds/${feedId}/refresh`);
    return response.data;
  },

  // Feed items
  async getItems(params: GetItemsParams = {}): Promise<FeedItem[]> {
    const response = await api.get('/items', { params });
    return response.data;
  },

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  },

  // Feed parser service (direct calls for testing)
  async parseFeedDirect(feedUrl: string) {
    const response = await axios.post('http://localhost:8001/parse', {
      url: feedUrl
    });
    return response.data;
  },

  async parseFeedsBatch(feedUrls: { url: string; name?: string }[]) {
    const response = await axios.post('http://localhost:8001/parse-batch', feedUrls);
    return response.data;
  }
};

export default apiService;