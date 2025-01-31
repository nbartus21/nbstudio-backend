import express from 'express';
import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';

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

    if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
      console.error('Hibás számla tételek:', invoiceData.items);
      return res.status(400).json({ message: 'Érvénytelen számla tételek' });
    }

    // Tételek ellenőrzése
    for (const item of invoiceData.items) {
      console.log('Tétel ellenőrzése:', item);
      if (!item.description || !item.quantity || !item.unitPrice) {
        console.error('Hiányzó tétel adatok:', item);
        return res.status(400).json({ message: 'Hiányzó számla tétel adatok' });
      }
    }

    project.invoices.push(invoiceData);
    console.log('Számla hozzáadva a projekthez');

    // Teljes számlázott összeg újraszámolása
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
    res.status(500).json({
      message: 'Szerver hiba történt a számla létrehozásakor',
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

    // 6 jegyű PIN kód generálása
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Token és PIN mentése a projekthez
    const shareToken = uuidv4();
    project.shareToken = shareToken;
    project.sharePin = pin;
    await project.save();

    // Megosztási link generálása
    const shareLink = `http://38.242.208.190:5173/shared-project/${shareToken}`;
    
    // Visszaküldjük a linket és a PIN-t
    res.status(200).json({ 
      shareLink,
      pin  // Ez a PIN kód jelenik meg az admin felületen
    });
  } catch (error) {
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Publikus végpont a PIN ellenőrzéshez (nem kell auth middleware)
router.post('/public/projects/verify-pin', async (req, res) => {
  console.log('PIN ellenőrzési kérés érkezett');
  console.log('Request body:', req.body);
  
  try {
    const { token, pin } = req.body;
    console.log('Beérkezett token:', token);
    console.log('Beérkezett PIN:', pin);
    
    const project = await Project.findOne({ shareToken: token });
    console.log('Talált projekt:', project ? 'igen' : 'nem');
    
    if (!project) {
      return res.status(404).json({ message: 'A projekt nem található' });
    }

    if (project.sharePin !== pin) {
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    // Minden szükséges adatot küldjünk vissza
    const sanitizedProject = {
      name: project.name,
      status: project.status,
      description: project.description,
      client: {
        name: project.client?.name || 'Unknown Client',
        email: project.client?.email
      },
      financial: {
        currency: project.financial?.currency || 'EUR'
      },
      invoices: project.invoices || []
    };

    console.log('Küldendő projekt adatok:', sanitizedProject); // Debug log
    res.json({ project: sanitizedProject });
    
  } catch (error) {
    console.error('Szerver hiba:', error);
    res.status(500).json({ message: 'Szerver hiba történt' });
  }
});

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

export default router;