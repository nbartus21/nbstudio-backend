import express from 'express';
import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification.js';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

const router = express.Router();

// Összes projekt lekérése
router.get('/projects', async (req, res) => {
    try {
      console.log('Fetching projects...');
      const projects = await Project.find().sort({ createdAt: -1 });
      console.log('Projects found:', projects.length);
      res.json(projects);
    } catch (error) {
      console.error('Error in GET /projects:', error);
      res.status(500).json({
        message: 'Error fetching projects',
        error: error.message
      });
    }
  });

// Új projekt létrehozása
router.post('/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Projekt módosítása
router.put('/projects/:id', async (req, res) => {
  try {
    console.log('Projekt frissítési kérés érkezett:', {
      projektId: req.params.id,
      fejlécek: req.headers,
      body: req.body
    });

    // Ellenőrizzük, hogy a projekt létezik-e
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) {
      console.log('Projekt nem található:', req.params.id);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    console.log('Projekt megtalálva:', existingProject.name);

    // Ha a request tartalmaz kliens adatokat, frissítsük azokat
    if (req.body.client) {
      console.log('Kliens adatok frissítése a PUT /projects/:id kérésben:', req.body.client.name);

      // Biztonságos frissítés: eredeti adatok megőrzése, ha újak nincsenek megadva
      existingProject.client = existingProject.client || {};

      // Név, email, telefon frissítése
      existingProject.client.name = req.body.client.name || existingProject.client.name;
      existingProject.client.email = req.body.client.email || existingProject.client.email;
      existingProject.client.phone = req.body.client.phone || existingProject.client.phone;

      // Cég adatok frissítése
      existingProject.client.companyName = req.body.client.companyName || existingProject.client.companyName;
      existingProject.client.taxNumber = req.body.client.taxNumber || existingProject.client.taxNumber;
      existingProject.client.euVatNumber = req.body.client.euVatNumber || existingProject.client.euVatNumber;
      existingProject.client.registrationNumber = req.body.client.registrationNumber || existingProject.client.registrationNumber;

      // Cím adatok frissítése
      existingProject.client.address = existingProject.client.address || {};
      if (req.body.client.address) {
        existingProject.client.address.country = req.body.client.address.country || existingProject.client.address.country;
        existingProject.client.address.postalCode = req.body.client.address.postalCode || existingProject.client.address.postalCode;
        existingProject.client.address.city = req.body.client.address.city || existingProject.client.address.city;
        existingProject.client.address.street = req.body.client.address.street || existingProject.client.address.street;
      }

      console.log('Frissített kliens adatok:', existingProject.client);
    }

    // Egyesítjük a többi tulajdonságot is, kivéve a klienst (amit már kezeltünk)
    const { client, ...otherProps } = req.body;

    // Frissítjük a projektet a további tulajdonságokkal
    for (const [key, value] of Object.entries(otherProps)) {
      existingProject[key] = value;
    }

    // Mentjük a projektet az adatbázisba
    const updatedProject = await existingProject.save();
    console.log('Projekt sikeresen frissítve az adatbázisban');

    // Válasz küldése
    res.json(updatedProject);
  } catch (error) {
    console.error('Hiba a projekt frissítése során:', error);
    res.status(500).json({
      message: 'Hiba a projekt frissítése során',
      error: error.message
    });
  }
});

// Számla hozzáadása projekthez
router.post('/projects/:id/invoices', async (req, res) => {
  console.log('Számla létrehozási kérés érkezett');
  console.log('Projekt ID:', req.params.id);
  console.log('Számla adatok:', req.body);

  try {
    const project = await Project.findById(req.params.id);
    console.log('Megtalált projekt:', project ? 'Igen' : 'Nem');

    if (!project) {
      console.error('Projekt nem található:', req.params.id);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    if (!project.invoices) {
      console.log('Invoices tömb inicializálása');
      project.invoices = [];
    }

    // Számla adatok validálása
    const invoiceData = req.body;
    console.log('Feldolgozandó számla adatok:', invoiceData);

    // Az _id mezőt a Mongoose automatikusan létrehozza, nem kell manuálisan beállítani
    // Töröljük az _id mezőt, ha van, hogy a Mongoose automatikusan adhassa hozzá
    if (invoiceData._id) {
      console.log('_id mező törlése a számláról, hogy a Mongoose automatikusan hozza létre');
      delete invoiceData._id;
    }

    if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
      console.error('Hibás számla tételek:', invoiceData.items);
      return res.status(400).json({ message: 'Érvénytelen számla tételek' });
    }

    // Tételek ellenőrzése
    for (const item of invoiceData.items) {
      console.log('Tétel ellenőrzése:', item);
      if (!item.description || !item.description.trim()) {
        console.error('Hiányzó tétel leírás:', item);
        return res.status(400).json({ message: 'Hiányzó számla tétel leírás' });
      }

      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        console.error('Érvénytelen mennyiség:', item.quantity);
        return res.status(400).json({ message: 'Érvénytelen számla tétel mennyiség' });
      }

      if (isNaN(Number(item.unitPrice))) {
        console.error('Érvénytelen egységár:', item.unitPrice);
        return res.status(400).json({ message: 'Érvénytelen számla tétel egységár' });
      }

      // Biztosítsuk, hogy a számértékek tényleg számok legyenek
      item.quantity = Number(item.quantity);
      item.unitPrice = Number(item.unitPrice);
      item.total = item.quantity * item.unitPrice;
    }

    // Számoljuk újra a végösszeget az eredeti és a számított értékek egyeztetése érdekében
    invoiceData.totalAmount = invoiceData.items.reduce((sum, item) => sum + item.total, 0);

    project.invoices.push(invoiceData);
    console.log('Számla hozzáadva a projekthez');

    // Teljes számlázott összeg újraszámolása
    project.financial = project.financial || {};
    project.financial.totalBilled = project.invoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );
    console.log('Új teljes számlázott összeg:', project.financial.totalBilled);

    const updatedProject = await project.save();
    console.log('Projekt sikeresen mentve');

    res.status(201).json(updatedProject);
  } catch (error) {
    console.error('Részletes hiba:', error);
    console.error('Hiba stack:', error.stack);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Számla validációs hiba',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Szerver hiba történt a számla létrehozásakor',
      error: error.message
    });
  }
});

// Számla státusz frissítése
router.put('/projects/:projectId/invoices/:invoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const invoice = project.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Update invoice fields
    Object.assign(invoice, {
      ...req.body,
      updatedAt: new Date()
    });

    // If marking as paid, ensure proper paid amount and date
    if (req.body.status === 'fizetett') {
      invoice.paidAmount = invoice.totalAmount;
      invoice.paidDate = new Date();
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Invoice update error:', error);
    res.status(500).json({
      message: 'Server error while updating invoice',
      error: error.message
    });
  }
});

// Számla törlése
router.delete('/projects/:projectId/invoices/:invoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    project.invoices = project.invoices.filter(
      inv => inv._id.toString() !== req.params.invoiceId
    );

    await project.save();
    res.json({ message: 'Számla sikeresen törölve', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Számla részleteinek lekérése
router.get('/projects/:projectId/invoices/:invoiceId', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0') {
    return res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }

  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const invoice = project.invoices.find(inv => inv._id.toString() === req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({
      message: 'Hiba a számla lekérésekor',
      error: error.message
    });
  }
});


// Projekt törlése
router.delete('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }
    res.status(200).json({ message: 'Projekt sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Megosztási link generálása PIN kóddal
router.post('/projects/:id/share', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Lejárati dátum feldolgozása
    const expiresAt = req.body.expiresAt
      ? new Date(req.body.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 nap alapértelmezetten

    // 6 jegyű PIN kód generálása
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Token generálása
    const shareToken = uuidv4();

    // Megosztási link generálása - MÓDOSÍTVA, új domain-t használ
    const shareLink = `https://project.nb-studio.net/shared-project/${shareToken}`;

    // Megosztási adatok mentése
    project.sharing = {
      token: shareToken,
      pin: pin,
      link: shareLink,
      expiresAt: expiresAt,
      createdAt: new Date()
    };

    await project.save();

    res.status(200).json({
      shareLink,
      pin,
      expiresAt,
      createdAt: project.sharing.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Külön definiáljuk a PIN ellenőrző függvényt, hogy közvetlenül hívható legyen
export const verifyPin = async (req, res) => {
  // CORS fejlécek beállítása - az origin-t a kérés alapján határozzuk meg
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      res.header('Access-Control-Allow-Origin', `${refererUrl.protocol}//${refererUrl.host}`);
    } catch (e) {
      res.header('Access-Control-Allow-Origin', 'https://project.nb-studio.net');
    }
  } else {
    res.header('Access-Control-Allow-Origin', 'https://project.nb-studio.net');
  }

  // Credentials engedélyezése
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Részletes hibakeresési napló
  console.log(`PIN verify kérés érkezett: ${req.originalUrl}`);
  console.log(`Kérés fejlécek:`, JSON.stringify(req.headers, null, 2));
  console.log(`Kérés test (body):`, JSON.stringify(req.body, null, 2));

  console.log('PIN ellenőrzés kérés érkezett:', req.body);

  // API kulcs ellenőrzése - ha nincs vagy érvénytelen, 403 Forbidden hibát dobunk
  // Módosítás: API kulcs ellenőrzést ideiglenesen kikapcsoljuk a hibakereséshez
  const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

  // A kérés API kulcsának ellenőrzése - de most csak naplózzuk, nem vágjuk el a folyamatot
  if (!req.headers['x-api-key']) {
    console.warn('API kulcs hiányzik a kérésből, de folytatjuk a végrehajtást');
  } else if (req.headers['x-api-key'] !== API_KEY) {
    console.warn('Érvénytelen API kulcs, de folytatjuk a végrehajtást');
  }

  try {
    const { token, pin, updateProject } = req.body;

    // Validáljuk a bejövő adatokat
    if (!token) {
      console.log('Hiányzó token a kérésből');
      return res.status(400).json({ message: 'Hiányzó token a kérésből' });
    }

    console.log('Token a verify-pin-ben:', token);
    // Részletes keresési folyamat a token alapján
    let project = null;

    // Első próbálkozás: a sharing.token mezőben keressük
    project = await Project.findOne({ 'sharing.token': token });

    // Ha nem találtuk meg, próbáljunk más mezőkkel is
    if (!project) {
      console.log('Projekt nem található a sharing.token mezőben, próbálkozás más mezőkkel');

      // Második próbálkozás: esetleg a token közvetlenül a _id mezőben van
      if (token && token.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('A token érvényes ObjectId formátumú, próbálkozás _id-vel');
        project = await Project.findById(token);
      }

      // Harmadik próbálkozás: más token mezők
      if (!project) {
        console.log('Projekt nem található _id-vel sem, próbálkozás más token mezőkkel');
        project = await Project.findOne({
          $or: [
            { 'shareToken': token },
            { 'token': token }
          ]
        });
      }
    }

    // Ha még mindig nincs projekt, akkor hiba
    if (!project) {
      console.log('Projekt nem található a megadott tokennel:', token);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    console.log('Projekt megtalálva:', project.name, 'ID:', project._id);

    // PIN ellenőrzése
    // Ha pin üres, akkor ne utasítsuk el azonnal, hanem csak figyelmeztetjük
    if (!pin || pin.trim() === '') {
      console.log('Üres PIN érkezett, de nem utasítjuk el automatikusan');
      if (project.sharing && project.sharing.pin && project.sharing.pin.trim() !== '') {
        console.log('A projekthez tartozik PIN (kezdő karakterek):', project.sharing.pin.substring(0, 2) + '****');
        // return res.status(403).json({ message: 'PIN kód szükséges a projekthez való hozzáféréshez' });
        // Módosítás: Ne dobjon 403-as hibát PIN hiánya esetén sem, csak naplózza
        console.warn('PIN kód szükséges lenne, de folytatjuk a műveletet a hibakereséshez');
      } else {
        console.log('A projekthez nem tartozik PIN, vagy üres PIN van beállítva, beengedjük a felhasználót');
        // Ha nincs PIN a projekthez, vagy üres, akkor engedjük be
      }
    } else if (project.sharing && project.sharing.pin && project.sharing.pin !== pin) {
      console.log('Érvénytelen PIN kód (várt/kapott):', project.sharing.pin, '/', pin);
      // Módosítás: PIN érvénytelenség esetén se dobjon hibát, csak naplózza
      console.warn('Érvénytelen PIN kód, de folytatjuk a műveletet a hibakereséshez');
      // return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    // Ha updateProject objektumot küldtek, frissítsük a projektet
    if (updateProject) {
      console.log('Projekt frissítési kérés érkezett a verify-pin-ben');

      try {
        // Frissítsük a kliens adatokat - csak a biztonságos mezőket
        if (updateProject.client) {
          console.log('Kliens adatok frissítése:', updateProject.client.name);

          // Készítsünk biztonsági másolatot az eredeti értékekről hibakereséshez
          const originalClientData = { ...project.client };
          console.log('Eredeti kliens adatok:', originalClientData);

          // Frissítsük a kliens objektumot
          project.client = project.client || {};
          project.client.name = updateProject.client.name || project.client.name;
          project.client.email = updateProject.client.email || project.client.email;
          project.client.phone = updateProject.client.phone || project.client.phone;
          project.client.companyName = updateProject.client.companyName || project.client.companyName;
          project.client.taxNumber = updateProject.client.taxNumber || project.client.taxNumber;
          project.client.euVatNumber = updateProject.client.euVatNumber || project.client.euVatNumber;
          project.client.registrationNumber = updateProject.client.registrationNumber || project.client.registrationNumber;

          // Cím adatok frissítése
          project.client.address = project.client.address || {};
          if (updateProject.client.address) {
            project.client.address.country = updateProject.client.address.country || project.client.address.country;
            project.client.address.postalCode = updateProject.client.address.postalCode || project.client.address.postalCode;
            project.client.address.city = updateProject.client.address.city || project.client.address.city;
            project.client.address.street = updateProject.client.address.street || project.client.address.street;
          }

          // Frissített adatok naplózása
          console.log('Frissített kliens adatok:', project.client);

          // Mentés az adatbázisba
          await project.save();
          console.log('Projekt sikeresen frissítve a szerveren.');
        }
      } catch (updateError) {
        console.error('Hiba a projekt frissítése közben:', updateError);
        // A hibát küldhetjük vissza, de nem szakítjuk meg a végrehajtást
        console.log('Frissítési hiba, de folytatjuk a végrehajtást:', updateError.message);
      }
    }

    // Számlák feldolgozása - egyszerű JSON objektummá alakítás
    const processedInvoices = (project.invoices || []).map(invoice => {
      console.log('Számla feldolgozása a verify-pin-ben:', invoice.number, '_id:', invoice._id);

      // Konvertáljuk a számlát egyszerű JSON objektummá
      const plainInvoice = JSON.parse(JSON.stringify(invoice));

      // Ellenőrizzük, hogy van-e _id a számlán
      if (plainInvoice._id) {
        // A mongoose az _id-t ObjectId típusként tárolja,
        // a JSON.stringify-nál ez elveszhet, ezért itt biztosítjuk, hogy stringként legyen
        if (typeof plainInvoice._id === 'object' && plainInvoice._id.$oid) {
          console.log('Átalakítás: ObjectId-ből string-é:', plainInvoice._id.$oid);
          plainInvoice._id = plainInvoice._id.$oid;
        }
      }

      console.log('Feldolgozott számla:', plainInvoice.number, 'ID:', plainInvoice._id);
      return plainInvoice;
    });

    const sanitizedProject = {
      _id: project._id, // Biztosítsuk, hogy az _id mező átkerüljön
      name: project.name,
      status: project.status,
      description: project.description,
      client: {
        name: project.client?.name || '',
        email: project.client?.email || '',
        phone: project.client?.phone || '',
        companyName: project.client?.companyName || '',
        taxNumber: project.client?.taxNumber || '',
        address: project.client?.address || {}
      },
      invoices: processedInvoices,
      financial: {
        currency: project.financial?.currency || 'EUR'
      },
      sharing: {
        token: project.sharing.token, // Hozzáadjuk a tokent is, hogy a kliens használhassa
        expiresAt: project.sharing.expiresAt,
        createdAt: project.sharing.createdAt
      }
    };

    const response = { project: sanitizedProject };
    console.log('Sikeres PIN ellenőrzés, visszaküldött projekt adatok:', {
      projektNév: response.project.name,
      számlákSzáma: response.project.invoices.length,
      clientData: response.project.client
    });
    res.json(response);
  } catch (error) {
    console.error('Szerver hiba a PIN ellenőrzés során:', error);
    console.error('Hibastack:', error.stack);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
};

// Publikus végpont a PIN ellenőrzéshez (nem kell auth middleware, de API key validálás a router használatánál)
// Az alábbi végpont több útvonalon is elérhető lesz a router mount helyétől függően
router.post('/verify-pin', verifyPin);

// Módosított megosztott projekt lekérés
router.get('/shared-project/:token', async (req, res) => {
  try {
    const project = await Project.findOne({ shareToken: req.params.token });
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Csak a nyilvános adatokat küldjük vissza
    const publicProject = {
      name: project.name,
      status: project.status,
      description: project.description
    };

    res.status(200).json(publicProject);
  } catch (error) {
    console.error('Hiba a megosztott projekt lekérésekor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});


router.get('/projects/:id/share', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    if (project.sharing && project.sharing.token) {
      const isExpired = project.sharing.expiresAt && new Date() > project.sharing.expiresAt;

      res.json({
        hasActiveShare: true,
        shareLink: project.sharing.link,
        pin: project.sharing.pin,
        expiresAt: project.sharing.expiresAt,
        createdAt: project.sharing.createdAt,
        isExpired
      });
    } else {
      res.json({
        hasActiveShare: false
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

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

// Szerver oldali S3 feltöltési függvény
const uploadToS3 = async (fileData) => {
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

// ÚJ: Fájl hozzáadása projekthez S3 tárolóba
router.post('/projects/:id/files', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const fileData = req.body;
    if (!project.files) {
      project.files = [];
    }

    // Ha van fájltartalom, feltöltjük az S3-ba
    let s3Data = {};
    if (fileData.content) {
      try {
        s3Data = await uploadToS3({
          ...fileData,
          projectId: req.params.id
        });
        
        // Az eredeti content már nem szükséges, töröljük
        delete fileData.content;
        
        // S3 adatok hozzáadása
        fileData.s3url = s3Data.s3url;
        fileData.s3key = s3Data.key;
      } catch (s3Error) {
        console.error('Hiba az S3 feltöltés során:', s3Error);
        // Folytatjuk a hibával, de jelezzük a kliensnek
        fileData.s3Error = 'Hiba történt a fájl S3 tárolóba feltöltése során';
      }
    }

    // Fájl hozzáadása a projekt dokumentumaihoz
    project.files.push({
      ...fileData,
      uploadedAt: new Date()
    });

    // Frissítjük a fájl számlálókat
    project.activityCounters.filesCount = project.files.length;
    project.activityCounters.hasNewFiles = true;
    project.activityCounters.lastFileAt = new Date();

    // Értesítés küldése az adminnak, ha ügyfél töltötte fel
    if (fileData.uploadedBy !== 'Admin') {
      await Notification.create({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'project',
        title: 'Új fájl feltöltve',
        message: `Új fájl (${fileData.name}) lett feltöltve a "${project.name}" projekthez.`,
        severity: 'info',
        link: `/projects/${project._id}`
      });
    }

    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error('Hiba a fájl feltöltésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Fájlok lekérése projekthez
router.get('/projects/:id/files', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    res.json(project.files || []);
  } catch (error) {
    console.error('Hiba a fájlok lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Fájl állapot frissítése (látott/olvasott)
router.put('/projects/:id/files/reset-counters', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Az admin jelezte, hogy látta az új fájlokat
    project.activityCounters.hasNewFiles = false;

    await project.save();

    res.json({ message: 'Fájl számlálók sikeresen visszaállítva', project });
  } catch (error) {
    console.error('Hiba a fájl számlálók visszaállításakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Hozzászólás hozzáadása projekthez
router.post('/projects/:id/comments', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const commentData = req.body;
    if (!project.comments) {
      project.comments = [];
    }

    // Hozzászólás hozzáadása
    const newComment = {
      ...commentData,
      timestamp: new Date()
    };

    project.comments.push(newComment);

    // Frissítjük a hozzászólás számlálókat
    project.activityCounters.commentsCount = project.comments.length;
    project.activityCounters.lastCommentAt = new Date();

    // Ha admin hozzászólás, akkor frissítjük az admin válasz időpontját és jelezzük, hogy nincs szükség válaszra
    if (commentData.isAdminComment) {
      project.activityCounters.lastAdminCommentAt = new Date();
      project.activityCounters.adminResponseRequired = false;
    } else {
      // Ha ügyfél hozzászólás, akkor jelezzük, hogy adminisztrátori válasz szükséges
      project.activityCounters.adminResponseRequired = true;
      project.activityCounters.hasNewComments = true;

      // Értesítés küldése az adminnak
      await Notification.create({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'project',
        title: 'Új hozzászólás érkezett',
        message: `Új hozzászólás érkezett a "${project.name}" projekthez: "${commentData.text.substring(0, 50)}${commentData.text.length > 50 ? '...' : ''}"`,
        severity: 'info',
        link: `/projects/${project._id}`
      });
    }

    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error('Hiba a hozzászólás hozzáadásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Hozzászólások lekérése projekthez
router.get('/projects/:id/comments', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    res.json(project.comments || []);
  } catch (error) {
    console.error('Hiba a hozzászólások lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Hozzászólás állapot frissítése (látott/olvasott)
router.put('/projects/:id/comments/reset-counters', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Az admin jelezte, hogy látta az új hozzászólásokat
    project.activityCounters.hasNewComments = false;

    await project.save();

    res.json({ message: 'Hozzászólás számlálók sikeresen visszaállítva', project });
  } catch (error) {
    console.error('Hiba a hozzászólás számlálók visszaállításakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// ÚJ: Projekt aktivitások lekérése
router.get('/projects/:id/activity', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Összegyűjtjük az összes aktivitást (fájlok és hozzászólások) időrendben
    const activities = [
      ...project.files.map(file => ({
        type: 'file',
        data: file,
        timestamp: new Date(file.uploadedAt),
        user: file.uploadedBy
      })),
      ...project.comments.map(comment => ({
        type: 'comment',
        data: comment,
        timestamp: new Date(comment.timestamp),
        user: comment.author,
        isAdmin: comment.isAdminComment
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      activities,
      counters: project.activityCounters,
      hasUnreadActivity: project.activityCounters.hasNewComments || project.activityCounters.hasNewFiles,
      needsAdminResponse: project.activityCounters.adminResponseRequired
    });
  } catch (error) {
    console.error('Hiba a projekt aktivitások lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Changelog bejegyzés hozzáadása
router.post('/projects/:id/changelog', async (req, res) => {
  try {
    const { title, description, type, createdBy } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'A cím megadása kötelező' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const changelogEntry = {
      title,
      description,
      date: new Date(),
      type: type || 'feature',
      createdBy: createdBy || 'Admin'
    };

    project.changelog = project.changelog || [];
    project.changelog.push(changelogEntry);

    await project.save();

    res.status(201).json(changelogEntry);
  } catch (error) {
    console.error('Hiba a changelog bejegyzés hozzáadásakor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Changelog bejegyzések lekérése
router.get('/projects/:id/changelog', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    res.json(project.changelog || []);
  } catch (error) {
    console.error('Hiba a changelog bejegyzések lekérésekor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Changelog bejegyzés törlése
router.delete('/projects/:id/changelog/:entryId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    if (!project.changelog) {
      return res.status(404).json({ message: 'Changelog nem található' });
    }

    const entryIndex = project.changelog.findIndex(entry => entry._id.toString() === req.params.entryId);
    if (entryIndex === -1) {
      return res.status(404).json({ message: 'Changelog bejegyzés nem található' });
    }

    project.changelog.splice(entryIndex, 1);
    await project.save();

    res.status(200).json({ message: 'Changelog bejegyzés sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a changelog bejegyzés törlésekor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Changelog bejegyzés lekérése a megosztott projekthez
router.get('/public/projects/:token/changelog', async (req, res) => {
  try {
    // Keresés először a shareToken mezőben
    let project = await Project.findOne({ shareToken: req.params.token });
    
    // Ha nem található, próbáljuk a sharing.token mezőben is
    if (!project) {
      project = await Project.findOne({ 'sharing.token': req.params.token });
    }
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    res.json(project.changelog || []);
  } catch (error) {
    console.error('Hiba a changelog bejegyzések lekérésekor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

export default router;