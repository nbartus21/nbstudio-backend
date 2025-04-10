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
      new: 'New invoice {invoiceNumber} has been issued',
      firstReminder: 'PAYMENT REMINDER: Invoice {invoiceNumber} is past due',
      secondReminder: 'SECOND REMINDER: Invoice {invoiceNumber} requires immediate attention',
      finalReminder: 'FINAL NOTICE: Invoice {invoiceNumber} - Urgent payment required'
    },
    greeting: 'Dear {clientName},',
    overdueMessage: 'This is a friendly reminder that the payment for invoice {invoiceNumber} is overdue. The payment was due on {dueDate}.',
    dueSoonMessage: 'This is a friendly reminder that the payment for invoice {invoiceNumber} is due soon. The payment is due on {dueDate}.',
    newInvoiceMessage: 'A new invoice has been issued for your project. Please find the details below.',
    firstReminderMessage: 'We would like to remind you that invoice {invoiceNumber} is now past due. The payment was due on {dueDate}. Please arrange for payment at your earliest convenience.',
    secondReminderMessage: 'This is our second reminder that invoice {invoiceNumber} remains unpaid. The payment was due on {dueDate}. Please arrange for immediate payment to avoid any service interruptions.',
    finalReminderMessage: 'URGENT: Despite our previous reminders, invoice {invoiceNumber} remains unpaid. The payment was due on {dueDate}. Please be advised that failure to make payment within 7 days may result in service suspension or termination.',
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
      new: 'Neue Rechnung {invoiceNumber} wurde ausgestellt',
      firstReminder: 'ZAHLUNGSERINNERUNG: Rechnung {invoiceNumber} ist überfällig',
      secondReminder: 'ZWEITE MAHNUNG: Rechnung {invoiceNumber} erfordert sofortige Aufmerksamkeit',
      finalReminder: 'LETZTE MAHNUNG: Rechnung {invoiceNumber} - Dringende Zahlung erforderlich'
    },
    greeting: 'Sehr geehrte(r) {clientName},',
    overdueMessage: 'Dies ist eine freundliche Erinnerung, dass die Zahlung für die Rechnung {invoiceNumber} überfällig ist. Die Zahlung war fällig am {dueDate}.',
    dueSoonMessage: 'Dies ist eine freundliche Erinnerung, dass die Zahlung für die Rechnung {invoiceNumber} bald fällig ist. Die Zahlung ist fällig am {dueDate}.',
    newInvoiceMessage: 'Eine neue Rechnung wurde für Ihr Projekt ausgestellt. Die Details finden Sie unten.',
    firstReminderMessage: 'Wir möchten Sie daran erinnern, dass die Rechnung {invoiceNumber} überfällig ist. Die Zahlung war fällig am {dueDate}. Bitte veranlassen Sie die Zahlung so bald wie möglich.',
    secondReminderMessage: 'Dies ist unsere zweite Mahnung, dass die Rechnung {invoiceNumber} noch unbezahlt ist. Die Zahlung war fällig am {dueDate}. Bitte veranlassen Sie die sofortige Zahlung, um Serviceunterbrechungen zu vermeiden.',
    finalReminderMessage: 'DRINGEND: Trotz unserer vorherigen Mahnungen bleibt die Rechnung {invoiceNumber} unbezahlt. Die Zahlung war fällig am {dueDate}. Bitte beachten Sie, dass bei Nichtzahlung innerhalb von 7 Tagen der Service ausgesetzt oder beendet werden kann.',
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
      new: 'Új számla kiállítva: {invoiceNumber}',
      firstReminder: 'FIZETÉSI EMLÉKEZTETŐ: A(z) {invoiceNumber} számú számla fizetési határideje lejárt',
      secondReminder: 'MÁSODIK FELSZÓLÍTÁS: A(z) {invoiceNumber} számú számla azonnali fizetést igényel',
      finalReminder: 'VÉGSŐ FELSZÓLÍTÁS: A(z) {invoiceNumber} számú számla - Sürgős fizetés szükséges'
    },
    greeting: 'Tisztelt {clientName}!',
    overdueMessage: 'Ezúton szeretnénk emlékeztetni, hogy a(z) {invoiceNumber} számú számla fizetési határideje lejárt. A fizetési határidő {dueDate} volt.',
    dueSoonMessage: 'Ezúton szeretnénk emlékeztetni, hogy a(z) {invoiceNumber} számú számla fizetési határideje hamarosan lejár. A fizetési határidő: {dueDate}.',
    newInvoiceMessage: 'Új számlát állítottunk ki az Ön projektjéhez. A részleteket alább találja.',
    firstReminderMessage: 'Ezúton szeretnénk emlékeztetni, hogy a(z) {invoiceNumber} számú számla fizetési határideje lejárt. A fizetési határidő {dueDate} volt. Kérjük, intézkedjen a számla kiegyenlítéséről a lehető leghamarabb.',
    secondReminderMessage: 'Ez a második felszólításunk a(z) {invoiceNumber} számú számla ügyében, amely még mindig kiegyenlítetlen. A fizetési határidő {dueDate} volt. Kérjük, intézkedjen a számla azonnali kiegyenlítéséről, hogy elkerülje a szolgáltatás felfüggesztését.',
    finalReminderMessage: 'SÜRGŐS: Korábbi emlékeztetőink ellenére a(z) {invoiceNumber} számú számla még mindig kiegyenlítetlen. A fizetési határidő {dueDate} volt. Tájékoztatjuk, hogy amennyiben 7 napon belül nem történik meg a fizetés, a szolgáltatást felfüggeszthetjük vagy megszüntethetjük.',

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
  } else if (type === 'firstReminder') {
    subject = t.subject.firstReminder.replace('{invoiceNumber}', invoiceNumber);
    message = t.firstReminderMessage.replace('{invoiceNumber}', invoiceNumber).replace('{dueDate}', dueDate);
  } else if (type === 'secondReminder') {
    subject = t.subject.secondReminder.replace('{invoiceNumber}', invoiceNumber);
    message = t.secondReminderMessage.replace('{invoiceNumber}', invoiceNumber).replace('{dueDate}', dueDate);
  } else if (type === 'finalReminder') {
    subject = t.subject.finalReminder.replace('{invoiceNumber}', invoiceNumber);
    message = t.finalReminderMessage.replace('{invoiceNumber}', invoiceNumber).replace('{dueDate}', dueDate);
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
  console.log('sendInvoiceReminder hívás:', { projectId, invoiceId, type, language });
  try {
    // Projekt és számla lekérése
    console.log('Projekt lekérése sendInvoiceReminder-ben:', projectId);
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('Projekt nem található sendInvoiceReminder-ben:', projectId);
      throw new Error('Project not found');
    }
    console.log('Projekt megtalálva sendInvoiceReminder-ben:', {
      projectId: project._id,
      projectName: project.name,
      clientName: project.client?.name,
      clientEmail: project.client?.email
    });

    console.log('Számla keresése a projektben sendInvoiceReminder-ben:', invoiceId);
    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      console.error('Számla nem található a projektben sendInvoiceReminder-ben:', { projectId, invoiceId });
      throw new Error('Invoice not found');
    }
    console.log('Számla megtalálva sendInvoiceReminder-ben:', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.number,
      amount: invoice.totalAmount,
      status: invoice.status
    });

    // Ellenőrizzük, hogy van-e email cím a projekthez
    if (!project.client?.email) {
      console.error('Nincs email cím a projekthez sendInvoiceReminder-ben:', {
        projectId,
        clientName: project.client?.name
      });
      throw new Error('Client email not found');
    }
    console.log('Kliens email cím megtalálva sendInvoiceReminder-ben:', project.client.email);

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
      console.log('transporter.sendMail hívása a következő paraméterekkel:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      // Teszteljük a kapcsolatot küldés előtt
      console.log('SMTP kapcsolat tesztelése küldés előtt...');
      const verifyResult = await new Promise((resolve) => {
        transporter.verify((error, success) => {
          if (error) {
            console.error('SMTP kapcsolat hiba a küldés előtt:', error);
            resolve({ success: false, error });
          } else {
            console.log('SMTP kapcsolat OK a küldés előtt');
            resolve({ success: true });
          }
        });
      });

      if (!verifyResult.success) {
        throw new Error(`SMTP kapcsolat hiba: ${verifyResult.error.message}`);
      }

      // Email küldése
      console.log('Email küldése megkezdődik...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Számla emlékeztető email sikeresen elküldve:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });
      return { success: true, messageId: info.messageId, info };
    } catch (emailError) {
      console.error('Hiba a számla emlékeztető email küldésekor:', {
        error: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
        command: emailError.command
      });
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
        // Határozzuk meg, hogy milyen típusú emlékeztetőt küldjünk a lejárat óta eltelt idő alapján
        const daysOverdue = Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
        let reminderType = 'overdue';

        // 1-2 nap késés: első emlékeztető
        if (daysOverdue <= 2) {
          reminderType = 'firstReminder';
        }
        // 3-9 nap késés: második felszólítás
        else if (daysOverdue <= 9) {
          reminderType = 'secondReminder';
        }
        // 10+ nap késés: végső felszólítás
        else {
          reminderType = 'finalReminder';
        }

        // Ellenőrizzük, hogy küldtünk-e már ilyen típusú emlékeztetőt ehhez a számlához
        const lastReminder = invoice.reminders?.find(r => r.type === reminderType);

        // Ha még nem küldtünk ilyen típusú emlékeztetőt, vagy az utolsó küldés óta eltelt legalább 7 nap
        if (!lastReminder || (now - new Date(lastReminder.sentAt) > 7 * 24 * 60 * 60 * 1000)) {
          const result = await sendInvoiceReminder(project._id, invoice._id, reminderType, language);

          // Ha sikeres volt a küldés, mentsük el az emlékeztető adatait
          if (result.success) {
            // Ha még nincs reminders tömb, hozzuk létre
            if (!invoice.reminders) {
              await Invoice.updateOne(
                { _id: invoice._id },
                { $set: { reminders: [] } }
              );
            }

            // Adjuk hozzá az új emlékeztetőt
            await Invoice.updateOne(
              { _id: invoice._id },
              { $push: { reminders: { type: reminderType, sentAt: now } } }
            );

            sentCount++;
          }

          results.push({
            projectId: project._id,
            invoiceId: invoice._id,
            invoiceNumber: invoice.number,
            reminderType,
            success: result.success
          });
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
  console.log('sendNewInvoiceNotification hívás kezdete:', { projectId, invoiceId });
  try {
    // Projekt és számla lekérése
    console.log('Projekt lekérése:', projectId);
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('Projekt nem található:', projectId);
      throw new Error('Project not found');
    }
    console.log('Projekt megtalálva:', {
      projectId: project._id,
      projectName: project.name,
      clientName: project.client?.name,
      clientEmail: project.client?.email,
      language: project.language
    });

    console.log('Számla keresése a projektben:', invoiceId);
    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      console.error('Számla nem található a projektben:', { projectId, invoiceId });
      throw new Error('Invoice not found');
    }
    console.log('Számla megtalálva:', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.number,
      amount: invoice.totalAmount,
      status: invoice.status,
      dueDate: invoice.dueDate
    });

    // Ellenőrizzük, hogy van-e email cím a projekthez
    if (!project.client?.email) {
      console.error('Nincs email cím a projekthez:', {
        projectId,
        clientName: project.client?.name
      });
      throw new Error('Client email not found');
    }
    console.log('Kliens email cím megtalálva:', project.client.email);

    // Projekt nyelve
    const language = project.language || 'hu';
    console.log('Használt nyelv:', language);

    // Email küldése
    console.log('Email küldés megkísérlése sendInvoiceReminder hívásával...');
    const result = await sendInvoiceReminder(projectId, invoiceId, 'new', language);
    console.log('sendInvoiceReminder eredménye:', result);
    return result;
  } catch (error) {
    console.error('Hiba az új számla értesítés küldésekor:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendInvoiceReminder,
  checkOverdueInvoices,
  checkDueSoonInvoices,
  sendNewInvoiceNotification
};
