import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';

const router = express.Router();

// Összes feladat lekérése - NYILVÁNOS
router.get('/', async (req, res) => {
  try {
    console.log('Nyilvános feladatok lekérése');
    // Egyszerű rendezési logika a hibák elkerülése érdekében
    const tasks = await Task.find()
      .sort({ createdAt: -1 });
    
    console.log(`${tasks.length} feladat található`);
    res.json(tasks);
  } catch (error) {
    console.error('Hiba a feladatok lekérésekor:', error);
    res.status(500).json({ message: 'Hiba a feladatok lekérése során', error: error.message });
  }
});

// Egy feladat lekérése - NYILVÁNOS
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Hiba a feladat lekérésekor:', error);
    res.status(500).json({ message: 'Hiba a feladat lekérése során', error: error.message });
  }
});

// Új feladat létrehozása - NYILVÁNOS
router.post('/', async (req, res) => {
  try {
    console.log('Új feladat létrehozása nyilvánosan');
    console.log('Feladat adatok:', req.body);
    
    // Érvényesítés
    if (!req.body.title) {
      return res.status(400).json({ message: 'A feladat címe kötelező' });
    }
    
    const task = new Task({
      ...req.body,
      userId: req.body.userId || 'public-user' // Default érték, ha nincs userId
    });
    
    const savedTask = await task.save();
    console.log('Feladat létrehozva:', savedTask._id);
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Hiba a feladat létrehozásakor:', error);
    res.status(500).json({ message: 'Hiba a feladat létrehozása során', error: error.message });
  }
});

// Feladat frissítése - NYILVÁNOS
router.put('/:id', async (req, res) => {
  try {
    console.log('Feladat frissítése nyilvánosan:', req.params.id);
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    // Ha a státusz változik 'completed'-re
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
      req.body.progress = 100;
    } 
    // Ha a státusz változik 'active'-ra
    else if (req.body.status === 'active' && task.status === 'completed') {
      req.body.completedAt = undefined;
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    console.log('Feladat sikeresen frissítve');
    res.json(updatedTask);
  } catch (error) {
    console.error('Hiba a feladat frissítésekor:', error);
    res.status(500).json({ message: 'Hiba a feladat frissítése során', error: error.message });
  }
});

// Feladat törlése - NYILVÁNOS
router.delete('/:id', async (req, res) => {
  try {
    console.log('Feladat törlése nyilvánosan:', req.params.id);
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    await Task.deleteOne({ _id: req.params.id });
    console.log('Feladat sikeresen törölve');
    res.json({ message: 'Feladat sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a feladat törlésekor:', error);
    res.status(500).json({ message: 'Hiba a feladat törlése során', error: error.message });
  }
});

// Feladat frissítés hozzáadása - NYILVÁNOS
router.post('/:id/updates', async (req, res) => {
  try {
    console.log('Frissítés hozzáadása a feladathoz nyilvánosan:', req.params.id);
    console.log('Frissítés adatok:', req.body);
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    // Érvényesítés
    if (!req.body.content) {
      return res.status(400).json({ message: 'A frissítés tartalma kötelező' });
    }
    
    const update = {
      content: req.body.content,
      progress: parseInt(req.body.progress) || task.progress,
      createdAt: new Date()
    };
    
    task.updates.push(update);
    
    // Ha a frissítés haladása nagyobb, mint a jelenlegi
    if (update.progress > task.progress) {
      task.progress = update.progress;
    }
    
    // Ha a haladás 100%, akkor a feladat kész
    if (update.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
    }
    
    await task.save();
    console.log('Frissítés sikeresen hozzáadva');
    res.json(task);
  } catch (error) {
    console.error('Hiba a feladat frissítésének hozzáadásakor:', error);
    res.status(500).json({ message: 'Hiba a feladat frissítésének hozzáadása során', error: error.message });
  }
});

export default router;