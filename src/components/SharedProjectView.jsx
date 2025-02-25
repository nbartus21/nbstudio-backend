import React, { useState } from 'react';
import SharedProjectDashboard from './SharedProjectDashboard';
import { Lock, AlertTriangle } from 'lucide-react';

// Mock functions to handle routing since we can't import react-router-dom
const useParams = () => {
  // Get token from URL
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

const SharedProjectView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle PIN verification
  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/public/projects/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        },
        body: JSON.stringify({ token, pin })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProject(data.project);
        setIsVerified(true);
        setError(null);
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

  // Handle project updates
  const handleProjectUpdate = async (updatedProject) => {
    try {
      const response = await fetch(`${API_URL}/projects/${project._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        },
        body: JSON.stringify(updatedProject)
      });

      if (response.ok) {
        setProject(updatedProject);
      } else {
        console.error('Nem sikerült frissíteni a projektet');
      }
    } catch (error) {
      console.error('Hiba a projekt frissítésekor:', error);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Biztosan ki szeretne lépni?')) {
      setIsVerified(false);
      setProject(null);
      setPin('');
      navigate(`/shared-project/${token}`);
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

  // Show project dashboard after verification
  return (
    <SharedProjectDashboard 
      project={project}
      onUpdate={handleProjectUpdate}
      onLogout={handleLogout}
    />
  );
};

export default SharedProjectView;