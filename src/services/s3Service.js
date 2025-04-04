import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// S3 konfigurációs beállítások
const S3_CONFIG = {
  credentials: {
    accessKeyId: '8dJM9m6z6I9kdM5IhoBv',
    secretAccessKey: 'bexUZRKqVBERCGohsGm0cEx1IAPhijQiePFqUvoE'
  },
  region: 'eu',
  endpoint: 'https://backup-minio.vddq6f.easypanel.host',
  forcePathStyle: true // MinIO esetén fontos
};

// Bucket név, ahová a fájlokat feltöltjük
const BUCKET_NAME = 'nbstudioapp';
const FILE_PREFIX = 'project_';

// S3 kliens létrehozása
const s3Client = new S3Client(S3_CONFIG);
console.log('S3 kliens létrehozva:', {
  region: S3_CONFIG.region,
  endpoint: S3_CONFIG.endpoint,
  bucket: BUCKET_NAME
});

/**
 * Fájl feltöltése S3 tárolóba
 * @param {File|Blob} file - A feltöltendő fájl objektum
 * @param {string} projectId - A projekt azonosító, amihez a fájl tartozik
 * @param {string} fileName - A fájl neve
 * @param {string} fileType - A fájl MIME típusa
 * @param {string} fileContent - A fájl tartalma (base64)
 * @returns {Promise<string>} - A feltöltött fájl URL-je
 */
export const uploadFileToS3 = async (fileData) => {
  try {
    console.log('S3 feltöltés kezdése:', {
      fileName: fileData.name,
      fileType: fileData.type,
      fileSize: fileData.size,
      projectId: fileData.projectId
    });

    // Base64 adat konvertálása bináris adattá
    const base64Data = fileData.content.split(';base64,').pop();
    const binaryData = Buffer.from(base64Data, 'base64');
    console.log('Base64 adat konvertálva bináris adattá:', {
      binaryLength: binaryData.length,
      base64Length: base64Data.length
    });

    // Egyedi fájlnév generálása a projektazonosítóval
    const key = `${FILE_PREFIX}${fileData.projectId}/${Date.now()}_${fileData.name.replace(/\s+/g, '_')}`;
    console.log('Generált S3 kulcs:', key);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: binaryData,
      ContentType: fileData.type,
      Metadata: {
        'project-id': fileData.projectId,
        'uploaded-by': fileData.uploadedBy || 'unknown',
        'original-name': fileData.name
      }
    };
    console.log('S3 feltöltési paraméterek összeállítva:', {
      bucket: uploadParams.Bucket,
      key: uploadParams.Key,
      contentType: uploadParams.ContentType,
      metadataFields: Object.keys(uploadParams.Metadata)
    });

    // A feltöltés végrehajtása
    console.log('S3 feltöltés indítása...');
    const upload = new Upload({
      client: s3Client,
      params: uploadParams
    });

    upload.on('httpUploadProgress', (progress) => {
      console.log('S3 feltöltési folyamat:', {
        loaded: progress.loaded,
        total: progress.total,
        part: progress.part,
        percent: (progress.loaded / progress.total * 100).toFixed(2) + '%'
      });
    });

    const result = await upload.done();
    console.log('S3 feltöltés befejezve:', {
      bucketName: result.Bucket,
      key: result.Key,
      location: result.Location || `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`
    });

    // Visszaadjuk az S3 URL-t
    return {
      s3url: result.Location || `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`,
      key: key
    };
  } catch (error) {
    console.error('❌ HIBA az S3 feltöltés során:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw error;
  }
};

/**
 * Fájl URL létrehozása az S3 tárolóban
 * @param {string} key - A fájl kulcsa az S3 tárolóban
 * @returns {string} - A fájl URL-je
 */
export const getS3Url = (key) => {
  const url = `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`;
  console.log('S3 URL létrehozva:', url);
  return url;
};

export default {
  uploadFileToS3,
  getS3Url
}; 