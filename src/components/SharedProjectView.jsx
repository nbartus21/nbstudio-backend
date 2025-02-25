import React, { useState, useEffect } from 'react';
import SharedProjectDashboard from './SharedProjectDashboard';
import { Lock, AlertTriangle } from 'lucide-react';

// Helper functions to simulate routing
const useParams = () => {
  const url = window.location.href;
  const tokenMatch = url.match(/\/shared-project\/([^\/]+)/);
  return { token: tokenMatch ? tokenMatch[1] : '' };
};

const useNavigate = () => {
  return (path) => {
    window.history.pushState({}, '', path);
  };
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

  // Ellenőrizze, hogy van-e már mentett munkamenet a localStorage-ban, amikor a komponens betöltődik
  useEffect(() => {
    const checkExistingSession = () => {
      if (!token) return;

      try {
        const savedSession = localStorage.getItem(`project_session_${token}`);
        
        if (savedSession) {
          const session = JSON.parse(savedSession);
          
          // Ellenőrizze, hogy a munkamenet nem járt-e le (24 óra)
          const sessionTime = new Date(session.timestamp).getTime();
          const currentTime = new Date().getTime();
          const sessionAge = currentTime - sessionTime;
          const maxAge = 24 * 60 * 60 * 1000; // 24 óra milliszekundumban
          
          if (sessionAge < maxAge) {
            console.log('Munkamenet visszaállítása a projekt számára', session.project.name);
            setProject(session.project);
            setIsVerified(true);
          } else {
            console.log('A munkamenet lejárt, eltávolítás');
            localStorage.removeItem(`project_session_${token}`);
          }
        }
      } catch (error) {
        console.error('Hiba a munkamenet ellenőrzésekor:', error);
        localStorage.removeItem(`project_session_${token}`);
      }
    };

    checkExistingSession();
  }, [token]);

  // Amikor a PIN sikeresen ellenőrződik
  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/public/projects/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ token, pin })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Adjon hozzá egy _id mezőt, ha nem létezik (kompatibilitás érdekében)
        if (!data.project._id && data.project.id) {
          data.project._id = data.project.id;
        }
        
        // Projekt adatok mentése
        setProject(data.project);
        setIsVerified(true);
        setError(null);
        
        // Munkamenet mentése a localStorage-ba
        const session = {
          project: data.project,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`project_session_${token}`, JSON.stringify(session));
        
        console.log('Munkamenet mentve a projekt számára', data.project.name);
      } else {
        setError(data.message || 'Érvénytelen PIN kód');
      }
    } catch (error) {
      console.error('Hiba történt:', error);
      setError('Hiba történt az ellenőrzés során');
    } finally {
      setLoading(false);
    }
  };

  // Projekt frissítése
  const handleProjectUpdate = async (updatedProject) => {
    try {
      const response = await fetch(`${API_URL}/projects/${project._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(updatedProject)
      });

      if (response.ok) {
        setProject(updatedProject);
        
        // Munkamenet frissítése a localStorage-ban
        const session = {
          project: updatedProject,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`project_session_${token}`, JSON.stringify(session));
      } else {
        console.error('Nem sikerült frissíteni a projektet');
      }
    } catch (error) {
      console.error('Hiba a projekt frissítésekor:', error);
    }
  };
  
  // Kijelentkezés kezelése
  const handleLogout = () => {
    if (window.confirm('Biztosan ki szeretne lépni?')) {
      // Csak a munkamenet eltávolítása, de a projekt-specifikus fájlok és megjegyzések megtartása
      localStorage.removeItem(`project_session_${token}`);
      
      setIsVerified(false);
      setProject(null);
      setPin('');
      navigate(`/shared-project/${token}`);
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
              Projekt megtekintése
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Kérjük, adja meg a PIN kódot a hozzáféréshez
            </p>
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
                PIN kód
              </label>
              <input
                id="pin"
                type="text"
                maxLength="6"
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 számjegyű PIN kód"
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
                    Ellenőrzés...
                  </>
                ) : (
                  'Belépés a projektbe'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Projekt irányítópult megjelenítése ellenőrzés után
  return (
    <SharedProjectDashboard 
      project={project}
      onUpdate={handleProjectUpdate}
      onLogout={handleLogout}
    />
  );
};

export default SharedProjectView;