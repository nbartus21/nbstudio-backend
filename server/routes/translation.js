import express from 'express';
import Task from '../models/Task.js';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// A router már védetté van téve az index.js-ben, így ezt elhagyjuk

// ============= FELADATOK VÉGPONTOK =============
// Összes feladat lekérése
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userData.email })
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Hiba történt a feladatok lekérése során' });
  }
});

// Egy feladat lekérése
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Hiba történt a feladat lekérése során' });
  }
});

// Új feladat létrehozása
router.post('/tasks', async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      userId: req.userData.email,
      createdAt: new Date()
    });
    
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ message: 'Hiba történt a feladat létrehozása során' });
  }
});

// Feladat frissítése
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    // Ha státusz completed-re változik, de nem volt eddig az
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
      req.body.progress = 100;
    }
    // Ha completed-ről active-ra változik
    else if (req.body.status === 'active' && task.status === 'completed') {
      req.body.completedAt = undefined;
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ message: 'Hiba történt a feladat módosítása során' });
  }
});

// Feladat törlése
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    res.json({ message: 'Feladat sikeresen törölve' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Hiba történt a feladat törlése során' });
  }
});

// Feladat frissítés (update) hozzáadása
router.post('/tasks/:id/updates', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    const update = {
      _id: new mongoose.Types.ObjectId(),
      content: req.body.content,
      progress: req.body.progress || task.progress,
      createdAt: new Date()
    };
    
    task.updates.push(update);
    
    // Ha a frissítés haladása nagyobb, mint a jelenlegi
    if (update.progress > task.progress) {
      task.progress = update.progress;
    }
    
    // Ha a haladás 100%, a státuszt is frissítjük
    if (update.progress >= 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
    }
    
    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Error adding task update:', error);
    res.status(400).json({ message: 'Hiba történt a feladat frissítésének hozzáadása során' });
  }
});

// ============= SABLONOK VÉGPONTOK =============
// Ezek a végpontok a meglévő sablon funkcionalitást szolgálják
// Ha még nem léteznek a Template modell/adatbázis, alapértelmezett értékeket adunk vissza

// Sablonok lekérése
router.get('/templates', async (req, res) => {
  try {
    // Ideális esetben: const templates = await Template.find({ userId: req.userData.email });

    // Alapértelmezett sablonok, ha nincs Template modell
    const templates = [
      {
        _id: '1',
        name: 'Üdvözlő email',
        description: 'Új ügyfél üdvözlése',
        sourceText: 'Tisztelt Ügyfelünk!\n\nKöszönjük megkeresését. Örömmel segítünk Önnek weboldala fejlesztésében.\n\nÜdvözlettel,\nNB Studio',
        targetText: 'Sehr geehrter Kunde!\n\nVielen Dank für Ihre Anfrage. Wir helfen Ihnen gerne bei der Entwicklung Ihrer Website.\n\nMit freundlichen Grüßen,\nNB Studio',
        sourceLanguage: 'hu',
        targetLanguage: 'de',
        category: 'email',
        userId: req.userData.email
      }
    ];
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Hiba történt a sablonok lekérése során' });
  }
});

// Új sablon mentése
router.post('/templates', async (req, res) => {
  try {
    // Ideális esetben:
    // const template = new Template({
    //   ...req.body,
    //   userId: req.userData.email
    // });
    // const savedTemplate = await template.save();
    
    // Mivel nincs Template modell, példa választ küldünk
    const savedTemplate = {
      _id: Date.now().toString(),
      ...req.body,
      userId: req.userData.email,
      createdAt: new Date()
    };
    
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(400).json({ message: 'Hiba történt a sablon mentése során' });
  }
});

// Sablon törlése
router.delete('/templates/:id', async (req, res) => {
  try {
    // Ideális esetben:
    // const template = await Template.findOneAndDelete({
    //   _id: req.params.id,
    //   userId: req.userData.email
    // });
    
    // Mivel nincs Template modell, csak sikeres választ küldünk
    res.json({ message: 'Sablon sikeresen törölve' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Hiba történt a sablon törlése során' });
  }
});

export default router;