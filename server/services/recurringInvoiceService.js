import mongoose from 'mongoose';
import Project from '../models/Project.js';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ez a szolgáltatás kezeli az ismétlődő számlák automatikus létrehozását
class RecurringInvoiceService {

  // Inicializálás
  constructor() {
    this.isRunning = false;
    this.emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || ''
      }
    };
    this.transporter = nodemailer.createTransport(this.emailConfig);
  }

  // Minden aktív ismétlődő számla ellenőrzése
  async checkAllRecurringInvoices() {
    if (this.isRunning) {
      console.log('Az ismétlődő számlák ellenőrzése már fut');
      return;
    }

    console.log('Ismétlődő számlák ellenőrzése kezdődik...');
    this.isRunning = true;
    
    try {
      // Összes projekt lekérése, amelyben van aktív ismétlődő számla
      const projects = await Project.find({
        'recurringInvoices.isActive': true,
        'status': { $ne: 'törölt' } // Kihagyjuk a törölt projekteket
      });

      console.log(`${projects.length} projekt van aktív ismétlődő számlákkal`);
      
      const now = new Date();
      let generatedCount = 0;
      let reminderCount = 0;

      // Minden projektre ellenőrizzük az ismétlődő számlákat
      for (const project of projects) {
        if (!project.recurringInvoices || project.recurringInvoices.length === 0) {
          continue;
        }

        // Minden ismétlődő számlát ellenőrzünk
        for (const recurringInvoice of project.recurringInvoices) {
          if (!recurringInvoice.isActive) {
            continue;
          }

          // Ellenőrizzük a végdátumot
          if (recurringInvoice.endDate && new Date(recurringInvoice.endDate) < now) {
            recurringInvoice.isActive = false;
            continue;
          }

          // Ellenőrizzük, hogy elértük-e a maximális ismétlésszámot
          if (recurringInvoice.totalOccurrences && 
              recurringInvoice.currentOccurrence >= recurringInvoice.totalOccurrences) {
            recurringInvoice.isActive = false;
            continue;
          }

          // Ellenőrizzük, hogy elérkezett-e a következő számla generálásának ideje
          if (recurringInvoice.nextInvoiceDate && new Date(recurringInvoice.nextInvoiceDate) <= now) {
            // Számla generálása
            await this.generateInvoice(project, recurringInvoice);
            generatedCount++;
          } 
          // Ellenőrizzük az emlékeztetőket
          else if (recurringInvoice.emailNotification && 
                   recurringInvoice.nextInvoiceDate && 
                   recurringInvoice.reminderDays && 
                   recurringInvoice.reminderDays.length > 0) {
            // Több emlékeztető napot is kezelünk
            for (const reminderDay of recurringInvoice.reminderDays) {
              const reminderDate = new Date(recurringInvoice.nextInvoiceDate);
              reminderDate.setDate(reminderDate.getDate() - reminderDay);
              
              if (reminderDate <= now && 
                  (!recurringInvoice.lastReminderSent || 
                   new Date(recurringInvoice.lastReminderSent) < reminderDate)) {
                // Emlékeztető küldése
                await this.sendReminderEmail(project, recurringInvoice, reminderDay);
                recurringInvoice.lastReminderSent = now;
                reminderCount++;
              }
            }
          }
        }

        // Mentjük a projekt változásait (csak ha volt változás)
        if (project.isModified()) {
          await project.save();
        }
      }

      console.log(`Automatikus számlázás befejezve: ${generatedCount} számla generálva, ${reminderCount} emlékeztető kiküldve`);
    } catch (error) {
      console.error('Hiba az ismétlődő számlák ellenőrzésekor:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Számla generálása ismétlődő számla alapján
  async generateInvoice(project, recurringInvoice) {
    try {
      console.log(`Ismétlődő számla generálása: ${recurringInvoice.name}, projektID: ${project._id}, recurringID: ${recurringInvoice._id}`);
      
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
      
      // Frissítjük az ismétlődő számla adatait
      recurringInvoice.lastInvoiceDate = now;
      recurringInvoice.currentOccurrence += 1;
      recurringInvoice.nextInvoiceDate = this.calculateNextInvoiceDate(
        recurringInvoice.lastInvoiceDate,
        recurringInvoice.frequency,
        recurringInvoice.interval
      );
      
      // Ellenőrizzük, hogy elértük-e a maximális ismétlésszámot
      if (recurringInvoice.totalOccurrences && 
          recurringInvoice.currentOccurrence >= recurringInvoice.totalOccurrences) {
        recurringInvoice.isActive = false;
      }

      // Ha automatikus küldés be van kapcsolva, küldjük el a számlát
      if (recurringInvoice.autoSend && project.client && project.client.email) {
        await this.sendInvoiceEmail(project, newInvoice);
      }

      console.log(`Számla sikeresen generálva: ${invoiceNumber}`);
      return newInvoice;
    } catch (error) {
      console.error('Hiba a számla generálásakor:', error);
      throw error;
    }
  }

  // Következő számlázási dátum kiszámítása
  calculateNextInvoiceDate(fromDate, frequency, interval = 1) {
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

  // Email küldése számla csatolmánnyal
  async sendInvoiceEmail(project, invoice) {
    if (!project.client || !project.client.email) {
      console.log('Nem lehet emailt küldeni: hiányzó ügyfél email cím');
      return;
    }

    try {
      // Email küldés inicializálása
      const transporter = nodemailer.createTransport(this.emailConfig);
      
      // Email sablon betöltése vagy alapértelmezett használata
      let emailTemplate = this.getDefaultInvoiceEmailTemplate();
      
      // Adatok behelyettesítése a sablonba
      const emailHtml = emailTemplate
        .replace('{{CLIENT_NAME}}', project.client.name)
        .replace('{{INVOICE_NUMBER}}', invoice.number)
        .replace('{{INVOICE_DATE}}', new Date(invoice.date).toLocaleDateString('hu-HU'))
        .replace('{{DUE_DATE}}', new Date(invoice.dueDate).toLocaleDateString('hu-HU'))
        .replace('{{TOTAL_AMOUNT}}', `${invoice.totalAmount} EUR`)
        .replace('{{PROJECT_NAME}}', project.name);
      
      // Email küldése
      await transporter.sendMail({
        from: `"NB Studio" <${this.emailConfig.auth.user}>`,
        to: project.client.email,
        subject: `Számla: ${invoice.number} - NB Studio`,
        html: emailHtml,
        // Itt lehetne a generált PDF-et csatolni, ha szükséges
      });
      
      console.log(`Számla email elküldve: ${invoice.number} - ${project.client.email}`);
    } catch (error) {
      console.error('Hiba a számla email küldésekor:', error);
    }
  }

  // Emlékeztető küldése közelgő számlagenerálásról
  async sendReminderEmail(project, recurringInvoice, daysLeft) {
    if (!project.client || !project.client.email) {
      console.log('Nem lehet emlékeztetőt küldeni: hiányzó ügyfél email cím');
      return;
    }

    try {
      // Email sablon betöltése vagy alapértelmezett használata
      let emailTemplate = this.getDefaultReminderEmailTemplate();
      
      // Adatok behelyettesítése a sablonba
      const emailHtml = emailTemplate
        .replace('{{CLIENT_NAME}}', project.client.name)
        .replace('{{INVOICE_NAME}}', recurringInvoice.name)
        .replace('{{NEXT_INVOICE_DATE}}', new Date(recurringInvoice.nextInvoiceDate).toLocaleDateString('hu-HU'))
        .replace('{{TOTAL_AMOUNT}}', `${recurringInvoice.totalAmount} EUR`)
        .replace('{{PROJECT_NAME}}', project.name)
        .replace('{{DAYS_LEFT}}', daysLeft || '');  // Hány nap van hátra a számla generálásáig
      
      // Email küldése
      await this.transporter.sendMail({
        from: `"NB Studio" <${this.emailConfig.auth.user}>`,
        to: project.client.email,
        subject: `Emlékeztető: Közelgő automatikus számlázás - NB Studio`,
        html: emailHtml
      });
      
      console.log(`Emlékeztető email elküldve: ${recurringInvoice.name} - ${project.client.email} (${daysLeft} nappal a generálás előtt)`);
    } catch (error) {
      console.error('Hiba az emlékeztető email küldésekor:', error);
    }
  }

  // Alapértelmezett számla email sablon
  getDefaultInvoiceEmailTemplate() {
    return `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Új számla érkezett</h1>
          </div>
          <div class="content">
            <p>Tisztelt {{CLIENT_NAME}}!</p>
            <p>Ezúton tájékoztatjuk, hogy elkészült az Ön legújabb számlája.</p>
            <p><strong>Számla adatok:</strong></p>
            <ul>
              <li>Számlaszám: {{INVOICE_NUMBER}}</li>
              <li>Kiállítás dátuma: {{INVOICE_DATE}}</li>
              <li>Fizetési határidő: {{DUE_DATE}}</li>
              <li>Végösszeg: {{TOTAL_AMOUNT}}</li>
              <li>Projekt: {{PROJECT_NAME}}</li>
            </ul>
            <p>A számla megtekinthető és letölthető a kliens felületen.</p>
            <p style="text-align: center; margin-top: 20px;">
              <a href="https://nb-studio.net/login" class="button">Belépés a rendszerbe</a>
            </p>
            <p>Amennyiben kérdése van a számlával kapcsolatban, kérjük, vegye fel velünk a kapcsolatot!</p>
            <p>Köszönettel,<br>NB Studio Csapata</p>
          </div>
          <div class="footer">
            <p>Ez egy automatikusan generált üzenet. Kérjük, ne válaszoljon rá!</p>
            <p>&copy; NB Studio</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Alapértelmezett emlékeztető email sablon
  getDefaultReminderEmailTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Emlékeztető: Közelgő automatikus számlázás</h1>
          </div>
          <div class="content">
            <p>Tisztelt {{CLIENT_NAME}}!</p>
            <p>Ezúton tájékoztatjuk, hogy az ismétlődő számlázási beállítások alapján hamarosan ({{DAYS_LEFT}} nap múlva) automatikusan kiállítunk egy új számlát Önnek.</p>
            <p><strong>Várható számla adatok:</strong></p>
            <ul>
              <li>Számla neve: {{INVOICE_NAME}}</li>
              <li>Várható kiállítás: {{NEXT_INVOICE_DATE}}</li>
              <li>Várható összeg: {{TOTAL_AMOUNT}}</li>
              <li>Projekt: {{PROJECT_NAME}}</li>
            </ul>
            <p>Amennyiben módosítani szeretné a számlázási beállításokat, kérjük, vegye fel velünk a kapcsolatot még a fenti dátum előtt!</p>
            <p>Köszönettel,<br>NB Studio Csapata</p>
          </div>
          <div class="footer">
            <p>Ez egy automatikusan generált üzenet. Kérjük, ne válaszoljon rá!</p>
            <p>&copy; ${new Date().getFullYear()} NB Studio</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async generateInvoiceNumber() {
    const Project = mongoose.model('Project');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Keressük meg az utolsó számlát a rendszerben
    const lastProject = await Project.findOne().sort({ 'invoices.number': -1 }).select('invoices.number');
    
    let sequenceNumber = 1;
    
    if (lastProject && lastProject.invoices && lastProject.invoices.length > 0) {
      const lastInvoice = lastProject.invoices.sort((a, b) => {
        const numA = parseInt(a.number.split('-')[2] || '0');
        const numB = parseInt(b.number.split('-')[2] || '0');
        return numB - numA;
      })[0];
      
      if (lastInvoice && lastInvoice.number) {
        const lastNumberParts = lastInvoice.number.split('-');
        if (lastNumberParts.length === 3) {
          const lastYear = lastNumberParts[0];
          const lastMonth = lastNumberParts[1];
          
          if (lastYear === year.toString() && lastMonth === month) {
            sequenceNumber = parseInt(lastNumberParts[2] || '0') + 1;
          }
        }
      }
    }
    
    return `${year}-${month}-${String(sequenceNumber).padStart(4, '0')}`;
  }

  async generatePDF(project, invoice) {
    try {
      const invoiceId = invoice._id;
      const uploadDir = path.join(__dirname, '..', 'uploads', 'invoices');
      
      // Ellenőrizzük, hogy létezik-e a mappa, ha nem, akkor létrehozzuk
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const pdfPath = path.join(uploadDir, `${invoiceId}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      
      // Létrehozzuk a PDF fájlt
      const pdfStream = fs.createWriteStream(pdfPath);
      doc.pipe(pdfStream);
      
      // PDF generálás a számla adatai alapján
      // Fejléc
      doc.fontSize(20).text('SZÁMLA', { align: 'center' });
      doc.moveDown();
      
      // Számla adatok
      doc.fontSize(12);
      doc.text(`Számla sorszáma: ${invoice.number}`);
      doc.text(`Kiállítás dátuma: ${new Date(invoice.date).toLocaleDateString('hu-HU')}`);
      doc.text(`Fizetési határidő: ${new Date(invoice.dueDate).toLocaleDateString('hu-HU')}`);
      doc.moveDown();
      
      // Szolgáltató adatok
      doc.fontSize(14).text('Szolgáltató:', { underline: true });
      doc.fontSize(12);
      doc.text('NB Studio');
      doc.text('Példa utca 123.');
      doc.text('1111 Budapest');
      doc.text('Adószám: 12345678-1-41');
      doc.moveDown();
      
      // Ügyfél adatok
      doc.fontSize(14).text('Ügyfél:', { underline: true });
      doc.fontSize(12);
      doc.text(project.client.name);
      doc.text(project.client.address || '');
      doc.text(project.client.taxNumber || '');
      doc.moveDown();
      
      // Számla tételek táblázat
      doc.fontSize(14).text('Számla tételek:', { underline: true });
      doc.moveDown();
      
      // Táblázat fejléc
      let yPos = doc.y;
      doc.fontSize(12);
      doc.text('Tétel megnevezése', 50, yPos);
      doc.text('Mennyiség', 300, yPos);
      doc.text('Egységár', 380, yPos);
      doc.text('Összesen', 480, yPos);
      
      // Vonal a fejléc után
      yPos += 20;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;
      
      // Tételek
      invoice.items.forEach(item => {
        doc.text(item.name, 50, yPos);
        doc.text(item.quantity.toString(), 300, yPos);
        doc.text(`${item.unitPrice.toLocaleString('hu-HU')} ${project.financial.currency}`, 380, yPos);
        doc.text(`${(item.quantity * item.unitPrice).toLocaleString('hu-HU')} ${project.financial.currency}`, 480, yPos);
        yPos += 20;
      });
      
      // Vonal a tételek után
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;
      
      // Végösszeg
      doc.text('Végösszeg:', 380, yPos);
      doc.text(`${invoice.totalAmount.toLocaleString('hu-HU')} ${project.financial.currency}`, 480, yPos);
      
      // Megjegyzések
      if (invoice.notes) {
        doc.moveDown(2);
        doc.fontSize(14).text('Megjegyzések:', { underline: true });
        doc.fontSize(12).text(invoice.notes);
      }
      
      // Lábléc
      doc.moveDown(2);
      doc.fontSize(10).text('Ez a számla elektronikusan került kiállításra és aláírás nélkül is érvényes.', { align: 'center' });
      
      // PDF lezárása
      doc.end();
      
      return new Promise((resolve, reject) => {
        pdfStream.on('finish', () => {
          console.log(`PDF sikeresen generálva: ${pdfPath}`);
          resolve(pdfPath);
        });
        pdfStream.on('error', (error) => {
          console.error('Hiba a PDF generálásakor:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Hiba a PDF generálásakor:', error);
      throw error;
    }
  }
}

// Service példány exportálása
const recurringInvoiceService = new RecurringInvoiceService();
export default recurringInvoiceService; 