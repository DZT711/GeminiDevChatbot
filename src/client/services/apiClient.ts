import { storageService } from './storageService.ts';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export const apiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true, ...customConfig } = options;
    const headers = new Headers(customConfig.headers || {});
    
    if (requireAuth) {
      const token = storageService.getSessionToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!headers.has('Content-Type') && !(customConfig.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...customConfig,
      headers,
    };

    const response = await fetch(endpoint, config);

    if (!response.ok) {
      let errorMessage = 'An error occurred while fetching data';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text();
      }
      throw new ApiError(response.status, errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json() as T;
    } catch {
      return (await response.text()) as unknown as T;
    }
  },

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiClient.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return apiClient.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return apiClient.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return apiClient.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  // Specialized method for streaming responses (SSE / chunked)
  async stream(endpoint: string, body?: any, options?: RequestOptions): Promise<Response> {
    const { requireAuth = true, ...customConfig } = options || {};
    const headers = new Headers(customConfig.headers || {});
    
    if (requireAuth) {
      const token = storageService.getSessionToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...customConfig,
      method: customConfig.method || (body ? 'POST' : 'GET'),
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(endpoint, config);
    if (!response.ok) {
       throw new Error(`API error: ${response.status}`);
    }
    return response;
  }
};
