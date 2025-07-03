import axios from 'axios';

// The base URL for the Google Apps Script is loaded from environment variables
export const API_BASE_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

if (!API_BASE_URL) {
  console.error("VITE_GOOGLE_APPS_SCRIPT_URL is not defined. Please check your .env file.");
}

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