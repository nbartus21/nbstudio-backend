import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle, Globe, Check, FileText, ThumbsUp, ThumbsDown, X } from 'lucide-react';
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
    logoutConfirm: "Are you sure you want to log out?",
    noDocument: "No document loaded",
    selectDocument: "Please select a document or log in again",
    back: "Back",
    documentInfo: "Document Information",
    documentName: "Document Name",
    createdAt: "Created At",
    approve: "Approve Document",
    reject: "Reject Document",
    comment: "Comment (optional)",
    commentPlaceholder: "Add your comments here...",
    submit: "Submit Response",
    approveConfirm: "Are you sure you want to approve this document?",
    rejectConfirm: "Are you sure you want to reject this document?",
    responseSuccess: "Your response has been submitted successfully",
    responseError: "An error occurred while submitting your response",
    downloadPdf: "Download PDF",
    documentApproved: "Document Approved",
    documentRejected: "Document Rejected",
    thankYou: "Thank you for your response",
    close: "Close",
  },
  de: {
    viewDocument: "Dokument anzeigen",
    enterPin: "Bitte geben Sie den PIN-Code ein, um zuzugreifen",
    pin: "PIN-Code",
    pinPlaceholder: "6-stelliger PIN-Code",
    login: "Dokument anzeigen",
    checking: "Überprüfung...",
    invalidPin: "Ungültiger PIN-Code",
    errorOccurred: "Bei der Überprüfung ist ein Fehler aufgetreten",
    logoutConfirm: "Sind Sie sicher, dass Sie sich abmelden möchten?",
    noDocument: "Kein Dokument geladen",
    selectDocument: "Bitte wählen Sie ein Dokument aus oder melden Sie sich erneut an",
    back: "Zurück",
    documentInfo: "Dokumentinformationen",
    documentName: "Dokumentname",
    createdAt: "Erstellt am",
    approve: "Dokument genehmigen",
    reject: "Dokument ablehnen",
    comment: "Kommentar (optional)",
    commentPlaceholder: "Fügen Sie hier Ihre Kommentare hinzu...",
    submit: "Antwort senden",
    approveConfirm: "Sind Sie sicher, dass Sie dieses Dokument genehmigen möchten?",
    rejectConfirm: "Sind Sie sicher, dass Sie dieses Dokument ablehnen möchten?",
    responseSuccess: "Ihre Antwort wurde erfolgreich übermittelt",
    responseError: "Beim Senden Ihrer Antwort ist ein Fehler aufgetreten",
    downloadPdf: "PDF herunterladen",
    documentApproved: "Dokument genehmigt",
    documentRejected: "Dokument abgelehnt",
    thankYou: "Vielen Dank für Ihre Antwort",
    close: "Schließen",
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
    logoutConfirm: "Biztosan ki szeretne jelentkezni?",
    noDocument: "Nincs betöltött dokumentum",
    selectDocument: "Kérjük, válasszon dokumentumot vagy jelentkezzen be újra",
    back: "Vissza",
    documentInfo: "Dokumentum információk",
    documentName: "Dokumentum neve",
    createdAt: "Létrehozva",
    approve: "Dokumentum jóváhagyása",
    reject: "Dokumentum elutasítása",
    comment: "Megjegyzés (opcionális)",
    commentPlaceholder: "Adja meg megjegyzéseit itt...",
    submit: "Válasz küldése",
    approveConfirm: "Biztosan jóváhagyja ezt a dokumentumot?",
    rejectConfirm: "Biztosan elutasítja ezt a dokumentumot?",
    responseSuccess: "Válaszát sikeresen elküldtük",
    responseError: "Hiba történt a válasz küldése közben",
    downloadPdf: "PDF letöltése",
    documentApproved: "Dokumentum jóváhagyva",
    documentRejected: "Dokumentum elutasítva",
    thankYou: "Köszönjük a válaszát",
    close: "Bezárás",
  }
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
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(detectBrowserLanguage());
  const [comment, setComment] = useState('');
  const [responseType, setResponseType] = useState(null); // 'approve' or 'reject'
  const [showConfirm, setShowConfirm] = useState(false);
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState(false);

  // Get translations for current language
  const t = translations[language];

  // Log component initialization
  useEffect(() => {
    debugLog('SharedDocumentView', 'Component initialized', { token, language });
  }, []);

  // Check for existing session
  useEffect(() => {
    if (token) {
      const savedSession = localStorage.getItem(`document_session_${token}`);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          debugLog('SharedDocumentView', 'Found existing session', { session });

          // Check if session is still valid (24 hours)
          const sessionTime = new Date(session.timestamp);
          const now = new Date();
          const hoursSinceSession = (now - sessionTime) / (1000 * 60 * 60);

          if (hoursSinceSession < 24) {
            setDocument(session.document);
            setIsVerified(true);
            setPin(session.pin);
            setLanguage(session.language || language);
            debugLog('SharedDocumentView', 'Restored session', { documentId: session.document._id });
          } else {
            debugLog('SharedDocumentView', 'Session expired, removing', { hoursSinceSession });
            localStorage.removeItem(`document_session_${token}`);
          }
        } catch (error) {
          console.error('Error parsing saved session:', error);
          localStorage.removeItem(`document_session_${token}`);
        }
      } else {
        // If no session, fetch basic document info
        fetchDocumentInfo();
      }
    }
  }, [token]);

  // Fetch basic document info (before PIN verification)
  const fetchDocumentInfo = async () => {
    try {
      debugLog('fetchDocumentInfo', 'Fetching document info', { token });

      const response = await fetch(`${API_URL}/public/shared-document/${token}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });

      if (!response.ok) {
        // Próbáljuk meg kiolvasni a hibaüzenetet
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch document info');
        } catch (jsonError) {
          // Ha nem sikerül a JSON parse, akkor használjuk a status text-et
          throw new Error(`Failed to fetch document info: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      debugLog('fetchDocumentInfo', 'Document info fetched successfully', { data });

      // We don't set the document state here, just log the info
      // The full document will be fetched after PIN verification
    } catch (error) {
      console.error('Error fetching document info:', error);
      setError(error.message);
    }
  };

  // Handle PIN verification
  const handleVerify = async (e) => {
    e.preventDefault();

    if (!pin || pin.length < 4) {
      setError('Please enter a valid PIN code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      debugLog('handleVerify', 'Verifying PIN', { token, pin });

      const response = await fetch(`${API_URL}/public/shared-document/${token}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      if (!response.ok) {
        // Próbáljuk meg kiolvasni a hibaüzenetet
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'PIN verification failed');
        } catch (jsonError) {
          // Ha nem sikerül a JSON parse, akkor használjuk a status text-et
          throw new Error(`PIN verification failed: ${response.status} ${response.statusText}`);
        }
      }

      const documentData = await response.json();
      debugLog('handleVerify', 'PIN verified successfully', { documentData });

      // Save document data to state
      setDocument(documentData);
      setIsVerified(true);
      setError(null);

      // Save session to localStorage with language
      const session = {
        document: documentData,
        timestamp: new Date().toISOString(),
        language: language,
        pin: pin
      };
      localStorage.setItem(`document_session_${token}`, JSON.stringify(session));
    } catch (error) {
      console.error('Error during PIN verification:', error);
      setError(error.message || 'PIN verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm(t.logoutConfirm)) {
      localStorage.removeItem(`document_session_${token}`);
      setDocument(null);
      setIsVerified(false);
      setPin('');
      setError(null);
    }
  };

  // Handle language change
  const handleLanguageChange = (lang) => {
    debugLog('handleLanguageChange', `Changing language to ${lang}`);
    setLanguage(lang);

    // If user is logged in, update the session with the new language
    if (isVerified && token) {
      const savedSession = localStorage.getItem(`document_session_${token}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.language = lang;
        localStorage.setItem(`document_session_${token}`, JSON.stringify(session));
      }
    }
  };

  // Handle document download
  const handleDownload = async () => {
    try {
      debugLog('handleDownload', 'Downloading document', { documentId: document.id });

      const response = await fetch(`${API_URL}/public/documents/${document.id}/pdf?language=${language}`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Get blob from response
      const blob = await response.blob();

      // Create download link for blob
      const url = window.URL.createObjectURL(blob);
      const fileName = language === 'hu' ? `dokumentum-${document.name}.pdf` :
                      (language === 'de' ? `dokument-${document.name}.pdf` : `document-${document.name}.pdf`);

      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError(error.message);
    }
  };

  // Handle response submission (approve/reject)
  const handleResponseSubmit = async () => {
    if (!responseType) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      debugLog('handleResponseSubmit', 'Submitting response', {
        token,
        responseType,
        comment,
        pin
      });

      const response = await fetch(`${API_URL}/public/shared-document/${token}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          response: responseType,
          comment,
          pin
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit response');
      }

      const data = await response.json();
      debugLog('handleResponseSubmit', 'Response submitted successfully', { data });

      setResponseSubmitted(true);
      setResponseSuccess(true);

      // Update document status in session
      const savedSession = localStorage.getItem(`document_session_${token}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.document.approvalStatus = data.documentStatus;
        localStorage.setItem(`document_session_${token}`, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      setError(error.message);
      setResponseSuccess(false);
    } finally {
      setLoading(false);
      setShowConfirm(false);
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
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t.viewDocument}
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

          <form className="mt-8 space-y-6" onSubmit={handleVerify}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="pin" className="sr-only">
                  {t.pin}
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="text"
                  autoComplete="off"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder={t.pinPlaceholder}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? t.checking : t.login}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show response success/error message
  if (responseSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className={`h-16 w-16 rounded-full ${responseSuccess ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
              {responseSuccess ? (
                <ThumbsUp className={`h-8 w-8 ${responseSuccess ? 'text-green-600' : 'text-red-600'}`} />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4">
            {responseSuccess
              ? (responseType === 'approve' ? t.documentApproved : t.documentRejected)
              : t.responseError
            }
          </h2>

          {responseSuccess && (
            <p className="text-gray-600 mb-6">{t.thankYou}</p>
          )}

          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation dialog
  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium mb-4">
            {responseType === 'approve' ? t.approveConfirm : t.rejectConfirm}
          </h3>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {t.back}
            </button>
            <button
              onClick={handleResponseSubmit}
              className={`px-4 py-2 rounded-md text-white ${
                responseType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {responseType === 'approve' ? t.approve : t.reject}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Document view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            {document?.name || t.viewDocument}
          </h1>

          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleLanguageChange('hu')}
                className={`px-2 py-1 rounded-md text-xs font-medium border ${
                  language === 'hu'
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                HU
              </button>
              <button
                onClick={() => handleLanguageChange('de')}
                className={`px-2 py-1 rounded-md text-xs font-medium border ${
                  language === 'de'
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                DE
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 rounded-md text-xs font-medium border ${
                  language === 'en'
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Document content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* Document content */}
              <div className="flex-1 min-h-[500px] border rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: document?.content }} />
              </div>

              {/* Sidebar */}
              <div className="md:w-80 md:ml-6 mt-6 md:mt-0">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">{t.documentInfo}</h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">{t.documentName}</p>
                      <p className="font-medium">{document?.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">{t.createdAt}</p>
                      <p className="font-medium">
                        {document?.createdAt && new Date(document.createdAt).toLocaleDateString(
                          language === 'hu' ? 'hu-HU' : (language === 'de' ? 'de-DE' : 'en-US')
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {t.downloadPdf}
                  </button>
                </div>

                {/* Response form */}
                <div className="bg-white border rounded-lg p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                        {t.comment}
                      </label>
                      <textarea
                        id="comment"
                        name="comment"
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder={t.commentPlaceholder}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setResponseType('approve');
                          setShowConfirm(true);
                        }}
                        className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        {t.approve}
                      </button>

                      <button
                        onClick={() => {
                          setResponseType('reject');
                          setShowConfirm(true);
                        }}
                        className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        {t.reject}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharedDocumentView;
