import axios from 'axios';

export const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxgpCFWAgmtrqmKJ1PHJAFsyE-jfBFDNK7bf6f1jx1MWfbV0ZvTsWPTW17dpYfAC8sRYg/exec';

// Create a shared axios instance with the correct configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  maxRedirects: 5, // Allow following redirects
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  withCredentials: false // Don't send cookies
}); 