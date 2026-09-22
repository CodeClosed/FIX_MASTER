import { mapApiError } from '../utils/errorMapper';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...customOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = localStorage.getItem('fixmaster_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...customOptions,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let body: any = null;
    if (isJson) {
      body = await response.json();
    } else {
      const text = await response.text();
      body = { error: text || `Server returned non-JSON format (HTTP ${response.status})` };
    }

    if (!response.ok) {
      // Only 401 means "you need to log in again" (no token, or the backend
      // rejected it as invalid/expired). 403 means the caller IS authenticated
      // but isn't allowed to do this one thing - an RBAC check
      // (authorize(...)) or an ownership check (e.g. "you can only complete
      // your own tasks") - and must be shown as an ordinary error, not treated
      // as a reason to log the user out. Treating every 403 as a logout
      // trigger would silently sign a user out the first time they hit any
      // permission boundary.
      if (response.status === 401) {
        localStorage.removeItem('fixmaster_token');
        localStorage.removeItem('fixmaster_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
      }

      const mappedMessage = mapApiError(body);
      throw new ApiError(mappedMessage, response.status, body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const mappedMessage = mapApiError(error);
    throw new ApiError(mappedMessage, 0, error);
  }
}
