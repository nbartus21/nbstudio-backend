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
    // Base64 adat konvertálása bináris adattá
    const base64Data = fileData.content.split(';base64,').pop();
    const binaryData = Buffer.from(base64Data, 'base64');

    // Egyedi fájlnév generálása a projektazonosítóval
    const key = `${FILE_PREFIX}${fileData.projectId}/${Date.now()}_${fileData.name.replace(/\s+/g, '_')}`;

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

    // A feltöltés végrehajtása
    const upload = new Upload({
      client: s3Client,
      params: uploadParams
    });

    const result = await upload.done();

    // Visszaadjuk az S3 URL-t
    return {
      s3url: result.Location || `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`,
      key: key
    };
  } catch (error) {
    console.error('Hiba az S3 feltöltés során:', error);
    throw error;
  }
};

/**
 * Fájl URL létrehozása az S3 tárolóban
 * @param {string} key - A fájl kulcsa az S3 tárolóban
 * @returns {string} - A fájl URL-je
 */
export const getS3Url = (key) => {
  return `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`;
};

export default {
  uploadFileToS3,
  getS3Url
}; 