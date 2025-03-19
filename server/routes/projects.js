import express from 'express';
import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification.js';

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
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
  
  // Debug információk
  console.log(`PIN verify request received on endpoint: ${req.originalUrl}`);
  console.log(`Request headers:`, JSON.stringify(req.headers, null, 2));
  
  console.log('PIN ellenőrzés kérés érkezett:', req.body);
  
  try {
    const { token, pin, updateProject } = req.body;
    
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
      
      // Ha még mindig nincs találat, próbáljuk megnézni van-e egyáltalán megosztott projekt
      if (!project) {
        console.log('Projekt nem található a token alapján, ellenőrizzük van-e egyáltalán megosztott projekt');
        const anyProjectWithSharing = await Project.findOne({ 'sharing': { $exists: true } });
        if (anyProjectWithSharing) {
          console.log('Van megosztott projekt, de nem ezzel a tokennel. Például:', anyProjectWithSharing.sharing.token);
        } else {
          console.log('Nincs egyetlen megosztott projekt sem az adatbázisban');
        }
        
        // Ha van legalább egy megosztott projekt, de rossz token jött, logoljuk a helyes tokent
        const allSharedProjects = await Project.find(
          { 'sharing.token': { $exists: true } },
          { 'sharing.token': 1, 'name': 1 }
        );
        if (allSharedProjects.length > 0) {
          console.log('Összes megosztott projekt token értékei:');
          allSharedProjects.forEach(p => {
            console.log(`- Projekt "${p.name}": ${p.sharing?.token}`);
          });
        }
        
        return res.status(404).json({ message: 'A projekt nem található' });
      }
    }
    
    console.log('Megtalált projekt:', project.name, 'számlák száma:', project.invoices?.length || 0);

    // Lejárat ellenőrzése
    if (project.sharing && project.sharing.expiresAt && new Date() > project.sharing.expiresAt) {
      return res.status(403).json({ message: 'A megosztási link lejárt' });
    }

    // PIN ellenőrzése
    // Ha pin üres, akkor ne utasítsuk el azonnal, hanem csak figyelmeztetjük
    if (!pin || pin.trim() === '') {
      console.log('Üres PIN érkezett, de nem utasítjuk el automatikusan');
      if (project.sharing && project.sharing.pin && project.sharing.pin.trim() !== '') {
        console.log('A projekthez tartozik PIN (kezdő karakterek):', project.sharing.pin.substring(0, 2) + '****');
        return res.status(403).json({ message: 'PIN kód szükséges a projekthez való hozzáféréshez' });
      } else {
        console.log('A projekthez nem tartozik PIN, vagy üres PIN van beállítva, beengedjük a felhasználót');
        // Ha nincs PIN a projekthez, vagy üres, akkor engedjük be
      }
    } else if (project.sharing && project.sharing.pin && project.sharing.pin !== pin) {
      console.log('Érvénytelen PIN kód (várt/kapott):', project.sharing.pin, '/', pin);
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }
    
    // Ha updateProject objektumot küldtek, frissítsük a projektet
    if (updateProject) {
      console.log('Projekt frissítési kérés érkezett a verify-pin-ben');
      
      // Frissítsük a kliens adatokat - csak a biztonságos mezőket
      if (updateProject.client) {
        console.log('Kliens adatok frissítése:', updateProject.client.name);
        project.client = {
          ...project.client,
          name: updateProject.client.name || project.client.name,
          email: updateProject.client.email || project.client.email,
          phone: updateProject.client.phone || project.client.phone,
          companyName: updateProject.client.companyName || project.client.companyName,
          taxNumber: updateProject.client.taxNumber || project.client.taxNumber,
          address: updateProject.client.address || project.client.address
        };
        
        await project.save();
        console.log('Projekt sikeresen frissítve a szerveren.');
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
      számlákSzáma: response.project.invoices.length
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

// ÚJ: Fájl hozzáadása projekthez
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
    
    // Fájl hozzáadása
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

export default router;