import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import authMiddleware from '../middleware/auth.js';
import Document from '../models/Document.js';
import { generateDocumentFromTemplate } from '../services/documentGenerator/generator.js';
import { getTemplates } from '../services/documentGenerator/templates.js';

const router = express.Router();

// Dokumentum sablonok lekérése (védett útvonal)
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const templates = await getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Hiba a sablonok lekérésekor:', error);
    res.status(500).json({ message: 'Szerverhiba a sablonok lekérésekor', error: error.message });
  }
});

// Dokumentum generálása sablon alapján (védett útvonal)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { templateId, documentData, saveAsDocument } = req.body;

    if (!templateId || !documentData) {
      return res.status(400).json({ message: 'Sablon azonosító és dokumentum adatok megadása kötelező' });
    }

    // Dokumentum generálása a szolgáltatással
    const result = await generateDocumentFromTemplate(templateId, documentData, req.user.id);

    // Ha kérték, mentsük el a generált dokumentumot az adatbázisba
    if (saveAsDocument && result.content) {
      // Új Document modell létrehozása a generált tartalommal
      const newDocument = new Document({
        title: documentData.title || `Generált dokumentum - ${new Date().toLocaleDateString('hu-HU')}`,
        content: result.content,
        client: documentData.client || null,
        status: 'draft', // Alapértelmezett státusz
        createdBy: req.user.id
      });

      await newDocument.save();
      result.documentId = newDocument._id; // Visszaadjuk a létrehozott dokumentum azonosítóját
    }

    res.json({
      success: true,
      message: 'Dokumentum sikeresen generálva',
      ...result
    });
  } catch (error) {
    console.error('Hiba a dokumentum generálásakor:', error);
    res.status(500).json({ message: 'Szerverhiba a dokumentum generálásakor', error: error.message });
  }
});

// PDF generálása generált dokumentumhoz (védett útvonal)
router.post('/generate-pdf', authMiddleware, async (req, res) => {
  try {
    const { content, templateId, documentData } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'A dokumentum tartalom megadása kötelező.' });
    }

    // PDF generálás itt hasonló a documents.js-ben található PDF generáláshoz
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      autoFirstPage: true,
      layout: 'portrait',
      info: {
        Title: documentData.title || 'Generált dokumentum',
        Author: 'NB-Studio'
      }
    });

    // Fájlnév beállítása
    const safeTitle = (documentData.title || 'dokument').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const fileName = `dokument_${safeTitle}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    doc.pipe(res);

    // PDF tartalom generálása a HTML tartalom alapján
    // Itt egy egyszerű HTML -> PDF konverziót alkalmazunk, éles környezetben
    // érdemes lehet a puppeteer vagy más fejlettebb megoldás használata
    const textContent = content.replace(/<[^>]*>?/gm, '');
    
    // Stílusok
    const colors = {
      primary: '#2563EB',
      secondary: '#1E293B',
      text: '#1E293B',
      border: '#E2E8F0',
      background: '#FFFFFF',
      lightBlue: '#EFF6FF',
    };
    
    // Fejléc
    doc.rect(0, 0, doc.page.width, 8).fill(colors.primary);
    doc.rect(0, 8, doc.page.width, 100).fill(colors.background);
    
    // Logo (ha van)
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 20, { width: 100 });
      }
    } catch (logoError) {
      console.warn('Logo betöltési hiba:', logoError.message);
    }
    
    // Dokumentum címe
    doc.font('Helvetica-Bold').fontSize(24).fillColor(colors.primary)
       .text(documentData.title || 'Generált dokumentum', 50, 30, { width: 400 });
    
    // Dátum
    doc.font('Helvetica').fontSize(10).fillColor(colors.text)
       .text(`Létrehozva: ${new Date().toLocaleDateString('hu-HU')}`, 50, 65);
    
    // Elválasztó vonal
    doc.rect(50, 90, doc.page.width - 100, 1).fill(colors.border);
    
    // Tartalmi rész
    doc.font('Helvetica').fontSize(11).fillColor(colors.text)
       .text(textContent, 50, 110, {
         width: doc.page.width - 100,
         align: 'justify'
       });
    
    // Lábléc
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      const footerTop = doc.page.height - 50;
      doc.rect(50, footerTop - 5, doc.page.width - 100, 0.5).fill(colors.border);
      const footerText = `NB-Studio | ${i + 1}. oldal | Automatikusan generált dokumentum`;
      doc.font('Helvetica').fontSize(8).fillColor(colors.secondary)
         .text(footerText, 50, footerTop, { align: 'center', width: doc.page.width - 100 });
    }
    
    doc.end();
    console.log('PDF sikeresen generálva');

  } catch (error) {
    console.error('Hiba a PDF generálásakor:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Szerverhiba a PDF generálásakor', error: error.message });
    } else {
      console.error("Hiba történt a PDF stream küldése közben.");
    }
  }
});

export default router;
