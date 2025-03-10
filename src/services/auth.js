// services/auth.js

// Token kezelés
export const getAuthToken = () => {
  return sessionStorage.getItem('token');
};

export const setAuthToken = (token) => {
  sessionStorage.setItem('token', token);
  // Beállítjuk az isAuthenticated flag-et is
  sessionStorage.setItem('isAuthenticated', 'true');
};

export const removeAuthToken = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('isAuthenticated');
  sessionStorage.removeItem('userEmail');
};

export const isAuthenticated = () => {
  return sessionStorage.getItem('isAuthenticated') === 'true';
};

export const getUserEmail = () => {
  return sessionStorage.getItem('userEmail');
};

// Fejlesztett API hívásokat kezelő függvény
export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken();
  
  // Alapértelmezett headers
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
    console.log(`Sending ${options.method || 'GET'} request to: ${url}`);
    
    const response = await fetch(url, config);

    // Ha 401-es hibát kapunk (unauthorized), akkor töröljük a tokent és átirányítunk a login oldalra
    if (response.status === 401) {
      console.error('Authentication error: Unauthorized');
      removeAuthToken();
      
      // Csak akkor irányítunk át, ha nem a login oldalon vagyunk
      if (window.location.pathname !== '/login' && window.location.pathname !== '/magic-login') {
        window.location.href = '/login';
      }
      
      throw new Error('Unauthorized - Please log in again');
    }

    // Ha nem 2xx-es a válasz, megpróbáljuk kiolvasni a hibaüzenetet
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Ha nem tudjuk parse-olni a JSON-t, maradunk az eredeti hibaüzenetnél
      }
      
      console.error(`API error (${response.status}):`, errorMessage);
      throw new Error(errorMessage);
    }
    
    // Ellenőrizzük a válasz típusát (üres, JSON, vagy egyéb)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else if (response.status === 204) {
      // No Content válasz
      return { ok: true, status: response.status, data: null };
    } else {
      // Egyéb válasz (pl. text)
      const text = await response.text();
      return { ok: true, status: response.status, data: text };
    }
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
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Token és felhasználói adatok tárolása
    setAuthToken(data.token);
    sessionStorage.setItem('userEmail', email);
    
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Magic login funkció
export const magicLogin = async (token) => {
  try {
    const response = await fetch('https://admin.nb-studio.net:5001/api/auth/magic-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Magic login failed' }));
      throw new Error(error.message || 'Magic login failed');
    }

    const data = await response.json();
    
    // Token és felhasználói adatok tárolása
    setAuthToken(data.token);
    if (data.email) {
      sessionStorage.setItem('userEmail', data.email);
    }
    
    return data;
  } catch (error) {
    console.error('Magic login failed:', error);
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
  // GET kérés - adatok lekérdezése
  get: async (url) => {
    const response = await apiFetch(url);
    return response.data;
  },
  
  // POST kérés - új adatok létrehozása
  post: async (url, data) => {
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  
  // PUT kérés - meglévő adatok frissítése
  put: async (url, data) => {
    const response = await apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  
  // DELETE kérés - adatok törlése
  delete: async (url) => {
    const response = await apiFetch(url, {
      method: 'DELETE',
    });
    return response.data;
  },
};