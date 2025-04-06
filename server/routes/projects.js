import express from 'express';
import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification.js';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import authMiddleware from '../middleware/auth.js';

// PIN ellenőrzés gyorsítótár (cache)
// A gyorsítótár kulcsa a token, értéke egy objektum, amely tartalmazza a projekt adatait és a lejárati időt
const pinVerificationCache = new Map();

// Gyorsítótár érvényességi ideje (ms) - 5 perc
const CACHE_TTL = 5 * 60 * 1000;

// Gyorsítótár tisztítása - eltávolítja a lejárt bejegyzéseket
setInterval(() => {
  const now = Date.now();
  for (const [token, cacheEntry] of pinVerificationCache.entries()) {
    if (now > cacheEntry.expiresAt) {
      pinVerificationCache.delete(token);
    }
  }
}, 60000); // 1 percenként tisztítjuk a gyorsítótárat

const router = express.Router();
const auth = authMiddleware; // Alias a meglévő kód kompatibilitásának megőrzéséhez

// Összes projekt lekérése - optimalizált változat
router.get('/projects', async (req, res) => {
    try {
      const projects = await Project.find().sort({ createdAt: -1 });
      res.json(projects);
    } catch (error) {
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
    const { projectId, invoiceId } = req.params;
    const updateData = req.body;

    // Csak a szükséges mezőket kérjük le a projektből
    const project = await Project.findById(projectId, 'invoices');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Keressük meg a számlát
    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Frissítjük a számla mezőit
    Object.assign(invoice, {
      ...updateData,
      updatedAt: new Date()
    });

    // Ha fizetettre állítjuk, biztosítsuk a megfelelő összeget és dátumot
    if (updateData.status === 'fizetett') {
      invoice.paidAmount = invoice.totalAmount;
      invoice.paidDate = new Date();
    }

    // Optimalizált mentés: Csak a számla mezőt frissítjük az adatbázisban
    // Ez sokkal gyorsabb, mint a teljes projekt mentése
    await Project.updateOne(
      { _id: projectId, 'invoices._id': invoiceId },
      { $set: { 'invoices.$': invoice } }
    );

    // Csak a frissített számlát adjuk vissza, nem a teljes projektet
    // Ez jelentősen csökkenti a válasz méretét és a feldolgozási időt
    res.json({
      success: true,
      message: 'Számla sikeresen frissítve',
      invoice: invoice.toObject()
    });
  } catch (error) {
    console.error('Invoice update error:', error.message);
    res.status(500).json({
      success: false,
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
const verifyPin = async (req, res) => {
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

  // Optimalizált naplózás - csak a lényeges információkat naplózzuk
  console.log(`PIN verify kérés érkezett: ${req.originalUrl}, token: ${req.body.token?.substring(0, 8)}...`);

  // API kulcs ellenőrzés már megtörtént a router szintjén, itt nem szükséges újra ellenőrizni

  try {
    const { token, pin, updateProject } = req.body;

    // Validáljuk a bejövő adatokat
    if (!token) {
      console.log('Hiányzó token a kérésből');
      return res.status(400).json({ message: 'Hiányzó token a kérésből' });
    }

    // Ellenőrizzük, hogy van-e a gyorsítótárban a token
    const cacheKey = `${token}:${pin || ''}`;
    const now = Date.now();
    const cachedResult = pinVerificationCache.get(cacheKey);

    // Ha van érvényes gyorsítótár bejegyzés, használjuk azt
    if (cachedResult && now < cachedResult.expiresAt) {
      // Ha a gyorsítótárban lévő eredmény hiba, adjuk vissza azt
      if (cachedResult.error) {
        return res.status(cachedResult.statusCode).json({ message: cachedResult.error });
      }

      // Ha a gyorsítótárban lévő eredmény sikeres, folytassuk a projekt adataival
      const project = cachedResult.project;

      // Ha updateProject objektumot küldtek, ne használjuk a gyorsítótárat
      if (updateProject) {
        // Folytatjuk a normál folyamatot
      } else {
        // Továbblépünk a projekt feldolgozásához
        const sanitizedProject = { ...project.toObject() };
        const response = { project: sanitizedProject };
        return res.json(response);
      }
    }

    // Ha nincs gyorsítótár találat, vagy frissíteni kell a projektet, lekérjük az adatbázisból
    let project = null;

    // Optimalizált keresés - egy lekérdezéssel keressük az összes lehetséges mezőben
    project = await Project.findOne({
      $or: [
        { 'sharing.token': token },
        ...(token.match(/^[0-9a-fA-F]{24}$/) ? [{ '_id': token }] : []),
        { 'shareToken': token },
        { 'token': token }
      ]
    });

    // Ha még mindig nincs projekt, akkor hiba
    if (!project) {
      // Mentsük a hibát a gyorsítótárba
      pinVerificationCache.set(cacheKey, {
        error: 'Projekt nem található',
        statusCode: 404,
        expiresAt: now + CACHE_TTL
      });

      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // PIN ellenőrzése - optimalizált változat
    const projectPin = project.sharing?.pin?.trim() || '';
    const requestPin = pin?.trim() || '';

    // Ha a projekthez tartozik PIN, de a kérésben nincs megadva vagy nem egyezik
    if (projectPin !== '' && (requestPin === '' || projectPin !== requestPin)) {
      const errorMessage = requestPin === '' ?
        'PIN kód szükséges a projekthez való hozzáféréshez' :
        'Érvénytelen PIN kód';

      // Mentsük a hibát a gyorsítótárba
      pinVerificationCache.set(cacheKey, {
        error: errorMessage,
        statusCode: 403,
        expiresAt: now + CACHE_TTL
      });

      return res.status(403).json({ message: errorMessage });
    }

    // Ha sikeres a PIN ellenőrzés, mentsük a projektet a gyorsítótárba
    // De csak ha nincs updateProject kérés
    if (!updateProject) {
      pinVerificationCache.set(cacheKey, {
        project,
        expiresAt: now + CACHE_TTL
      });
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

    // Ha vannak domainek a projekthez kapcsolva, frissítsük a lejárati dátumokat
    if (project.domains && project.domains.length > 0) {
      try {
        const Domain = (await import('../models/Domain.js')).default;

        // Minden domain-hez lekérjük a legfrissebb adatokat
        for (let i = 0; i < project.domains.length; i++) {
          const domainId = project.domains[i].domainId;
          if (domainId) {
            const domainData = await Domain.findById(domainId);
            if (domainData) {
              // Frissítsük a domain adatait a projektben
              project.domains[i].expiryDate = domainData.expiryDate;
              project.domains[i].name = domainData.name;
            }
          }
        }
      } catch (domainError) {
        console.error('Hiba a domainek frissítésekor:', domainError);
      }
    }

    // Számlák feldolgozása - optimalizált változat
    const processedInvoices = (project.invoices || []).map(invoice => {
      // Konvertáljuk a számlát egyszerű JSON objektummá - optimalizált módon
      const plainInvoice = { ...invoice.toObject() };

      // Biztosítjuk, hogy az _id string formátumban legyen
      if (plainInvoice._id) {
        plainInvoice._id = plainInvoice._id.toString();
      }

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
      // Hozzáadjuk a nem törölt fájlokat, ha nincsenek elrejtve
      files: project.sharing?.hideFiles ? [] : (project.files || [])
        .filter(file => !file.isDeleted)
        .map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: file.uploadedAt,
          uploadedBy: file.uploadedBy,
          s3url: file.s3url,
          s3key: file.s3key
        })),
      // Hozzáadjuk a projekthez kapcsolódó domaineket
      domains: project.domains || [],
      sharing: {
        token: project.sharing.token, // Hozzáadjuk a tokent is, hogy a kliens használhassa
        expiresAt: project.sharing.expiresAt,
        createdAt: project.sharing.createdAt,
        hideFiles: project.sharing?.hideFiles || false,
        hideDocuments: project.sharing?.hideDocuments || false
      }
    };

    const response = { project: sanitizedProject };
    res.json(response);
  } catch (error) {
    console.error('Szerver hiba a PIN ellenőrzés során:', error.message);
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
    console.log('🔄 [SZERVER] S3 feltöltés indítása:', {
      fájlnév: fileData.name,
      méret: fileData.size,
      típus: fileData.type,
      projektID: fileData.projectId,
      feltöltő: fileData.uploadedBy
    });

    // Base64 adat konvertálása bináris adattá
    const base64Data = fileData.content.split(';base64,').pop();
    const binaryData = Buffer.from(base64Data, 'base64');
    console.log('🔄 [SZERVER] Base64 adat konvertálása bináris adattá:', {
      binárisMéret: binaryData.length,
      base64Méret: base64Data.length
    });

    // Egyedi fájlnév generálása a projektazonosítóval és projektnévvel
    // Ékezetes karakterek eltávolítása és biztonságos fájlnév létrehozása
    const safeFileName = fileData.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
      .replace(/[^\w.-]/g, '_'); // Nem biztonságos karakterek cseréje alulvonásra

    // Projekt nevének lekérése és biztonságos formázása
    let projectName = '';
    try {
      // Projekt lekérése az adatbázisból
      const project = await Project.findById(fileData.projectId);
      if (project && project.name) {
        // Projekt nevének biztonságos formázása
        projectName = project.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
          .replace(/[^\w.-]/g, '_') // Nem biztonságos karakterek cseréje alulvonásra
          .replace(/\s+/g, '_'); // Szóközök cseréje alulvonásra
      }
    } catch (error) {
      console.error('❌ [SZERVER] Hiba a projekt nevének lekérésekor:', error);
      // Hiba esetén folytatjuk projekt név nélkül
    }

    // S3 kulcs generálása projekt azonosítóval és névvel
    const key = projectName
      ? `${FILE_PREFIX}${fileData.projectId}_${projectName}/${Date.now()}_${safeFileName}`
      : `${FILE_PREFIX}${fileData.projectId}/${Date.now()}_${safeFileName}`;
    console.log('🔄 [SZERVER] Generált S3 kulcs:', key);

    // Metaadatok előkészítése - csak ASCII karakterek használata
    const metadata = {
      'project-id': fileData.projectId,
      'project-name': projectName || 'unknown',
      'uploaded-by': (fileData.uploadedBy || 'unknown').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      'original-filename': encodeURIComponent(fileData.name) // URL kódolás a biztonság kedvéért
    };

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: binaryData,
      ContentType: fileData.type,
      Metadata: metadata,
      // Publikus hozzáférés biztosítása a fájlhoz
      ACL: 'public-read'
    };
    console.log('🔄 [SZERVER] Feltöltési paraméterek összeállítva:', {
      bucket: uploadParams.Bucket,
      kulcs: uploadParams.Key,
      contentType: uploadParams.ContentType,
      metaadatMezők: Object.keys(uploadParams.Metadata),
      hozzáférés: 'public-read'
    });

    // A feltöltés végrehajtása
    console.log('🔄 [SZERVER] S3 feltöltés végrehajtása...');
    const upload = new Upload({
      client: s3Client,
      params: uploadParams
    });

    upload.on('httpUploadProgress', (progress) => {
      console.log('🔄 [SZERVER] Feltöltési folyamat:', {
        loaded: progress.loaded,
        total: progress.total,
        part: progress.part,
        százalék: Math.round((progress.loaded / progress.total) * 100) + '%'
      });
    });

    const result = await upload.done();
    console.log('✅ [SZERVER] S3 feltöltés befejezve:', {
      bucket: result.Bucket,
      kulcs: result.Key,
      location: result.Location || `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`
    });

    // Visszaadjuk az S3 URL-t
    return {
      s3url: result.Location || `https://${BUCKET_NAME}.backup-minio.vddq6f.easypanel.host/${key}`,
      key: key
    };
  } catch (error) {
    console.error('❌ [SZERVER] HIBA az S3 feltöltés során:', {
      hibaÜzenet: error.message,
      hibakód: error.code,
      stack: error.stack
    });
    throw error;
  }
};

// ÚJ: Fájl hozzáadása projekthez S3 tárolóba
router.post('/projects/:id/files', async (req, res) => {
  try {
    console.log('📂 [SZERVER] Fájl feltöltési kérés érkezett:', {
      projektId: req.params.id,
      idő: new Date().toISOString()
    });

    const project = await Project.findById(req.params.id);
    if (!project) {
      console.error('❌ [SZERVER] Projekt nem található:', req.params.id);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    console.log('✅ [SZERVER] Projekt megtalálva:', {
      név: project.name,
      státusz: project.status
    });

    const fileData = req.body;
    console.log('📄 [SZERVER] Fogadott fájl adatok:', {
      név: fileData.name,
      méret: fileData.size,
      típus: fileData.type,
      feltöltő: fileData.uploadedBy,
      tartalom: fileData.content ? (fileData.content.length > 100 ?
        `${fileData.content.substring(0, 100)}... (${fileData.content.length} karakter)` :
        'Nincs tartalom')
        : 'Nincs tartalom'
    });

    if (!project.files) {
      project.files = [];
      console.log('ℹ️ [SZERVER] Projekt fájlok inicializálása...');
    }

    // Ha van fájltartalom, feltöltjük az S3-ba
    let s3Data = {};
    if (fileData.content) {
      console.log('🚀 [SZERVER] S3 feltöltés kezdeményezése...');
      try {
        const startTime = Date.now();
        s3Data = await uploadToS3({
          ...fileData,
          projectId: req.params.id
        });
        const uploadDuration = Date.now() - startTime;

        console.log(`✅ [SZERVER] S3 feltöltés sikeres (${uploadDuration}ms):`, {
          s3Url: s3Data.s3url,
          s3Kulcs: s3Data.key
        });

        // Az eredeti content már nem szükséges, töröljük
        delete fileData.content;

        // S3 adatok hozzáadása
        fileData.s3url = s3Data.s3url;
        fileData.s3key = s3Data.key;
      } catch (s3Error) {
        console.error('❌ [SZERVER] HIBA az S3 feltöltés során:', s3Error);
        // Folytatjuk a hibával, de jelezzük a kliensnek
        fileData.s3Error = 'Hiba történt a fájl S3 tárolóba feltöltése során';
      }
    } else {
      console.warn('⚠️ [SZERVER] A fájlban nincs tartalom az S3 feltöltéshez');
    }

    // Fájl hozzáadása a projekt dokumentumaihoz
    fileData.uploadedAt = new Date();
    project.files.push({
      ...fileData,
      uploadedAt: fileData.uploadedAt
    });

    console.log('✅ [SZERVER] Fájl hozzáadva a projekthez:', {
      projektNév: project.name,
      fájlnév: fileData.name,
      feltöltésIdeje: fileData.uploadedAt,
      fájlokSzáma: project.files.length
    });

    // Frissítjük a fájl számlálókat
    project.activityCounters.filesCount = project.files.length;
    project.activityCounters.hasNewFiles = true;
    project.activityCounters.lastFileAt = new Date();

    // Értesítés küldése az adminnak, ha ügyfél töltötte fel
    if (fileData.uploadedBy !== 'Admin') {
      console.log('ℹ️ [SZERVER] Értesítés küldése az adminnak az új fájlról');
      await Notification.create({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'project',
        title: 'Új fájl feltöltve',
        message: `Új fájl (${fileData.name}) lett feltöltve a "${project.name}" projekthez.`,
        severity: 'info',
        link: `/projects/${project._id}`
      });
    }

    console.log('💾 [SZERVER] Projekt mentése adatbázisba...');
    await project.save();
    console.log('✅ [SZERVER] Projekt sikeresen mentve a fájlfeltöltés után');

    res.status(201).json(project);
  } catch (error) {
    console.error('❌ [SZERVER] HIBA a fájl feltöltésekor:', {
      hiba: error.message,
      stack: error.stack
    });
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

// GET project files
router.get('/:id/files', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/projects/${id}/files kérés`);

    const project = await Project.findById(id);
    if (!project) {
      console.log(`Projekt nem található: ${id}`);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    console.log(`Fájlok visszaadása a projekthez: ${id}, talált fájlok: ${project.files.length}`);
    res.json(project.files || []);
  } catch (error) {
    console.error('Hiba a projekt fájlok lekérdezése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt' });
  }
});

// Add file to project
router.post('/:id/files', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const fileData = req.body;
    console.log(`POST /api/projects/${id}/files kérés érkezett`, {
      fájlnév: fileData.name,
      méret: fileData.size,
      típus: fileData.type
    });

    const project = await Project.findById(id);
    if (!project) {
      console.log(`Projekt nem található: ${id}`);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Validáljuk a fájl adatokat
    if (!fileData.id || !fileData.name || !fileData.size || !fileData.type) {
      console.log('Hiányzó kötelező adatok:', {
        van_id: !!fileData.id,
        van_név: !!fileData.name,
        van_méret: !!fileData.size,
        van_típus: !!fileData.type
      });
      return res.status(400).json({ message: 'Hiányzó fájl adatok' });
    }

    // Előkészítjük a fájl objektumot a MongoDB számára
    const fileToSave = {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      uploadedAt: fileData.uploadedAt || new Date(),
      uploadedBy: fileData.uploadedBy || 'Ismeretlen',
      s3url: fileData.s3url || null,
      s3key: fileData.s3key || null,
      isDeleted: false
    };

    // Ha van content, akkor azt is mentjük (base64 kép)
    if (fileData.content) {
      fileToSave.content = fileData.content;
    }

    console.log('Fájl mentése a MongoDB-be:', {
      id: fileToSave.id,
      név: fileToSave.name,
      s3_url_létezik: !!fileToSave.s3url
    });

    // Az új fájl objektum hozzáadása a tömbhöz a push helyett egy megbízhatóbb módon
    if (!project.files) {
      project.files = [];
    }

    // Ellenőrizzük, hogy ez a fájl nem létezik-e már (id alapján)
    const existingFileIndex = project.files.findIndex(f => f.id === fileToSave.id);
    if (existingFileIndex !== -1) {
      console.log(`Már létező fájl frissítése az ID alapján: ${fileToSave.id}`);
      // Ha már létezik, frissítjük (kivéve az id-t és feltöltés dátumát)
      Object.assign(project.files[existingFileIndex], {
        ...fileToSave,
        uploadedAt: project.files[existingFileIndex].uploadedAt // Megtartjuk az eredeti feltöltési dátumot
      });
    } else {
      // Új fájl hozzáadása
      project.files.push(fileToSave);
    }

    await project.save();
    console.log(`Fájl sikeresen mentve a projekthez: ${fileToSave.name}`);

    res.json({
      message: 'Fájl sikeresen hozzáadva',
      files: project.files.filter(f => !f.isDeleted)
    });
  } catch (error) {
    console.error('Hiba a fájl projekthez adása során:', error);
    res.status(500).json({
      message: 'Szerver hiba történt',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete file from project (logical delete)
router.delete('/:projectId/files/:fileId', auth, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    console.log(`DELETE /api/projects/${projectId}/files/${fileId} kérés`);

    const project = await Project.findById(projectId);
    if (!project) {
      console.log(`Projekt nem található: ${projectId}`);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const fileIndex = project.files.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      console.log(`Fájl nem található: ${fileId}`);
      return res.status(404).json({ message: 'Fájl nem található' });
    }

    // Csak logikai törlés - megjelöljük a fájlt töröltként
    project.files[fileIndex].isDeleted = true;
    project.files[fileIndex].deletedAt = new Date();

    await project.save();
    console.log(`Fájl sikeresen törölve: ${fileId}`);

    res.json({ message: 'Fájl sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a fájl törlése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt' });
  }
});

// Megosztott projekt fájljainak lekérése (publikus végpont, nem igényel auth)
router.get('/public/projects/:token/files', async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`GET /api/public/projects/${token}/files publikus kérés érkezett`);

    // Keresés a sharing.token mezőben
    let project = await Project.findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await Project.findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    console.log(`Megosztott projekt megtalálva: ${project.name}, fájlok száma: ${project.files?.length || 0}`);

    // Szűrjük a fájlokat, hogy csak a nem törölteket küldjük vissza
    const activeFiles = (project.files || []).filter(file => !file.isDeleted);

    console.log(`Aktív fájlok száma: ${activeFiles.length}`);

    res.json(activeFiles);
  } catch (error) {
    console.error('Hiba a megosztott projekt fájlok lekérdezése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt' });
  }
});

// Fájl hozzáadása megosztott projekthez (publikus végpont)
router.post('/public/projects/:token/files', async (req, res) => {
  try {
    const { token } = req.params;
    const fileData = req.body;
    console.log(`POST /api/public/projects/${token}/files publikus kérés érkezett`, {
      fájlnév: fileData.name,
      méret: fileData.size,
      típus: fileData.type
    });

    // Keresés a sharing.token mezőben
    let project = await Project.findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await Project.findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    console.log(`Megosztott projekt megtalálva: ${project.name}`);

    // Validáljuk a fájl adatokat
    if (!fileData.id || !fileData.name || !fileData.size || !fileData.type) {
      console.log('Hiányzó kötelező adatok:', {
        van_id: !!fileData.id,
        van_név: !!fileData.name,
        van_méret: !!fileData.size,
        van_típus: !!fileData.type
      });
      return res.status(400).json({ message: 'Hiányzó fájl adatok' });
    }

    // Előkészítjük a fájl objektumot a MongoDB számára
    const fileToSave = {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      uploadedAt: new Date(),
      uploadedBy: fileData.uploadedBy || 'Ügyfél', // Alapértelmezés: "Ügyfél"
      s3url: fileData.s3url || null,
      s3key: fileData.s3key || null,
      isDeleted: false
    };

    // Ha van fájltartalom, feltöltjük az S3-ba
    if (fileData.content) {
      try {
        console.log('S3 feltöltés kezdeményezése publikus végponton keresztül...');
        const s3Result = await uploadToS3({
          ...fileData,
          projectId: project._id.toString()
        });

        // S3 adatok hozzáadása
        fileToSave.s3url = s3Result.s3url;
        fileToSave.s3key = s3Result.key;
        console.log('S3 feltöltés sikeres:', { url: fileToSave.s3url });

        // Content eltávolítása, mert már feltöltöttük S3-ba
        delete fileData.content;
      } catch (s3Error) {
        console.error('Hiba az S3 feltöltés során:', s3Error);
        return res.status(500).json({
          message: 'Hiba a fájl feltöltése során',
          error: s3Error.message
        });
      }
    }

    // Az új fájl objektum hozzáadása a tömbhöz
    if (!project.files) {
      project.files = [];
    }

    // Ellenőrizzük, hogy ez a fájl nem létezik-e már (id alapján)
    const existingFileIndex = project.files.findIndex(f => f.id === fileToSave.id);
    if (existingFileIndex !== -1) {
      console.log(`Már létező fájl frissítése az ID alapján: ${fileToSave.id}`);
      // Ha már létezik, frissítjük
      Object.assign(project.files[existingFileIndex], fileToSave);
    } else {
      // Új fájl hozzáadása
      project.files.push(fileToSave);
    }

    // Értesítés küldése az adminnak az új fájlról
    try {
      await Notification.create({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'project',
        title: 'Új fájl feltöltve megosztott projektbe',
        message: `Új fájl (${fileToSave.name}) lett feltöltve a "${project.name}" megosztott projektbe.`,
        severity: 'info',
        link: `/projects/${project._id}`
      });
      console.log('Értesítés sikeresen elküldve az adminnak');
    } catch (notifError) {
      console.error('Hiba az értesítés küldése során:', notifError);
      // Ezt a hibát csak naplózzuk, de nem szakítjuk meg a feltöltést
    }

    await project.save();
    console.log(`Fájl sikeresen mentve a megosztott projekthez: ${fileToSave.name}`);

    // Csak a nem törölt fájlokat küldjük vissza
    const activeFiles = project.files.filter(f => !f.isDeleted);
    res.status(201).json({
      message: 'Fájl sikeresen hozzáadva',
      files: activeFiles
    });
  } catch (error) {
    console.error('Hiba a fájl megosztott projekthez adása során:', error);
    res.status(500).json({
      message: 'Szerver hiba történt',
      error: error.message
    });
  }
});

export { uploadToS3, verifyPin };
export default router;