import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Extract the token directly from the browser's cookies
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('vendor_jwt='))
    ?.split('=')[1];

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (typeof window !== 'undefined' && (status === 401 || status === 403)) {
      document.cookie = 'vendor_jwt=; Max-Age=0; path=/; SameSite=Lax';

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;