import React, { useState, useEffect } from 'react';
import SharedWebhostingDashboard from './SharedWebhostingDashboard';
import { Lock, AlertTriangle, Globe, Check } from 'lucide-react';
import { debugLog } from './shared/utils';

// Fordítási adatok minden UI elemhez
const translations = {
  en: {
    viewWebhosting: "View Webhosting",
    enterPin: "Please enter the PIN code to access",
    pin: "PIN code",
    pinPlaceholder: "6-digit PIN code",
    login: "Login to webhosting",
    checking: "Checking...",
    invalidPin: "Invalid PIN code",
    errorOccurred: "An error occurred during verification",
    logoutConfirm: "Are you sure you want to log out?",
    noWebhosting: "No webhosting account loaded",
    selectWebhosting: "Please select a webhosting account or log in again",
    back: "Back",
  },
  de: {
    viewWebhosting: "Webhosting anzeigen",
    enterPin: "Bitte geben Sie den PIN-Code für den Zugriff ein",
    pin: "PIN-Code",
    pinPlaceholder: "6-stelliger PIN-Code",
    login: "Zum Webhosting anmelden",
    checking: "Überprüfung...",
    invalidPin: "Ungültiger PIN-Code",
    errorOccurred: "Bei der Überprüfung ist ein Fehler aufgetreten",
    logoutConfirm: "Sind Sie sicher, dass Sie sich abmelden möchten?",
    noWebhosting: "Kein Webhosting-Konto geladen",
    selectWebhosting: "Bitte wählen Sie ein Webhosting-Konto aus oder melden Sie sich erneut an",
    back: "Zurück",
  },
  hu: {
    viewWebhosting: "Webhosting megtekintése",
    enterPin: "Kérjük, adja meg a PIN kódot a hozzáféréshez",
    pin: "PIN kód",
    pinPlaceholder: "6 számjegyű PIN kód",
    login: "Belépés a webhosting fiókba",
    checking: "Ellenőrzés...",
    invalidPin: "Érvénytelen PIN kód",
    errorOccurred: "Hiba történt az ellenőrzés során",
    logoutConfirm: "Biztosan ki szeretne lépni?",
    noWebhosting: "Nincs betöltve webhosting fiók",
    selectWebhosting: "Kérjük, válasszon egy webhosting fiókot vagy jelentkezzen be újra",
    back: "Visszalépés",
  }
};

// Segédfüggvények a routing szimulálásához
const useParams = () => {
  const url = window.location.href;
  const tokenMatch = url.match(/\/shared-webhosting\/([^\/\?]+)/);
  let token = tokenMatch ? tokenMatch[1] : '';

  if (token.includes('?')) {
    token = token.split('?')[0];
  }

  return { token };
};

const useNavigate = () => {
  return (path) => {
    window.history.pushState({}, '', path);
  };
};

// Böngésző nyelv felismerése
const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0];

  if (['en', 'de', 'hu'].includes(langCode)) {
    return langCode;
  }
  return 'hu'; // Alapértelmezett magyar, ha nincs támogatva
};

const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

const SharedWebhostingView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [webhosting, setWebhosting] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(detectBrowserLanguage());

  // Fordítások lekérése az aktuális nyelvhez
  const t = translations[language];

  // Komponens inicializálásának naplózása
  useEffect(() => {
    debugLog('SharedWebhostingView', 'Component initialized', { token, language });
  }, []);

  // Meglévő munkamenet ellenőrzése komponens betöltésekor
  useEffect(() => {
    const checkExistingSession = () => {
      if (!token) {
        debugLog('checkExistingSession', 'No token provided');
        return;
      }

      // Tisztítsuk meg a tokent minden extra paramétertől
      const cleanToken = token.split('?')[0];

      try {
        debugLog('checkExistingSession', 'Checking for saved session', { token: cleanToken });
        const savedSession = localStorage.getItem(`webhosting_session_${cleanToken}`);

        if (savedSession) {
          const session = JSON.parse(savedSession);
          debugLog('checkExistingSession', 'Found saved session', { webhosting: session.webhosting?.hosting?.domainName });

          // Ellenőrizzük, hogy a munkamenet nem járt-e le (24 óra)
          const sessionTime = new Date(session.timestamp).getTime();
          const currentTime = new Date().getTime();
          const sessionAge = currentTime - sessionTime;
          const maxAge = 24 * 60 * 60 * 1000; // 24 óra milliszekundumban

          if (sessionAge < maxAge) {
            debugLog('checkExistingSession', 'Session is valid, restoring', {
              age: Math.round(sessionAge / (60 * 60 * 1000)) + ' hours'
            });

            // Nyelv visszaállítása a munkamenetből
            if (session.language) {
              setLanguage(session.language);
            }

            // Biztosítsuk a webhosting adatok kompatibilitását
            const webhostingData = session.webhosting;
            if (webhostingData) {
              if (!webhostingData._id && webhostingData.id) {
                debugLog('checkExistingSession', 'Adding _id from id field');
                webhostingData._id = webhostingData.id;
              }

              setWebhosting(webhostingData);
              setIsVerified(true);
            } else {
              debugLog('checkExistingSession', 'Webhosting data missing from session');
            }
          } else {
            debugLog('checkExistingSession', 'Session expired, removing');
            localStorage.removeItem(`webhosting_session_${cleanToken}`);
          }
        } else {
          debugLog('checkExistingSession', 'No saved session found');
        }
      } catch (error) {
        debugLog('checkExistingSession', 'Error checking session', { error });
        localStorage.removeItem(`webhosting_session_${cleanToken}`);
      }
    };

    checkExistingSession();
  }, [token]);

  // PIN ellenőrzése
  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Tisztítsuk meg a tokent minden extra paramétertől
    const cleanToken = token.split('?')[0];

    debugLog('verifyPin', 'Verifying PIN for webhosting', { token: cleanToken, pinLength: pin.length, language });

    try {
      // Különböző végpontok kipróbálása
      const endpoints = [
        `${API_URL}/webhosting/verify-pin`,
        `${API_URL}/api/webhosting/verify-pin`,
        `${API_URL}/public/webhosting/verify-pin`,
        `${API_URL}/api/public/webhosting/verify-pin`
      ];

      let response = null;
      let success = false;

      // Végpontok kipróbálása sorban
      for (let endpoint of endpoints) {
        try {
          debugLog('verifyPin', `Trying endpoint: ${endpoint}`);
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY,
              'Accept': 'application/json'
            },
            body: JSON.stringify({ token: cleanToken, pin }),
            credentials: 'omit'
          });

          if (response.ok) {
            success = true;
            debugLog('verifyPin', `Successful response from ${endpoint}`);
            break;
          } else {
            debugLog('verifyPin', `Failed with status ${response.status} from ${endpoint}`);
          }
        } catch (fetchError) {
          debugLog('verifyPin', `Fetch error with ${endpoint}`, { error: fetchError.message });
        }
      }

      if (!success || !response) {
        throw new Error('All endpoints failed');
      }

      const data = await response.json();
      debugLog('verifyPin', 'API response data received');

      if (success) {
        const webhostingData = data.webhosting;

        // _id mező hozzáadása, ha nem létezik (kompatibilitás miatt)
        if (!webhostingData._id) {
          debugLog('verifyPin', 'Webhosting data needs normalization');

          if (webhostingData.id) {
            debugLog('verifyPin', 'Using id as _id field');
            webhostingData._id = webhostingData.id;
          } else {
            debugLog('verifyPin', 'Using token as temporary _id');
            webhostingData._id = cleanToken;
          }
        }

        // Webhosting adatok szerkezete
        debugLog('verifyPin', 'Webhosting loaded successfully', {
          hasId: Boolean(webhostingData.id),
          has_Id: Boolean(webhostingData._id),
          domain: webhostingData.hosting.domainName
        });

        // Adatok mentése state-be
        setWebhosting(webhostingData);
        setIsVerified(true);
        setError(null);

        // Munkamenet mentése localStorage-ba a nyelvvel együtt
        const session = {
          webhosting: webhostingData,
          timestamp: new Date().toISOString(),
          language: language,
          pin: pin // PIN kód mentése a későbbi frissítésekhez
        };
        localStorage.setItem(`webhosting_session_${cleanToken}`, JSON.stringify(session));

        debugLog('verifyPin', 'Session saved with language preference');
      } else {
        debugLog('verifyPin', 'PIN verification failed', { message: data.message });
        setError(data.message || t.invalidPin);
      }
    } catch (error) {
      debugLog('verifyPin', 'Error during verification', { error });
      console.error('Error occurred:', error);
      setError(t.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  // Webhosting frissítések kezelése
  const handleWebhostingUpdate = async (updatedWebhosting) => {
    try {
      debugLog('handleWebhostingUpdate', 'Updating webhosting', { webhostingId: updatedWebhosting._id });

      // Még akkor is mentjük helyileg, ha az API hívás sikertelen
      setWebhosting(updatedWebhosting);

      // Token tisztítása
      const cleanToken = token.split('?')[0];

      // Munkamenet mentése a PIN kóddal együtt a későbbi frissítésekhez
      const session = {
        webhosting: updatedWebhosting,
        timestamp: new Date().toISOString(),
        language: language,
        pin: pin
      };
      localStorage.setItem(`webhosting_session_${cleanToken}`, JSON.stringify(session));

      // Webhosting frissítése a szerveren
      try {
        const updateData = {
          token: cleanToken,
          pin: pin || '',
          updateWebhosting: updatedWebhosting
        };

        // Végpontok kipróbálása sorban
        const endpoints = [
          `${API_URL}/webhosting/verify-pin`,
          `${API_URL}/api/webhosting/verify-pin`,
          `${API_URL}/public/webhosting/verify-pin`,
          `${API_URL}/api/public/webhosting/verify-pin`
        ];

        let updated = false;

        for (let endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
              },
              body: JSON.stringify(updateData),
              credentials: 'omit'
            });

            if (response.ok) {
              debugLog('handleWebhostingUpdate', `Webhosting updated via ${endpoint} successfully`);
              
              // Frissített adatok visszaolvasása
              const responseData = await response.json();
              if (responseData.webhosting) {
                setWebhosting(responseData.webhosting);
                
                // Munkamenet frissítése
                const updatedSession = {
                  webhosting: responseData.webhosting,
                  timestamp: new Date().toISOString(),
                  language: language,
                  pin: pin
                };
                localStorage.setItem(`webhosting_session_${cleanToken}`, JSON.stringify(updatedSession));
              }
              
              updated = true;
              break;
            }
          } catch (endpointError) {
            debugLog('handleWebhostingUpdate', `Error with ${endpoint}`, { error: endpointError.message });
          }
        }

        if (!updated) {
          debugLog('handleWebhostingUpdate', 'All update endpoints failed');
        }
      } catch (apiError) {
        debugLog('handleWebhostingUpdate', 'API error when updating webhosting', { error: apiError });
      }
    } catch (error) {
      debugLog('handleWebhostingUpdate', 'Error updating webhosting', { error });
      console.error('Error updating webhosting:', error);
    }
  };

  // Nyelv váltás kezelése
  const handleLanguageChange = (lang) => {
    debugLog('handleLanguageChange', `Changing language to ${lang}`);
    setLanguage(lang);

    // Ha a felhasználó be van jelentkezve, frissítsük a munkamenetet az új nyelvvel
    if (isVerified && token) {
      const cleanToken = token.split('?')[0];
      const savedSession = localStorage.getItem(`webhosting_session_${cleanToken}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.language = lang;
        localStorage.setItem(`webhosting_session_${cleanToken}`, JSON.stringify(session));
      }
    }
  };

  // Kijelentkezés kezelése
  const handleLogout = () => {
    if (window.confirm(t.logoutConfirm)) {
      debugLog('handleLogout', 'User confirmed logout');

      // Biztosítsuk, hogy a token tisztított formátumú
      const cleanToken = token.split('?')[0];

      // Munkamenet törlése, de a projektspecifikus fájlok és dokumentumok megőrzése
      localStorage.removeItem(`webhosting_session_${cleanToken}`);

      setIsVerified(false);
      setWebhosting(null);
      setPin('');
      navigate(`/shared-webhosting/${cleanToken}`);

      debugLog('handleLogout', 'Logout completed');
    } else {
      debugLog('handleLogout', 'Logout cancelled by user');
    }
  };

  // PIN ellenőrző űrlap
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Lock className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t.viewWebhosting}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t.enterPin}
            </p>
          </div>

          {/* Nyelvválasztó */}
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => handleLanguageChange('hu')}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                language === 'hu'
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Magyar
              {language === 'hu' && <Check className="inline-block ml-1 h-3 w-3" />}
            </button>
            <button
              onClick={() => handleLanguageChange('de')}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                language === 'de'
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Deutsch
              {language === 'de' && <Check className="inline-block ml-1 h-3 w-3" />}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                language === 'en'
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              English
              {language === 'en' && <Check className="inline-block ml-1 h-3 w-3" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={verifyPin}>
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                {t.pin}
              </label>
              <input
                id="pin"
                type="text"
                maxLength="6"
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t.pinPlaceholder}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 6) {
                    setPin(value);
                  }
                }}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-opacity-50 border-t-white" />
                    </span>
                    {t.checking}
                  </>
                ) : (
                  t.login
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // PIN ellenőrzés után a webhosting dashboard megjelenítése
  return (
    <SharedWebhostingDashboard
      webhosting={webhosting}
      language={language}
      onUpdate={handleWebhostingUpdate}
      onLogout={handleLogout}
      onLanguageChange={handleLanguageChange}
    />
  );
};

export default SharedWebhostingView; 