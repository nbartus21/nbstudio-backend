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

// Új számla létrehozása projekthez
router.post('/projects/:projectId/invoices', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Számla adatok előkészítése
    const invoiceData = {
      ...req.body,
      projectId: project._id
    };

    // Számla létrehozása
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Számla hozzáadása a projekthez
    project.invoices = project.invoices || [];
    project.invoices.push(invoice);
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error('Hiba a számla létrehozásánál:', error);
    res.status(500).json({ message: error.message });
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
    let fileName = `szamla-${invoice.number}`;
    // Ellenőrizzük, hogy van-e .pdf kiterjesztés
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // PDF streamelése a response-ba
    doc.pipe(res);

    try {
      // Fejléc logó (ha létezik)
      const logoPath = './public/logo.png';
      // Ellenőrizzük a fájl létezését és csak akkor próbáljuk beilleszteni
      const fs = require('fs');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 })
          .moveDown();
      }
    } catch (logoError) {
      console.warn('Logo not found, skipping:', logoError.message);
    }

    // Fejléc
    doc.fontSize(25)
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