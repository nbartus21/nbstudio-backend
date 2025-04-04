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
      // Logging for PUT requests to help with debugging
      if (options.method === 'PUT') {
        console.log(`API PUT kérés: ${url}`);
        console.log('Hitelesítési token:', token ? 'Jelen' : 'Hiányzik');
      }
      
      const response = await fetch(url, config);
  
      // Ha 401-es hibát kapunk (unauthorized), akkor töröljük a tokent és átirányítunk a login oldalra
      if (response.status === 401) {
        removeAuthToken();
        window.location.href = '/login';
        throw new Error('Unauthorized - Please log in again');
      }
  
      // Speciális kezelés az /expenses végpontra - csendes fallback
      if (response.status === 404 && url.includes('/expenses')) {
        return { 
          ok: false, 
          status: 404,
          json: async () => ({ message: 'Endpoint not found' })
        };
      }
      
      // Ha PUT kérés és 500-as hiba, ellenőrizzük részletesebben
      if (options.method === 'PUT' && response.status === 500) {
        console.error('500-as szerver hiba a PUT kérés során:', url);
        try {
          // Próbáljuk meg kinyerni a hiba részleteit
          const errorDetails = await response.json().catch(() => ({}));
          console.error('Szerver hiba részletek:', errorDetails);
        } catch (e) {
          console.error('Nem sikerült a hibaválaszt kiolvasni:', e);
        }
      }
  
      // Ha nem 2xx-es a válasz, dobunk egy hibát
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (jsonError) {
          // Ha nem sikerül a JSON-t értelmezni, használjuk az eredeti hibaüzenetet
          console.error('Nem sikerült a JSON hibaüzenetet értelmezni:', jsonError);
        }
        
        throw new Error(errorMessage);
      }
  
      return response;
    } catch (error) {
      // Csak akkor naplózzuk a hibát, ha nem az /expenses végponthoz kapcsolódik
      if (!url.includes('/expenses')) {
        console.error('API request failed:', error);
      }
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