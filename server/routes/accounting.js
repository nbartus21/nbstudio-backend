import express from 'express';
import Accounting from '../models/Accounting.js';
import Project from '../models/Project.js';

const router = express.Router();

// Könyvelési adatok lekérése év alapján
router.get('/accounting/:year', async (req, res) => {
  try {
    let accounting = await Accounting.findOne({ year: req.params.year });
    
    if (!accounting) {
      // Ha nincs még könyvelés az adott évre, létrehozunk egyet
      accounting = new Accounting({ year: req.params.year });
      
      // Számoljuk ki a bevételeket a projektekből
      const projects = await Project.find({
        'invoices.date': {
          $gte: new Date(req.params.year, 0, 1),
          $lt: new Date(parseInt(req.params.year) + 1, 0, 1)
        }
      });

      // Összesítjük a bevételeket
      const totalIncome = projects.reduce((sum, project) => {
        return sum + project.invoices
          .filter(inv => new Date(inv.date).getFullYear() === parseInt(req.params.year))
          .reduce((invSum, inv) => invSum + (inv.totalAmount || 0), 0);
      }, 0);

      accounting.summary.totalIncome = totalIncome;
      await accounting.save();
    }

    res.json(accounting);
  } catch (error) {
    console.error('Hiba a könyvelési adatok lekérésekor:', error);
    res.status(500).json({ 
      message: 'Szerver hiba történt',
      error: error.message 
    });
  }
});

// Új eszköz hozzáadása
router.post('/accounting/assets', async (req, res) => {
  try {
    const { year, ...assetData } = req.body;
    let accounting = await Accounting.findOne({ year });

    if (!accounting) {
      accounting = new Accounting({ year });
    }

    accounting.assets.push(assetData);
    await accounting.save();

    res.status(201).json(accounting);
  } catch (error) {
    console.error('Hiba az eszköz hozzáadásakor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Eszköz módosítása
router.put('/accounting/assets/:id', async (req, res) => {
  try {
    const { year } = req.body;
    const accounting = await Accounting.findOne({ year });

    if (!accounting) {
      return res.status(404).json({ message: 'Könyvelési év nem található' });
    }

    const assetIndex = accounting.assets.findIndex(
      asset => asset._id.toString() === req.params.id
    );

    if (assetIndex === -1) {
      return res.status(404).json({ message: 'Eszköz nem található' });
    }

    accounting.assets[assetIndex] = {
      ...accounting.assets[assetIndex].toObject(),
      ...req.body
    };

    await accounting.save();
    res.json(accounting);
  } catch (error) {
    console.error('Hiba az eszköz módosításakor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Eszköz törlése
router.delete('/accounting/assets/:id', async (req, res) => {
  try {
    const { year } = req.query;
    const accounting = await Accounting.findOne({ year });

    if (!accounting) {
      return res.status(404).json({ message: 'Könyvelési év nem található' });
    }

    accounting.assets = accounting.assets.filter(
      asset => asset._id.toString() !== req.params.id
    );

    await accounting.save();
    res.json({ message: 'Eszköz sikeresen törölve' });
  } catch (error) {
    console.error('Hiba az eszköz törlésekor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Új költség hozzáadása
router.post('/accounting/expenses', async (req, res) => {
  try {
    const { year, ...expenseData } = req.body;
    let accounting = await Accounting.findOne({ year });

    if (!accounting) {
      accounting = new Accounting({ year });
    }

    accounting.expenses.push(expenseData);
    await accounting.save();

    res.status(201).json(accounting);
  } catch (error) {
    console.error('Hiba a költség hozzáadásakor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Költség módosítása
router.put('/accounting/expenses/:id', async (req, res) => {
  try {
    const { year } = req.body;
    const accounting = await Accounting.findOne({ year });

    if (!accounting) {
      return res.status(404).json({ message: 'Könyvelési év nem található' });
    }

    const expenseIndex = accounting.expenses.findIndex(
      exp => exp._id.toString() === req.params.id
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ message: 'Költség nem található' });
    }

    accounting.expenses[expenseIndex] = {
      ...accounting.expenses[expenseIndex].toObject(),
      ...req.body
    };

    await accounting.save();
    res.json(accounting);
  } catch (error) {
    console.error('Hiba a költség módosításakor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Költség törlése
router.delete('/accounting/expenses/:id', async (req, res) => {
  try {
    const { year } = req.query;
    const accounting = await Accounting.findOne({ year });

    if (!accounting) {
      return res.status(404).json({ message: 'Könyvelési év nem található' });
    }

    accounting.expenses = accounting.expenses.filter(
      exp => exp._id.toString() !== req.params.id
    );

    await accounting.save();
    res.json({ message: 'Költség sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a költség törlésekor:', error);
    res.status(400).json({ message: error.message });
  }
});

// Éves összesítés újraszámolása
router.post('/accounting/:year/recalculate', async (req, res) => {
  try {
    const accounting = await Accounting.findOne({ year: req.params.year });
    
    if (!accounting) {
      return res.status(404).json({ message: 'Könyvelési év nem található' });
    }

    // Bevételek újraszámolása a projektekből
    const projects = await Project.find({
      'invoices.date': {
        $gte: new Date(req.params.year, 0, 1),
        $lt: new Date(parseInt(req.params.year) + 1, 0, 1)
      }
    });

    const totalIncome = projects.reduce((sum, project) => {
      return sum + project.invoices
        .filter(inv => new Date(inv.date).getFullYear() === parseInt(req.params.year))
        .reduce((invSum, inv) => invSum + (inv.totalAmount || 0), 0);
    }, 0);

    accounting.summary.totalIncome = totalIncome;
    await accounting.save();

    res.json(accounting);
  } catch (error) {
    console.error('Hiba az újraszámoláskor:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;