import express from 'express';
import Task from '../models/Task.js';
import authMiddleware from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Védett végpontok - csak bejelentkezett felhasználók számára
router.use(authMiddleware);

// ---------------------- FELADAT VÉGPONTOK ----------------------

// Összes feladat lekérése
router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    let query = { userId: req.userData.email };
    
    // Státusz szűrő alkalmazása
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Prioritás szűrő alkalmazása
    if (priority) {
      query.priority = priority;
    }
    
    // Szöveg keresés alkalmazása
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tasks = await Task.find(query).sort({ dueDate: 1, priority: 1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Hiba történt a feladatok lekérése során', error: error.message });
  }
});

// Egy feladat lekérése azonosító alapján
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userData.email });
    
    if (!task) {
      return res.status(404).json({ message: 'A feladat nem található' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Hiba történt a feladat lekérése során', error: error.message });
  }
});

// Új feladat létrehozása validációval
router.post('/tasks', [
  body('title').notEmpty().withMessage('A feladat címe kötelező'),
  body('dueDate').isISO8601().withMessage('Érvényes dátum formátum szükséges'),
  body('priority').isIn(['high', 'medium', 'low']).withMessage('Érvénytelen prioritás')
], async (req, res) => {
  // Validációs hibák ellenőrzése
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const task = new Task({
      ...req.body,
      userId: req.userData.email
    });
    
    const savedTask = await task.save();
    console.log('New task created:', savedTask.title);
    
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ message: 'Hiba történt a feladat létrehozása során', error: error.message });
  }
});

// Feladat frissítése
router.put('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.userData.email;
    
    // Ellenőrizzük, hogy a feladat létezik-e és a felhasználóhoz tartozik-e
    const existingTask = await Task.findOne({ _id: taskId, userId });
    
    if (!existingTask) {
      return res.status(404).json({ message: 'A feladat nem található vagy nem jogosult a módosításra' });
    }
    
    // Ha a frissítés tartalmaz státuszváltást completed-re, állítsuk be a completedAt mezőt
    if (req.body.status === 'completed' && existingTask.status !== 'completed') {
      req.body.completedAt = new Date();
      req.body.progress = 100;
    } else if (req.body.status === 'active' && existingTask.status === 'completed') {
      // Ha újranyitjuk a feladatot, töröljük a completedAt mezőt
      req.body.completedAt = null;
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      req.body,
      { new: true, runValidators: true }
    );
    
    console.log('Task updated:', updatedTask.title);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ message: 'Hiba történt a feladat frissítése során', error: error.message });
  }
});

// Feladat törlése
router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await Task.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userData.email 
    });
    
    if (!result) {
      return res.status(404).json({ message: 'A feladat nem található vagy nem jogosult a törlésre' });
    }
    
    console.log('Task deleted:', req.params.id);
    res.json({ message: 'Feladat sikeresen törölve' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Hiba történt a feladat törlése során', error: error.message });
  }
});

// Feladat frissítés (update) hozzáadása
router.post('/tasks/:id/updates', [
  body('content').notEmpty().withMessage('A frissítés tartalma kötelező'),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('A haladásnak 0 és 100 közötti számnak kell lennie')
], async (req, res) => {
  // Validációs hibák ellenőrzése
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const taskId = req.params.id;
    const userId = req.userData.email;
    
    // Ellenőrizzük, hogy a feladat létezik-e és a felhasználóhoz tartozik-e
    const task = await Task.findOne({ _id: taskId, userId });
    
    if (!task) {
      return res.status(404).json({ message: 'A feladat nem található vagy nem jogosult a módosításra' });
    }
    
    const update = {
      content: req.body.content,
      progress: req.body.progress,
      createdAt: new Date()
    };
    
    // Frissítés hozzáadása a feladathoz
    task.updates.push(update);
    
    // Ha a frissítés haladása nagyobb, mint a feladat jelenlegi haladása, aktualizáljuk azt
    if (req.body.progress > task.progress) {
      task.progress = req.body.progress;
    }
    
    // Ha a haladás 100%, jelöljük a feladatot befejezettként
    if (req.body.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
    }
    
    const updatedTask = await task.save();
    console.log('Task update added:', updatedTask.title);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error adding task update:', error);
    res.status(400).json({ message: 'Hiba történt a feladat frissítés hozzáadása során', error: error.message });
  }
});

// ------------------- MEGLÉVŐ FORDÍTÁS VÉGPONTOK -------------------

// Itt az eredeti fordítási funkciók végpontjai jönnének...
// Pl. sablonok kezelése, fordítási előzmények, stb.

// Sablonok lekérése
router.get('/templates', async (req, res) => {
  try {
    // Itt lenne a sablonok lekérése az adatbázisból
    // Példa: const templates = await Template.find({ userId: req.userData.email });
    // res.json(templates);
    
    // Mivel nincs Template modell a dokumentumokban, itt most csak egy példa választ küldünk
    res.json([
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
    ]);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Hiba történt a sablonok lekérése során', error: error.message });
  }
});

// Jegyzetek lekérése
router.get('/notes', async (req, res) => {
  try {
    // Itt lenne a jegyzetek lekérése az adatbázisból
    // Példa: const notes = await Note.find({ userId: req.userData.email });
    // res.json(notes);
    
    // Mivel nincs Note modell a dokumentumokban, itt most csak egy példa választ küldünk
    res.json([
      {
        _id: '1',
        title: 'Német megszólítási formák',
        content: 'Hivatalos levelekben: "Sehr geehrte/r Frau/Herr [Nachname]"\nInformális: "Liebe/r [Vorname]"\nCéges kommunikáció: "Sehr geehrte Damen und Herren"',
        tags: ['német', 'megszólítás', 'levélírás'],
        category: 'nyelvi',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        userId: req.userData.email
      }
    ]);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Hiba történt a jegyzetek lekérése során', error: error.message });
  }
});

export default router;