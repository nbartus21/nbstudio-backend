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
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Projekt nem található' });
      }
  
      if (!project.invoices) {
        project.invoices = [];
      }
  
      project.invoices.push(req.body);
      
      // Számoljuk újra a teljes számlázott összeget
      project.financial.totalBilled = project.invoices.reduce(
        (sum, invoice) => sum + (invoice.totalAmount || 0), 
        0
      );
  
      const updatedProject = await project.save();
      
      console.log('Számla hozzáadva:', updatedProject.invoices[updatedProject.invoices.length - 1]);
      
      res.status(201).json(updatedProject);
    } catch (error) {
      console.error('Hiba a számla létrehozásakor:', error);
      res.status(400).json({ 
        message: 'Hiba a számla létrehozásakor', 
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

// Megosztási link generálása - frissített verzió
router.post('/projects/:id/share', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Egyedi token generálása
    const shareToken = uuidv4();
    
    // Token mentése a projekthez
    project.shareToken = shareToken;
    await project.save();

    // Megosztási link generálása - használjuk a frontend URL-t
    const shareLink = `http://38.242.208.190:5173/shared-project/${shareToken}`;
    
    res.status(200).json({ shareLink });
  } catch (error) {
    console.error('Hiba a megosztási link generálásakor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Új végpont: Megosztott projekt hozzáférés ellenőrzése
router.post('/projects/verify-access', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    const project = await Project.findOne({ shareToken: token });
    if (!project) {
      return res.status(404).json({ message: 'A projekt nem található' });
    }

    // Ellenőrizzük, hogy az email cím egyezik-e a projekt ügyfél email címével
    if (project.client.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ message: 'Érvénytelen email cím' });
    }

    // Csak a szükséges adatokat küldjük vissza
    const sanitizedProject = {
      name: project.name,
      status: project.status,
      description: project.description,
      invoices: project.invoices,
      financial: {
        currency: project.financial?.currency
      }
    };

    res.json({ project: sanitizedProject });
  } catch (error) {
    console.error('Hiba a hozzáférés ellenőrzésekor:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
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