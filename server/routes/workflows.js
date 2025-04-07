const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Aktív munkafolyamatok lekérdezése
router.get('/active', auth, async (req, res) => {
  try {
    // Példa munkafolyamatok a kezdeti implementációhoz
    const mockWorkflows = [
      {
        id: 'wf-1',
        name: 'E-commerce Weboldal Fejlesztés',
        status: 'in-progress',
        progress: 68,
        tasks: [
          { name: 'Design jóváhagyás', status: 'completed' },
          { name: 'Frontend fejlesztés', status: 'in-progress' },
          { name: 'Backend integrálás', status: 'pending' }
        ],
        dueDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'wf-2',
        name: 'Marketing Kampány - Q2',
        status: 'in-progress',
        progress: 42,
        tasks: [
          { name: 'Stratégia kidolgozás', status: 'completed' },
          { name: 'Tartalom készítés', status: 'in-progress' },
          { name: 'Hirdetések beállítása', status: 'pending' }
        ],
        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'wf-3',
        name: 'Domain és Szerver Migráció',
        status: 'in-progress',
        progress: 85,
        tasks: [
          { name: 'Előkészítés', status: 'completed' },
          { name: 'DNS beállítások', status: 'completed' },
          { name: 'Tartalom migráció', status: 'in-progress' }
        ],
        dueDate: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000)
      }
    ];

    res.json(mockWorkflows);
  } catch (err) {
    console.error('Hiba a munkafolyamatok lekérdezésekor:', err.message);
    res.status(500).json({ msg: 'Szerver hiba' });
  }
});

// Munkafolyamat létrehozása
router.post('/', auth, async (req, res) => {
  try {
    const { name, tasks, dueDate } = req.body;
    
    // Validálás
    if (!name || !tasks || !dueDate) {
      return res.status(400).json({ msg: 'Hiányzó adatok' });
    }

    // Itt implementálható az adatbázisba mentés
    const newWorkflow = {
      id: `wf-${Math.floor(Math.random() * 10000) + 1}`,
      name,
      status: 'in-progress',
      progress: 0,
      tasks,
      dueDate: new Date(dueDate),
      createdAt: new Date()
    };

    res.json(newWorkflow);
  } catch (err) {
    console.error('Hiba a munkafolyamat létrehozásakor:', err.message);
    res.status(500).json({ msg: 'Szerver hiba' });
  }
});

// Munkafolyamat állapot frissítése
router.put('/:workflowId', auth, async (req, res) => {
  try {
    const { progress, status, tasks } = req.body;
    const { workflowId } = req.params;

    // Itt implementálható az adatbázisból való lekérdezés és frissítés
    // Példa válasz:
    res.json({
      id: workflowId,
      status: status || 'in-progress',
      progress: progress || 0,
      tasks: tasks || [],
      updatedAt: new Date()
    });
  } catch (err) {
    console.error('Hiba a munkafolyamat frissítésekor:', err.message);
    res.status(500).json({ msg: 'Szerver hiba' });
  }
});

module.exports = router; 