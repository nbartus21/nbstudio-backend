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
    Object.assign(domain, req.body);
    domain.history.push({
      action: 'update',
      details: 'Domain adatok frissítve'
    });
    const updatedDomain = await domain.save();
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