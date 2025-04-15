import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/auth';

const ClientLogin = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('hu');
  const navigate = useNavigate();

  useEffect(() => {
    // Ellenőrizzük, hogy a kliens már be van-e jelentkezve
    const isAuthenticated = sessionStorage.getItem('clientAuthenticated') === 'true';
    if (isAuthenticated) {
      navigate('/client/projects');
    }

    // Navigátor nyelv lekérése
    const browserLang = navigator.language.substring(0, 2);
    if (['hu', 'en', 'de'].includes(browserLang)) {
      setLanguage(browserLang);
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Hibás email vagy jelszó');
      }
      
      // Kliens authentikáció mentése
      sessionStorage.setItem('clientAuthenticated', 'true');
      sessionStorage.setItem('clientToken', data.token);
      sessionStorage.setItem('clientUser', JSON.stringify(data.user));
      sessionStorage.setItem('clientLanguage', data.user.language || language);
      
      navigate('/client/projects');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  // Többnyelvű címkék
  const translations = {
    title: {
      hu: 'Ügyfél belépés',
      en: 'Client Login',
      de: 'Kunden Login'
    },
    emailLabel: {
      hu: 'Email cím',
      en: 'Email address',
      de: 'E-Mail-Adresse'
    },
    passwordLabel: {
      hu: 'Jelszó',
      en: 'Password',
      de: 'Passwort'
    },
    rememberMe: {
      hu: 'Emlékezz rám',
      en: 'Remember me',
      de: 'Angemeldet bleiben'
    },
    forgotPassword: {
      hu: 'Elfelejtett jelszó?',
      en: 'Forgot password?',
      de: 'Passwort vergessen?'
    },
    loginButton: {
      hu: 'Bejelentkezés',
      en: 'Sign in',
      de: 'Anmelden'
    },
    loading: {
      hu: 'Bejelentkezés...',
      en: 'Signing in...',
      de: 'Anmeldung...'
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img 
              className="h-14 w-auto" 
              src="/logo.png" 
              alt="NB Studio" 
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {translations.title[language]}
          </h2>

          {/* Nyelválasztó */}
          <div className="mt-4 flex justify-center space-x-4">
            <button 
              onClick={() => handleLanguageChange('hu')}
              className={`px-3 py-1 rounded ${language === 'hu' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              HU
            </button>
            <button 
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded ${language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              EN
            </button>
            <button 
              onClick={() => handleLanguageChange('de')}
              className={`px-3 py-1 rounded ${language === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              DE
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">{translations.emailLabel[language]}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={credentials.email}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={translations.emailLabel[language]}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{translations.passwordLabel[language]}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={translations.passwordLabel[language]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                {translations.rememberMe[language]}
              </label>
            </div>

            <div className="text-sm">
              <Link to="/client/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                {translations.forgotPassword[language]}
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? translations.loading[language] : translations.loginButton[language]}
            </button>
          </div>

          {/* Admin belépés link */}
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Admin belépés
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientLogin; 