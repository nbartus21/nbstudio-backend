import express from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Project from '../models/Project.js';
import authMiddleware from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import cron from 'node-cron';

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
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  // Ismétlődő számla beállítások
  recurring: {
    isRecurring: { type: Boolean, default: false },
    interval: { type: String, enum: ['havonta', 'negyedévente', 'félévente', 'évente'], default: 'havonta' },
    nextDate: Date, // Következő számlázási dátum
    // Opcionálisan adhatunk meg végdátumot vagy maximális számot
    endDate: Date, // Ha üres, akkor végtelen
    remainingOccurrences: Number // Ha 0 vagy üres, akkor végtelen
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Log entry modell létrehozása
const recurringInvoiceLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  description: String,
  generatedCount: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  details: [{ 
    projectId: mongoose.Schema.Types.ObjectId,
    projectName: String,
    invoiceId: mongoose.Schema.Types.ObjectId,
    invoiceNumber: String,
    newInvoiceId: mongoose.Schema.Types.ObjectId,
    newInvoiceNumber: String,
    amount: Number
  }],
  error: String
}, { timestamps: true });

const RecurringInvoiceLog = mongoose.model('RecurringInvoiceLog', recurringInvoiceLogSchema);

// Különböző ismétlődési időszakok alapján kiszámolja a következő generálás dátumát
const calculateNextDate = (interval, currentDate) => {
  const nextDate = new Date(currentDate);
  
  switch (interval) {
    case 'havonta':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'negyedévente':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'félévente':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'évente':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // Alapértelmezett: havonta
  }
  
  return nextDate;
};

// Segédfüggvény a logoláshoz
const logRecurringInvoiceActivity = async (type, description, generatedCount, success, details = [], error = null) => {
  try {
    const logEntry = new RecurringInvoiceLog({
      type,
      description,
      generatedCount,
      success,
      details,
      error: error ? error.message || error.toString() : null
    });
    
    await logEntry.save();
    console.log(`Log bejegyzés létrehozva: ${description}`);
    return logEntry;
  } catch (logError) {
    console.error('Hiba a tevékenység naplózásakor:', logError);
    // Naplózási hiba esetén csak konzolra írunk, de nem dobunk hibát, hogy ne akadályozza a fő műveletet
  }
};

// Ismétlődő számla másolása és új létrehozása
const generateNewInvoiceFromRecurring = async (projectId, recurringInvoice) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Projekt nem található: ${projectId}`);
    }
    
    // Megkeressük az eredeti számlát
    const originalInvoice = project.invoices.id(recurringInvoice._id);
    if (!originalInvoice) {
      throw new Error(`Számla nem található: ${recurringInvoice._id}`);
    }
    
    // Új számla adatok létrehozása az eredeti alapján
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Számoljuk ki az új fizetési határidőt (általában 14 nap)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14);
    
    // Másoljuk az elemeket
    const items = originalInvoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));
    
    // Új számla objektum
    const newInvoice = {
      _id: new mongoose.Types.ObjectId(),
      number: invoiceNumber,
      date: now,
      dueDate: dueDate,
      items: items,
      totalAmount: originalInvoice.totalAmount,
      paidAmount: 0,
      status: 'kiállított',
      notes: originalInvoice.notes,
      recurring: {
        isRecurring: false // Az ismétlődésből generált példány nem lesz ismétlődő
      }
    };
    
    // Fűzzük az új számlát a projekthez
    project.invoices.push(newInvoice);
    
    // Frissítsük az eredeti ismétlődő számla adatait
    
    // Csökkentsük a hátralévő ismétlődések számát, ha van ilyen
    if (originalInvoice.recurring.remainingOccurrences) {
      originalInvoice.recurring.remainingOccurrences--;
    }
    
    // Frissítsük a következő generálási dátumot
    originalInvoice.recurring.nextDate = calculateNextDate(
      originalInvoice.recurring.interval,
      originalInvoice.recurring.nextDate || now
    );
    
    // Ha elfogytak az ismétlődések vagy elértük a végdátumot, akkor kikapcsoljuk az ismétlődést
    if (
      (originalInvoice.recurring.remainingOccurrences !== null && 
       originalInvoice.recurring.remainingOccurrences <= 0) ||
      (originalInvoice.recurring.endDate && 
       new Date(originalInvoice.recurring.endDate) <= now)
    ) {
      originalInvoice.recurring.isRecurring = false;
    }
    
    // Mentsük a projektet a változtatásokkal
    await project.save();
    
    return newInvoice;
  } catch (error) {
    console.error('Hiba az ismétlődő számla generálásakor:', error);
    throw error;
  }
};

// Futtatandó a rendszerben ütemezve (pl. naponta egyszer)
// Ez a függvény generálja az új számlákat az ismétlődő beállítások alapján
const processRecurringInvoices = async () => {
  try {
    const now = new Date();
    console.log(`Ismétlődő számlák feldolgozása: ${now.toISOString()}`);
    
    // Keressük meg az összes projektet, amelyben van olyan ismétlődő számla, amelynek a nextDate-je lejárt
    const projects = await Project.find({
      'invoices.recurring.isRecurring': true,
      'invoices.recurring.nextDate': { $lte: now }
    });
    
    console.log(`${projects.length} projekt talált ismétlődő számlákkal`);
    
    let generatedCount = 0;
    const logDetails = [];
    
    // Projektenként végigmegyünk a számlákon és létrehozzuk az újakat
    for (const project of projects) {
      // Szűrjük ki az aktív ismétlődő számlákat, amelyek generálása esedékes
      const invoicesToGenerate = project.invoices.filter(inv => 
        inv.recurring && 
        inv.recurring.isRecurring === true && 
        new Date(inv.recurring.nextDate) <= now
      );
      
      console.log(`${invoicesToGenerate.length} számla generálása a(z) ${project.name} projektben`);
      
      // Minden esedékes számlához generálunk egy újat
      for (const invoice of invoicesToGenerate) {
        try {
          const newInvoice = await generateNewInvoiceFromRecurring(project._id, invoice);
          generatedCount++;
          
          // Részletes információk mentése a loghoz
          logDetails.push({
            projectId: project._id,
            projectName: project.name,
            invoiceId: invoice._id,
            invoiceNumber: invoice.number,
            newInvoiceId: newInvoice._id,
            newInvoiceNumber: newInvoice.number,
            amount: newInvoice.totalAmount
          });
        } catch (invoiceError) {
          console.error(`Hiba a számla generálásakor (${project.name}, ${invoice._id}):`, invoiceError);
          
          // Hibás számla is kerüljön be a logba
          logDetails.push({
            projectId: project._id,
            projectName: project.name,
            invoiceId: invoice._id,
            invoiceNumber: invoice.number,
            error: invoiceError.message
          });
        }
      }
    }
    
    console.log(`Sikeresen generált ${generatedCount} új számla`);
    
    // Mentsük el a logban az aktivitást
    await logRecurringInvoiceActivity(
      'auto',
      `Automatikus ismétlődő számla generálás (${now.toLocaleString('hu-HU')})`,
      generatedCount,
      true,
      logDetails
    );
    
    return generatedCount;
  } catch (error) {
    console.error('Hiba az ismétlődő számlák feldolgozásakor:', error);
    
    // Hiba esetén is logoljuk az eseményt
    await logRecurringInvoiceActivity(
      'auto',
      `Hiba az automatikus ismétlődő számla generálás során (${new Date().toLocaleString('hu-HU')})`,
      0,
      false,
      [],
      error
    );
    
    throw error;
  }
};

// Manuálisan generál egy új számlát az ismétlődő sablonból
const manuallyGenerateInvoice = async (projectId, invoiceId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Projekt nem található: ${projectId}`);
    }
    
    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      throw new Error(`Számla nem található: ${invoiceId}`);
    }
    
    const newInvoice = await generateNewInvoiceFromRecurring(projectId, invoice);
    
    // Mentsük el a logban az aktivitást
    await logRecurringInvoiceActivity(
      'manual',
      `Manuális ismétlődő számla generálás (${new Date().toLocaleString('hu-HU')})`,
      1,
      true,
      [{
        projectId: project._id,
        projectName: project.name,
        invoiceId: invoice._id,
        invoiceNumber: invoice.number,
        newInvoiceId: newInvoice._id,
        newInvoiceNumber: newInvoice.number,
        amount: newInvoice.totalAmount
      }]
    );
    
    return newInvoice;
  } catch (error) {
    console.error('Hiba a számla manuális generálásakor:', error);
    
    // Hiba esetén is logoljuk az eseményt
    await logRecurringInvoiceActivity(
      'manual',
      `Hiba a manuális ismétlődő számla generálás során (${new Date().toLocaleString('hu-HU')})`,
      0,
      false,
      [],
      error
    );
    
    throw error;
  }
};

// Új számla létrehozása projekthez
router.post('/projects/:projectId/invoices', async (req, res) => {
  try {
    console.log('Számla létrehozási kérés érkezett');
    console.log('Projekt ID:', req.params.projectId);
    console.log('Számla adatok:', req.body);
    
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      console.log('Projekt nem található');
      return res.status(404).json({ message: 'Projekt nem található' });
    }
    
    console.log('Megtalált projekt: Igen');

    // Számla adatok előkészítése
    const invoiceData = { ...req.body };
    console.log('Feldolgozandó számla adatok:', invoiceData);
    
    // Ha vannak tételek és nincs megadva a total mező, számoljuk ki
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      invoiceData.items = invoiceData.items.map(item => {
        console.log('Tétel ellenőrzése:', item);
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
    console.log('Számla hozzáadva a projekthez');
    
    // Naplózzuk az új számla létrehozását
    let logType = 'manual';
    let logDescription = `Új számla manuális létrehozása: ${invoice.number}`;
    
    // Ha ismétlődő számla, akkor azt is jelezzük a naplóban
    if (invoiceData.recurring && invoiceData.recurring.isRecurring) {
      logType = 'manual';
      logDescription = `Új ismétlődő számla létrehozása: ${invoice.number} (${invoiceData.recurring.interval})`;
    }
    
    try {
      await logRecurringInvoiceActivity(
        logType,
        logDescription,
        1, // Egy számla lett létrehozva
        true,
        [{
          projectId: project._id,
          projectName: project.name,
          invoiceId: invoice._id,
          invoiceNumber: invoice.number,
          amount: invoice.totalAmount
        }]
      );
    } catch (logError) {
      console.error('Hiba a napló létrehozásakor:', logError);
      // A naplózási hiba nem szakítja meg a számla létrehozását
    }
    
    // Financial összegek frissítése a projektben
    if (project.financial) {
      const totalBilled = project.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      project.financial.totalBilled = totalBilled;
      console.log('Új teljes számlázott összeg:', totalBilled);
    }
    
    await project.save();
    console.log('Projekt sikeresen mentve');

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

    // Betűtípusok beállítása
    doc.registerFont('Helvetica', 'Helvetica');
    doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

    // Modern design - színek és stílusok
    const colors = {
      primary: '#1E40AF',    // Sötét kék
      secondary: '#1E293B',  // Sötét szürke
      accent: '#3B82F6',     // Világos kék
      text: '#1E293B',       // Sötét szöveg
      light: '#F8FAFC',      // Világos háttér
      success: '#059669',    // Zöld (fizetett)
      warning: '#D97706',    // Narancs (lejárt)
      border: '#E2E8F0',     // Szegély szín
      background: '#FFFFFF', // Fehér háttér
    };

    // Fejléc háttér
    doc.rect(0, 0, doc.page.width, 180)
       .fill(colors.primary);

    // Logo hozzáadása (ha létezik)
    try {
      const logoPath = join(__dirname, '..', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 120 });
      }
    } catch (logoError) {
      console.warn('Logo betöltési hiba:', logoError.message);
    }

    // Fejléc szöveg
    doc.font('Helvetica-Bold')
       .fontSize(36)
       .fillColor('white')
       .text('SZÁMLA', 50, 50)
       .fontSize(14)
       .font('Helvetica')
       .text(`Számlaszám: ${invoice.number}`, 50, 95);

    // Fejléc jobb oldali információk
    doc.font('Helvetica')
       .fontSize(12)
       .text('Kiállítás dátuma:', 400, 50)
       .font('Helvetica-Bold')
       .text(new Date(invoice.date).toLocaleDateString('hu-HU'), 400, 70)
       .font('Helvetica')
       .text('Fizetési határidő:', 400, 100)
       .font('Helvetica-Bold')
       .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), 400, 120);

    // Színes elválasztó sáv
    doc.rect(0, 180, doc.page.width, 3)
       .fill(colors.accent);

    // Kiállító és vevő adatok konténer
    doc.rect(50, 210, 520, 160)
       .fill(colors.light);

    // Kiállító adatok
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(colors.secondary)
       .text('Kiállító:', 70, 230)
       .font('Helvetica')
       .fontSize(12)
       .fillColor(colors.text)
       .text('NB Studio', 70, 255)
       .text('Bartus Norbert', 70, 275)
       .text('Adószám: 12345678-1-42', 70, 295)
       .text('1234 Budapest, Példa utca 1.', 70, 315)
       .text('info@nb-studio.net', 70, 335);

    // Vevő adatok
    if (project.client) {
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(colors.secondary)
         .text('Vevő:', 320, 230)
         .font('Helvetica')
         .fontSize(12)
         .fillColor(colors.text)
         .text(project.client.name || '', 320, 255)
         .text(project.client.companyName || '', 320, 275);

      if (project.client.taxNumber) {
        doc.text(`Adószám: ${project.client.taxNumber}`, 320, 295);
      }

      if (project.client.address) {
        const { city, street, postalCode } = project.client.address;
        if (city || street || postalCode) {
          doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 320, 315);
        }
      }

      if (project.client.email) {
        doc.text(project.client.email, 320, 335);
      }
    }

    // Tételek táblázat
    const tableTop = 400;
    const tableHeaders = ['Tétel', 'Mennyiség', 'Egységár', 'Összesen'];
    const tableColumnWidths = [240, 80, 100, 100];
    const columnPositions = [50];
    
    for (let i = 1; i < tableColumnWidths.length; i++) {
      columnPositions[i] = columnPositions[i-1] + tableColumnWidths[i-1];
    }

    // Táblázat fejléc háttér
    doc.rect(50, tableTop, 520, 30)
       .fill(colors.secondary);

    // Táblázat fejléc szöveg
    doc.font('Helvetica-Bold')
       .fillColor('white')
       .fontSize(12);
    
    tableHeaders.forEach((header, i) => {
      const position = columnPositions[i];
      doc.text(header, position + 5, tableTop + 10, { 
        width: tableColumnWidths[i] - 10,
        align: i === 0 ? 'left' : 'right'
      });
    });

    // Táblázat sorok
    let currentY = tableTop + 30;
    let rowBackground = true;

    invoice.items.forEach((item) => {
      // Váltakozó háttérszín
      if (rowBackground) {
        doc.rect(50, currentY, 520, 30)
           .fill(colors.light);
      }

      const row = [
        item.description || '',
        item.quantity?.toString() || '',
        `${item.unitPrice || 0} EUR`,
        `${item.total || 0} EUR`
      ];
      
      doc.font('Helvetica')
         .fillColor(colors.text)
         .fontSize(11);

      row.forEach((cell, i) => {
        doc.text(cell, columnPositions[i] + 5, currentY + 10, { 
          width: tableColumnWidths[i] - 10,
          align: i === 0 ? 'left' : 'right'
        });
      });

      currentY += 30;
      rowBackground = !rowBackground;
    });

    // Végösszeg doboz
    const summaryStartY = currentY + 20;
    
    // Végösszeg háttér
    doc.rect(350, summaryStartY, 220, 40)
       .fill(colors.primary);

    // Végösszeg szöveg
    doc.font('Helvetica-Bold')
       .fillColor('white')
       .fontSize(14)
       .text('Végösszeg:', 370, summaryStartY + 12)
       .fontSize(16)
       .text(`${invoice.totalAmount} EUR`, 530, summaryStartY + 12, { align: 'right' });

    // Fizetési információk
    const paymentInfoY = summaryStartY + 80;
    
    doc.rect(50, paymentInfoY, 520, 100)
       .fill(colors.light);

    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(colors.secondary)
       .text('Fizetési információk', 70, paymentInfoY + 15)
       .font('Helvetica')
       .fontSize(11)
       .fillColor(colors.text)
       .moveDown(0.5);

    doc.text('IBAN: DE47 6634 0014 0743 4638 00', 70, paymentInfoY + 40)
       .text('SWIFT/BIC: COBADEFFXXX', 70, paymentInfoY + 55)
       .text('Bank: Commerzbank AG', 70, paymentInfoY + 70)
       .text(`Közlemény: ${invoice.number}`, 70, paymentInfoY + 85);

    // Státusz jelzés (ha van)
    if (invoice.status === 'fizetett') {
      doc.rotate(-30, { origin: [350, summaryStartY - 20] })
         .rect(280, summaryStartY - 80, 140, 40)
         .fill(colors.success)
         .fillColor('white')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('FIZETVE', 300, summaryStartY - 70, { align: 'center' })
         .rotate(30, { origin: [350, summaryStartY - 20] });
    }

    // Lábléc
    const footerTop = doc.page.height - 80;
    
    // Lábléc vonal
    doc.moveTo(50, footerTop)
       .lineTo(570, footerTop)
       .stroke(colors.border);

    // Lábléc szöveg
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.secondary)
       .text('NB Studio - Bartus Norbert | www.nb-studio.net', 50, footerTop + 20, { align: 'center' })
       .moveDown(0.3)
       .fontSize(8)
       .fillColor(colors.text)
       .text('Ez a számla elektronikusan készült és érvényes aláírás nélkül is.', { align: 'center' });

    // Oldalszám
    doc.fontSize(9)
       .text('1/1', 500, footerTop + 20, { align: 'right' });

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

// Ismétlődő számlák generálása (cron job által meghívható)
router.post('/recurring/process', async (req, res) => {
  try {
    const count = await processRecurringInvoices();
    res.status(200).json({ 
      message: `Sikeresen feldolgozva ${count} ismétlődő számla`,
      count 
    });
  } catch (error) {
    console.error('Hiba az ismétlődő számlák feldolgozásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Teszt log létrehozása
router.post('/recurring/logs/test', async (req, res) => {
  try {
    console.log('Teszt log bejegyzés létrehozása');
    
    const testLog = new RecurringInvoiceLog({
      type: 'manual',
      description: 'Teszt log bejegyzés - ' + new Date().toLocaleString('hu-HU'),
      generatedCount: 1,
      success: true,
      details: [{
        projectName: 'Teszt Projekt',
        invoiceNumber: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        amount: 100
      }]
    });
    
    await testLog.save();
    console.log('Teszt log sikeresen mentve:', testLog._id);
    
    res.status(201).json({ 
      message: 'Teszt log létrehozva', 
      log: testLog 
    });
  } catch (error) {
    console.error('Hiba a teszt log létrehozásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Ismétlődő számlákkal kapcsolatos logok lekérése
router.get('/recurring/logs', async (req, res) => {
  try {
    console.log('Ismétlődő számlák log lekérési kérés');
    console.log('Query paraméterek:', req.query);
    
    // Paraméteres szűrés (opcionális)
    const limit = parseInt(req.query.limit) || 20; // Alapértelmezetten 20 bejegyzés
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const type = req.query.type; // 'auto' vagy 'manual'
    
    console.log('Feldolgozott paraméterek:', { limit, page, skip, type });
    
    // Szűrési feltételek
    const filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    console.log('Alkalmazott szűrő:', filter);
    
    // Ellenőrizzük, hogy egyáltalán van-e RecurringInvoiceLog modell
    console.log('RecurringInvoiceLog modell ellenőrzése:', !!RecurringInvoiceLog);
    console.log('Elérhető modellek:', Object.keys(mongoose.models).join(', '));
    
    // Összes találat száma (páginációhoz)
    const total = await RecurringInvoiceLog.countDocuments(filter);
    console.log('Összes találat:', total);
    
    // Logok lekérése
    const logs = await RecurringInvoiceLog.find(filter)
      .sort({ timestamp: -1 }) // Legújabb elöl
      .skip(skip)
      .limit(limit);
    
    console.log(`${logs.length} log lekérve`);
    
    // Ha vannak logok, kiírjuk az elsőt példaként
    if (logs.length > 0) {
      console.log('Példa log bejegyzés:', {
        id: logs[0]._id,
        timestamp: logs[0].timestamp,
        type: logs[0].type,
        description: logs[0].description,
        generatedCount: logs[0].generatedCount
      });
    } else {
      console.log('Nincsenek logok a szűrési feltételeknek megfelelően');
      
      // Ha nincs találat, próbáljuk meg szűrési feltételek nélkül
      console.log('Összes log lekérése szűrők nélkül:');
      const allLogs = await RecurringInvoiceLog.find({}).limit(5);
      console.log(`Összes log száma (szűrők nélkül, max 5): ${allLogs.length}`);
      
      if (allLogs.length > 0) {
        console.log('Példa log az adatbázisból:', {
          id: allLogs[0]._id,
          timestamp: allLogs[0].timestamp,
          type: allLogs[0].type,
          description: allLogs[0].description
        });
      } else {
        console.log('Az adatbázisban egyáltalán nincsenek log bejegyzések!');
      }
    }
      
    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Hiba a logok lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Manuális számla generálás egy adott ismétlődő számlából
router.post('/projects/:projectId/invoices/:invoiceId/generate', async (req, res) => {
  try {
    const { projectId, invoiceId } = req.params;
    
    // Ellenőrizzük az ID-k érvényességét
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ message: 'Érvénytelen projekt vagy számla azonosító' });
    }
    
    // Használjuk az új, logolást is végző függvényt
    const newInvoice = await manuallyGenerateInvoice(projectId, invoiceId);
    
    res.status(201).json({
      message: 'Ismétlődő számla sikeresen létrehozva',
      invoice: newInvoice
    });
  } catch (error) {
    console.error('Hiba a számla manuális generálásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Cron job beállítása az ismétlődő számlák automatikus feldolgozásához
// Minden nap 00:00-kor lefut
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Ismétlődő számlák automatikus feldolgozása indul...');
    const count = await processRecurringInvoices();
    console.log(`Automatikus számlafeldolgozás befejezve, ${count} számla generálva`);
  } catch (error) {
    console.error('Hiba az automatikus számlafeldolgozás során:', error);
  }
});

export default router;