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

    // Beállítunk egy időkorlátot a kérésre, hogy elkerüljük az időtúllépést
    // Ha nincs még AbortController, akkor létrehozunk egyet
    if (!config.signal) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 másodperc

      // Hozzáadjuk a controller.signal-t a config objektumhoz
      config.signal = controller.signal;

      // Eltároljuk a timeoutId-t, hogy később törölhessük
      config._timeoutId = timeoutId;
    }

    try {
      console.log(`API kérés: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);

      // Töröljük az időkorlátot, ha van
      if (config._timeoutId) {
        clearTimeout(config._timeoutId);
      }

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

      // Ha nem 2xx-es a válasz, dobunk egy hibát
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      // Töröljük az időkorlátot, ha van
      if (config._timeoutId) {
        clearTimeout(config._timeoutId);
      }

      // Ellenőrizzük, hogy időtúllépés történt-e
      if (error.name === 'AbortError') {
        console.error('Kérés időtúllépés miatt megszakadt:', url);
        throw new Error('A kérés időtúllépés miatt megszakadt');
      }

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