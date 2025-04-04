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

    // Napló bejegyzés létrehozása
    await logRecurringInvoiceActivity(
      logType,
      logDescription,
      1,
      true,
      [{
        projectId: project._id,
        projectName: project.name,
        invoiceId: invoice._id,
        invoiceNumber: invoice.number,
        amount: invoice.totalAmount
      }]
    );

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
        Author: 'Norbert Bartus'
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
      primary: '#2563EB',     // Fő kék szín
      secondary: '#1E293B',   // Sötét szürke
      accent: '#3B82F6',      // Világos kék
      text: '#1E293B',        // Sötét szöveg
      light: '#F8FAFC',       // Világos háttér
      success: '#10B981',     // Zöld (fizetett)
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

    // Logo hozzáadása (ha létezik)
    try {
      const logoPath = join(__dirname, '..', 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 20, { width: 100 });
      }
    } catch (logoError) {
      console.warn('Logo betöltési hiba:', logoError.message);
    }

    // Státusz jelölés a fejlécben
    let statusColor = colors.accent;
    let statusText = 'Kiállítva';

    if (invoice.status === 'fizetett') {
      statusColor = colors.success;
      statusText = 'Fizetve';
    } else if (invoice.status === 'késedelmes') {
      statusColor = colors.warning;
      statusText = 'Lejárt';
    } else if (invoice.status === 'törölt') {
      statusColor = '#9CA3AF';
      statusText = 'Törölve';
    }

    // Számla felirat és szám
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(colors.primary)
       .text('SZÁMLA', 50, 30)
       .fontSize(14)
       .fillColor(colors.secondary)
       .text(`#${invoice.number}`, 50, 65);

    // Státusz badge
    const statusBadgeWidth = 80;
    const statusBadgeHeight = 22;
    const statusBadgeX = 50;
    const statusBadgeY = 85;

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
       .text('Kiállítás dátuma:', rightColumnX, 30, { align: 'right' })
       .fontSize(12)
       .fillColor(colors.primary)
       .text(new Date(invoice.date).toLocaleDateString('hu-HU'), rightColumnX, 45, { align: 'right' })
       .fontSize(10)
       .fillColor(colors.secondary)
       .text('Fizetési határidő:', rightColumnX, 65, { align: 'right' })
       .fontSize(12)
       .fillColor(colors.primary)
       .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), rightColumnX, 80, { align: 'right' });

    // Vékony elválasztó vonal a fejléc után
    doc.rect(50, 140, doc.page.width - 100, 1)
       .fill(colors.border);

    // Kiállító és vevő adatok
    const infoStartY = 160;

    // Kiállító adatok
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text('KIÁLLÍTÓ', 50, infoStartY);

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
       .text('USt-IdNr.: DE346419031', 50, infoStartY + 88)
       .text('IBAN: DE47 6634 0018 0473 4638 00', 50, infoStartY + 100)
       .text('BANK: Commerzbank AG', 50, infoStartY + 112)
       .text('SWIFT/BIC: COBADEFFXXX', 50, infoStartY + 124);

    // Kleinunternehmer megjegyzés
    doc.fontSize(7)
       .fillColor('#666666')
       .text('Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.', 50, infoStartY + 140, {
         width: 220
       });

    // Vevő adatok
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text('VEVŐ', 320, infoStartY);

    doc.rect(320, infoStartY + 18, 220, 1)
       .fill(colors.primary);

    if (project.client) {
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor(colors.secondary)
         .text(project.client.companyName || project.client.name || '', 320, infoStartY + 25);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.text);

      let rowY = infoStartY + 40;

      if (project.client.companyName && project.client.name) {
        doc.text(project.client.name, 320, rowY);
        rowY += 12;
      }

      if (project.client.taxNumber) {
        doc.text(`Adószám: ${project.client.taxNumber}`, 320, rowY);
        rowY += 12;
      }

      if (project.client.email) {
        doc.text(`Email: ${project.client.email}`, 320, rowY);
        rowY += 12;
      }

      if (project.client.phone) {
        doc.text(`Telefon: ${project.client.phone}`, 320, rowY);
        rowY += 12;
      }

      if (project.client.address) {
        const { city, street, postalCode, country } = project.client.address;
        if (city || street || postalCode) {
          doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 320, rowY);
          rowY += 12;
        }
        if (country) {
          doc.text(country, 320, rowY);
        }
      }
    }

    // Tételek táblázat
    const tableStartY = infoStartY + 180;

    // Táblázat fejléc - eredeti margókkal
    doc.rect(50, tableStartY, doc.page.width - 100, 30) // Visszaállítva az eredeti margókra
       .fill(colors.primary);

    const tableHeaders = ['Tétel', 'Mennyiség', 'Egységár', 'Összesen', 'Valuta'];
    // Újratervezett oszlopszélességek, hogy minden belférjen
    const tableColumnWidths = [240, 60, 60, 60, 40]; // Külön oszlop a valutának
    const columnPositions = [50];

    // Kiszámoljuk a pozíciókat
    for (let i = 1; i < tableHeaders.length; i++) {
      columnPositions.push(columnPositions[i - 1] + tableColumnWidths[i - 1]);
    }

    // Táblázat fejléc szöveg
    doc.font('Helvetica-Bold')
       .fillColor('white')
       .fontSize(10);

    tableHeaders.forEach((header, i) => {
      const position = columnPositions[i];
      // Különböző igazítás az oszlopoknak
      let align = 'left';
      if (i === 1 || i === 4) { // Mennyiség és Valuta középre
        align = 'center';
      } else if (i === 2 || i === 3) { // Egységár és Összesen jobbra
        align = 'right';
      }

      const padding = 10; // Egységes padding minden oszlopnál

      doc.text(header, position + padding, tableStartY + 10, {
        width: tableColumnWidths[i] - (padding * 2), // Egységes szélesség számítás
        align: align
      });
    });

    // Táblázat sorok
    let currentY = tableStartY + 30;
    let currentPage = 1;
    let rowBackground = true;

    invoice.items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        console.log(`Hibás tétel formátum a(z) ${index}. indexnél:`, item);
        return;
      }

      item.description = item.description || 'Nincs leírás';
      item.quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      item.unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      item.total = typeof item.total === 'number' ? item.total : 0;

      // Oldaltörés ellenőrzése
      if (currentY > 700) {
        doc.addPage();
        currentPage++;
        currentY = 50;

        // Új oldal fejléce - eredeti margókkal
        doc.rect(50, currentY, doc.page.width - 100, 30) // Visszaállítva az eredeti margókra
           .fill(colors.primary);

        doc.font('Helvetica-Bold')
           .fillColor('white')
           .fontSize(10);

        tableHeaders.forEach((header, i) => {
          const position = columnPositions[i];
          // Különböző igazítás az oszlopoknak
          let align = 'left';
          if (i === 1 || i === 4) { // Mennyiség és Valuta középre
            align = 'center';
          } else if (i === 2 || i === 3) { // Egységár és Összesen jobbra
            align = 'right';
          }

          const padding = 10; // Egységes padding minden oszlopnál

          doc.text(header, position + padding, currentY + 10, {
            width: tableColumnWidths[i] - (padding * 2), // Egységes szélesség számítás
            align: align
          });
        });

        currentY += 30;
        rowBackground = true;
      }

      // Zebra csíkos táblázat - eredeti margókkal
      if (rowBackground) {
        doc.rect(50, currentY, doc.page.width - 100, 25) // Visszaállítva az eredeti margókra
           .fill('#F9FAFB');
      }

      // Vékony elválasztó vonal minden sor után - eredeti margókkal
      doc.rect(50, currentY + 25, doc.page.width - 100, 0.5) // Visszaállítva az eredeti margókra
         .fill(colors.border);

      doc.font('Helvetica')
         .fillColor(colors.text)
         .fontSize(9);

      const currency = invoice.currency || 'EUR';
      const row = [
        item.description,
        item.quantity.toString(),
        item.unitPrice.toString(), // Csak a szám
        item.total.toString(), // Csak a szám
        currency // Külön oszlopban a valuta
      ];

      row.forEach((cell, i) => {
        const position = columnPositions[i];
        // Különböző igazítás az oszlopoknak
        let align = 'left';
        if (i === 1 || i === 4) { // Mennyiség és Valuta középre
          align = 'center';
        } else if (i === 2 || i === 3) { // Egységár és Összesen jobbra
          align = 'right';
        }

        const padding = 10; // Egységes padding minden oszlopnál

        doc.text(cell, position + padding, currentY + 8, {
          width: tableColumnWidths[i] - (padding * 2), // Egységes szélesség számítás
          align: align
        });
      });

      currentY += 25;
      rowBackground = !rowBackground;
    });

    // Összegzés és fizetési információk
    const summaryStartY = currentY + 20;

    // Fizetési információk
    doc.roundedRect(50, summaryStartY, 250, 120, 4)
       .fillAndStroke(colors.lightBlue, colors.border);

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor(colors.primary)
       .text('FIZETÉSI INFORMÁCIÓK', 65, summaryStartY + 15);

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(colors.text)
       .text('IBAN:', 65, summaryStartY + 40, { continued: true })
       .font('Helvetica-Bold')
       .text(' DE47 6634 0018 0473 4638 00')
       .font('Helvetica')
       .text('SWIFT/BIC:', 65, summaryStartY + 55, { continued: true })
       .font('Helvetica-Bold')
       .text(' COBADEFFXXX')
       .font('Helvetica')
       .text('Bank:', 65, summaryStartY + 70, { continued: true })
       .font('Helvetica-Bold')
       .text(' Commerzbank AG')
       .font('Helvetica')
       .text('Közlemény:', 65, summaryStartY + 85, { continued: true })
       .font('Helvetica-Bold')
       .text(` ${invoice.number}`);

    // Összegzés
    doc.roundedRect(350, summaryStartY, 220, 120, 4)
       .fillAndStroke(colors.lightBlue, colors.border);

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor(colors.primary)
       .text('ÖSSZEGZÉS', 365, summaryStartY + 15);

    // Részösszeg sor
    doc.font('Helvetica')
       .fillColor(colors.text)
       .fontSize(10)
       .text('Részösszeg:', 365, summaryStartY + 40, { width: 100, align: 'left' })
       .text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 465, summaryStartY + 40, { width: 90, align: 'right' });

    // ÁFA sor (ha van)
    doc.text('ÁFA (0%):', 365, summaryStartY + 60, { width: 100, align: 'left' })
       .text('0.00 EUR', 465, summaryStartY + 60, { width: 90, align: 'right' });

    // Végösszeg kiemelése
    doc.roundedRect(365, summaryStartY + 80, 190, 30, 4)
       .fill(colors.primary);

    // Végösszeg kiírása
    doc.font('Helvetica-Bold')
       .fillColor('white')
       .fontSize(12);
    doc.text('Végösszeg:', 375, summaryStartY + 90, { width: 100, align: 'left' });
    doc.text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 465, summaryStartY + 90, { width: 80, align: 'right' });

    // QR kód generálás eltávolítva

    // Lábléc - feljebb helyezve
    const footerTop = doc.page.height - 60;

    // Vékony vonal a lábléc tetején - eredeti margókkal
    doc.rect(50, footerTop - 5, doc.page.width - 100, 0.5) // Visszaállítva az eredeti margókra
       .fill(colors.border);

    // Lábléc szöveg és oldalszám egy sorban
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(colors.secondary);

    // Teljes lábléc szöveg egy sorban az oldalszámmal együtt
    const footerText = `Norbert Bartus | www.nb-studio.net | Ez a számla elektronikusan készült és érvényes aláírás nélkül is. | ${currentPage}. oldal`;
    doc.text(footerText, 50, footerTop, {
      align: 'center',
      width: doc.page.width - 100 // Visszaállítva az eredeti margókra
    });

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
    console.log('Számla frissítési kérés érkezett:', {
      projectId: req.params.projectId,
      invoiceId: req.params.invoiceId,
      body: req.body
    });

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      console.log('Projekt nem található:', req.params.projectId);
      return res.status(404).json({ message: 'Projekt nem található' });
    }

    console.log('Projekt megtalálva, számlák száma:', project.invoices?.length || 0);

    // Ellenőrizzük, hogy a számlák tömb létezik-e
    if (!project.invoices || !Array.isArray(project.invoices)) {
      console.log('A projekt nem tartalmaz számlákat vagy a számlák nem tömb formátumban vannak tárolva');
      return res.status(404).json({ message: 'A projekt nem tartalmaz számlákat' });
    }

    // Keressük meg a számlát ID alapján
    const invoice = project.invoices.id(req.params.invoiceId);
    if (!invoice) {
      console.log('Számla nem található ezzel az ID-val:', req.params.invoiceId);
      console.log('Elérhető számla ID-k:', project.invoices.map(inv => inv._id.toString()));
      return res.status(404).json({ message: 'Számla nem található' });
    }

    console.log('Számla megtalálva, jelenlegi státusz:', invoice.status);
    console.log('Frissítendő mezők:', req.body);

    // Frissítjük a számla mezőit
    Object.assign(invoice, req.body);

    // Ha a státusz fizetett, és nincs megadva fizetési dátum, akkor beállítjuk a mai dátumot
    if (req.body.status === 'fizetett' && !req.body.paidDate) {
      invoice.paidDate = new Date();
      console.log('Fizetési dátum automatikusan beállítva:', invoice.paidDate);
    }

    // Ha a státusz fizetett, és nincs megadva fizetett összeg, akkor beállítjuk a teljes összeget
    if (req.body.status === 'fizetett' && !req.body.paidAmount) {
      invoice.paidAmount = invoice.totalAmount;
      console.log('Fizetett összeg automatikusan beállítva:', invoice.paidAmount);
    }

    console.log('Számla frissítve, mentés előtt:', {
      status: invoice.status,
      paidAmount: invoice.paidAmount,
      paidDate: invoice.paidDate
    });

    // Mentjük a projektet a frissített számlával
    await project.save();
    console.log('Projekt sikeresen mentve a frissített számlával');

    // Visszaadjuk a frissített projektet
    res.json({
      success: true,
      message: 'Számla sikeresen frissítve',
      project: project
    });
  } catch (error) {
    console.error('Hiba a számla frissítésénél:', error);
    console.error('Hiba stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a számla frissítése során',
      error: error.message
    });
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
// Minden nap 00:00-kor és 12:00-kor lefut
cron.schedule('0 0,12 * * *', async () => {
  try {
    console.log('Ismétlődő számlák automatikus feldolgozása indul...');
    const count = await processRecurringInvoices();
    console.log(`Automatikus számlafeldolgozás befejezve, ${count} számla generálva`);
  } catch (error) {
    console.error('Hiba az automatikus számlafeldolgozás során:', error);
  }
});

export default router;