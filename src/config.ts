import axios from 'axios';

export const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxgpCFWAgmtrqmKJ1PHJAFsyE-jfBFDNK7bf6f1jx1MWfbV0ZvTsWPTW17dpYfAC8sRYg/exec';

// Create a shared axios instance with the correct configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  maxRedirects: 5, // Allow following redirects
  validateStatus: (status) => status >= 200 && status < 300,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  withCredentials: false // Important for CORS
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    return Promise.reject(error);
  }
); 