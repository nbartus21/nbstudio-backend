import React, { useState, useEffect } from 'react';
import { FileText, X, Download } from 'lucide-react';
import { formatFileSize, formatDate, debugLog } from './utils';
import { getS3Url } from '../../services/s3Service';

// Translation data for all UI elements
const translations = {
  en: {
    file: "File",
    close: "Close",
    download: "Download",
    uploadedOn: "Uploaded on",
    previewNotSupported: "File preview not supported",
    size: "Size",
    type: "Type",
    loading: "Loading...",
    previewNotAvailable: "Preview not available"
  },
  de: {
    file: "Datei",
    close: "Schließen",
    download: "Herunterladen",
    uploadedOn: "Hochgeladen am",
    previewNotSupported: "Dateivorschau wird nicht unterstützt",
    size: "Größe",
    type: "Typ",
    loading: "Laden...",
    previewNotAvailable: "Vorschau nicht verfügbar"
  },
  hu: {
    file: "Fájl",
    close: "Bezárás",
    download: "Letöltés",
    uploadedOn: "Feltöltve",
    previewNotSupported: "A fájl előnézete nem támogatott",
    size: "Méret",
    type: "Típus",
    loading: "Betöltés...",
    previewNotAvailable: "Nem elérhető előnézet"
  }
};

const FilePreviewModal = ({ file, onClose, language = 'hu' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const isImage = file.type?.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  
  // S3 URL kezelése
  const fileUrl = file.s3url || (file.s3key ? getS3Url(file.s3key) : file.content);
  
  // Get translations for current language
  const t = translations[language] || translations.hu;

  useEffect(() => {
    // Add a slight delay to show the loading indicator
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!file) {
    debugLog('FilePreviewModal', 'No file provided');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium truncate">{file.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-2 flex items-center justify-center min-h-[60vh] relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              <p className="mt-4 text-gray-500">{t.loading}</p>
            </div>
          ) : (
            <>
              {isImage && (
                <img 
                  src={fileUrl} 
                  alt={file.name} 
                  className="max-h-full max-w-full object-contain"
                  onError={() => showError(true)}
                />
              )}
              {isPdf && (
                <iframe
                  src={fileUrl}
                  className="w-full h-full min-h-[60vh]"
                  title={file.name}
                ></iframe>
              )}
              {!isImage && !isPdf && (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p>{t.previewNotAvailable}</p>
                  <a 
                    href={fileUrl}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t.download}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {t.uploadedOn}: {formatDate(file.uploadedAt)}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                debugLog('FilePreviewModal-download', 'Downloading file', { fileName: file.name });
                const link = document.createElement('a');
                link.href = file.content;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              {t.download}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;