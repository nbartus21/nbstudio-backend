import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Project from '../models/Project.js';

const router = express.Router();

// Számla modell létrehozása
const invoiceSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['kiállított', 'fizetett', 'késedelmes', 'törölt'],
    default: 'kiállított'
  },
  notes: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Számla hozzáadása projekthez
router.post('/projects/:projectId/invoices', async (req, res) => {
  console.log('Számla létrehozási kérés érkezett');
  console.log('Projekt ID:', req.params.projectId);
  console.log('Számla adatok:', req.body);

  try {
    const project = await Project.findById(req.params.projectId);
    console.log('Megtalált projekt:', project ? 'Igen' : 'Nem');

    if (!project) {
      console.error('Projekt nem található:', req.params.projectId);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    if (!project.invoices) {
      console.log('Invoices tömb inicializálása');
      project.invoices = [];
    }

    // Számla adatok validálása
    const invoiceData = req.body;
    console.log('Feldolgozandó számla adatok:', invoiceData);

    if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
      console.error('Hibás számla tételek:', invoiceData.items);
      return res.status(400).json({ message: 'Érvénytelen számla tételek' });
    }

    // Tételek ellenőrzése
    for (const item of invoiceData.items) {
      console.log('Tétel ellenőrzése:', item);
      if (!item.description || !item.description.trim()) {
        console.error('Hiányzó tétel leírás:', item);
        return res.status(400).json({ message: 'Hiányzó számla tétel leírás' });
      }
      
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        console.error('Érvénytelen mennyiség:', item.quantity);
        return res.status(400).json({ message: 'Érvénytelen számla tétel mennyiség' });
      }
      
      if (isNaN(Number(item.unitPrice))) {
        console.error('Érvénytelen egységár:', item.unitPrice);
        return res.status(400).json({ message: 'Érvénytelen számla tétel egységár' });
      }
      
      // Biztosítsuk, hogy a számértékek tényleg számok legyenek
      item.quantity = Number(item.quantity);
      item.unitPrice = Number(item.unitPrice);
      item.total = item.quantity * item.unitPrice;
    }
    
    // Számoljuk újra a végösszeget az eredeti és a számított értékek egyeztetése érdekében
    invoiceData.totalAmount = invoiceData.items.reduce((sum, item) => sum + item.total, 0);

    project.invoices.push(invoiceData);
    console.log('Számla hozzáadva a projekthez');

    // Teljes számlázott összeg újraszámolása
    project.financial = project.financial || {};
    project.financial.totalBilled = project.invoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );
    console.log('Új teljes számlázott összeg:', project.financial.totalBilled);

    const updatedProject = await project.save();
    console.log('Projekt sikeresen mentve');

    res.status(201).json(updatedProject);
  } catch (error) {
    console.error('Részletes hiba:', error);
    console.error('Hiba stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Számla validációs hiba',
        error: error.message
      });
    }
    
    res.status(500).json({
      message: 'Szerver hiba történt a számla létrehozásakor',
      error: error.message
    });
  }
});

// PDF generálás és letöltés
router.get('/projects/:projectId/invoices/:invoiceId/pdf', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const invoice = project.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }

    // PDF létrehozása
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Számla-${invoice.number}`,
        Author: 'NB Studio'
      }
    });

    // Response headerek beállítása
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="szamla-${invoice.number}.pdf"`);

    // PDF streamelése a response-ba
    doc.pipe(res);

    // Fejléc
    doc.image('logo.png', 50, 50, { width: 100 })
      .fontSize(25)
      .text('SZÁMLA', { align: 'center' })
      .moveDown();

    // Kiállító adatok
    doc.fontSize(12)
      .text('Kiállító:', { underline: true })
      .text('NB Studio')
      .text('Adószám: 12345678-1-42')
      .text('Cím: 1234 Budapest, Példa utca 1.')
      .moveDown();

    // Vevő adatok
    if (project.client) {
      doc.text('Vevő:', { underline: true })
        .text(project.client.name)
        .text(`Email: ${project.client.email}`)
        .text(`Adószám: ${project.client.taxNumber || 'N/A'}`)
        .moveDown();
    }

    // Számla adatok
    doc.text(`Számlaszám: ${invoice.number}`)
      .text(`Kiállítás dátuma: ${new Date(invoice.date).toLocaleDateString('hu-HU')}`)
      .text(`Fizetési határidő: ${new Date(invoice.dueDate).toLocaleDateString('hu-HU')}`)
      .moveDown();

    // Tételek táblázat
    const tableTop = doc.y;
    const itemsTable = {
      headers: ['Tétel', 'Mennyiség', 'Egységár', 'Összesen'],
      rows: invoice.items.map(item => [
        item.description,
        item.quantity.toString(),
        `${item.unitPrice} EUR`,
        `${item.total} EUR`
      ])
    };

    let currentY = tableTop;
    let currentPage = 1;

    // Táblázat fejléc
    doc.font('Helvetica-Bold')
      .text(itemsTable.headers[0], 50, currentY, { width: 200 })
      .text(itemsTable.headers[1], 250, currentY, { width: 100 })
      .text(itemsTable.headers[2], 350, currentY, { width: 100 })
      .text(itemsTable.headers[3], 450, currentY, { width: 100 });

    // Táblázat sorok
    doc.font('Helvetica');
    currentY += 20;

    itemsTable.rows.forEach(row => {
      if (currentY > 700) {
        doc.addPage();
        currentPage++;
        currentY = 50;
        
        // Fejléc az új oldalon
        doc.font('Helvetica-Bold')
          .text(itemsTable.headers[0], 50, currentY, { width: 200 })
          .text(itemsTable.headers[1], 250, currentY, { width: 100 })
          .text(itemsTable.headers[2], 350, currentY, { width: 100 })
          .text(itemsTable.headers[3], 450, currentY, { width: 100 });
        
        doc.font('Helvetica');
        currentY += 20;
      }

      doc.text(row[0], 50, currentY, { width: 200 })
        .text(row[1], 250, currentY, { width: 100 })
        .text(row[2], 350, currentY, { width: 100 })
        .text(row[3], 450, currentY, { width: 100 });

      currentY += 20;
    });

    // Összesítés
    doc.moveDown()
      .font('Helvetica-Bold')
      .text('Összesítés:', { underline: true })
      .moveDown()
      .text(`Végösszeg: ${invoice.totalAmount} EUR`, { align: 'right' })
      .text(`Fizetve: ${invoice.paidAmount} EUR`, { align: 'right' })
      .text(`Fennmaradó összeg: ${invoice.totalAmount - invoice.paidAmount} EUR`, { align: 'right' });

    // Lábléc
    doc.fontSize(10)
      .text('Köszönjük, hogy minket választott!', { align: 'center' })
      .text(`Oldalszám: ${currentPage}`, 50, doc.page.height - 50, { align: 'center' });

    // PDF lezárása
    doc.end();

  } catch (error) {
    console.error('Hiba a PDF generálásnál:', error);
    res.status(500).json({ 
      message: 'Hiba a PDF generálása során',
      error: error.message 
    });
  }
});

// Számla állapot frissítése
router.patch('/projects/:projectId/invoices/:invoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const invoice = project.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }

    // Frissítjük a számla mezőit
    Object.assign(invoice, req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    console.error('Hiba a számla frissítésénél:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;