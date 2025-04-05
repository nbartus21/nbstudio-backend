import { api } from './auth';

// Hasznos debugolási információ
const debugEnabled = true;
const debugLog = (message, data) => {
  if (debugEnabled) {
    console.log(`🔹 S3 Service (Kliens): ${message}`, data || '');
  }
};

// Konfig - Vite-kompatibilis környezeti változók használata (import.meta.env)
const S3_CONFIG = {
  bucketName: import.meta.env?.VITE_AWS_S3_BUCKET_NAME || 'nb-studio-client-files',
  region: import.meta.env?.VITE_AWS_S3_REGION || 'eu-central-1',
};

// Ellenőrizzük, hogy a böngészőben vagy szerveren futunk
const isClient = typeof window !== 'undefined';

/**
 * Fájl feltöltése S3-ba - Kliens oldali implementáció
 * @param {Object} fileData - A fájl adatai (name, content, stb.)
 * @returns {Promise<Object>} - A feltöltött fájl adatai (key, s3url)
 */
export const uploadFileToS3 = async (fileData) => {
  try {
    debugLog('Fájl feltöltés előkészítése', {
      fájlnév: fileData.name,
      méret: fileData.size,
      típus: fileData.type
    });
    
    // Készítünk egy helyi másolatot a fileData-ról, hogy ne módosítsuk az eredetit
    const fileInfo = { ...fileData };
    
    // A fájl tartalma és neve előkészítése
    if (!fileInfo.content) {
      throw new Error('Hiányzó fájl tartalom');
    }
    
    // Normalizáljuk a fájlnevet a biztonság kedvéért - ékezetek és speciális karakterek kezelése
    const normalizedFileName = fileInfo.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
      .replace(/[^\w.\-]/g, '_'); // Speciális karakterek cseréje underscore-ra
    
    debugLog('Normalizált fájlnév:', normalizedFileName);
    
    // Egyedi azonosító generálása a fájlhoz
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    fileInfo.id = fileInfo.id || uniqueId;
    
    // Ha van projektID, felkészítjük a projekt specifikus tárolásra
    if (fileInfo.projectId) {
      debugLog('Fájl projekthez kapcsolása:', fileInfo.projectId);
    }
    
    // Közvetlen REST API hívás helyett az api segédfüggvényt használjuk
    // Ami kezeli az authentikációt és a hibakezelést
    const startTime = Date.now();
    
    // A feltöltést két lépésben végezzük:
    // 1. A fájl adatainak elküldése a backend API-nak
    // 2. A backend kezeli az S3 feltöltést és visszaadja a megfelelő URL-t
    
    debugLog('Fájl adatok küldése a backend API-nak');
    const projectEndpoint = fileInfo.projectId 
      ? `/api/projects/${fileInfo.projectId}/files`
      : '/api/files/upload';
      
    const response = await api.post(projectEndpoint, fileInfo);
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Hiba a fájl feltöltésekor a szerverre:', errorText);
      throw new Error(`Szerver hiba: ${response.status} ${response.statusText}`);
    }
    
    // Feldolgozzuk a választ
    const responseData = await response.json();
    
    const uploadDuration = Date.now() - startTime;
    debugLog('Fájl feltöltése sikeres', {
      időtartam: `${uploadDuration}ms`,
      válasz: responseData
    });
    
    // Kinyerjük a fájl S3 adatait a válaszból
    const s3url = extractS3UrlFromResponse(responseData, fileInfo);
    const s3key = extractS3KeyFromResponse(responseData, fileInfo);
    
    // Ha nem találunk S3 URL-t, akkor használjuk a content mezőt (fallback)
    if (!s3url && fileInfo.content) {
      debugLog('S3 URL nem található a válaszban, content mező használata');
      return {
        key: fileInfo.id,
        s3url: fileInfo.content,
        uploadTime: uploadDuration
      };
    }
    
    return {
      key: s3key || fileInfo.id,
      s3url: s3url,
      uploadTime: uploadDuration
    };
  } catch (error) {
    console.error('❌ Hiba az S3 feltöltés során:', error);
    throw error;
  }
};

/**
 * S3 URL generálása egy fájl objektumból
 * @param {Object} file - A fájl objektum
 * @returns {string} - Az S3 URL
 */
export const getS3Url = (file) => {
  // Ha már van S3 URL a fájlban, használjuk azt
  if (file.s3url) {
    return file.s3url;
  }
  
  // Ha van S3 kulcs, generáljunk belőle URL-t
  if (file.s3key) {
    const bucket = S3_CONFIG.bucketName;
    const region = S3_CONFIG.region;
    return `https://${bucket}.s3.${region}.amazonaws.com/${file.s3key}`;
  }
  
  // Fallback - visszaadjuk a file.content-et, ha van
  if (file.content) {
    return file.content;
  }
  
  // Ha semmi nincs, amit használhatnánk, üres stringet adunk vissza
  console.warn('Nem található letölthető tartalom a fájlhoz:', file.name);
  return '';
};

/**
 * Fájl törlése az S3-ból (logikai törlés)
 * @param {string} projectId - A projekt azonosítója
 * @param {string} fileId - A fájl azonosítója
 * @returns {Promise<Object>} - A törlés eredménye
 */
export const deleteFileFromS3 = async (projectId, fileId) => {
  try {
    debugLog('Fájl törlés kezdeményezése', { projectId, fileId });
    
    const response = await api.delete(`/api/projects/${projectId}/files/${fileId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fájl törlési hiba: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    debugLog('Fájl sikeresen törölve', result);
    
    return result;
  } catch (error) {
    console.error('❌ Hiba a fájl törlése során:', error);
    throw error;
  }
};

// Segédfüggvények

// S3 URL kinyerése a szerver válaszból
function extractS3UrlFromResponse(response, fileInfo) {
  // Ha a válasz közvetlenül tartalmazza az s3url mezőt
  if (response.s3url) {
    return response.s3url;
  }
  
  // Ha a válasz a files tömbben tartalmazza a fájlt
  if (response.files && Array.isArray(response.files)) {
    const file = response.files.find(f => f.id === fileInfo.id);
    if (file && file.s3url) {
      return file.s3url;
    }
  }
  
  // Ha a projekt objektumban a files tömbben van
  if (response.files && Array.isArray(response.files)) {
    const file = response.files.find(f => f.id === fileInfo.id || f.name === fileInfo.name);
    if (file && file.s3url) {
      return file.s3url;
    }
  }
  
  // Próbáljuk megtalálni az adott nevű fájlt a projektben
  if (response.files && Array.isArray(response.files)) {
    // Legújabb fájl
    const latestFile = response.files.sort((a, b) => 
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )[0];
    
    if (latestFile && latestFile.s3url) {
      return latestFile.s3url;
    }
  }
  
  // Nem találtunk S3 URL-t
  return null;
}

// S3 kulcs kinyerése a szerver válaszból
function extractS3KeyFromResponse(response, fileInfo) {
  // Logika hasonló az URL kinyeréséhez
  if (response.s3key) {
    return response.s3key;
  }
  
  if (response.key) {
    return response.key;
  }
  
  // Próbáljuk megkeresni a files tömbben
  if (response.files && Array.isArray(response.files)) {
    const file = response.files.find(f => f.id === fileInfo.id);
    if (file && file.s3key) {
      return file.s3key;
    }
  }
  
  // Alapértelmezett kulcs generálása
  return `${fileInfo.projectId || 'uploads'}/${fileInfo.id}`;
}

export default {
  uploadFileToS3,
  getS3Url,
  deleteFileFromS3
}; 