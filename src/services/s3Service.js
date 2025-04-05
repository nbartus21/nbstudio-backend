import AWS from 'aws-sdk';

// Hasznos debugolási információ
const debugEnabled = true;
const debugLog = (message, data) => {
  if (debugEnabled) {
    console.log(`🔹 S3 Service: ${message}`, data || '');
  }
};

// Konfig - az AWS hitelesítési adatok a környezeti változókból vagy a Netlifyből jönnek
const S3_CONFIG = {
  accessKeyId: process.env.REACT_APP_AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_S3_REGION || 'eu-central-1',
  bucket: process.env.REACT_APP_AWS_S3_BUCKET_NAME || 'nb-studio-client-files',
};

// Ellenőrizzük, hogy a böngészőben vagy szerveren futunk
const isClient = typeof window !== 'undefined';

// S3 kliens inicializálása
let s3;

// S3 kliens inicializálása
const initS3Client = () => {
  if (!s3) {
    debugLog('Initializing S3 client', {
      region: S3_CONFIG.region,
      bucket: S3_CONFIG.bucket,
      environmentType: isClient ? 'browser' : 'server',
      hasCredentials: !!(S3_CONFIG.accessKeyId && S3_CONFIG.secretAccessKey)
    });
    
    const config = {
      accessKeyId: S3_CONFIG.accessKeyId,
      secretAccessKey: S3_CONFIG.secretAccessKey,
      region: S3_CONFIG.region
    };
    
    // Kliensoldalon beállítunk néhány extra paramétert
    if (isClient) {
      // Növeljük a timeout-ot, mert a nagy fájlok feltöltése időigényes lehet
      config.httpOptions = {
        timeout: 300000 // 5 perc timeout
      };
    }
    
    s3 = new AWS.S3(config);
  }
  return s3;
};

/**
 * Fájl feltöltése S3-ba
 * @param {Object} fileData - A fájl adatai (name, content, stb.)
 * @returns {Promise<Object>} - A feltöltött fájl adatai (key, s3url)
 */
export const uploadFileToS3 = async (fileData) => {
  // Inicializáljuk az S3 klienst, ha még nem történt meg
  const s3Client = initS3Client();
  
  try {
    debugLog('Fájl feltöltés előkészítése', {
      fájlnév: fileData.name,
      méret: fileData.size,
      típus: fileData.type
    });
    
    // A böngészőben a Base64 string tartalmazza a MIME típust is, ezt el kell távolítani
    let fileContent = fileData.content;
    if (fileContent.includes('base64')) {
      fileContent = fileContent.split('base64,')[1];
    }
    
    // Biztosítjuk, hogy a Buffer kompatibilis módon kezeljük a tartalmat
    let binaryContent;
    if (isClient) {
      // Böngészőben az atob függvényt használjuk a base64 dekódoláshoz
      try {
        const binary = atob(fileContent);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        binaryContent = bytes.buffer;
      } catch (error) {
        console.error('Hiba a Base64 dekódolás során:', error);
        // Fallback: egyszerűen átadjuk a nyers Base64 stringet
        binaryContent = fileContent;
      }
    } else {
      // Szerveren a Buffer objektumot használjuk
      binaryContent = Buffer.from(fileContent, 'base64');
    }
    
    // Normalizáljuk a fájlnevet - ékezeteket és speciális karaktereket kezeljük
    const normalizedFileName = fileData.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
      .replace(/[^\w.\-]/g, '_'); // Speciális karakterek cseréje underscore-ra
    
    // Egyedi kulcs generálása a fájlnak - ez biztosítja, hogy ne írjuk felül a létező fájlokat
    const uniquePrefix = Date.now().toString();
    const folder = fileData.projectId ? `projects/${fileData.projectId}/` : 'uploads/';
    const key = `${folder}${uniquePrefix}_${normalizedFileName}`;
    
    // S3 feltöltési paraméterek
    const params = {
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: binaryContent,
      ContentType: fileData.type || 'application/octet-stream',
      ContentDisposition: `inline; filename="${normalizedFileName}"`,
      ACL: 'public-read', // Fontos: nyilvános olvasási jog, hogy bárki (más böngészők is) elérhessék
      Metadata: {
        'original-filename': normalizedFileName,
        'upload-date': new Date().toISOString(),
        'project-id': fileData.projectId || 'none',
        'uploaded-by': fileData.uploadedBy || 'unknown'
      }
    };
    
    debugLog('S3 feltöltés indítása', {
      bucket: S3_CONFIG.bucket,
      key: key,
      contentTypus: params.ContentType,
      metaadatok: params.Metadata
    });
    
    // Fájl feltöltése az S3-ba
    const startTime = Date.now();
    const uploadResult = await s3Client.upload(params).promise();
    const uploadDuration = Date.now() - startTime;
    
    // Generáljuk az S3 URL-t
    const s3url = uploadResult.Location;
    
    debugLog('S3 feltöltés befejezve', {
      s3url: s3url,
      key: key,
      feltöltési_idő: `${uploadDuration}ms`
    });
    
    return {
      key,
      s3url,
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
    const bucket = S3_CONFIG.bucket;
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
 * Fájl törlése az S3-ból (ritkán használjuk, általában csak logikai törlés van)
 * @param {string} key - A fájl S3 kulcsa
 * @returns {Promise<Object>} - A törlés eredménye
 */
export const deleteFileFromS3 = async (key) => {
  const s3Client = initS3Client();
  
  try {
    debugLog('S3 fájl törlés kérése', { key });
    
    const params = {
      Bucket: S3_CONFIG.bucket,
      Key: key
    };
    
    const result = await s3Client.deleteObject(params).promise();
    
    debugLog('S3 fájl sikeresen törölve', { key, result });
    return result;
  } catch (error) {
    console.error('❌ Hiba az S3 fájl törlése során:', error);
    throw error;
  }
};

export default {
  uploadFileToS3,
  getS3Url,
  deleteFileFromS3
}; 