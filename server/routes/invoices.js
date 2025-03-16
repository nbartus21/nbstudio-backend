import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Project from '../models/Project.js';
import authMiddleware from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Védett végpontok
router.use(authMiddleware);

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
    console.log(`PDF generálási kérés: projectId=${req.params.projectId}, invoiceId=${req.params.invoiceId}`);
    
    // Érvényesítjük az ID-kat
    if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
      console.log('Érvénytelen projekt ID formátum:', req.params.projectId);
      return res.status(400).json({ message: 'Érvénytelen projekt ID formátum' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.params.invoiceId)) {
      console.log('Érvénytelen számla ID formátum:', req.params.invoiceId);
      return res.status(400).json({ message: 'Érvénytelen számla ID formátum' });
    }
    
    // Lekérjük a projekthez tartozó számlákat
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      console.log('Projekt nem található:', req.params.projectId);
      return res.status(404).json({ message: 'Projekt nem található' });
    }
    
    console.log('Projekt megtalálva:', project._id);
    
    // Ellenőrizzük a számlákat
    if (!project.invoices || !Array.isArray(project.invoices) || project.invoices.length === 0) {
      console.log('A projekthez nem tartoznak számlák:', project._id);
      return res.status(404).json({ message: 'A projekthez nem tartoznak számlák' });
    }
    
    console.log(`Számlák száma a projektben: ${project.invoices.length}`);
    
    // Keressük meg a számlát ID alapján (string összehasonlítással, biztonságosabb)
    const invoice = project.invoices.find(inv => 
      inv._id.toString() === req.params.invoiceId
    );
    
    if (!invoice) {
      console.log('Számla nem található ezzel az ID-val:', req.params.invoiceId);
      console.log('Elérhető számla ID-k:', project.invoices.map(inv => inv._id.toString()));
      return res.status(404).json({ message: 'Számla nem található' });
    }
    
    console.log('Számla megtalálva:', invoice._id.toString());
  
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
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // PDF streamelése a response-ba
    doc.pipe(res);
    
    // Fejléc logó (ha létezik)
    try {
      const logoPath = join(__dirname, '..', 'public', 'logo.png');
      console.log('Logo útvonal ellenőrzése:', logoPath);
      if (fs.existsSync(logoPath)) {
        console.log('Logo megtalálva, hozzáadás a PDF-hez');
        doc.image(logoPath, 50, 50, { width: 150 })
          .moveDown();
      } else {
        console.log('Logo fájl nem található:', logoPath);
      }
    } catch (logoError) {
      console.warn('Logo betöltési hiba:', logoError.message);
      // Folytatjuk a PDF generálást logo nélkül
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

    // Ellenőrizzük az items tömböt
    console.log('Számla tételek ellenőrzése:', invoice.items);
    if (!invoice.items || !Array.isArray(invoice.items)) {
      console.log('A számla tételei hiányoznak vagy nem tömbként vannak tárolva');
      invoice.items = []; // Üres tömböt hozunk létre, hogy ne crasheljen
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
      // Ellenőrizzük a tétel adatokat
      if (!item || typeof item !== 'object') {
        console.log(`Hibás tétel formátum a(z) ${index}. indexnél:`, item);
        return; // Kihagyjuk ezt a tételt
      }
      
      // Biztosítjuk, hogy minden szükséges mezőnek legyen alapértelmezett értéke
      item.description = item.description || 'Nincs leírás';
      item.quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      item.unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      item.total = typeof item.total === 'number' ? item.total : 0;
      
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

    // Ellenőrizzük a számla összegeket
    if (typeof invoice.totalAmount !== 'number') {
      console.log('Hiányzó vagy érvénytelen totalAmount érték:', invoice.totalAmount);
      invoice.totalAmount = 0;
    }
    
    if (typeof invoice.paidAmount !== 'number') {
      console.log('Hiányzó vagy érvénytelen paidAmount érték:', invoice.paidAmount);
      invoice.paidAmount = 0;
    }

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
    console.log('PDF generálás sikeres, küldés...');
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

// ==================================================
// ISMÉTLŐDŐ SZÁMLÁZÁS VÉGPONTJAI
// ==================================================

// Ismétlődő számla létrehozása egy projekthez
router.post('/projects/:projectId/recurring-invoices', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Számítjuk a következő számlázási dátumot a frekvencia alapján
    const startDate = new Date(req.body.startDate);
    const nextInvoiceDate = calculateNextInvoiceDate(startDate, req.body.frequency, req.body.interval);

    // Új ismétlődő számla létrehozása
    const newRecurringInvoice = {
      name: req.body.name,
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      frequency: req.body.frequency,
      interval: req.body.interval || 1,
      startDate: startDate,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      nextInvoiceDate: nextInvoiceDate,
      totalOccurrences: req.body.totalOccurrences,
      paymentTerms: req.body.paymentTerms || 14,
      items: req.body.items || [],
      totalAmount: req.body.totalAmount,
      notes: req.body.notes || '',
      emailNotification: req.body.emailNotification !== undefined ? req.body.emailNotification : true,
      emailTemplate: req.body.emailTemplate || '',
      reminderDays: req.body.reminderDays || 3,
      autoSend: req.body.autoSend !== undefined ? req.body.autoSend : false,
      generatePDF: req.body.generatePDF !== undefined ? req.body.generatePDF : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Számla tételek összegének ellenőrzése
    if (!newRecurringInvoice.totalAmount && newRecurringInvoice.items && newRecurringInvoice.items.length > 0) {
      newRecurringInvoice.totalAmount = newRecurringInvoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
    }

    // Hozzáadjuk az ismétlődő számlát a projekthez
    project.recurringInvoices.push(newRecurringInvoice);
    await project.save();

    // Visszaadjuk a létrehozott számla adatait
    res.status(201).json({
      message: 'Ismétlődő számla sikeresen létrehozva',
      recurringInvoice: project.recurringInvoices[project.recurringInvoices.length - 1]
    });
  } catch (error) {
    console.error('Hiba az ismétlődő számla létrehozásakor:', error);
    res.status(500).json({ 
      message: 'Hiba az ismétlődő számla létrehozásakor', 
      error: error.message 
    });
  }
});

// Ismétlődő számlák lekérdezése egy projekthez
router.get('/projects/:projectId/recurring-invoices', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Ha nincsenek ismétlődő számlák, üres tömböt adunk vissza
    if (!project.recurringInvoices || project.recurringInvoices.length === 0) {
      return res.json([]);
    }

    // Visszaadjuk az összes ismétlődő számlát
    res.json(project.recurringInvoices);
  } catch (error) {
    console.error('Hiba az ismétlődő számlák lekérdezésekor:', error);
    res.status(500).json({ 
      message: 'Hiba az ismétlődő számlák lekérdezésekor', 
      error: error.message 
    });
  }
});

// Egy ismétlődő számla lekérdezése
router.get('/projects/:projectId/recurring-invoices/:recurringInvoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Keressük meg az ismétlődő számlát
    const recurringInvoice = project.recurringInvoices.id(req.params.recurringInvoiceId);
    if (!recurringInvoice) {
      return res.status(404).json({ message: 'Ismétlődő számla nem található' });
    }

    res.json(recurringInvoice);
  } catch (error) {
    console.error('Hiba az ismétlődő számla lekérdezésekor:', error);
    res.status(500).json({ 
      message: 'Hiba az ismétlődő számla lekérdezésekor', 
      error: error.message 
    });
  }
});

// Ismétlődő számla módosítása
router.put('/projects/:projectId/recurring-invoices/:recurringInvoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Keressük meg az ismétlődő számlát
    const recurringInvoice = project.recurringInvoices.id(req.params.recurringInvoiceId);
    if (!recurringInvoice) {
      return res.status(404).json({ message: 'Ismétlődő számla nem található' });
    }

    // Módosítható mezők
    const updatableFields = [
      'name', 'description', 'isActive', 'frequency', 'interval', 
      'startDate', 'endDate', 'totalOccurrences', 'paymentTerms', 
      'items', 'totalAmount', 'notes', 'emailNotification', 
      'emailTemplate', 'reminderDays', 'autoSend', 'generatePDF'
    ];

    // Frissítjük a mezőket
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Dátum mezők konvertálása
        if (field === 'startDate' || field === 'endDate') {
          recurringInvoice[field] = req.body[field] ? new Date(req.body[field]) : recurringInvoice[field];
        } else {
          recurringInvoice[field] = req.body[field];
        }
      }
    });

    // Számla tételek összegének frissítése
    if (req.body.items && req.body.items.length > 0) {
      recurringInvoice.totalAmount = req.body.items.reduce((sum, item) => sum + (item.total || 0), 0);
    }

    // Következő számlázási dátum frissítése, ha a frekvencia vagy kezdési dátum változott
    if (req.body.frequency || req.body.interval || req.body.startDate) {
      recurringInvoice.nextInvoiceDate = calculateNextInvoiceDate(
        recurringInvoice.lastInvoiceDate || recurringInvoice.startDate,
        recurringInvoice.frequency,
        recurringInvoice.interval
      );
    }

    // Frissítési dátum
    recurringInvoice.updatedAt = new Date();

    await project.save();

    res.json({
      message: 'Ismétlődő számla sikeresen frissítve',
      recurringInvoice
    });
  } catch (error) {
    console.error('Hiba az ismétlődő számla frissítésekor:', error);
    res.status(500).json({ 
      message: 'Hiba az ismétlődő számla frissítésekor', 
      error: error.message 
    });
  }
});

// Ismétlődő számla törlése
router.delete('/projects/:projectId/recurring-invoices/:recurringInvoiceId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Keressük meg az ismétlődő számlát
    const recurringInvoice = project.recurringInvoices.id(req.params.recurringInvoiceId);
    if (!recurringInvoice) {
      return res.status(404).json({ message: 'Ismétlődő számla nem található' });
    }

    // Töröljük az ismétlődő számlát
    recurringInvoice.remove();
    await project.save();

    res.json({
      message: 'Ismétlődő számla sikeresen törölve'
    });
  } catch (error) {
    console.error('Hiba az ismétlődő számla törlésekor:', error);
    res.status(500).json({ 
      message: 'Hiba az ismétlődő számla törlésekor', 
      error: error.message 
    });
  }
});

// Manuális számlakészítés ismétlődő számlából
router.post('/projects/:projectId/recurring-invoices/:recurringInvoiceId/generate', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    // Keressük meg az ismétlődő számlát
    const recurringInvoice = project.recurringInvoices.id(req.params.recurringInvoiceId);
    if (!recurringInvoice) {
      return res.status(404).json({ message: 'Ismétlődő számla nem található' });
    }

    // Számla létrehozása az ismétlődő számla alapján
    const newInvoice = await generateInvoiceFromRecurring(project, recurringInvoice);

    // Frissítjük az ismétlődő számla adatait
    recurringInvoice.lastInvoiceDate = new Date();
    recurringInvoice.currentOccurrence += 1;
    recurringInvoice.nextInvoiceDate = calculateNextInvoiceDate(
      recurringInvoice.lastInvoiceDate,
      recurringInvoice.frequency,
      recurringInvoice.interval
    );

    // Ellenőrizzük, hogy elértük-e a maximális ismétlésszámot
    if (recurringInvoice.totalOccurrences && recurringInvoice.currentOccurrence >= recurringInvoice.totalOccurrences) {
      recurringInvoice.isActive = false;
    }

    await project.save();

    res.status(201).json({
      message: 'Számla sikeresen létrehozva az ismétlődő számla alapján',
      invoice: newInvoice
    });
  } catch (error) {
    console.error('Hiba a számla generálásakor:', error);
    res.status(500).json({ 
      message: 'Hiba a számla generálásakor', 
      error: error.message 
    });
  }
});

// Admin végpont az összes ismétlődő számla ellenőrzésére és generálására
router.post('/admin/check-recurring-invoices', authMiddleware, async (req, res) => {
  try {
    // Ellenőrizzük, hogy a felhasználó admin-e
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Nem rendelkezik megfelelő jogosultsággal' });
    }
    
    const recurringInvoiceService = (await import('../services/recurringInvoiceService.js')).default;
    
    // Elindítjuk az ismétlődő számlák ellenőrzését
    await recurringInvoiceService.checkAllRecurringInvoices();
    
    res.status(200).json({ message: 'Ismétlődő számlák ellenőrzése sikeresen elindítva' });
  } catch (error) {
    console.error('Hiba az ismétlődő számlák ellenőrzésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az ismétlődő számlák ellenőrzésekor', error: error.message });
  }
});

// ==================================================
// SEGÉDFÜGGVÉNYEK
// ==================================================

// Következő számlázási dátum kiszámítása
function calculateNextInvoiceDate(fromDate, frequency, interval = 1) {
  const date = new Date(fromDate);
  
  switch (frequency) {
    case 'havi':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'negyedéves':
      date.setMonth(date.getMonth() + (3 * interval));
      break;
    case 'féléves':
      date.setMonth(date.getMonth() + (6 * interval));
      break;
    case 'éves':
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      // Egyedi frekvencia esetén nem változtatunk az időponton
      break;
  }
  
  return date;
}

// Számla generálása ismétlődő számla alapján
async function generateInvoiceFromRecurring(project, recurringInvoice) {
  // Számla szám generálása (példa: INV-YYYYMM-XXXX formátumban)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${year}${month}-${randomNum}`;
  
  // Fizetési határidő kiszámítása
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (recurringInvoice.paymentTerms || 14));
  
  // Új számla létrehozása
  const newInvoice = {
    number: invoiceNumber,
    date: new Date(),
    dueDate: dueDate,
    status: 'kiállított',
    items: JSON.parse(JSON.stringify(recurringInvoice.items)), // Deep copy
    totalAmount: recurringInvoice.totalAmount,
    paidAmount: 0,
    notes: recurringInvoice.notes,
    isRecurring: true,
    recurringInvoiceId: recurringInvoice._id
  };
  
  // Számla hozzáadása a projekthez
  project.invoices.push(newInvoice);
  
  // Visszaadjuk az újonnan létrehozott számlát
  return project.invoices[project.invoices.length - 1];
}

// ==================================================
// MEGLÉVŐ VÉGPONTOK
// ==================================================

export default router;