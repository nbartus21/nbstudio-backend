// server/services/invoiceReminderService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Project from '../models/Project.js';

dotenv.config();

// Környezeti változók ellenőrzése és alapértékek beállítása
const SMTP_HOST = process.env.SMTP_HOST || 'nb-hosting.hu';
const SMTP_PORT = process.env.SMTP_PORT || 25;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || 'noreply@nb-hosting.hu';
const SMTP_PASS = process.env.SMTP_PASS;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://project.nb-studio.net';

// Ellenőrizzük, hogy a kötelező környezeti változók be vannak-e állítva
if (!SMTP_USER || !SMTP_PASS) {
  console.error('Hiányzó környezeti változók! Ellenőrizd a .env fájlt:');
  console.error('- SMTP_USER: ' + (SMTP_USER ? 'OK' : 'HIÁNYZIK'));
  console.error('- SMTP_PASS: ' + (SMTP_PASS ? 'OK' : 'HIÁNYZIK'));
}

// SMTP beállítások a .env fájlból
const transporterConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
};

console.log('Számla emlékeztető szolgáltatás - SMTP Konfiguráció (jelszó nélkül):', {
  ...transporterConfig,
  auth: { user: SMTP_USER, pass: '******' }
});

// Nodemailer transporter létrehozása
let transporter;
try {
  transporter = nodemailer.createTransport(transporterConfig);

  // Teszteljük a kapcsolatot (aszinkron, nincs await, csak logolunk)
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP kapcsolat hiba a számla emlékeztető szolgáltatásban:', error);
    } else {
      console.log('SMTP szerver kapcsolat OK a számla emlékeztető szolgáltatásban, kész az emailek küldésére');
    }
  });
} catch (error) {
  console.error('Hiba a nodemailer transporter létrehozásakor a számla emlékeztető szolgáltatásban:', error);
}

// Fordítások a különböző nyelvekhez
const translations = {
  en: {
    subject: {
      overdue: 'OVERDUE: Invoice {invoiceNumber} payment is overdue',
      dueSoon: 'REMINDER: Invoice {invoiceNumber} payment due soon',
      new: 'New invoice {invoiceNumber} has been issued'
    },
    greeting: 'Dear {clientName},',
    overdueMessage: 'This is a friendly reminder that the payment for invoice {invoiceNumber} is overdue. The payment was due on {dueDate}.',
    dueSoonMessage: 'This is a friendly reminder that the payment for invoice {invoiceNumber} is due soon. The payment is due on {dueDate}.',
    newInvoiceMessage: 'A new invoice has been issued for your project. Please find the details below.',
    paymentDetails: 'Payment Details',
    invoiceNumber: 'Invoice Number',
    amount: 'Amount',
    dueDate: 'Due Date',
    paymentInstructions: 'Payment Instructions',
    bankTransfer: 'Bank Transfer',
    iban: 'IBAN',
    swift: 'SWIFT/BIC',
    bank: 'Bank',
    reference: 'Reference',
    viewInvoice: 'View Invoice',
    thankYou: 'Thank you for your business.',
    questions: 'If you have any questions, please don\'t hesitate to contact us.',
    regards: 'Best regards,',
    signature: 'Norbert Bartus',
    company: 'Norbert Bartus',
    vatExempt: 'VAT exempt according to § 19 Abs. 1 UStG.'
  },
  de: {
    subject: {
      overdue: 'ÜBERFÄLLIG: Zahlung für Rechnung {invoiceNumber} ist überfällig',
      dueSoon: 'ERINNERUNG: Zahlung für Rechnung {invoiceNumber} ist bald fällig',
      new: 'Neue Rechnung {invoiceNumber} wurde ausgestellt'
    },
    greeting: 'Sehr geehrte(r) {clientName},',
    overdueMessage: 'Dies ist eine freundliche Erinnerung, dass die Zahlung für die Rechnung {invoiceNumber} überfällig ist. Die Zahlung war fällig am {dueDate}.',
    dueSoonMessage: 'Dies ist eine freundliche Erinnerung, dass die Zahlung für die Rechnung {invoiceNumber} bald fällig ist. Die Zahlung ist fällig am {dueDate}.',
    newInvoiceMessage: 'Eine neue Rechnung wurde für Ihr Projekt ausgestellt. Die Details finden Sie unten.',
    paymentDetails: 'Zahlungsdetails',
    invoiceNumber: 'Rechnungsnummer',
    amount: 'Betrag',
    dueDate: 'Fälligkeitsdatum',
    paymentInstructions: 'Zahlungsanweisungen',
    bankTransfer: 'Banküberweisung',
    iban: 'IBAN',
    swift: 'SWIFT/BIC',
    bank: 'Bank',
    reference: 'Verwendungszweck',
    viewInvoice: 'Rechnung ansehen',
    thankYou: 'Vielen Dank für Ihr Vertrauen.',
    questions: 'Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
    regards: 'Mit freundlichen Grüßen,',
    signature: 'Norbert Bartus',
    company: 'Norbert Bartus',
    vatExempt: 'Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.'
  },
  hu: {
    subject: {
      overdue: 'LEJÁRT: A(z) {invoiceNumber} számú számla fizetési határideje lejárt',
      dueSoon: 'EMLÉKEZTETŐ: A(z) {invoiceNumber} számú számla fizetési határideje hamarosan lejár',
      new: 'Új számla kiállítva: {invoiceNumber}'
    },
    greeting: 'Tisztelt {clientName}!',
    overdueMessage: 'Ezúton szeretnénk emlékeztetni, hogy a(z) {invoiceNumber} számú számla fizetési határideje lejárt. A fizetési határidő {dueDate} volt.',
    dueSoonMessage: 'Ezúton szeretnénk emlékeztetni, hogy a(z) {invoiceNumber} számú számla fizetési határideje hamarosan lejár. A fizetési határidő: {dueDate}.',
    newInvoiceMessage: 'Új számlát állítottunk ki az Ön projektjéhez. A részleteket alább találja.',
    paymentDetails: 'Fizetési adatok',
    invoiceNumber: 'Számlaszám',
    amount: 'Összeg',
    dueDate: 'Fizetési határidő',
    paymentInstructions: 'Fizetési útmutató',
    bankTransfer: 'Banki átutalás',
    iban: 'IBAN',
    swift: 'SWIFT/BIC',
    bank: 'Bank',
    reference: 'Közlemény',
    viewInvoice: 'Számla megtekintése',
    thankYou: 'Köszönjük az együttműködést.',
    questions: 'Ha kérdése van, kérjük, forduljon hozzánk bizalommal.',
    regards: 'Üdvözlettel,',
    signature: 'Bartus Norbert',
    company: 'Bartus Norbert',
    vatExempt: 'Alanyi adómentes a § 19 Abs. 1 UStG. szerint.'
  }
};

// Dátum formázása a megfelelő nyelven
const formatDate = (date, language) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(
    language === 'hu' ? 'hu-HU' : (language === 'de' ? 'de-DE' : 'en-US'),
    options
  );
};

// Email HTML sablon generálása
const generateEmailTemplate = (invoice, project, type, language = 'hu') => {
  const t = translations[language] || translations.hu;
  const clientName = project.client?.name || 'Client';
  const dueDate = formatDate(invoice.dueDate, language);
  const invoiceNumber = invoice.number;
  const amount = `${invoice.totalAmount} ${invoice.currency || 'EUR'}`;
  const projectUrl = `https://project.nb-studio.net/shared-project/${project.shareId}`;

  let subject = '';
  let message = '';

  // Téma és üzenet beállítása a típus alapján
  if (type === 'overdue') {
    subject = t.subject.overdue.replace('{invoiceNumber}', invoiceNumber);
    message = t.overdueMessage.replace('{invoiceNumber}', invoiceNumber).replace('{dueDate}', dueDate);
  } else if (type === 'dueSoon') {
    subject = t.subject.dueSoon.replace('{invoiceNumber}', invoiceNumber);
    message = t.dueSoonMessage.replace('{invoiceNumber}', invoiceNumber).replace('{dueDate}', dueDate);
  } else if (type === 'new') {
    subject = t.subject.new.replace('{invoiceNumber}', invoiceNumber);
    message = t.newInvoiceMessage;
  }

  // HTML sablon
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="color: #3B82F6; margin-top: 0;">${subject}</h2>
        <p>${t.greeting.replace('{clientName}', clientName)}</p>
        <p>${message}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #4B5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">${t.paymentDetails}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; width: 40%;"><strong>${t.invoiceNumber}:</strong></td>
            <td style="padding: 8px 0;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>${t.amount}:</strong></td>
            <td style="padding: 8px 0;">${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>${t.dueDate}:</strong></td>
            <td style="padding: 8px 0;">${dueDate}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #4B5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">${t.paymentInstructions}</h3>
        <p><strong>${t.bankTransfer}:</strong></p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; width: 40%;"><strong>${t.iban}:</strong></td>
            <td style="padding: 4px 0;">DE47 6634 0018 0473 4638 00</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>${t.swift}:</strong></td>
            <td style="padding: 4px 0;">COBADEFFXXX</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>${t.bank}:</strong></td>
            <td style="padding: 4px 0;">Commerzbank AG</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>${t.reference}:</strong></td>
            <td style="padding: 4px 0;">${invoiceNumber}</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #6B7280; margin-top: 10px;">${t.vatExempt}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${projectUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          ${t.viewInvoice}
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 14px;">
        <p>${t.thankYou}</p>
        <p>${t.questions}</p>
        <p>${t.regards}</p>
        <p><strong>${t.signature}</strong><br>${t.company}</p>
      </div>
    </div>
  `;

  return { subject, html };
};

// Emlékeztető küldése egy adott számlához
export const sendInvoiceReminder = async (projectId, invoiceId, type = 'dueSoon', language = 'hu') => {
  try {
    // Projekt és számla lekérése
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Ellenőrizzük, hogy van-e email cím a projekthez
    if (!project.client?.email) {
      throw new Error('Client email not found');
    }

    // Email sablon generálása
    const { subject, html } = generateEmailTemplate(invoice, project, type, language);

    // Ellenőrizzük, hogy a transporter létezik-e
    if (!transporter) {
      console.error('A nodemailer transporter nincs konfigurálva');
      throw new Error('Email küldési szolgáltatás nincs megfelelően beállítva');
    }

    // Email küldése
    const mailOptions = {
      from: `"Norbert Bartus" <${SMTP_USER}>`,
      to: project.client.email,
      subject: subject,
      html: html
    };

    console.log('Számla emlékeztető email küldése megkísérlése...', {
      to: project.client.email,
      subject: subject,
      from: `"Norbert Bartus" <${SMTP_USER}>`
    });

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Számla emlékeztető email sikeresen elküldve:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (emailError) {
      console.error('Hiba a számla emlékeztető email küldésekor:', emailError);
      throw emailError;
    }
  } catch (error) {
    console.error('Error sending invoice reminder:', error);
    return { success: false, error: error.message };
  }
};

// Lejárt számlák ellenőrzése és emlékeztetők küldése
export const checkOverdueInvoices = async () => {
  try {
    const now = new Date();
    console.log(`Checking overdue invoices: ${now.toISOString()}`);

    // Keressük meg az összes projektet, amelyben van lejárt számla
    const projects = await Project.find({
      'invoices.status': { $nin: ['fizetett', 'paid', 'bezahlt', 'törölt', 'canceled', 'storniert'] },
      'invoices.dueDate': { $lt: now }
    });

    console.log(`Found ${projects.length} projects with overdue invoices`);

    let sentCount = 0;
    const results = [];

    // Projektenként végigmegyünk a számlákon és küldünk emlékeztetőt
    for (const project of projects) {
      // Projekt nyelve
      const language = project.language || 'hu';

      // Szűrjük ki a lejárt számlákat
      const overdueInvoices = project.invoices.filter(inv =>
        !['fizetett', 'paid', 'bezahlt', 'törölt', 'canceled', 'storniert'].includes(inv.status) &&
        new Date(inv.dueDate) < now
      );

      console.log(`Found ${overdueInvoices.length} overdue invoices in project ${project.name}`);

      // Minden lejárt számlához küldünk emlékeztetőt
      for (const invoice of overdueInvoices) {
        const result = await sendInvoiceReminder(project._id, invoice._id, 'overdue', language);
        results.push({
          projectId: project._id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.number,
          success: result.success
        });

        if (result.success) {
          sentCount++;
        }
      }
    }

    return { sentCount, results };
  } catch (error) {
    console.error('Error checking overdue invoices:', error);
    return { sentCount: 0, error: error.message };
  }
};

// Hamarosan lejáró számlák ellenőrzése és emlékeztetők küldése
export const checkDueSoonInvoices = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    console.log(`Checking invoices due soon: ${now.toISOString()}`);

    // Keressük meg az összes projektet, amelyben van hamarosan lejáró számla
    const projects = await Project.find({
      'invoices.status': { $nin: ['fizetett', 'paid', 'bezahlt', 'törölt', 'canceled', 'storniert'] },
      'invoices.dueDate': { $gte: now, $lte: threeDaysFromNow }
    });

    console.log(`Found ${projects.length} projects with invoices due soon`);

    let sentCount = 0;
    const results = [];

    // Projektenként végigmegyünk a számlákon és küldünk emlékeztetőt
    for (const project of projects) {
      // Projekt nyelve
      const language = project.language || 'hu';

      // Szűrjük ki a hamarosan lejáró számlákat
      const dueSoonInvoices = project.invoices.filter(inv =>
        !['fizetett', 'paid', 'bezahlt', 'törölt', 'canceled', 'storniert'].includes(inv.status) &&
        new Date(inv.dueDate) >= now && new Date(inv.dueDate) <= threeDaysFromNow
      );

      console.log(`Found ${dueSoonInvoices.length} invoices due soon in project ${project.name}`);

      // Minden hamarosan lejáró számlához küldünk emlékeztetőt
      for (const invoice of dueSoonInvoices) {
        const result = await sendInvoiceReminder(project._id, invoice._id, 'dueSoon', language);
        results.push({
          projectId: project._id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.number,
          success: result.success
        });

        if (result.success) {
          sentCount++;
        }
      }
    }

    return { sentCount, results };
  } catch (error) {
    console.error('Error checking invoices due soon:', error);
    return { sentCount: 0, error: error.message };
  }
};

// Új számla értesítés küldése
export const sendNewInvoiceNotification = async (projectId, invoiceId) => {
  try {
    // Projekt és számla lekérése
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Ellenőrizzük, hogy van-e email cím a projekthez
    if (!project.client?.email) {
      throw new Error('Client email not found');
    }

    // Projekt nyelve
    const language = project.language || 'hu';

    // Email küldése
    return await sendInvoiceReminder(projectId, invoiceId, 'new', language);
  } catch (error) {
    console.error('Error sending new invoice notification:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendInvoiceReminder,
  checkOverdueInvoices,
  checkDueSoonInvoices,
  sendNewInvoiceNotification
};
