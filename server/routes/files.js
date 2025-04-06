import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

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

// Bucket név, ahonnan a fájlokat lekérdezzük
const BUCKET_NAME = 'nbstudioapp';

// S3 kliens létrehozása
const s3Client = new S3Client(S3_CONFIG);

// Védett végpontok
router.use(authMiddleware);

// Összes S3 fájl lekérése
router.get('/s3-files', async (req, res) => {
  try {
    console.log('S3 fájlok lekérése...');

    // Létrehozzuk a ListObjectsV2Command parancsot
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1000 // Maximum 1000 fájlt kérünk le egyszerre
    });

    // Végrehajtjuk a parancsot
    const response = await s3Client.send(command);

    // Átalakítjuk a választ egy egyszerűbb formátumra
    const files = response.Contents?.map(item => {
      // Az S3 URL generálása
      const s3url = `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${item.Key}`;

      // Kinyerjük a fájlnevet a Key-ből
      const fileName = item.Key.split('/').pop();

      // Kinyerjük a projekt azonosítót a Key-ből (ha van)
      const projectId = item.Key.includes('/') ? item.Key.split('/')[0] : null;

      return {
        key: item.Key,
        name: fileName || item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        s3url: s3url,
        projectId: projectId
      };
    }) || [];

    console.log(`${files.length} S3 fájl található`);
    res.json(files);
  } catch (error) {
    console.error('Hiba az S3 fájlok lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// S3 fájl törlése
router.delete('/s3-files/:key', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    console.log('S3 fájl törlése:', key);

    // Létrehozzuk a DeleteObjectCommand parancsot
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    // Végrehajtjuk a parancsot
    await s3Client.send(command);

    console.log('S3 fájl sikeresen törölve');
    res.json({ message: 'Fájl sikeresen törölve', key });
  } catch (error) {
    console.error('Hiba az S3 fájl törlésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fájlok lekérése végpont - üres tömböt ad vissza a kompatibilitás érdekében
router.get('/', async (req, res) => {
  console.log('Korábbi /api/files végpont hívása - üres tömböt adunk vissza');
  // Üres tömböt adunk vissza, hogy a frontend ne hibásodjon meg
  res.json([]);
});

export default router;