import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { api } from '../services/auth';

const QRLogin = () => {
  const [sessionId, setSessionId] = useState('');
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loginStatus, setLoginStatus] = useState('pending'); // pending, success, expired
  const navigate = useNavigate();

  // Initialize QR session
  useEffect(() => {
    const createQRSession = async () => {
      try {
        setLoading(true);
        const response = await api.post('/api/auth/qr-session');
        const data = await response.json();
        
        setSessionId(data.sessionId);
        setQrData(data.qrCode);
        setLoading(false);
        
        // Start polling for authentication status
        startPolling(data.sessionId);
      } catch (error) {
        console.error('Error creating QR session:', error);
        setError('Nem sikerült létrehozni a QR bejelentkezési kódot');
        setLoading(false);
      }
    };

    createQRSession();
  }, []);

  // Poll for authentication status
  const startPolling = (sid) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/api/auth/qr-session-status/${sid}`);
        const data = await response.json();
        
        if (data.status === 'authenticated') {
          clearInterval(pollInterval);
          setLoginStatus('success');
          
          // Save auth token and redirect
          sessionStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('email', data.email);
          
          // Allow time for success message to be seen
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else if (data.status === 'expired') {
          clearInterval(pollInterval);
          setLoginStatus('expired');
        }
      } catch (error) {
        console.error('Error polling QR session status:', error);
        clearInterval(pollInterval);
        setError('Hiba történt a bejelentkezési állapot ellenőrzésekor');
      }
    }, 2000); // Poll every 2 seconds

    // Clean up interval on component unmount
    return () => clearInterval(pollInterval);
  };

  // Refresh QR code
  const refreshQRCode = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/qr-session');
      const data = await response.json();
      
      setSessionId(data.sessionId);
      setQrData(data.qrCode);
      setLoginStatus('pending');
      setLoading(false);
      
      // Start polling for new session
      startPolling(data.sessionId);
    } catch (error) {
      console.error('Error refreshing QR session:', error);
      setError('Nem sikerült frissíteni a QR kódot');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            QR kód bejelentkezés
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Mobilalkalmazásával szkennelve a QR kódot jelentkezzen be
          </p>
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

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : loginStatus === 'success' ? (
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Sikeres bejelentkezés!</h3>
              <p className="mt-1 text-sm text-gray-500">Átirányítás folyamatban...</p>
            </div>
          ) : loginStatus === 'expired' ? (
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">QR kód lejárt</h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">Kérjük, frissítse a QR kódot</p>
              <button
                onClick={refreshQRCode}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                QR kód frissítése
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <QRCode
                  value={qrData}
                  size={200}
                  level={"H"}
                  includeMargin={true}
                  renderAs={"svg"}
                />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Ez a QR kód 5 percig érvényes. <br />
                Olvassa be a NB Studio mobilalkalmazással.
              </p>
              <div className="flex justify-center space-x-4">
                <a
                  href="https://apps.apple.com/app/nb-studio-authenticator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.462 8.293a5.47 5.47 0 0 0-1.272-1.667 5.34 5.34 0 0 0-4.135-1.417c-1.535.123-2.934.885-3.746 2.083a5.41 5.41 0 0 0-.691 4.403 10.82 10.82 0 0 0 1.474 3.35c.764 1.228 1.629 2.392 2.935 3.276a5.29 5.29 0 0 0 2.955.971.79.79 0 0 0 .087-.005 5.282 5.282 0 0 0 3.029-.971c1.306-.884 2.195-2.054 2.935-3.277a10.755 10.755 0 0 0 1.474-3.349 5.39 5.39 0 0 0-.691-4.403 5.207 5.207 0 0 0-3.746-2.083 5.47 5.47 0 0 0-.608.09z" />
                    <path d="M20.087 11.292a4.072 4.072 0 0 0-.498-3.169c-.554-.892-1.392-1.48-2.335-1.605a3.734 3.734 0 0 0-2.834.833c-.353.294-.667.64-.926 1.022a4.213 4.213 0 0 0-.926-1.023 3.733 3.733 0 0 0-2.834-.833c-.943.126-1.805.726-2.335 1.605a4.06 4.06 0 0 0-.498 3.169 9.6 9.6 0 0 0 1.296 2.996c.671 1.096 1.437 2.143 2.598 2.79a3.884 3.884 0 0 0 2.099.727c.073 0 .341-.018.407-.023a3.896 3.896 0 0 0 2.1-.7c1.147-.647 1.913-1.692 2.598-2.79a9.595 9.595 0 0 0 1.288-3.004v.006zm-3.413-1.937c.32.218.581.515.759.857.178.342.25.728.209 1.111a5.312 5.312 0 0 1-.759 1.97 7.674 7.674 0 0 1-1.238 1.582 2.951 2.951 0 0 1-1.897.788 1.307 1.307 0 0 1-.213 0 2.97 2.97 0 0 1-1.92-.818 7.652 7.652 0 0 1-1.222-1.563 5.304 5.304 0 0 1-.762-1.96 2.078 2.078 0 0 1 .997-1.967c.35-.183.742-.275 1.138-.268.396.007.786.111 1.13.304.343.193.639.467.857.8.219-.335.517-.609.861-.8a2.532 2.532 0 0 1 2.267-.036z" />
                  </svg>
                  App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=net.nb-studio.authenticator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.9 5.6c-.6-.2-1.2-.4-1.9-.4-1.5 0-2.9.6-3.9 1.7l-1.2 1.5-1.2-1.5c-1-1.1-2.4-1.7-3.9-1.7-.7 0-1.3.1-1.9.4C1.8 6.6.5 9.2.5 12c0 2.8 2 5.4 5.1 5.4 1.5 0 2.9-.6 3.9-1.7l1.2-1.5 1.2 1.5c1 1.1 2.4 1.7 3.9 1.7 3.1 0 5.1-2.6 5.1-5.4-.1-2.8-1.4-5.4-3-6.4zm-13 9.8c-1.8 0-3.5-1.5-3.5-3.4 0-1.9 1.7-3.4 3.5-3.4s3.5 1.5 3.5 3.4c0 1.9-1.7 3.4-3.5 3.4zm13.1 0c-1.8 0-3.5-1.5-3.5-3.4 0-1.9 1.7-3.4 3.5-3.4s3.5 1.5 3.5 3.4c0 1.9-1.7 3.4-3.5 3.4z" />
                  </svg>
                  Google Play
                </a>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Vagy használja másik bejelentkezési módot
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Email/Jelszó
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRLogin;