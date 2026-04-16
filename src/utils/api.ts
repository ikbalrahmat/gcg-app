

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Standard fetch api wrapper.
 * Menyisipkan Bearer Token secara otomatis untuk menggantikan manual fetch.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gcg_token');
  
  const headers: any = {
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions: RequestInit = {
    ...options,
    headers
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return fetch(url, finalOptions);
}

export async function fetchCsrfCookie() {
   // Dimatikan sementara karena Setup Local UI ke Remote API (Railway) memblokir strict cookie (CORS error)
   return Promise.resolve();
}
