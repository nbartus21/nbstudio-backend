import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
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
  notes: String
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Új számla létrehozása egy projekthez
router.post('/projects/:projectId/invoices', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    const invoice = new Invoice(req.body);
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

// Számla megtekintése
router.get('/projects/invoice/:invoiceId', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PDF generálás és letöltés
router.get('/projects/invoice/:invoiceId/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }

    // PDF létrehozása
    const doc = new PDFDocument();
    const filename = `szamla-${invoice.number}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // PDF tartalom generálása
    doc.fontSize(25).text('SZÁMLA', { align: 'center' });
    doc.moveDown();
    
    // Számla adatok
    doc.fontSize(12)
      .text(`Számlaszám: ${invoice.number}`)
      .text(`Dátum: ${new Date(invoice.date).toLocaleDateString('hu-HU')}`)
      .text(`Fizetési határidő: ${new Date(invoice.dueDate).toLocaleDateString('hu-HU')}`)
      .moveDown();

    // Tételek táblázat
    doc.fontSize(12).text('Tételek:', { underline: true });
    doc.moveDown();

    invoice.items.forEach(item => {
      doc.text(`${item.description}`)
         .text(`Mennyiség: ${item.quantity} × ${item.unitPrice} = ${item.total} Ft`, { indent: 20 })
         .moveDown();
    });

    // Összegzés
    doc.moveDown()
      .text(`Végösszeg: ${invoice.totalAmount} Ft`, { bold: true })
      .text(`Fizetve: ${invoice.paidAmount} Ft`)
      .text(`Fennmaradó összeg: ${invoice.totalAmount - invoice.paidAmount} Ft`);

    doc.end();
  } catch (error) {
    console.error('Hiba a PDF generálásnál:', error);
    res.status(500).json({ message: error.message });
  }
});

// Számla állapot frissítése
router.patch('/projects/invoice/:invoiceId', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.invoiceId,
      { $set: req.body },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ message: 'Számla nem található' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
