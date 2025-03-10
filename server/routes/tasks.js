import express from 'express';
import Task from '../models/Task.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Védett route-ok - bejelentkezés szükséges
router.use(authMiddleware);

// Feladatok lekérése
router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, search, dateRange } = req.query;
    
    // Ellenőrizzük, hogy a req.userData létezik-e
    if (!req.userData || !req.userData.email) {
      console.error('Hiányzó felhasználói adat:', req.userData);
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    // Alap lekérdezés a felhasználó feladataira
    let query = { createdBy: req.userData.email };
    
    // Státusz szerinti szűrés
    if (status) {
      query.status = status;
    }
    
    // Prioritás szerinti szűrés
    if (priority) {
      query.priority = priority;
    }
    
    // Szöveg keresés
    if (search) {
      // Szöveg keresés: vagy text index vagy regex használata
      if (Task.schema.index && Task.schema.index.text) {
        // Ha van text index a modellen
        query.$text = { $search: search };
      } else {
        // Ha nincs text index, használjunk regex-et
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
    }
    
    // Dátum szűrés
    if (dateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      if (dateRange === 'today') {
        query.dueDate = {
          $gte: today,
          $lt: tomorrow
        };
      } else if (dateRange === 'tomorrow') {
        query.dueDate = {
          $gte: tomorrow,
          $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        };
      } else if (dateRange === 'week') {
        query.dueDate = {
          $gte: today,
          $lt: nextWeek
        };
      }
    }
    
    console.log('Feladatok lekérdezése a következő paraméterekkel:', {
      email: req.userData.email,
      status,
      priority,
      search,
      dateRange
    });
    
    // Feladatok lekérése és sorrendbe állítása - JAVÍTOTT VERZIÓ
    // MongoDB helyes sort szintaxis
    const tasks = await Task.find(query)
      .sort({ dueDate: 1 }) // Először dátum szerint rendezzük
      .lean();
    
    console.log(`${tasks.length} feladat található`);
    
    // Virtuális mező hozzáadása minden feladathoz
    const tasksWithIsOverdue = tasks.map(task => {
      const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
      return { ...task, isOverdue };
    });
    
    // JavaScript-ben rendezzük a prioritás szerint
    // high = 0, medium = 1, low = 2 (hogy a magasabb prioritású feladatok legyenek előrébb)
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    tasksWithIsOverdue.sort((a, b) => {
      // Először prioritás szerint rendezünk
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Ha a prioritás azonos, határidő szerint rendezünk
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    res.json(tasksWithIsOverdue);
  } catch (error) {
    console.error('Hiba a feladatok lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladatok lekérésekor',
      error: error.message 
    });
  }
});

// Egy feladat lekérése
router.get('/tasks/:id', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const task = await Task.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Hiba a feladat lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat lekérésekor',
      error: error.message 
    });
  }
});

// Új feladat létrehozása
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, priority, reminders } = req.body;
    
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      console.error('Hiányzó felhasználói adatok a feladat létrehozásánál:', req.userData);
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    // Alapvető validáció
    if (!title) {
      return res.status(400).json({ message: 'A feladat címe kötelező' });
    }
    
    if (!dueDate) {
      return res.status(400).json({ message: 'A határidő megadása kötelező' });
    }
    
    console.log('Feladat létrehozása:', {
      title,
      createdBy: req.userData.email,
      dueDate,
      priority: priority || 'medium'
    });
    
    // Új feladat létrehozása
    const task = new Task({
      title,
      description: description || '',
      dueDate,
      priority: priority || 'medium',
      reminders: reminders || [],
      createdBy: req.userData.email
    });
    
    // Feladat mentése
    const savedTask = await task.save();
    console.log('Feladat sikeresen létrehozva:', savedTask._id);
    
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Hiba a feladat létrehozásakor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat létrehozásakor',
      error: error.message 
    });
  }
});

// Feladat frissítése
router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, dueDate, priority, reminders } = req.body;
    
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    if (!title) {
      return res.status(400).json({ message: 'A feladat címe kötelező' });
    }
    
    // Feladat keresése
    const task = await Task.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    // Adatok frissítése
    task.title = title;
    task.description = description || '';
    
    if (dueDate) {
      task.dueDate = dueDate;
    }
    
    if (priority) {
      task.priority = priority;
    }
    
    if (reminders) {
      task.reminders = reminders;
    }
    
    // Automatikus updatedAt frissítés
    task.updatedAt = new Date();
    
    const updatedTask = await task.save();
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Hiba a feladat frissítésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat frissítésekor',
      error: error.message 
    });
  }
});

// Feladat teljesítettnek jelölése
router.put('/tasks/:id/complete', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const task = await Task.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    const completedTask = await task.save();
    
    res.json(completedTask);
  } catch (error) {
    console.error('Hiba a feladat teljesítésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat teljesítésekor',
      error: error.message 
    });
  }
});

// Feladat visszaállítása függőbe
router.put('/tasks/:id/reopen', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const task = await Task.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    task.status = 'pending';
    task.completedAt = undefined;
    task.updatedAt = new Date();
    
    const reopenedTask = await task.save();
    
    res.json(reopenedTask);
  } catch (error) {
    console.error('Hiba a feladat újranyitásakor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat újranyitásakor',
      error: error.message 
    });
  }
});

// Feladat törlése
router.delete('/tasks/:id', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const task = await Task.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Feladat nem található' });
    }
    
    await Task.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Feladat sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a feladat törlésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat törlésekor',
      error: error.message 
    });
  }
});

// Mai feladatok lekérése (dashboard widgethez)
router.get('/tasks/dashboard/today', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasks = await Task.find({
      createdBy: req.userData.email,
      dueDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'pending'
    }).sort({ dueDate: 1 }).lean();
    
    // Prioritás szerint rendezzük (JavaScript-ben)
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    res.json(tasks);
  } catch (error) {
    console.error('Hiba a mai feladatok lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a mai feladatok lekérésekor',
      error: error.message 
    });
  }
});

// Késésben lévő feladatok lekérése (dashboard widgethez)
router.get('/tasks/dashboard/overdue', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = await Task.find({
      createdBy: req.userData.email,
      dueDate: { $lt: today },
      status: 'pending'
    }).sort({ dueDate: 1 }).lean();
    
    // Prioritás szerint rendezzük (JavaScript-ben)
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    res.json(tasks);
  } catch (error) {
    console.error('Hiba a késésben lévő feladatok lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a késésben lévő feladatok lekérésekor',
      error: error.message 
    });
  }
});

// Statisztikák lekérése (dashboard widgethez)
router.get('/tasks/dashboard/stats', async (req, res) => {
  try {
    // Felhasználó ellenőrzése
    if (!req.userData || !req.userData.email) {
      return res.status(401).json({ message: 'Hiányzó felhasználói adatok' });
    }
    
    const email = req.userData.email;
    
    // Mai dátum határok
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Összes feladat
    const totalTasks = await Task.countDocuments({ createdBy: email });
    
    // Függőben lévő feladatok
    const pendingTasks = await Task.countDocuments({ 
      createdBy: email,
      status: 'pending'
    });
    
    // Teljesített feladatok
    const completedTasks = await Task.countDocuments({ 
      createdBy: email,
      status: 'completed'
    });
    
    // Mai feladatok
    const todayTasks = await Task.countDocuments({ 
      createdBy: email,
      dueDate: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Késésben lévő feladatok
    const overdueTasks = await Task.countDocuments({ 
      createdBy: email,
      dueDate: { $lt: today },
      status: 'pending'
    });
    
    // Mai befejezett feladatok
    const todayCompleted = await Task.countDocuments({ 
      createdBy: email,
      completedAt: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'completed'
    });
    
    res.json({
      totalTasks,
      pendingTasks,
      completedTasks,
      todayTasks,
      overdueTasks,
      todayCompleted
    });
  } catch (error) {
    console.error('Hiba a feladat statisztikák lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba a feladat statisztikák lekérésekor',
      error: error.message 
    });
  }
});

export default router;