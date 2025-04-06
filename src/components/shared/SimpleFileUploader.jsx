import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { formatFileSize, debugLog, getProjectId } from './utils';

// Fordítások
const translations = {
  en: {
    uploadTitle: "Upload Files",
    uploadSubtitle: "Drag and drop files here or click to select files",
    selectFiles: "Select Files",
    uploading: "Uploading...",
    uploadSuccess: "files uploaded successfully",
    uploadError: "Error uploading files",
    projectIdError: "Project ID is missing",
    dropFilesText: "Drop files here",
    dropFilesSubtext: "or click to select files",
    uploadingFile: "Uploading file",
    of: "of",
    tipTitle: "Tips for file upload",
    tipProjectName: "Uploaded files will automatically start with the project name",
    tipMultiple: "You can upload multiple files at once",
    tipSecure: "Uploaded files are stored securely",
    tipTypes: "Supported file types: documents, images, PDFs, etc.",
    tipSize: "Maximum file size: 100MB"
  },
  de: {
    uploadTitle: "Dateien hochladen",
    uploadSubtitle: "Dateien hier ablegen oder klicken, um Dateien auszuwählen",
    selectFiles: "Dateien auswählen",
    uploading: "Wird hochgeladen...",
    uploadSuccess: "Dateien erfolgreich hochgeladen",
    uploadError: "Fehler beim Hochladen der Dateien",
    projectIdError: "Projekt-ID fehlt",
    dropFilesText: "Dateien hier ablegen",
    dropFilesSubtext: "oder klicken, um Dateien auszuwählen",
    uploadingFile: "Datei wird hochgeladen",
    of: "von",
    tipTitle: "Tipps zum Hochladen von Dateien",
    tipProjectName: "Hochgeladene Dateien beginnen automatisch mit dem Projektnamen",
    tipMultiple: "Sie können mehrere Dateien gleichzeitig hochladen",
    tipSecure: "Hochgeladene Dateien werden sicher gespeichert",
    tipSize: "Maximale Dateigröße: 100MB",
    tipTypes: "Unterstützte Dateitypen: Dokumente, Bilder, PDFs, usw."
  },
  hu: {
    uploadTitle: "Fájlok feltöltése",
    uploadSubtitle: "Húzza ide a fájlokat vagy kattintson a kiválasztáshoz",
    selectFiles: "Fájlok kiválasztása",
    uploading: "Feltöltés...",
    uploadSuccess: "fájl sikeresen feltöltve",
    uploadError: "Hiba történt a fájlok feltöltése során",
    projectIdError: "Hiányzó projekt azonosító",
    dropFilesText: "Húzza ide a fájlokat",
    dropFilesSubtext: "vagy kattintson a kiválasztáshoz",
    uploadingFile: "Fájl feltöltése",
    of: "/",
    tipTitle: "Tippek a fájlfeltöltéshez",
    tipProjectName: "A feltöltött fájlok automatikusan a projekt nevével kezdődnek",
    tipMultiple: "Egyszerre több fájlt is feltölthet",
    tipSecure: "A feltöltött fájlok biztonságosan tárolódnak",
    tipTypes: "Támogatott fájltípusok: dokumentumok, képek, PDF-ek, stb.",
    tipSize: "Maximális fájlméret: 100MB"
  }
};

const SimpleFileUploader = ({
  project,
  showSuccessMessage,
  showErrorMessage,
  language = 'hu'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  // Fordítások betöltése
  const t = translations[language] || translations.hu;

  // Projekt azonosító lekérése
  const projectId = getProjectId(project);

  // Drag and drop kezelése
  React.useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (!dropArea) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('bg-blue-50', 'border-blue-300');
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('bg-blue-50', 'border-blue-300');
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('bg-blue-50', 'border-blue-300');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload({ target: { files: e.dataTransfer.files } });
      }
    };

    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);

    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Fájl feltöltés kezelése
  const handleFileUpload = async (event) => {
    debugLog('handleFileUpload', 'Upload started');

    if (!project || !project.sharing || !project.sharing.token) {
      debugLog('handleFileUpload', 'ERROR: No project token');
      showErrorMessage(t.projectIdError);
      return;
    }

    // Fájl méret ellenőrzése - maximum 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB bytes-ban
    const files = Array.from(event.target.files);

    // Ellenőrizzük, hogy van-e túl nagy fájl
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      debugLog('handleFileUpload', `Files too large: ${fileNames}`);
      showErrorMessage(`A következő fájlok túl nagyok (max. 100MB): ${fileNames}`);
      return;
    }

    const projectToken = project.sharing.token;

    setIsUploading(true);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);

    if (files.length === 0) {
      setIsUploading(false);
      return;
    }

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i + 1);
      const file = files[i];

      try {
        // Fájl olvasása
        const fileContent = await readFileAsDataURL(file);

        // Fájl adatok előkészítése
        const fileData = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          name: `${project.name} - ${file.name}`, // Projekt név hozzáadása a fájlnévhez
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          content: fileContent,
          uploadedBy: 'Ügyfél'
        };

        // Közvetlen feltöltés a szerverre a publikus végponton keresztül
        const API_URL = 'https://admin.nb-studio.net:5001/api';
        const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

        const response = await fetch(`${API_URL}/public/shared-projects/${projectToken}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify(fileData)
        });

        if (response.ok) {
          successCount++;
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        } else {
          console.error('Error saving file to server:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    // Feltöltés befejezése
    if (successCount > 0) {
      showSuccessMessage(`${successCount} ${t.uploadSuccess}`);
    } else {
      showErrorMessage(t.uploadError);
    }

    // Kis késleltetés a 100% megjelenítéséhez
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);

      // Fájl input mező törlése
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 500);
  };

  // Fájl olvasása DataURL-ként
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="w-full">
      {/* Feltöltési terület */}
      <div
        ref={dropAreaRef}
        className="mb-6 p-8 border-2 border-dashed border-gray-300 rounded-lg transition-colors text-center"
      >
        <div className="flex flex-col items-center justify-center">
          <Upload className="text-blue-500 mb-3" size={48} />
          <h3 className="text-xl font-medium text-gray-700 mb-2">{t.uploadTitle}</h3>
          <p className="text-sm text-gray-500 mb-4">{t.uploadSubtitle}</p>

          {isUploading ? (
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{t.uploadingFile} {currentFileIndex} {t.of} {totalFiles}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current.click()}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
            >
              {t.selectFiles}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Feltöltési tippek */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Check className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">{t.tipTitle}</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>{t.tipProjectName}</li>
                <li>{t.tipMultiple}</li>
                <li>{t.tipSecure}</li>
                <li>{t.tipTypes}</li>
                <li>{t.tipSize}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleFileUploader;
