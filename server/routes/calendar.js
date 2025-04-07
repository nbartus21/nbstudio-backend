const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Naptár események lekérése
router.get('/events', auth, async (req, res) => {
  try {
    // Példa események a kezdeti implementációhoz
    const today = new Date();
    const events = [
      {
        id: 1,
        title: 'Domain megújítás - example.com',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
        type: 'domain'
      },
      {
        id: 2,
        title: 'Weboldal éves karbantartás',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
        type: 'maintenance'
      },
      {
        id: 3,
        title: 'Ügyfél egyeztetés - XYZ Projekt',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        type: 'meeting'
      },
      {
        id: 4,
        title: 'Havi számlázás',
        date: new Date(today.getFullYear(), today.getMonth() + 1, 1),
        type: 'invoice'
      },
      {
        id: 5,
        title: 'Projekt határidő - Webáruház',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
        type: 'project'
      }
    ];

    res.json(events);
  } catch (err) {
    console.error('Hiba a naptár események lekérésekor:', err.message);
    res.status(500).json({ msg: 'Szerver hiba' });
  }
});

// Esemény létrehozása
router.post('/events', auth, async (req, res) => {
  try {
    const { title, date, type } = req.body;
    
    // Validálás
    if (!title || !date || !type) {
      return res.status(400).json({ msg: 'Hiányzó adatok' });
    }

    // Itt implementálható az adatbázisba mentés
    const newEvent = {
      id: Math.floor(Math.random() * 10000) + 1,
      title,
      date: new Date(date),
      type
    };

    res.json(newEvent);
  } catch (err) {
    console.error('Hiba az esemény létrehozásakor:', err.message);
    res.status(500).json({ msg: 'Szerver hiba' });
  }
});

module.exports = router; 