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
      // Részletes naplózás minden kéréshez
      console.log(`API kérés indítása: ${options.method || 'GET'} ${url}`);
      console.log('Kérés adatok:', {
        method: options.method || 'GET',
        headers: config.headers,
        body: options.body ? JSON.parse(options.body) : null,
        token: token ? 'Jelen' : 'Hiányzik'
      });

      // Időtúllépés kezelése
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 másodperc időtúllépés

      try {
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId); // Töröljük az időzítőt, ha a kérés befejeződött

        console.log(`API válasz érkezett: ${response.status} ${response.statusText}`);

        // Ha 401-es hibát kapunk (unauthorized), akkor töröljük a tokent és átirányítunk a login oldalra
        if (response.status === 401) {
          console.log('401 Unauthorized hiba, átirányítás a login oldalra');
          removeAuthToken();
          window.location.href = '/login';
          throw new Error('Unauthorized - Please log in again');
        }

        // Speciális kezelés az /expenses végpontra - csendes fallback
        if (response.status === 404 && url.includes('/expenses')) {
          console.log('404 Not Found hiba az /expenses végponton, csendes fallback');
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: 'Endpoint not found' })
          };
        }

        // Szerver hibák részletes naplózása
        if (response.status >= 500) {
          console.error(`${response.status} szerver hiba a ${options.method || 'GET'} kérés során:`, url);
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
            console.log('Hiba válasz adatok:', errorData);
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (jsonError) {
            // Ha nem sikerül a JSON-t értelmezni, használjuk az eredeti hibaüzenetet
            console.error('Nem sikerült a JSON hibaüzenetet értelmezni:', jsonError);
          }

          console.error(`Hiba a kérés során: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Sikeres válasz esetén naplózzuk a válasz adatokat
        console.log('Sikeres API válasz:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });

        return response;
      } catch (fetchError) {
        // AbortError kezelése (időtúllépés)
        if (fetchError.name === 'AbortError') {
          console.error('API kérés időtúllépés:', url);
          throw new Error('A kérés időtúllépés miatt megszakadt');
        }

        // Egyéb hibák kezelése
        console.error('API kérés hiba:', fetchError);
        throw fetchError;
      }
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

    put: (url, data) => {
      // Ellenőrizzük, hogy a PUT kérés URL-je tartalmaz-e projekt azonosítót
      if (url.includes('/projects/') && data && data._id) {
        // Biztonsági ellenőrzés: az URL-ben és a data objektumban lévő azonosító egyezik-e
        const urlParts = url.split('/');
        const urlId = urlParts[urlParts.length - 1];

        console.log('PUT kérés ellenőrzése:');
        console.log('- URL azonosító:', urlId);
        console.log('- Adat objektum azonosító:', data._id);

        // Ha az URL-ben lévő azonosító nem egyezik a data objektumban lévővel, javítsuk
        if (urlId !== data._id) {
          console.warn('Az URL-ben és az adatokban lévő azonosító nem egyezik! Javítás...');
          // Javított URL létrehozása a helyes azonosítóval
          const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
          const correctedUrl = baseUrl + data._id;
          console.log('Javított URL:', correctedUrl);
          return apiFetch(correctedUrl, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
        }
      }

      // Ha nincs probléma, normál PUT kérés végrehajtása
      return apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

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