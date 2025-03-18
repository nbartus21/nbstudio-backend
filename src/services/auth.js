export const getAuthToken = () => {
    return sessionStorage.getItem('token');
  };
  
  export const setAuthToken = (token) => {
    sessionStorage.setItem('token', token);
  };
  
  export const removeAuthToken = () => {
    sessionStorage.removeItem('token');
  };
  
  export const isAuthenticated = () => {
    return !!getAuthToken();
  };
  
  // API hívásokat kezelő függvény
  export const apiFetch = async (url, options = {}) => {
    const token = getAuthToken();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  
    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
  
    try {
      const response = await fetch(url, config);
  
      // Ha 401-es hibát kapunk (unauthorized), akkor töröljük a tokent és átirányítunk a login oldalra
      if (response.status === 401) {
        removeAuthToken();
        window.location.href = '/login';
        throw new Error('Unauthorized - Please log in again');
      }
  
      // Ha nem 2xx-es a válasz, dobunk egy hibát
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
  
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };
  
  // Login funkció
  export const login = async (email, password) => {
    try {
      const response = await fetch('https://admin.nb-studio.net:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
  
      const data = await response.json();
      setAuthToken(data.token);
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };
  
  // Logout funkció
  export const logout = () => {
    removeAuthToken();
    window.location.href = '/login';
  };
  
  // Védett API végpontok hívásához használható helper függvények
  export const api = {
    get: (url) => apiFetch(url),
    
    post: (url, data) => apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    put: (url, data) => apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
    delete: (url) => apiFetch(url, {
      method: 'DELETE',
    }),

    patch: (url, data) => apiFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

    // Token lekérő funkció
    getToken: () => getAuthToken(),
  };