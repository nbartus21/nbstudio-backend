import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ClientProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('hu');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Többnyelvű feliratok
  const translations = {
    title: {
      hu: 'Projektjeim',
      en: 'My Projects',
      de: 'Meine Projekte'
    },
    noProjects: {
      hu: 'Nincsenek hozzárendelt projektek.',
      en: 'No projects assigned yet.',
      de: 'Noch keine Projekte zugewiesen.'
    },
    status: {
      hu: {
        aktív: 'Aktív',
        befejezett: 'Befejezett',
        felfüggesztett: 'Felfüggesztett',
        törölt: 'Törölt'
      },
      en: {
        aktív: 'Active',
        befejezett: 'Completed',
        felfüggesztett: 'Suspended',
        törölt: 'Deleted'
      },
      de: {
        aktív: 'Aktiv',
        befejezett: 'Abgeschlossen',
        felfüggesztett: 'Ausgesetzt',
        törölt: 'Gelöscht'
      }
    },
    details: {
      hu: 'Részletek',
      en: 'Details',
      de: 'Details'
    },
    logoutButton: {
      hu: 'Kijelentkezés',
      en: 'Logout',
      de: 'Abmelden'
    },
    welcome: {
      hu: 'Üdvözöljük,',
      en: 'Welcome,',
      de: 'Willkommen,'
    },
    profile: {
      hu: 'Profil',
      en: 'Profile',
      de: 'Profil'
    }
  };

  useEffect(() => {
    // Ellenőrizzük, hogy a kliens be van-e jelentkezve
    const isAuthenticated = sessionStorage.getItem('clientAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/client/login');
      return;
    }

    // Felhasználói adatok betöltése session storage-ból
    const clientLanguage = sessionStorage.getItem('clientLanguage');
    if (clientLanguage && ['hu', 'en', 'de'].includes(clientLanguage)) {
      setLanguage(clientLanguage);
    }

    const userStr = sessionStorage.getItem('clientUser');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }

    // Projektek lekérése a szervertől
    fetchProjects();
  }, [navigate]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('clientToken');
      
      const response = await fetch('/api/users/me/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token lejárt vagy érvénytelen, vissza a bejelentkezéshez
          sessionStorage.removeItem('clientAuthenticated');
          sessionStorage.removeItem('clientToken');
          sessionStorage.removeItem('clientUser');
          navigate('/client/login');
          return;
        }
        throw new Error('Nem sikerült betölteni a projekteket');
      }

      const data = await response.json();
      setProjects(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Kijelentkezés - session adatok törlése
    sessionStorage.removeItem('clientAuthenticated');
    sessionStorage.removeItem('clientToken');
    sessionStorage.removeItem('clientUser');
    navigate('/client/login');
  };

  // Státusz osztályok
  const statusClasses = {
    aktív: 'bg-green-100 text-green-800',
    befejezett: 'bg-blue-100 text-blue-800',
    felfüggesztett: 'bg-yellow-100 text-yellow-800',
    törölt: 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fejléc */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {translations.title[language]}
          </h1>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-sm text-gray-700">
                {translations.welcome[language]} <span className="font-medium">{user.name}</span>
              </div>
            )}
            <Link 
              to="/client/profile" 
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {translations.profile[language]}
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {translations.logoutButton[language]}
            </button>
          </div>
        </div>
      </header>

      {/* Fő tartalom */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center text-gray-500">
            {translations.noProjects[language]}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <div key={project._id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{project.name}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[project.status]}`}>
                      {translations.status[language][project.status]}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {project.description || ' '}
                    </p>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block font-medium">Start:</span>
                        <span>{new Date(project.startDate).toLocaleDateString()}</span>
                      </div>
                      {project.expectedEndDate && (
                        <div>
                          <span className="block font-medium">Várható befejezés:</span>
                          <span>{new Date(project.expectedEndDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-5 py-3">
                  <Link
                    to={`/client/projects/${project._id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {translations.details[language]} &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientProjects; 