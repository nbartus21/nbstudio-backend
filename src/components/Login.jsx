import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BiometricAuth from './BiometricAuth';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const biometricRef = useRef(null); // useRef használata

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://admin.nb-studio.net:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Bejelentkezési hiba');
      }

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('isAuthenticated', 'true');

      // Ha még nincs beállítva biometrikus bejelentkezés, felajánljuk
      const biometricCredential = localStorage.getItem('biometricCredential');
      if (!biometricCredential && biometricRef.current) { // .current ellenőrzése
        setShowBiometricPrompt(true);
      } else {
        navigate('/blog');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Hibás email vagy jelszó!');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async (savedEmail) => {
    if (savedEmail) {
      setEmail(savedEmail);
      await handleLogin();
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem('isAuthenticated');
    const token = sessionStorage.getItem('token');
    
    if (isAuth && token) {
      navigate('/blog');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Bejelentkezés az admin felületre
          </h2>
        </div>

        <BiometricAuth 
          ref={biometricRef} // useRef használata
          onAuthSuccess={handleBiometricAuth} 
        />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">
              vagy
            </span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email cím
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email cím"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Jelszó
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Jelszó"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </button>
          </div>
        </form>

        {/* Biometrikus beállítás prompt */}
        {showBiometricPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium mb-4">Biometrikus bejelentkezés beállítása</h3>
              <p className="text-sm text-gray-600 mb-4">
                Szeretné beállítani a biometrikus bejelentkezést? Így a következő alkalommal 
                egyszerűbben tud bejelentkezni.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowBiometricPrompt(false);
                    navigate('/blog');
                  }}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Most nem
                </button>
                <button
                  onClick={async () => {
                    if (biometricRef.current) { // .current használata
                      await biometricRef.current.registerBiometric(email);
                    }
                    setShowBiometricPrompt(false);
                    navigate('/blog');
                  }}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Beállítás
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;