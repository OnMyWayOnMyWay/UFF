// Centralized API configuration
// This ensures consistent API URL handling across all components

const getApiBaseUrl = () => {
  // In production (Heroku), the API is on the same domain
  // In development, use REACT_APP_BACKEND_URL if set, otherwise default to same origin
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  if (backendUrl) {
    // Remove trailing slash if present
    return backendUrl.replace(/\/$/, '');
  }
  
  // Default to same origin (works for both dev and production)
  return '';
};

export const API_BASE = getApiBaseUrl();
export const API = `${API_BASE}/api`;

// Helper function for making API calls with better error handling
export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

export default API;
