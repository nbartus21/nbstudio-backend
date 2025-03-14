import React from 'react';
import { FileText, X, Download } from 'lucide-react';
import { formatFileSize, formatDate, debugLog } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    file: "File",
    close: "Close",
    download: "Download",
    uploadedOn: "Uploaded on",
    previewNotSupported: "File preview not supported",
    size: "Size",
    type: "Type"
  },
  de: {
    file: "Datei",
    close: "Schließen",
    download: "Herunterladen",
    uploadedOn: "Hochgeladen am",
    previewNotSupported: "Dateivorschau wird nicht unterstützt",
    size: "Größe",
    type: "Typ"
  },
  hu: {
    file: "Fájl",
    close: "Bezárás",
    download: "Letöltés",
    uploadedOn: "Feltöltve",
    previewNotSupported: "A fájl előnézete nem támogatott",
    size: "Méret",
    type: "Típus"
  }
};

const FilePreviewModal = ({ file, onClose, language = 'hu' }) => {
  debugLog('FilePreviewModal', 'Rendering file preview', { 
    fileName: file?.name, 
    fileType: file?.type,
    language: language
  });

  // Get translations for current language
  const t = translations[language] || translations.hu;

  if (!file) {
    debugLog('FilePreviewModal', 'No file provided');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            {t.file}: {file.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-gray-100">
          {file.type?.startsWith('image/') ? (
            <img 
              src={file.content} 
              alt={file.name}
              className="max-w-full max-h-[600px] object-contain"
            />
          ) : (
            <div className="text-center p-10">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">{t.previewNotSupported}</p>
              <p className="text-sm text-gray-500 mt-2">
                {file.name} ({formatFileSize(file.size)})
              </p>
            </div>
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