

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
  
  const response = await fetch(url, finalOptions);

  // Jika response 401 (Unauthorized), dan kita BUKAN sedang melakukan request login (agar tidak loop),
  // bersihkan local storage dan arahkan kembali ke login.
  if (response.status === 401 && !url.includes('/login')) {
    localStorage.removeItem('gcg_active_user');
    localStorage.removeItem('gcg_token');
    window.location.href = '/'; 
  }

  return response;
}

export async function fetchCsrfCookie() {
   // Dimatikan sementara karena Setup Local UI ke Remote API (Railway) memblokir strict cookie (CORS error)
   return Promise.resolve();
}
