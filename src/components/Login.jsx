import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Debug log
    console.log('Login attempt:', { email, password });
    
    if (email === 'nbartus21@gmail.com' && password === 'Atom.1993*') {
      // Debug log
      console.log('Login successful');
      
      // Először állítsuk be a sessionStorage-t
      sessionStorage.setItem('isAuthenticated', 'true');
      
      // Debug log
      console.log('SessionStorage set:', sessionStorage.getItem('isAuthenticated'));
      
      // Kis késleltetés után navigáljunk
      setTimeout(() => {
        navigate('/blog');
      }, 100);
    } else {
      setError('Hibás email vagy jelszó!');
    }
  };

  // Mount-kor ellenőrizzük a sessionStorage állapotát
  useEffect(() => {
    console.log('Current session state:', sessionStorage.getItem('isAuthenticated'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Bejelentkezés az admin felületre
          </h2>
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Bejelentkezés
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;