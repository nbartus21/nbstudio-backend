import express from 'express';
import Project from './models/Project.js';

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

export default router;