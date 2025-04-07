import React, { useState, useEffect } from 'react';
import SharedProjectDashboard from './SharedProjectDashboard';
import { Lock, AlertTriangle, Globe, Check } from 'lucide-react';
import { debugLog } from './shared/utils';

// Translation data for all UI elements
const translations = {
  en: {
    viewProject: "View Project",
    enterPin: "Please enter the PIN code to access",
    pin: "PIN code",
    pinPlaceholder: "6-digit PIN code",
    login: "Login to project",
    checking: "Checking...",
    invalidPin: "Invalid PIN code",
    errorOccurred: "An error occurred during verification",
    logoutConfirm: "Are you sure you want to log out?",
    noProject: "No project loaded",
    selectProject: "Please select a project or log in again",
    back: "Back",
  },
  de: {
    viewProject: "Projekt ansehen",
    enterPin: "Bitte geben Sie den PIN-Code für den Zugriff ein",
    pin: "PIN-Code",
    pinPlaceholder: "6-stelliger PIN-Code",
    login: "Zum Projekt anmelden",
    checking: "Überprüfung...",
    invalidPin: "Ungültiger PIN-Code",
    errorOccurred: "Bei der Überprüfung ist ein Fehler aufgetreten",
    logoutConfirm: "Sind Sie sicher, dass Sie sich abmelden möchten?",
    noProject: "Kein Projekt geladen",
    selectProject: "Bitte wählen Sie ein Projekt aus oder melden Sie sich erneut an",
    back: "Zurück",
  },
  hu: {
    viewProject: "Projekt megtekintése",
    enterPin: "Kérjük, adja meg a PIN kódot a hozzáféréshez",
    pin: "PIN kód",
    pinPlaceholder: "6 számjegyű PIN kód",
    login: "Belépés a projektbe",
    checking: "Ellenőrzés...",
    invalidPin: "Érvénytelen PIN kód",
    errorOccurred: "Hiba történt az ellenőrzés során",
    logoutConfirm: "Biztosan ki szeretne lépni?",
    noProject: "Nincs betöltve projekt",
    selectProject: "Kérjük, válasszon egy projektet vagy jelentkezzen be újra",
    back: "Visszalépés",
  }
};

// Helper functions to simulate routing
const useParams = () => {
  const url = window.location.href;
  // Ha van token és kérdőjelet tartalmaz, akkor csak a kérdőjel előtti részt vesszük
  const tokenMatch = url.match(/\/shared-project\/([^\/\?]+)/);
  let token = tokenMatch ? tokenMatch[1] : '';

  // Ha van a tokenben még mindig kérdőjel, vágjuk le onnan
  if (token.includes('?')) {
    token = token.split('?')[0];
  }

  return { token: token };
};

const useNavigate = () => {
  return (path) => {
    window.history.pushState({}, '', path);
  };
};

// Detect browser language
const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0];

  if (['en', 'de', 'hu'].includes(langCode)) {
    return langCode;
  }
  return 'en'; // Default to English if not supported
};

const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

const SharedProjectView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(detectBrowserLanguage());

  // Get translations for current language
  const t = translations[language];

  // Log component initialization
  useEffect(() => {
    debugLog('SharedProjectView', 'Component initialized', { token, language });
  }, []);

  // Check for existing session on component mount
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
        const savedSession = localStorage.getItem(`project_session_${cleanToken}`);

        if (savedSession) {
          const session = JSON.parse(savedSession);
          debugLog('checkExistingSession', 'Found saved session', { project: session.project?.name });

          // Verify if session hasn't expired (24 hours)
          const sessionTime = new Date(session.timestamp).getTime();
          const currentTime = new Date().getTime();
          const sessionAge = currentTime - sessionTime;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

          if (sessionAge < maxAge) {
            debugLog('checkExistingSession', 'Session is valid, restoring', {
              age: Math.round(sessionAge / (60 * 60 * 1000)) + ' hours'
            });

            // Restore language from session
            if (session.language) {
              setLanguage(session.language);
            }

            // Ensure project has _id field for compatibility
            const projectData = session.project;
            if (projectData) {
              if (!projectData._id && projectData.id) {
                debugLog('checkExistingSession', 'Adding _id from id field');
                projectData._id = projectData.id;
              }

              setProject(projectData);
              setIsVerified(true);
            } else {
              debugLog('checkExistingSession', 'Project data missing from session');
            }
          } else {
            debugLog('checkExistingSession', 'Session expired, removing');
            localStorage.removeItem(`project_session_${cleanToken}`);
          }
        } else {
          debugLog('checkExistingSession', 'No saved session found');
        }
      } catch (error) {
        debugLog('checkExistingSession', 'Error checking session', { error });
        localStorage.removeItem(`project_session_${cleanToken}`);
      }
    };

    checkExistingSession();
  }, [token]);

  // Handle PIN verification - VISSZAÁLLÍTVA AZ EREDETI
  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Tisztítsuk meg a tokent minden extra paramétertől
    const cleanToken = token.split('?')[0];

    debugLog('verifyPin', 'Verifying PIN', { token: cleanToken, pinLength: pin.length, language });

    try {
      // Közvetlenül a /verify-pin végpontot használjuk, elkerülve a CORS problémákat
      debugLog('verifyPin', 'Attempting to verify PIN with direct endpoint');
      let response = await fetch(`${API_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ token: cleanToken, pin }),
        credentials: 'omit'  // Nem küldünk sütit a CORS problémák elkerülése érdekében
      });

      // CORS hiba ellenőrzése és kezelése
      if (!response.ok) {
        const statusCode = response.status;
        debugLog('verifyPin', `Direct endpoint failed with ${statusCode}, trying API endpoint`);

        // Különböző API útvonalak kipróbálása, mindegyiknél credentials: 'omit' használata
        try {
          response = await fetch(`${API_URL}/api/verify-pin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY,
              'Accept': 'application/json'
            },
            body: JSON.stringify({ token: cleanToken, pin }),
            credentials: 'omit'
          });

          if (!response.ok) {
            debugLog('verifyPin', `API endpoint failed with ${response.status}, trying next route`);
            response = await fetch(`${API_URL}/public/projects/verify-pin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Accept': 'application/json'
              },
              body: JSON.stringify({ token: cleanToken, pin }),
              credentials: 'omit'
            });

            if (!response.ok) {
              debugLog('verifyPin', `Public endpoint failed with ${response.status}, trying direct API call`);
              response = await fetch(`${API_URL}/api/public/projects/verify-pin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': API_KEY,
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ token: cleanToken, pin }),
                credentials: 'omit'
              });
            }
          }
        } catch (retryError) {
          debugLog('verifyPin', 'All retry attempts failed', { error: retryError.message });
          throw retryError;
        }
      }

      debugLog('verifyPin', 'API response status', { status: response.status });

      const data = await response.json();
      debugLog('verifyPin', 'API response data received');

      if (response.ok) {
        const projectData = data.project;

        // Add an _id field if it doesn't exist (for compatibility)
        if (!projectData._id) {
          debugLog('verifyPin', 'Project data needs normalization');

          if (projectData.id) {
            debugLog('verifyPin', 'Using id as _id field');
            projectData._id = projectData.id;
          } else {
            debugLog('verifyPin', 'Using token as temporary _id');
            projectData._id = token;
          }
        }

        // Debug log the project structure
        debugLog('verifyPin', 'Project loaded successfully', {
          hasId: Boolean(projectData.id),
          has_Id: Boolean(projectData._id),
          name: projectData.name
        });

        // Debug: nézd meg a projekt struktúráját, különösen az invoices tömböt
        console.log('Betöltött projekt adatok:', JSON.stringify(projectData, null, 2));
        console.log('Számlák száma:', projectData.invoices?.length || 0);

        // Save project data to state
        setProject(projectData);
        setIsVerified(true);
        setError(null);

        // Save session to localStorage with language
        // Mentjük a PIN kódot is a session-be, hogy később frissíteni tudjuk az adatokat
        const session = {
          project: projectData,
          timestamp: new Date().toISOString(),
          language: language,
          pin: pin // Mentjük a PIN kódot, hogy később is tudjuk használni a frissítéshez
        };
        localStorage.setItem(`project_session_${cleanToken}`, JSON.stringify(session));

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

  // Handle project updates
  const handleProjectUpdate = async (updatedProject) => {
    try {
      debugLog('handleProjectUpdate', 'Updating project', { projectId: updatedProject._id });

      // Save locally even if API call fails
      setProject(updatedProject);

      // Biztosítsuk, hogy a token tisztított formátumú
      const cleanToken = token.split('?')[0];

      // Mentsük a PIN kódot is a session-be, hogy később is tudjuk használni a frissítéshez
      const session = {
        project: updatedProject,
        timestamp: new Date().toISOString(),
        language: language,
        pin: pin // Mentjük a PIN kódot a frissítéshez
      };
      localStorage.setItem(`project_session_${cleanToken}`, JSON.stringify(session));

      // Try to update project on server
      try {
        // 1. Először a nyilvános verify-pin végpontot próbáljuk
        debugLog('handleProjectUpdate', 'Trying to update using verify-pin endpoint first');
        
        // Készítsünk egy updateProject objektumot a verify-pin végponthoz
        const updateProjectData = {
          token: cleanToken,
          pin: pin || '',
          updateProject: updatedProject
        };

        const verifyPinResponse = await fetch(`${API_URL}/public/projects/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify(updateProjectData),
          credentials: 'omit'
        });

        if (verifyPinResponse.ok) {
          debugLog('handleProjectUpdate', 'Project updated via verify-pin endpoint successfully');

          // Frissítsük a projektet a válasz alapján
          try {
            const responseData = await verifyPinResponse.json();
            if (responseData.project) {
              setProject(responseData.project);

              // Frissítsük a session-t is
              const updatedSession = {
                project: responseData.project,
                timestamp: new Date().toISOString(),
                language: language,
                pin: pin
              };
              localStorage.setItem(`project_session_${cleanToken}`, JSON.stringify(updatedSession));
            }
          } catch (parseError) {
            debugLog('handleProjectUpdate', 'Error parsing verify-pin response', { error: parseError });
          }
        } else {
          debugLog('handleProjectUpdate', 'Failed to update project via verify-pin endpoint', { status: verifyPinResponse.status });
          
          // 2. Ha a nyilvános végpont nem sikerült, csak akkor próbáljuk meg a közvetlen PUT kérést
          try {
            debugLog('handleProjectUpdate', 'Falling back to direct API call');
            const response = await fetch(`${API_URL}/projects/${updatedProject._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
              },
              body: JSON.stringify(updatedProject)
            });

            if (response.ok) {
              debugLog('handleProjectUpdate', 'Project updated on server successfully');
            } else {
              debugLog('handleProjectUpdate', 'Failed to update project on server', { status: response.status });
            }
          } catch (directError) {
            debugLog('handleProjectUpdate', 'Error during direct API call', { error: directError });
          }
        }
      } catch (apiError) {
        debugLog('handleProjectUpdate', 'API error when updating project', { error: apiError });
      }
    } catch (error) {
      debugLog('handleProjectUpdate', 'Error updating project', { error });
      console.error('Error updating project:', error);
    }
  };

  // Handle language change
  const handleLanguageChange = (lang) => {
    debugLog('handleLanguageChange', `Changing language to ${lang}`);
    setLanguage(lang);

    // If user is logged in, update the session with the new language
    if (isVerified && token) {
      const savedSession = localStorage.getItem(`project_session_${token}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.language = lang;
        localStorage.setItem(`project_session_${token}`, JSON.stringify(session));
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm(t.logoutConfirm)) {
      debugLog('handleLogout', 'User confirmed logout');

      // Biztosítsuk, hogy a token tisztított formátumú
      const cleanToken = token.split('?')[0];

      // Remove session but keep project-specific files and documents
      localStorage.removeItem(`project_session_${cleanToken}`);

      setIsVerified(false);
      setProject(null);
      setPin('');
      navigate(`/shared-project/${cleanToken}`);

      debugLog('handleLogout', 'Logout completed');
    } else {
      debugLog('handleLogout', 'Logout cancelled by user');
    }
  };

  // PIN verification form
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
              {t.viewProject}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t.enterPin}
            </p>
          </div>

          {/* Language selector */}
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

  // Show project dashboard after verification
  return (
    <SharedProjectDashboard
      project={project}
      language={language}
      onUpdate={handleProjectUpdate}
      onLogout={handleLogout}
      onLanguageChange={handleLanguageChange}
    />
  );
};

export default SharedProjectView;