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
    previewNotAvailable: "Preview not available",
    uploadedBy: "Uploaded by",
    loadError: "Error loading file",
    unknown: "Unknown"
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
    previewNotAvailable: "Vorschau nicht verfügbar",
    uploadedBy: "Hochgeladen von",
    loadError: "Fehler beim Laden der Datei",
    unknown: "Unbekannt"
  },
  hu: {
    file: "Fájl",
    close: "Bezárás",
    download: "Letöltés",
    uploadedOn: "Feltöltés ideje",
    previewNotSupported: "A fájl előnézete nem támogatott",
    size: "Méret",
    type: "Típus",
    loading: "Betöltés...",
    previewNotAvailable: "Nem elérhető előnézet",
    uploadedBy: "Feltöltő",
    loadError: "Hiba a fájl betöltésekor",
    unknown: "Ismeretlen"
  }
};

const FilePreviewModal = ({ file, onClose, language = 'hu' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const isImage = file.type?.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  
  console.log('🖼️ Fájl előnézet megnyitása:', {
    név: file.name,
    méret: formatFileSize(file.size),
    típus: file.type,
    feltöltésIdeje: file.uploadedAt,
    s3url: file.s3url || 'nincs',
    s3key: file.s3key || 'nincs',
    vanTartalom: Boolean(file.content),
    feltöltő: file.uploadedBy || 'ismeretlen'
  });
  
  // S3 URL kezelése
  const fileUrl = file.s3url || (file.s3key ? getS3Url(file.s3key) : file.content);
  console.log('🔗 Fájl megjelenítési URL:', fileUrl?.substring(0, 100) + (fileUrl?.length > 100 ? '...' : ''));
  
  // Get translations for current language
  const t = translations[language] || translations.hu;

  useEffect(() => {
    // Add a slight delay to show the loading indicator
    console.log('⏳ Fájl betöltés kezdése...');
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log('✅ Fájl betöltés befejezve');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Handle image load error
  const handleImageError = () => {
    console.error('❌ Kép betöltési hiba:', {
      fájl: file.name,
      url: fileUrl?.substring(0, 100) + '...'
    });
    setLoadError(true);
  };

  if (!file) {
    console.error('❌ Nincs fájl objektum a megjelenítéshez');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium truncate">{file.name}</h2>
          <button 
            onClick={() => {
              console.log('🚪 Fájl előnézet bezárása');
              onClose();
            }}
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
                  onError={handleImageError}
                  onLoad={() => console.log('✅ Kép sikeresen betöltve:', file.name)}
                />
              )}
              {isPdf && (
                <iframe
                  src={fileUrl}
                  className="w-full h-full min-h-[60vh]"
                  title={file.name}
                  onLoad={() => console.log('✅ PDF sikeresen betöltve:', file.name)}
                  onError={() => {
                    console.error('❌ PDF betöltési hiba:', file.name);
                    setLoadError(true);
                  }}
                ></iframe>
              )}
              {(!isImage && !isPdf) || loadError ? (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p>{loadError ? t.loadError : t.previewNotAvailable}</p>
                  <a 
                    href={fileUrl}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => console.log('📥 Fájl letöltés kezdeményezve:', file.name)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t.download}
                  </a>
                </div>
              ) : null}
            </>
          )}
        </div>
        
        {/* File details */}
        <div className="p-4 bg-gray-50 border-t flex flex-wrap text-sm text-gray-500">
          <div className="mr-6 mb-2">
            <span className="font-medium">{t.size}:</span> {formatFileSize(file.size)}
          </div>
          <div className="mr-6 mb-2">
            <span className="font-medium">{t.type}:</span> {file.type || 'unknown'}
          </div>
          <div className="mr-6 mb-2">
            <span className="font-medium">{t.uploadedOn}:</span> {formatDate(file.uploadedAt)}
          </div>
          <div className="mb-2">
            <span className="font-medium">{t.uploadedBy}:</span> {file.uploadedBy || t.unknown}
          </div>
          {file.s3url && (
            <div className="w-full mt-1 text-xs overflow-hidden text-gray-400">
              <span className="font-medium">S3:</span> {file.s3url.substring(0, 60)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;