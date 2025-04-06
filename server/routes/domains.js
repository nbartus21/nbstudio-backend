import express from 'express';
import Domain from '../models/Domain.js';
const router = express.Router();

// Összes domain lekérése
router.get('/domains', async (req, res) => {
  try {
    const domains = await Domain.find().sort({ expiryDate: 1 });
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Új domain létrehozása
router.post('/domains', async (req, res) => {
  const domain = new Domain(req.body);
  try {
    const newDomain = await domain.save();

    // Ha van projektId, akkor frissítsük a projektet is
    if (req.body.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(req.body.projectId);

      if (project) {
        // Ellenőrizzük, hogy a domain már hozzá van-e adva a projekthez
        const domainExists = project.domains && project.domains.some(d => d.domainId && d.domainId.toString() === newDomain._id.toString());

        if (!domainExists) {
          // Adjuk hozzá a domaint a projekthez
          if (!project.domains) project.domains = [];

          project.domains.push({
            domainId: newDomain._id,
            name: newDomain.name,
            expiryDate: newDomain.expiryDate,
            addedAt: new Date()
          });

          await project.save();
        }
      }
    }

    res.status(201).json(newDomain);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Domain frissítése
router.put('/domains/:id', async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain nem található' });
    }

    // Ellenőrizzük, hogy változott-e a projektId
    const oldProjectId = domain.projectId ? domain.projectId.toString() : null;
    const newProjectId = req.body.projectId || null;

    // Frissítsük a domain adatait
    Object.assign(domain, req.body);
    domain.history.push({
      action: 'update',
      details: 'Domain adatok frissítve'
    });

    const updatedDomain = await domain.save();

    // Projekt kapcsolatok kezelése
    const Project = (await import('../models/Project.js')).default;

    // Ha volt régi projekt, távolítsuk el a domaint onnan
    if (oldProjectId && oldProjectId !== newProjectId) {
      const oldProject = await Project.findById(oldProjectId);
      if (oldProject && oldProject.domains) {
        oldProject.domains = oldProject.domains.filter(d =>
          !d.domainId || d.domainId.toString() !== domain._id.toString());
        await oldProject.save();
      }
    }

    // Ha van új projekt, adjuk hozzá a domaint
    if (newProjectId && oldProjectId !== newProjectId) {
      const newProject = await Project.findById(newProjectId);
      if (newProject) {
        // Ellenőrizzük, hogy a domain már hozzá van-e adva a projekthez
        const domainExists = newProject.domains && newProject.domains.some(d =>
          d.domainId && d.domainId.toString() === domain._id.toString());

        if (!domainExists) {
          // Adjuk hozzá a domaint a projekthez
          if (!newProject.domains) newProject.domains = [];

          newProject.domains.push({
            domainId: domain._id,
            name: domain.name,
            expiryDate: domain.expiryDate,
            addedAt: new Date()
          });

          await newProject.save();
        }
      }
    }

    res.json(updatedDomain);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Domain törlése
router.delete('/domains/:id', async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ message: 'Domain nem található' });
    }

    // Ha a domain kapcsolódik projekthez, távolítsuk el a kapcsolatot
    if (domain.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(domain.projectId);

      if (project && project.domains) {
        project.domains = project.domains.filter(d =>
          !d.domainId || d.domainId.toString() !== domain._id.toString());
        await project.save();
      }
    }

    await Domain.deleteOne({ _id: domain._id }); // remove() helyett deleteOne()
    res.json({ message: 'Domain sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Domain lejárat ellenőrzése
router.get('/domains/check-expiry', async (req, res) => {
  try {
    const domains = await Domain.find({
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 nap
      }
    });
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;