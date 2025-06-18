import axios from 'axios';

// TODO: Update this URL with the new deployment URL from the correct Google Apps Script project
export const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx49S2FIU4lgI2WEo811kLAesOQJ18zBBds0PuHzkOx9FXv1mA9KRFTg_lqpgcit_UT/exec';

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