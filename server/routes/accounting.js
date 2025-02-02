import express from 'express';
import Accounting from '../models/Accounting.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Minden route védelme az authMiddleware-rel
router.use(authMiddleware);

// Eszközök lekérése
router.get('/assets', async (req, res) => {
  try {
    const assets = await Accounting.find({
      type: { $in: ['equipment', 'software', 'furniture'] }
    }).sort({ purchaseDate: -1 });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Költségek lekérése
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await Accounting.find({
      type: { $nin: ['equipment', 'software', 'furniture'] }
    }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Új eszköz hozzáadása
router.post('/assets', async (req, res) => {
  try {
    const asset = new Accounting({
      ...req.body,
      type: req.body.type || 'equipment'
    });
    const savedAsset = await asset.save();
    res.status(201).json(savedAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Új költség hozzáadása
router.post('/expenses', async (req, res) => {
  try {
    const expense = new Accounting(req.body);
    const savedExpense = await expense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eszköz módosítása
router.put('/assets/:id', async (req, res) => {
  try {
    const updatedAsset = await Accounting.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedAsset) {
      return res.status(404).json({ message: 'Eszköz nem található' });
    }
    res.json(updatedAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Költség módosítása
router.put('/expenses/:id', async (req, res) => {
  try {
    const updatedExpense = await Accounting.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedExpense) {
      return res.status(404).json({ message: 'Költség nem található' });
    }
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eszköz törlése
router.delete('/assets/:id', async (req, res) => {
  try {
    const asset = await Accounting.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Eszköz nem található' });
    }
    await Accounting.deleteOne({ _id: req.params.id });
    res.json({ message: 'Eszköz sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Költség törlése
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expense = await Accounting.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Költség nem található' });
    }
    await Accounting.deleteOne({ _id: req.params.id });
    res.json({ message: 'Költség sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;