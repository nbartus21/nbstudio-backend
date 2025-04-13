import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

    // Fejlesztői módban ellenőrizzük, hogy fut-e a MongoDB
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    // Ha kérték, mentsük el a generált dokumentumot az adatbázisba
    if (saveAsDocument && result.content && !isDevelopment) {
      try {
        // Új Document modell létrehozása a generált tartalommal
        const newDocument = new Document({
          title: documentData.title || `Generált dokumentum - ${new Date().toLocaleDateString('hu-HU')}`,
          content: result.content,
          client: documentData.client || null,
          status: 'draft', // Alapértelmezett státusz
          createdBy: req.user.id,
          // A pin és sharingToken automatikusan generálódik a pre-validate hook által
          // de biztonság kedvéért itt is beállítjuk
          pin: Math.floor(100000 + Math.random() * 900000).toString(),
          sharingToken: crypto.randomBytes(32).toString('hex')
        });

        await newDocument.save();
        result.documentId = newDocument._id; // Visszaadjuk a létrehozott dokumentum azonosítóját
      } catch (docError) {
        console.error('Hiba a dokumentum mentésekor:', docError);
        // Nem dobunk hibát, csak naplózzuk és folytatjuk a generált tartalom visszaadásával
        result.documentSaveError = docError.message;
      }
    } else if (saveAsDocument && result.content && isDevelopment) {
      // Fejlesztői módban nem mentjük az adatbázisba, csak visszaadjuk a generált tartalmat
      console.log('Fejlesztői módban nem mentjük a dokumentumot az adatbázisba');
      result.documentId = 'dev-mode-document-id';
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

    // Nyelvi paraméter kezelése (alapértelmezett: hu) - ugyanúgy mint az invoice esetén
    const language = req.query.language || 'hu';
    const validLanguage = ['hu', 'en', 'de'].includes(language) ? language : 'hu';

    if (!content) {
      return res.status(400).json({ message: 'A dokumentum tartalom megadása kötelező.' });
    }

    // Fordítások a különböző nyelvekhez - hasonlóan az invoice PDF-hez
    const translations = {
      en: {
        document: "DOCUMENT",
        generatedAt: "Generated at",
        validUntil: "Valid until",
        createdBy: "Created by",
        page: "Page",
        footer: "This document was created electronically and is valid without signature.",
        provider: "PROVIDER",
        client: "CLIENT",
        content: "CONTENT",
        confidential: "CONFIDENTIAL DOCUMENT",
        status: {
          draft: "Draft",
          active: "Active",
          expired: "Expired",
          cancelled: "Cancelled"
        }
      },
      de: {
        document: "DOKUMENT",
        generatedAt: "Erstellt am",
        validUntil: "Gültig bis",
        createdBy: "Erstellt von",
        page: "Seite",
        footer: "Dieses Dokument wurde elektronisch erstellt und ist ohne Unterschrift gültig.",
        provider: "ANBIETER",
        client: "KUNDE",
        content: "INHALT",
        confidential: "VERTRAULICHES DOKUMENT",
        status: {
          draft: "Entwurf",
          active: "Aktiv",
          expired: "Abgelaufen",
          cancelled: "Storniert"
        }
      },
      hu: {
        document: "DOKUMENTUM",
        generatedAt: "Létrehozva",
        validUntil: "Érvényes",
        createdBy: "Készítette",
        page: "oldal",
        footer: "Ez a dokumentum elektronikusan készült és érvényes aláírás nélkül is.",
        provider: "KIÁLLÍTÓ",
        client: "ÜGYFÉL",
        content: "TARTALOM",
        confidential: "BIZALMAS DOKUMENTUM",
        status: {
          draft: "Piszkozat",
          active: "Aktív",
          expired: "Lejárt",
          cancelled: "Törölt"
        }
      }
    };

    // Fordítások betöltése a megfelelő nyelvhez
    const t = translations[validLanguage];

    // PDF generálás az invoice-hoz hasonló designnal
    console.log(`PDF generálása a(z) ${documentData.title || 'Generált dokumentum'} dokumentumhoz`);

    // Create PDF document with explicit options to prevent auto page breaks
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40, // Kisebb margó
      bufferPages: true, // Buffer pages for more control
      autoFirstPage: true, // Automatically create first page
      layout: 'portrait',
      info: {
        Title: documentData.title || 'Generált dokumentum',
        Author: 'Norbert Bartus'
      }
    });

    // Fájlnév beállítása
    const safeTitle = (documentData.title || 'dokument').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const fileName = validLanguage === 'hu' ? `dokumentum_${safeTitle}_${Date.now()}.pdf` :
                    (validLanguage === 'de' ? `dokument_${safeTitle}_${Date.now()}.pdf` : `document_${safeTitle}_${Date.now()}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Pipe to response
    doc.pipe(res);

    // Betűtípusok beállítása
    doc.registerFont('Helvetica', 'Helvetica');
    doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

    // Modern design - színek és stílusok - pontosan az invoice design-nal megegyező
    const colors = {
      primary: '#2563EB',     // Fő kék szín
      secondary: '#1E293B',   // Sötét szürke
      accent: '#3B82F6',      // Világos kék
      text: '#1E293B',        // Sötét szöveg
      light: '#F8FAFC',       // Világos háttér
      success: '#10B981',     // Zöld (aktív)
      warning: '#F59E0B',     // Narancs (lejárt)
      border: '#E2E8F0',      // Szegély szín
      background: '#FFFFFF',  // Fehér háttér
      lightBlue: '#EFF6FF',   // Világos kék háttér
      darkBlue: '#1E40AF',    // Sötét kék kiemelésekhez
    };

    // Vékony színes sáv a lap tetején
    doc.rect(0, 0, doc.page.width, 8)
       .fill(colors.primary);

    // Fejléc terület
    doc.rect(0, 8, doc.page.width, 120)
       .fill(colors.background);

    // Logo hozzáadása (ha létezik) - ugyanaz a logika mint az invoice-nál
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 20, { width: 100 });
      }
    } catch (logoError) {
      console.warn('Logo betöltési hiba:', logoError.message);
    }

    // Dokumentum felirat és cím
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(colors.primary)
       .text(t.document, 50, 30)
       .fontSize(14)
       .fillColor(colors.secondary)
       .text(documentData.title || 'Generált dokumentum', 50, 65, { width: 350 });

    // Státusz badge (az invoice-hoz hasonló, ha van dokumentum státusz)
    let statusColor = colors.accent;
    let statusText = documentData.status ? t.status[documentData.status] || documentData.status : t.status.active;

    if (documentData.status === 'active') {
      statusColor = colors.success;
    } else if (documentData.status === 'expired') {
      statusColor = colors.warning;
    } else if (documentData.status === 'cancelled') {
      statusColor = '#9CA3AF';
    }

    const statusBadgeWidth = 80;
    const statusBadgeHeight = 22;
    const statusBadgeX = doc.page.width - 50 - statusBadgeWidth;
    const statusBadgeY = 30;

    doc.roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 4)
       .fill(statusColor);

    doc.font('Helvetica-Bold')
       .fontSize(10)
       .fillColor('white')
       .text(statusText, statusBadgeX, statusBadgeY + 6, { width: statusBadgeWidth, align: 'center' });

    // Jobb oldali dátum információk
    const rightColumnX = 400;
    doc.fontSize(10)
       .fillColor(colors.secondary)
       .text(`${t.generatedAt}:`, rightColumnX, 65, { align: 'right' })
       .fontSize(12)
       .fillColor(colors.primary)
       .text(new Date().toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')), rightColumnX, 80, { align: 'right' });

    if (documentData.validUntil) {
      doc.fontSize(10)
         .fillColor(colors.secondary)
         .text(`${t.validUntil}:`, rightColumnX, 100, { align: 'right' })
         .fontSize(12)
         .fillColor(colors.primary)
         .text(new Date(documentData.validUntil).toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')), rightColumnX, 115, { align: 'right' });
    }

    // Vékony elválasztó vonal a fejléc után
    doc.rect(50, 140, doc.page.width - 100, 1)
       .fill(colors.border);

    // Kiállító és címzett adatok (ha vannak) - az invoice mintájára
    const infoStartY = 160;

    // Kiállító adatok
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text(t.provider, 50, infoStartY);

    doc.rect(50, infoStartY + 18, 220, 1)
       .fill(colors.primary);

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor(colors.secondary)
       .text('Norbert Bartus', 50, infoStartY + 25)
       .font('Helvetica')
       .fontSize(9)
       .fillColor(colors.text)
       .text('Salinenstraße 25', 50, infoStartY + 40)
       .text('76646 Bruchsal, Baden-Württemberg', 50, infoStartY + 52)
       .text('Deutschland', 50, infoStartY + 64)
       .text('St.-Nr.: 68194547329', 50, infoStartY + 76)
       .text('USt-IdNr.: DE346419031', 50, infoStartY + 88);

    // Ügyfél adatok (ha vannak a dokumentumban)
    if (documentData.client) {
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(colors.primary)
         .text(t.client, 320, infoStartY);

      doc.rect(320, infoStartY + 18, 220, 1)
         .fill(colors.primary);

      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor(colors.secondary)
         .text(documentData.client.companyName || documentData.client.name || '', 320, infoStartY + 25);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.text);

      let rowY = infoStartY + 40;

      if (documentData.client.companyName && documentData.client.name) {
        doc.text(documentData.client.name, 320, rowY);
        rowY += 12;
      }

      if (documentData.client.taxNumber) {
        doc.text(`Adószám: ${documentData.client.taxNumber}`, 320, rowY);
        rowY += 12;
      }

      if (documentData.client.email) {
        doc.text(`Email: ${documentData.client.email}`, 320, rowY);
        rowY += 12;
      }

      if (documentData.client.phone) {
        doc.text(`Telefon: ${documentData.client.phone}`, 320, rowY);
        rowY += 12;
      }

      if (documentData.client.address) {
        const { city, street, postalCode, country } = documentData.client.address;
        if (city || street || postalCode) {
          doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 320, rowY);
          rowY += 12;
        }
        if (country) {
          doc.text(country, 320, rowY);
        }
      }
    }

    // Dokumentum tartalom
    const contentStartY = infoStartY + (documentData.client ? 150 : 100);

    // Tartalom cím
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text(t.content, 50, contentStartY);

    doc.rect(50, contentStartY + 18, doc.page.width - 100, 1)
       .fill(colors.primary);

    // Dokumentum tartalom - a HTML tartalom konvertálva sima szöveggé
    // Egyszerű HTML -> szöveg konverzió
    const textContent = content.replace(/<[^>]*>?/gm, '');

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor(colors.text)
       .text(textContent, 50, contentStartY + 30, {
         width: doc.page.width - 100,
         align: 'justify'
       });

    // Lábléc - ugyanaz a formázás mint az invoice esetén
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Lábléc
      const footerTop = doc.page.height - 50;

      // Vékony vonal a lábléc tetején
      doc.rect(50, footerTop - 5, doc.page.width - 100, 0.5)
         .fill(colors.border);

      // Lábléc szöveg és oldalszám egy sorban
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor(colors.secondary);

      // Teljes lábléc szöveg egy sorban az oldalszámmal együtt - invoice mintájára
      const pageText = validLanguage === 'hu' ? `${i + 1}. ${t.page}` : (validLanguage === 'de' ? `${t.page} ${i + 1}` : `${t.page} ${i + 1}`);
      const footerText = `Norbert Bartus | www.nb-studio.net | ${t.footer} | ${pageText}`;
      doc.text(footerText, 50, footerTop, {
        align: 'center',
        width: doc.page.width - 100
      });
    }

    // Finalize the PDF
    doc.end();
    console.log('PDF sikeresen generálva az invoice designnal');

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
