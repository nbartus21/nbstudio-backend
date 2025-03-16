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
    const invoiceData = { ...req.body };
    
    // Ha vannak tételek és nincs megadva a total mező, számoljuk ki
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      invoiceData.items = invoiceData.items.map(item => {
        if (!item.total) {
          // Biztosítsuk, hogy számok legyenek
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          
          // Számítsuk ki a total mezőt
          item.total = quantity * unitPrice;
        }
        return item;
      });
    }
    
    invoiceData.projectId = project._id;

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
        doc.image(logoPath, 50, 50, { width: 150 })
          .moveDown();
      }
    } catch (logoError) {
      console.warn('Logo not found, skipping:', logoError.message);
    }

    // Modern design - színek és stílusok
    const colors = {
      primary: '#3182CE', // Kék
      secondary: '#2D3748', // Sötét szürke
      accent: '#4FD1C5', // Türkiz
      text: '#1A202C', // Sötét szöveg
      light: '#E2E8F0', // Világos háttér
      success: '#38A169', // Zöld (fizetett)
      warning: '#DD6B20', // Narancs (lejárt)
    };

    // Fejléc háttér téglalap
    doc.rect(0, 0, doc.page.width, 150)
       .fill(colors.primary);

    // Fehér fejléc szöveg
    doc.fontSize(32)
       .fillColor('white')
       .text('SZÁMLA', 50, 70)
       .fontSize(14)
       .text(`#${invoice.number}`, 50, 105);

    // Jobbra igazított fejléc info
    const rightColumnX = 400;
    doc.fontSize(10)
       .fillColor('white')
       .text('Kiállítás dátuma:', rightColumnX, 70, { align: 'right' })
       .fontSize(14)
       .text(new Date(invoice.date).toLocaleDateString('hu-HU'), rightColumnX, 85, { align: 'right' })
       .fontSize(10)
       .text('Fizetési határidő:', rightColumnX, 110, { align: 'right' })
       .fontSize(14)
       .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), rightColumnX, 125, { align: 'right' });

    // Színsáv a fejléc alatt
    doc.rect(0, 150, doc.page.width, 5)
       .fill(colors.accent);

    // Kiállító és vevő adatok
    const startY = 180;
    
    // Kiállító adatok
    doc.fontSize(14)
       .fillColor(colors.secondary)
       .text('Kiállító:', 50, startY)
       .moveDown(0.3);
    
    doc.fontSize(12)
       .fillColor(colors.text)
       .text('NB Studio', { continued: true })
       .fillColor(colors.primary)
       .text(' (Bartus Norbert)')
       .fillColor(colors.text)
       .text('Adószám: 12345678-1-42')
       .text('Cím: 1234 Budapest, Példa utca 1.')
       .text('Email: info@nb-studio.net')
       .text('Telefon: +36 30 123 4567')
       .moveDown();

    // Vevő adatok
    if (project.client) {
      doc.fontSize(14)
         .fillColor(colors.secondary)
         .text('Vevő:', 300, startY)
         .moveDown(0.3);

      doc.fontSize(12)
         .fillColor(colors.text)
         .text(project.client.name || '', 300)
         .text(project.client.companyName || '', 300);
      
      if (project.client.taxNumber) {
        doc.text(`Adószám: ${project.client.taxNumber}`, 300);
      }
      
      doc.text(`Email: ${project.client.email || ''}`, 300);
      
      // Ha van cím adat, azt is kiírjuk
      if (project.client.address) {
        const { city, street, postalCode, country } = project.client.address;
        if (city || street || postalCode) {
          doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 300);
        }
        if (country) doc.text(country, 300);
      }
    }

    // Tételek táblázat fejléc
    const tableTop = Math.max(doc.y + 30, 340); // Minimum pozíció a táblázat kezdéséhez
    const tableHeaders = ['Tétel', 'Mennyiség', 'Egységár', 'Összesen'];
    const tableColumnWidths = [240, 80, 100, 100];
    const columnPositions = [50];
    
    // Kiszámoljuk a kezdőpontokat minden oszlophoz
    for (let i = 1; i < tableColumnWidths.length; i++) {
      columnPositions[i] = columnPositions[i-1] + tableColumnWidths[i-1];
    }

    // Táblázat fejléc háttere
    doc.rect(50, tableTop, 520, 25)
       .fill(colors.secondary);

    // Táblázat fejléc szöveg
    doc.fillColor('white')
       .fontSize(11);
    
    tableHeaders.forEach((header, i) => {
      const position = columnPositions[i];
      doc.text(header, position + 5, tableTop + 7, { width: tableColumnWidths[i] - 10 });
    });

    // Táblázat sorok
    let currentY = tableTop + 25;
    let currentPage = 1;
    let rowBackground = true; // Váltakozó háttérszín a sorokhoz

    invoice.items.forEach((item, index) => {
      // Oldaltörés ellenőrzése
      if (currentY > 700) {
        doc.addPage();
        currentPage++;
        currentY = 50;
        
        // Fejléc az új oldalon
        doc.rect(50, currentY, 520, 25)
           .fill(colors.secondary);

        doc.fillColor('white')
           .fontSize(11);
        
        tableHeaders.forEach((header, i) => {
          const position = columnPositions[i];
          doc.text(header, position + 5, currentY + 7, { width: tableColumnWidths[i] - 10 });
        });
        
        currentY += 25;
        rowBackground = true;
      }

      // Váltakozó háttérszín a sorokhoz
      if (rowBackground) {
        doc.rect(50, currentY, 520, 25)
           .fillColor(colors.light)
           .fill();
      }
      
      // A táblázat sor adatai
      doc.fillColor(colors.text)
         .fontSize(10);
         
      const row = [
        item.description,
        item.quantity.toString(),
        `${item.unitPrice} EUR`,
        `${item.total} EUR`
      ];
      
      row.forEach((cell, i) => {
        const position = columnPositions[i];
        const align = i === 0 ? 'left' : 'right';
        const padding = i === 0 ? 5 : 10;
        
        doc.text(cell, position + padding, currentY + 7, { 
          width: tableColumnWidths[i] - (padding * 2),
          align: align
        });
      });

      currentY += 25;
      rowBackground = !rowBackground;
    });

    // Összegzés táblázat
    const summaryStartY = currentY + 10;
    
    // Vonalak és dobozok a végösszeg kiemelésére
    doc.rect(350, summaryStartY, 220, 1)
       .fillColor(colors.light)
       .fill();
       
    doc.rect(350, summaryStartY + 5, 220, 25)
       .fillColor(colors.primary)
       .fill();
       
    // Végösszeg kiírása
    doc.fillColor('white')
       .fontSize(12)
       .text('Végösszeg:', 360, summaryStartY + 12)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(`${invoice.totalAmount} EUR`, 530, summaryStartY + 12, { align: 'right' });
       
    // Fizetve és fennmaradó összeg (ha nem fizetett a számla)
    if (invoice.status !== 'fizetett' && invoice.paidAmount < invoice.totalAmount) {
      doc.rect(350, summaryStartY + 35, 220, 50)
         .fillColor(colors.light)
         .fill();
         
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica')
         .text('Fizetve:', 360, summaryStartY + 40)
         .text(`${invoice.paidAmount} EUR`, 530, summaryStartY + 40, { align: 'right' })
         .text('Fennmaradó összeg:', 360, summaryStartY + 60)
         .font('Helvetica-Bold')
         .text(`${invoice.totalAmount - invoice.paidAmount} EUR`, 530, summaryStartY + 60, { align: 'right' });
    }
    
    // Számla státusz jelzés
    if (invoice.status) {
      let statusColor;
      let statusText;
      
      switch (invoice.status) {
        case 'fizetett':
          statusColor = colors.success;
          statusText = 'FIZETVE';
          break;
        case 'késedelmes':
          statusColor = colors.warning;
          statusText = 'LEJÁRT';
          break;
        case 'törölt':
          statusColor = '#9CA3AF'; // Szürke
          statusText = 'TÖRÖLT';
          break;
        default:
          statusColor = colors.primary;
          statusText = 'KIÁLLÍTVA';
      }
      
      // Nagy státusz pecsét
      if (invoice.status === 'fizetett') {
        doc.rotate(-30, { origin: [350, summaryStartY - 20] })
           .rect(280, summaryStartY - 80, 140, 40)
           .fillColor(statusColor)
           .fillOpacity(0.8)
           .fill()
           .fillOpacity(1)
           .fillColor('white')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text(statusText, 300, summaryStartY - 70, { align: 'center' })
           .rotate(30, { origin: [350, summaryStartY - 20] })
           .font('Helvetica');
      }
    }

    // Fizetési információk
    const paymentInfoY = Math.max(summaryStartY + 110, 580);
    
    doc.fontSize(14)
       .fillColor(colors.secondary)
       .text('Fizetési információk', 50, paymentInfoY)
       .moveDown(0.3);
       
    doc.fontSize(10)
       .fillColor(colors.text)
       .text('IBAN: DE47 6634 0014 0743 4638 00')
       .text('SWIFT/BIC: COBADEFFXXX')
       .text('Bank: Commerzbank AG')
       .text(`Közlemény: ${invoice.number}`)
       .moveDown(0.5);

    // QR kód - ha elérhető
    // Itt lehetne SEPA QR kódot generálni

    // Lábléc
    const footerTop = doc.page.height - 50;
    
    // Vonal a lábléc előtt
    doc.rect(50, footerTop - 20, 520, 1)
       .fillColor(colors.light)
       .fill();
       
    // Lábléc szöveg
    doc.fontSize(10)
       .fillColor(colors.secondary)
       .text('NB Studio - Bartus Norbert | www.nb-studio.net', 50, footerTop, { align: 'center' })
       .moveDown(0.3)
       .fontSize(8)
       .fillColor(colors.text)
       .text('Ez a számla elektronikusan készült és érvényes aláírás nélkül is.', { align: 'center' });

    // Oldalszám a jobb alsó sarokban
    doc.fontSize(9)
       .fillColor(colors.text)
       .text(`Oldal: ${currentPage}`, 500, footerTop, { align: 'right' });

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