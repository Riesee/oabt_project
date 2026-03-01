import TokenManager from './tokenManager';
import { API_URL } from '../config';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  requireAuth?: boolean;
}

class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async fetch(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const {
      method = 'GET',
      headers = {},
      body,
      requireAuth = true,
    } = options;

    const url = `${API_URL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication header if required
    if (requireAuth) {
      const token = await TokenManager.getValidToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      } else {
        // Token refresh failed, user needs to login again
        throw new Error('AUTHENTICATION_REQUIRED');
      }
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
    });

    // Handle 401 responses
    if (response.status === 401 && requireAuth) {
      // Try to refresh token once more
      const newToken = await TokenManager.getValidToken();
      if (newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        return await fetch(url, {
          method,
          headers: requestHeaders,
          body,
        });
      } else {
        throw new Error('AUTHENTICATION_REQUIRED');
      }
    }

    return response;
  }

  async get(endpoint: string, requireAuth = true): Promise<Response> {
    return this.fetch(endpoint, { requireAuth });
  }

  async post(endpoint: string, data: any, requireAuth = true): Promise<Response> {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      requireAuth,
    });
  }

  async put(endpoint: string, data: any, requireAuth = true): Promise<Response> {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth,
    });
  }
}

export default ApiClient.getInstance();