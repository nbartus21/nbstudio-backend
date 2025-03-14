import React, { useState } from 'react';
import { FileText, X, Download, Printer, Share2, FileCheck } from 'lucide-react';
import { formatFileSize, formatDate, debugLog } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    document: "Document",
    close: "Close",
    download: "Download",
    print: "Print",
    uploadedOn: "Uploaded on",
    previewNotSupported: "Document preview not supported",
    category: "Category",
    size: "Size",
    uploadedBy: "Uploaded by",
    documentInfo: "Document Information",
    actions: "Actions"
  },
  de: {
    document: "Dokument",
    close: "Schließen",
    download: "Herunterladen",
    print: "Drucken",
    uploadedOn: "Hochgeladen am",
    previewNotSupported: "Dokumentvorschau nicht unterstützt",
    category: "Kategorie",
    size: "Größe",
    uploadedBy: "Hochgeladen von",
    documentInfo: "Dokumentinformationen",
    actions: "Aktionen"
  },
  hu: {
    document: "Dokumentum",
    close: "Bezárás",
    download: "Letöltés",
    print: "Nyomtatás",
    uploadedOn: "Feltöltve",
    previewNotSupported: "A dokumentum előnézete nem támogatott",
    category: "Kategória",
    size: "Méret",
    uploadedBy: "Feltöltő",
    documentInfo: "Dokumentum adatok",
    actions: "Műveletek"
  }
};

// Document category translations
const categoryTranslations = {
  en: {
    contract: "Contract",
    invoice: "Invoice",
    presentation: "Presentation",
    other: "Other"
  },
  de: {
    contract: "Vertrag",
    invoice: "Rechnung",
    presentation: "Präsentation",
    other: "Sonstige"
  },
  hu: {
    contract: "Szerződés",
    invoice: "Számla",
    presentation: "Prezentáció",
    other: "Egyéb"
  }
};

const DocumentViewModal = ({ document, project, onClose, language = 'hu' }) => {
  debugLog('DocumentViewModal', 'Rendering document view', { 
    documentName: document?.name, 
    documentType: document?.type,
    documentCategory: document?.category
  });
  
  // Get translations for current language
  const t = translations[language] || translations.en;
  const categoryT = categoryTranslations[language] || categoryTranslations.en;

  if (!document) {
    debugLog('DocumentViewModal', 'No document provided');
    return null;
  }

  // Determine document icon/color based on category
  const getDocumentCategoryStyle = (category) => {
    switch (category) {
      case 'contract':
        return { 
          color: 'text-blue-600',
          bgColor: 'bg-blue-100', 
          borderColor: 'border-blue-200'
        };
      case 'invoice':
        return { 
          color: 'text-green-600',
          bgColor: 'bg-green-100', 
          borderColor: 'border-green-200'
        };
      case 'presentation':
        return { 
          color: 'text-orange-600',
          bgColor: 'bg-orange-100', 
          borderColor: 'border-orange-200'
        };
      default:
        return { 
          color: 'text-gray-600',
          bgColor: 'bg-gray-100', 
          borderColor: 'border-gray-200'
        };
    }
  };

  const categoryStyle = getDocumentCategoryStyle(document.category);

  // Get document type label
  const getDocumentTypeLabel = (mimeType) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word')) return 'Word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
    if (mimeType.includes('text')) return 'Text';
    if (mimeType.includes('image')) return 'Image';
    return mimeType.split('/')[1]?.toUpperCase() || 'Document';
  };

  // Handle document download
  const handleDownload = () => {
    debugLog('DocumentViewModal-download', 'Downloading document', { fileName: document.name });
    const link = document.createElement('a');
    link.href = document.content;
    link.download = document.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if document preview is supported
  const isPreviewSupported = () => {
    return (
      document.type?.startsWith('image/') || 
      document.type === 'application/pdf' ||
      document.type?.includes('text/plain')
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className={`h-5 w-5 mr-2 ${categoryStyle.color}`} />
            {t.document}: {document.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Document preview area */}
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-100 overflow-auto">
            {isPreviewSupported() ? (
              document.type?.startsWith('image/') ? (
                <img 
                  src={document.content} 
                  alt={document.name}
                  className="max-w-full max-h-[600px] object-contain"
                />
              ) : document.type === 'application/pdf' ? (
                <iframe
                  src={document.content}
                  title={document.name}
                  className="w-full h-full min-h-[600px] border-0"
                />
              ) : (
                <div className="bg-white p-6 rounded shadow w-full overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {/* For text files, we would need to decode the content */}
                    {document.textContent || "Preview not available for this document type"}
                  </pre>
                </div>
              )
            ) : (
              <div className="text-center p-10">
                <FileText className={`h-16 w-16 mx-auto ${categoryStyle.color} mb-3`} />
                <p className="text-gray-600 font-medium">{t.previewNotSupported}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {document.name} ({formatFileSize(document.size)})
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center mx-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.download}
                </button>
              </div>
            )}
          </div>
          
          {/* Document info sidebar */}
          <div className="md:w-64 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
            <h4 className="font-medium text-gray-700 mb-3">{t.documentInfo}</h4>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">{t.category}</span>
                <div className={`mt-1 px-2 py-1 ${categoryStyle.bgColor} ${categoryStyle.borderColor} border rounded-md inline-block text-sm font-medium ${categoryStyle.color}`}>
                  {categoryT[document.category] || document.category}
                </div>
              </div>
              
              {document.type && (
                <div>
                  <span className="text-sm text-gray-500">Type</span>
                  <p className="font-medium">{getDocumentTypeLabel(document.type)}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-500">{t.size}</span>
                <p className="font-medium">{formatFileSize(document.size)}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">{t.uploadedBy}</span>
                <p className="font-medium">{document.uploadedBy || "Unknown"}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">{t.uploadedOn}</span>
                <p className="font-medium">{formatDate(document.uploadedAt)}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-3">{t.actions}</h4>
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center text-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.download}
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center justify-center text-sm"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {t.print}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end items-center p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;