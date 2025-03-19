import React, { useState, useEffect } from 'react';
import { Lock, AlertTriangle, FileText, X } from 'lucide-react';
import { debugLog } from './shared/utils';

// Translation data for all UI elements
const translations = {
  en: {
    viewDocument: "View Document",
    enterPin: "Please enter the PIN code to access",
    pin: "PIN code",
    pinPlaceholder: "6-digit PIN code",
    login: "View document",
    checking: "Checking...",
    invalidPin: "Invalid PIN code",
    errorOccurred: "An error occurred during verification",
    document: "Document"
  },
  de: {
    viewDocument: "Dokument ansehen",
    enterPin: "Bitte geben Sie den PIN-Code für den Zugriff ein",
    pin: "PIN-Code",
    pinPlaceholder: "6-stelliger PIN-Code",
    login: "Dokument ansehen",
    checking: "Überprüfung...",
    invalidPin: "Ungültiger PIN-Code",
    errorOccurred: "Bei der Überprüfung ist ein Fehler aufgetreten",
    document: "Dokument"
  },
  hu: {
    viewDocument: "Dokumentum megtekintése",
    enterPin: "Kérjük, adja meg a PIN kódot a hozzáféréshez",
    pin: "PIN kód",
    pinPlaceholder: "6 számjegyű PIN kód",
    login: "Dokumentum megtekintése",
    checking: "Ellenőrzés...",
    invalidPin: "Érvénytelen PIN kód",
    errorOccurred: "Hiba történt az ellenőrzés során",
    document: "Dokumentum"
  }
};

// Helper functions to simulate routing
const useParams = () => {
  const url = window.location.href;
  const tokenMatch = url.match(/\/shared-document\/([^\/]+)/);
  return { token: tokenMatch ? tokenMatch[1] : '' };
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

const SharedDocumentView = () => {
  const { token } = useParams();
  const [document, setDocument] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(detectBrowserLanguage());

  // Get translations for current language
  const t = translations[language];

  // Log component initialization
  useEffect(() => {
    debugLog('SharedDocumentView', 'Component initialized', { token, language });
    fetchDocumentInfo();
  }, []);

  // Fetch document info
  const fetchDocumentInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/public/shared-document/${token}/info`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Hiba történt a dokumentum információk lekérésekor');
      }

      const data = await response.json();
      setDocument(data);
    } catch (error) {
      console.error('Error fetching document info:', error);
      setError(error.message);
    }
  };

  // Handle PIN verification
  const verifyPin = async (e) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 6) {
      setError(t.invalidPin);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/public/shared-document/${token}/verify`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.invalidPin);
      }

      setDocument(data);
      setIsVerified(true);
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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
              {t.viewDocument}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {document?.name || t.enterPin}
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
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

  // Show document content after verification
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-600" />
            {t.document}: {document.name}
          </h3>
        </div>
        
        <div className="flex-1 p-6 overflow-auto">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default SharedDocumentView; 