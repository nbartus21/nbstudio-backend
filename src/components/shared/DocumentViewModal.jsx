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

const DocumentViewModal = ({ document: docData, project, onClose, language = 'hu' }) => {
  // Átnevezzük a 'document' paramétert 'docData'-ra, hogy ne ütközzön a globális document objektummal
  debugLog('DocumentViewModal', 'Rendering document view', { 
    documentName: docData?.name, 
    documentType: docData?.type,
    documentCategory: docData?.category
  });
  
  // Get translations for current language
  const t = translations[language] || translations.en;
  const categoryT = categoryTranslations[language] || categoryTranslations.en;

  if (!docData) {
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

  const categoryStyle = getDocumentCategoryStyle(docData.category);

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
  const handleDownload = async () => {
    debugLog('DocumentViewModal-download', 'Downloading document', { 
      fileName: docData.name,
      hasContent: !!docData.content,
      hasDocumentId: !!docData._id 
    });
    
    // Ha van content (például helyi tárolás esetén), azt használjuk egyszerű letöltéshez
    if (docData.content && docData.content.startsWith('data:')) {
      debugLog('DocumentViewModal-download', 'Using local content for download');
      const a = window.document.createElement('a');
      a.href = docData.content;
      a.download = docData.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      return;
    }
    
    // Ha van dokumentum azonosító, akkor próbáljuk a szerver API-t
    if (docData._id) {
      try {
        const API_URL = 'https://admin.nb-studio.net:5001/api';
        const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
        
        debugLog('DocumentViewModal-download', 'Downloading PDF from server API', { documentId: docData._id });
        
        // Használjuk a publikus PDF végpontot
        const response = await fetch(`${API_URL}/documents/${docData._id}/pdf`, {
          headers: {
            'X-API-Key': API_KEY
          }
        });
        
        if (response.ok) {
          // Get blob from response
          const blob = await response.blob();
          
          // Create download link for blob
          const url = window.URL.createObjectURL(blob);
          // Biztosítsuk, hogy a fájlnév végén legyen .pdf kiterjesztés
          let fileName = docData.name || `document-${docData._id}`;
          if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
          }
          
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
          
          debugLog('DocumentViewModal-download', 'PDF download successful');
        } else {
          console.error('Error downloading PDF:', response.status, response.statusText);
          alert('Hiba történt a dokumentum letöltése során');
        }
      } catch (error) {
        console.error('Error downloading document:', error);
        alert('Nem sikerült letölteni a dokumentumot');
      }
    } else {
      console.error('Cannot download - no document content or ID available');
      alert('A dokumentum nem tölthető le, mert nincs elérhető tartalom');
    }
  };

  // Check if document preview is supported
  const isPreviewSupported = () => {
    // Ha van beágyazott tartalom, akkor ellenőrizzük a típust
    if (docData.content) {
      return (
        docData.type?.startsWith('image/') || 
        docData.type === 'application/pdf' ||
        docData.type?.includes('text/plain')
      );
    } 
    
    // Ha nincs content, de van _id, akkor PDF letöltés lehet elérhető
    if (docData._id) {
      return true; // PDF letöltés mutatása
    }
    
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className={`h-5 w-5 mr-2 ${categoryStyle.color}`} />
            {t.document}: {docData.name}
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
              docData.content && docData.type?.startsWith('image/') ? (
                <img 
                  src={docData.content} 
                  alt={docData.name}
                  className="max-w-full max-h-[600px] object-contain"
                />
              ) : docData.content && docData.type === 'application/pdf' ? (
                <iframe
                  src={docData.content}
                  title={docData.name}
                  className="w-full h-full min-h-[600px] border-0"
                />
              ) : docData._id ? (
                <div className="text-center p-10">
                  <FileText className="h-16 w-16 mx-auto text-blue-600 mb-3" />
                  <p className="text-gray-600 font-medium">A dokumentum tartalmát a szerverről töltheti le</p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center mx-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF letöltése
                  </button>
                </div>
              ) : (
                <div className="bg-white p-6 rounded shadow w-full overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {/* For text files, we would need to decode the content */}
                    {docData.textContent || "Preview not available for this document type"}
                  </pre>
                </div>
              )
            ) : (
              <div className="text-center p-10">
                <FileText className={`h-16 w-16 mx-auto ${categoryStyle.color} mb-3`} />
                <p className="text-gray-600 font-medium">{t.previewNotSupported}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {docData.name} ({formatFileSize(docData.size)})
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
                  {categoryT[docData.category] || docData.category}
                </div>
              </div>
              
              {docData.type && (
                <div>
                  <span className="text-sm text-gray-500">Type</span>
                  <p className="font-medium">{getDocumentTypeLabel(docData.type)}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-500">{t.size}</span>
                <p className="font-medium">{formatFileSize(docData.size)}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">{t.uploadedBy}</span>
                <p className="font-medium">{docData.uploadedBy || "Unknown"}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">{t.uploadedOn}</span>
                <p className="font-medium">{formatDate(docData.uploadedAt)}</p>
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