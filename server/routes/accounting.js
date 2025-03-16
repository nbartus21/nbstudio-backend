import express from 'express';
import Accounting from '../models/Accounting.js';
import Project from '../models/Project.js';
import Server from '../models/Server.js';
import License from '../models/License.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Védett route-ok
router.use(authMiddleware);

// Összes könyvelési tétel lekérése
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    let query = {};

    // Dátum szűrés
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Típus és kategória szűrés
    if (type) query.type = type;
    if (category) query.category = category;

    const transactions = await Accounting.find(query)
      .sort({ date: -1 })
      .populate('projectId', 'name')
      .populate('serverId', 'name')
      .populate('licenseId', 'name');

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Új tétel hozzáadása
router.post('/transactions', async (req, res) => {
  try {
    const transaction = new Accounting(req.body);
    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Összesített statisztikák
router.get('/statistics', async (req, res) => {
  try {
    const { year, month } = req.query;
    let dateQuery = {};

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    }

    const [incomes, expenses, projectIncomes, recurringExpenses] = await Promise.all([
      // Összes bevétel
      Accounting.aggregate([
        { $match: { type: 'income', ...dateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Összes kiadás
      Accounting.aggregate([
        { $match: { type: 'expense', ...dateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Projekt bevételek
      Accounting.aggregate([
        { $match: { type: 'income', category: 'project_invoice', ...dateQuery } },
        { $group: { _id: '$projectId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
        { $unwind: '$project' },
        { $project: { projectName: '$project.name', total: 1 } }
      ]),
      // Ismétlődő költségek
      Accounting.aggregate([
        { $match: { type: 'expense', isRecurring: true, ...dateQuery } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      totalIncome: incomes[0]?.total || 0,
      totalExpenses: expenses[0]?.total || 0,
      balance: (incomes[0]?.total || 0) - (expenses[0]?.total || 0),
      projectIncomes,
      recurringExpenses,
      summary: {
        year: parseInt(year) || new Date().getFullYear(),
        month: parseInt(month) || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Automatikus költségek szinkronizálása
router.post('/sync', async (req, res) => {
  try {
    // Szerverek költségeinek szinkronizálása
    const servers = await Server.find();
    for (const server of servers) {
      const existingCost = await Accounting.findOne({
        serverId: server._id,
        type: 'expense',
        category: 'server_cost',
        date: { $gte: new Date().setDate(1) } // Aktuális hónap kezdete
      });

      if (!existingCost && server.costs?.monthly) {
        await Accounting.create({
          type: 'expense',
          category: 'server_cost',
          amount: server.costs.monthly,
          currency: server.costs.currency || 'EUR',
          date: new Date(),
          description: `${server.name} szerver havi költség`,
          serverId: server._id,
          isRecurring: true,
          recurringInterval: 'monthly',
          nextRecurringDate: new Date().setMonth(new Date().getMonth() + 1),
          taxDeductible: true,
          taxCategory: 'infrastructure'
        });
      }
    }

    // Licenszek költségeinek szinkronizálása
    const licenses = await License.find();
    for (const license of licenses) {
      if (!license.renewal?.cost) continue;

      const existingCost = await Accounting.findOne({
        licenseId: license._id,
        type: 'expense',
        category: 'license_cost',
        date: { $gte: new Date(license.renewal.nextRenewalDate).setDate(1) }
      });

      if (!existingCost) {
        await Accounting.create({
          type: 'expense',
          category: 'license_cost',
          amount: license.renewal.cost,
          currency: 'EUR',
          date: new Date(license.renewal.nextRenewalDate),
          description: `${license.name} licensz megújítás`,
          licenseId: license._id,
          isRecurring: true,
          recurringInterval: license.renewal.type === 'subscription' ? 'monthly' : 'yearly',
          nextRecurringDate: new Date(license.renewal.nextRenewalDate),
          taxDeductible: true,
          taxCategory: 'software'
        });
      }
    }

    // Projekt számlák szinkronizálása
    const projects = await Project.find({ 'invoices.0': { $exists: true } });
    for (const project of projects) {
      for (const invoice of project.invoices) {
        const existingInvoice = await Accounting.findOne({
          projectId: project._id,
          invoiceNumber: invoice.number,
          type: 'income'
        });

        if (!existingInvoice) {
          await Accounting.create({
            type: 'income',
            category: 'project_invoice',
            amount: invoice.totalAmount,
            currency: project.financial?.currency || 'EUR',
            date: new Date(invoice.date),
            description: `Számla: ${project.name}`,
            projectId: project._id,
            invoiceNumber: invoice.number,
            paymentStatus: invoice.status === 'fizetett' ? 'paid' : 'pending',
            dueDate: new Date(invoice.dueDate),
            taxCategory: 'service_income'
          });
        }
      }
    }

    res.json({ message: 'Költségek és bevételek sikeresen szinkronizálva' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tétel módosítása
router.put('/transactions/:id', async (req, res) => {
  try {
    const updatedTransaction = await Accounting.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Tétel nem található' });
    }
    res.json(updatedTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tranzakció részletek frissítése
router.put('/transactions/:id/details', async (req, res) => {
  try {
    console.log('Tranzakció részletek frissítése: ', req.params.id);
    console.log('Beérkező adatok:', req.body);
    console.log('Fájlok:', req.files);
    
    const transaction = await Accounting.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Tranzakció nem található' });
    }

    // Frissítjük a tranzakció részleteit
    transaction.paymentStatus = 'paid';
    transaction.paidDate = req.body.paymentDate || new Date();
    transaction.paymentMethod = req.body.paymentMethod;
    
    if (req.body.notes) {
      transaction.notes = req.body.notes;
    }

    // Használjuk a multer middleware-t a fájlok kezelésére
    if (req.files && req.files.length > 0) {
      console.log('Csatolt fájlok:', req.files.map(f => f.originalname));
      const attachments = req.files.map(file => ({
        name: file.originalname,
        url: file.path, // vagy a tárolt fájl URL-je
        uploadDate: new Date()
      }));
      transaction.attachments = [...(transaction.attachments || []), ...attachments];
    }

    if (req.body.attachmentDescription) {
      transaction.attachmentDescription = req.body.attachmentDescription;
    }

    await transaction.save();
    console.log('Tranzakció mentve:', transaction._id);

    // Ha ez egy számla, frissítsük a kapcsolódó projekt számlát is
    if (transaction.invoiceNumber && transaction.projectId) {
      console.log('Kapcsolódó számla frissítése:', transaction.invoiceNumber);
      const updateResult = await Project.updateOne(
        { 
          '_id': transaction.projectId,
          'invoices.number': transaction.invoiceNumber 
        },
        { 
          $set: { 
            'invoices.$.status': 'fizetett',
            'invoices.$.paidDate': transaction.paidDate,
            'invoices.$.paymentMethod': transaction.paymentMethod
          } 
        }
      );
      console.log('Projekt számla frissítése:', updateResult);
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction details:', error);
    res.status(500).json({ message: 'Hiba történt a részletek mentése során: ' + error.message });
  }
});

// Tétel törlése
router.delete('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Accounting.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Tétel nem található' });
    }
    await Accounting.deleteOne({ _id: req.params.id });
    res.json({ message: 'Tétel sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Adójelentés generálása
router.get('/tax-report', async (req, res) => {
  try {
    const { year } = req.query;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const [taxableIncomes, taxDeductibles] = await Promise.all([
      // Adóköteles bevételek
      Accounting.aggregate([
        { 
          $match: { 
            type: 'income',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$taxCategory',
            total: { $sum: '$amount' },
            items: { $push: '$$ROOT' }
          }
        }
      ]),
      // Leírható költségek
      Accounting.aggregate([
        { 
          $match: { 
            type: 'expense',
            taxDeductible: true,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$taxCategory',
            total: { $sum: '$amount' },
            items: { $push: '$$ROOT' }
          }
        }
      ])
    ]);

    res.json({
      year: parseInt(year),
      taxableIncomes,
      taxDeductibles,
      summary: {
        totalTaxableIncome: taxableIncomes.reduce((sum, cat) => sum + cat.total, 0),
        totalDeductibles: taxDeductibles.reduce((sum, cat) => sum + cat.total, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;