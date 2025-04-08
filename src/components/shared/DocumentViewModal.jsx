import React, { useState } from 'react';
import { FileText, X, Download, ChevronRight, Eye, Lock } from 'lucide-react';

// Language translations
const translations = {
  en: {
    document: 'Document',
    enterPin: 'Enter PIN',
    pinRequired: 'PIN code is required to view this document',
    pinPlaceholder: 'Enter 6-digit PIN',
    submit: 'Submit',
    invalidPin: 'Invalid PIN code',
    close: 'Close',
    downloadPdf: 'Download PDF',
    loading: 'Loading document...',
    expires: 'Link expires on',
    shared: 'Shared document'
  },
  de: {
    document: 'Dokument',
    enterPin: 'PIN eingeben',
    pinRequired: 'PIN-Code ist erforderlich, um dieses Dokument anzuzeigen',
    pinPlaceholder: '6-stellige PIN eingeben',
    submit: 'Bestätigen',
    invalidPin: 'Ungültiger PIN-Code',
    close: 'Schließen',
    downloadPdf: 'PDF herunterladen',
    loading: 'Dokument wird geladen...',
    expires: 'Link läuft ab am',
    shared: 'Geteiltes Dokument'
  },
  hu: {
    document: 'Dokumentum',
    enterPin: 'PIN kód megadása',
    pinRequired: 'A dokumentum megtekintéséhez PIN kód szükséges',
    pinPlaceholder: 'Add meg a 6 jegyű PIN kódot',
    submit: 'Belépés',
    invalidPin: 'Érvénytelen PIN kód',
    close: 'Bezárás',
    downloadPdf: 'PDF letöltése',
    loading: 'Dokumentum betöltése...',
    expires: 'Link érvényessége:',
    shared: 'Megosztott dokumentum'
  }
};

const DocumentViewModal = ({ 
  documentInfo, 
  onClose, 
  onVerifyPin, 
  documentContent = null, 
  pinError = false,
  language = 'hu'
}) => {
  const [pin, setPin] = useState('');
  const t = translations[language] || translations.hu;
  
  const handlePinSubmit = (e) => {
    e.preventDefault();
    onVerifyPin(pin);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-600" />
            {t.document}: {documentInfo.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {!documentContent ? (
            // PIN entry form
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="max-w-md w-full">
                <div className="text-center mb-6">
                  <Lock className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">{t.enterPin}</h3>
                  <p className="text-gray-500">{t.pinRequired}</p>
                </div>
                
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="pin" className="sr-only">{t.enterPin}</label>
                    <input
                      type="text"
                      id="pin"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.slice(0, 6))}
                      placeholder={t.pinPlaceholder}
                      className={`block w-full px-3 py-2 border ${pinError ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'} rounded-md shadow-sm text-center text-2xl tracking-widest`}
                      maxLength={6}
                      required
                    />
                    {pinError && (
                      <p className="mt-2 text-sm text-red-600">{t.invalidPin}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {t.expires} {new Date(documentInfo.expiresAt).toLocaleDateString(
                        language === 'hu' ? 'hu-HU' : 
                        language === 'de' ? 'de-DE' : 'en-US'
                      )}
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {t.submit}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Document content display
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-white rounded-lg border border-gray-300 p-8 max-w-4xl mx-auto shadow-sm">
                  <div dangerouslySetInnerHTML={{ __html: documentContent }} />
                </div>
              </div>
              
              <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                <span className="text-sm text-gray-500 flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {t.shared}
                </span>
                
                <a
                  href={`/api/public/documents/${documentInfo.token}/pdf?language=${language}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.downloadPdf}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;