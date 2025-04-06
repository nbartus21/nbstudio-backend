import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Környezeti változók betöltése
dotenv.config();

// SMTP beállítások a .env fájlból
const CONTACT_SMTP_HOST = process.env.CONTACT_SMTP_HOST || process.env.SMTP_HOST || 'nb-hosting.hu';
const CONTACT_SMTP_PORT = process.env.CONTACT_SMTP_PORT || process.env.SMTP_PORT || 25;
const CONTACT_SMTP_SECURE = process.env.CONTACT_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true';
const CONTACT_SMTP_USER = process.env.CONTACT_SMTP_USER || process.env.SMTP_USER || 'kontakt@nb-studio.net';
const CONTACT_SMTP_PASS = process.env.CONTACT_SMTP_PASS || process.env.SMTP_PASS;

// Ellenőrizzük, hogy a kötelező környezeti változók be vannak-e állítva
if (!CONTACT_SMTP_USER || !CONTACT_SMTP_PASS) {
  console.error('Hiányzó környezeti változók a számla e-mail szolgáltatáshoz! Ellenőrizd a .env fájlt:');
  console.error('- CONTACT_SMTP_USER vagy SMTP_USER: ' + (CONTACT_SMTP_USER ? 'OK' : 'HIÁNYZIK'));
  console.error('- CONTACT_SMTP_PASS vagy SMTP_PASS: ' + (CONTACT_SMTP_PASS ? 'OK' : 'HIÁNYZIK'));
}

// SMTP beállítások
const transporterConfig = {
  host: CONTACT_SMTP_HOST,
  port: CONTACT_SMTP_PORT,
  secure: CONTACT_SMTP_SECURE,
  auth: {
    user: CONTACT_SMTP_USER,
    pass: CONTACT_SMTP_PASS
  }
};

console.log('Számla e-mail szolgáltatás - SMTP Konfiguráció (jelszó nélkül):', {
  ...transporterConfig,
  auth: { user: CONTACT_SMTP_USER, pass: '******' }
});

// Nodemailer transporter létrehozása
let transporter;
try {
  console.log('[DEBUG-INVOICE-EMAIL] Nodemailer transporter létrehozása a számla e-mail szolgáltatáshoz');
  console.log('[DEBUG-INVOICE-EMAIL] SMTP konfiguráció:', {
    host: transporterConfig.host,
    port: transporterConfig.port,
    secure: transporterConfig.secure,
    auth: { user: transporterConfig.auth.user, pass: '******' }
  });

  transporter = nodemailer.createTransport(transporterConfig);

  // Teszteljük a kapcsolatot (aszinkron, nincs await, csak logolunk)
  console.log('[DEBUG-INVOICE-EMAIL] SMTP kapcsolat tesztelése...');
  transporter.verify((error) => {
    if (error) {
      console.error('[DEBUG-INVOICE-EMAIL] SMTP kapcsolat HIBA a számla e-mail szolgáltatásban:', {
        error: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response,
        stack: error.stack
      });
    } else {
      console.log('[DEBUG-INVOICE-EMAIL] SMTP szerver kapcsolat OK a számla e-mail szolgáltatásban, kész az emailek küldésére');
    }
  });
} catch (error) {
  console.error('[DEBUG-INVOICE-EMAIL] Hiba a nodemailer transporter létrehozásakor a számla e-mail szolgáltatásban:', {
    error: error.message,
    stack: error.stack,
    code: error.code
  });
}

// Számla státusz fordítása különböző nyelvekre
const translateInvoiceStatus = (status, language) => {
  const statusTranslations = {
    'pending': {
      'hu': 'függőben',
      'en': 'pending',
      'de': 'ausstehend'
    },
    'paid': {
      'hu': 'fizetve',
      'en': 'paid',
      'de': 'bezahlt'
    },
    'overdue': {
      'hu': 'lejárt',
      'en': 'overdue',
      'de': 'überfällig'
    },
    'cancelled': {
      'hu': 'törölve',
      'en': 'cancelled',
      'de': 'storniert'
    }
  };

  return statusTranslations[status]?.[language] || status;
};

// Dátum formázása különböző nyelvekre
const formatDate = (dateString, language) => {
  const date = new Date(dateString);

  switch (language) {
    case 'en':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'de':
      return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'hu':
    default:
      return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  }
};

// Pénznem formázása
const formatCurrency = (amount, currency) => {
  const formatter = new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2
  });

  return formatter.format(amount);
};

// E-mail sablon generálása különböző nyelveken
const generateEmailTemplate = (invoice, project, language = 'hu') => {
  // Alapértelmezett magyar sablon
  let subject = `Új számla: ${invoice.number} - ${project.name}`;
  let greeting = `Kedves ${project.client.name}!`;
  let intro = `Új számla készült az Ön részére a következő projekthez: ${project.name}`;
  let invoiceInfo = `Számla száma: ${invoice.number}`;
  let dateInfo = `Kiállítás dátuma: ${formatDate(invoice.date, language)}`;
  let dueInfo = `Fizetési határidő: ${formatDate(invoice.dueDate, language)}`;
  let amountInfo = `Fizetendő összeg: ${formatCurrency(invoice.amount, invoice.currency)}`;
  let statusInfo = `Státusz: ${translateInvoiceStatus(invoice.status, language)}`;
  let viewInfo = 'A számla részleteit megtekintheti és letöltheti a projekt oldalán:';
  let linkText = 'Számla megtekintése';
  let helpText = 'Ha kérdése van a számlával kapcsolatban, kérjük, vegye fel a kapcsolatot velünk.';
  let signature = 'Üdvözlettel,<br>Norbert Bartus<br>NB Studio';

  // Angol sablon
  if (language === 'en') {
    subject = `New Invoice: ${invoice.number} - ${project.name}`;
    greeting = `Dear ${project.client.name},`;
    intro = `A new invoice has been created for you regarding the project: ${project.name}`;
    invoiceInfo = `Invoice number: ${invoice.number}`;
    dateInfo = `Issue date: ${formatDate(invoice.date, language)}`;
    dueInfo = `Due date: ${formatDate(invoice.dueDate, language)}`;
    amountInfo = `Amount due: ${formatCurrency(invoice.amount, invoice.currency)}`;
    statusInfo = `Status: ${translateInvoiceStatus(invoice.status, language)}`;
    viewInfo = 'You can view and download the invoice details on the project page:';
    linkText = 'View Invoice';
    helpText = 'If you have any questions about this invoice, please contact us.';
    signature = 'Best regards,<br>Norbert Bartus<br>NB Studio';
  }

  // Német sablon
  else if (language === 'de') {
    subject = `Neue Rechnung: ${invoice.number} - ${project.name}`;
    greeting = `Sehr geehrte(r) ${project.client.name},`;
    intro = `Eine neue Rechnung wurde für Sie erstellt für das Projekt: ${project.name}`;
    invoiceInfo = `Rechnungsnummer: ${invoice.number}`;
    dateInfo = `Ausstellungsdatum: ${formatDate(invoice.date, language)}`;
    dueInfo = `Fälligkeitsdatum: ${formatDate(invoice.dueDate, language)}`;
    amountInfo = `Zu zahlender Betrag: ${formatCurrency(invoice.amount, invoice.currency)}`;
    statusInfo = `Status: ${translateInvoiceStatus(invoice.status, language)}`;
    viewInfo = 'Sie können die Rechnungsdetails auf der Projektseite einsehen und herunterladen:';
    linkText = 'Rechnung ansehen';
    helpText = 'Bei Fragen zu dieser Rechnung kontaktieren Sie uns bitte.';
    signature = 'Mit freundlichen Grüßen,<br>Norbert Bartus<br>NB Studio';
  }

  // Projekt link generálása
  const projectLink = `https://project.nb-studio.net/shared-project/${project.sharing?.token}`;

  // HTML sablon összeállítása
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 20px; border-radius: 8px; color: white;">
          <h1 style="margin: 0; font-size: 24px;">NB</h1>
          <p style="margin: 5px 0 0; font-size: 14px;">Digital Solutions</p>
        </div>
      </div>

      <h2 style="color: #4F46E5; margin-top: 0;">${greeting}</h2>

      <p>${intro}</p>

      <div style="background-color: #f9fafb; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0; font-weight: bold;">${invoiceInfo}</p>
        <p style="margin: 5px 0;">${dateInfo}</p>
        <p style="margin: 5px 0;">${dueInfo}</p>
        <p style="margin: 5px 0; font-weight: bold;">${amountInfo}</p>
        <p style="margin: 5px 0;">${statusInfo}</p>
      </div>

      <p>${viewInfo}</p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${projectLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">${linkText}</a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">

      <p>${helpText}</p>

      <div style="margin-top: 25px;">
        ${signature}
      </div>
    </div>
  `;

  return { subject, html };
};

// E-mail küldése a számláról
export const sendInvoiceEmail = async (invoice, project, language = 'hu') => {
  try {
    console.log(`[DEBUG-INVOICE-EMAIL] Számla e-mail küldése: ${invoice.number} - ${project.name} - ${project.client.email} (${language})`);
    console.log('[DEBUG-INVOICE-EMAIL] Számla és projekt adatok:', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.number,
      projectId: project._id,
      projectName: project.name,
      clientName: project.client.name,
      clientEmail: project.client.email,
      language
    });

    // Ellenőrizzük, hogy a transporter létezik-e
    if (!transporter) {
      console.error('[DEBUG-INVOICE-EMAIL] A nodemailer transporter nincs konfigurálva a számla e-mail szolgáltatásban');
      throw new Error('Email küldési szolgáltatás nincs megfelelően beállítva');
    }

    // E-mail sablon generálása
    console.log('[DEBUG-INVOICE-EMAIL] E-mail sablon generálása a számlához...');
    const { subject, html } = generateEmailTemplate(invoice, project, language);
    console.log('[DEBUG-INVOICE-EMAIL] E-mail sablon generálása kész. Tárgy:', subject);

    // E-mail küldése
    const mailOptions = {
      from: `"Norbert Bartus" <${CONTACT_SMTP_USER}>`,
      to: project.client.email,
      subject: subject,
      html: html
    };

    console.log('[DEBUG-INVOICE-EMAIL] Számla e-mail küldése megkísérlése...', {
      to: project.client.email,
      subject: subject,
      from: `"Norbert Bartus" <${CONTACT_SMTP_USER}>`,
      smtpHost: CONTACT_SMTP_HOST,
      smtpPort: CONTACT_SMTP_PORT,
      smtpSecure: CONTACT_SMTP_SECURE,
      smtpUser: CONTACT_SMTP_USER
    });

    try {
      // E-mail küldése
      console.log('[DEBUG-INVOICE-EMAIL] E-mail küldése megkezdődik...');
      console.log('[DEBUG-INVOICE-EMAIL] Transporter állapota:', transporter ? 'Létezik' : 'Nem létezik');
      console.log('[DEBUG-INVOICE-EMAIL] Mail opciók:', {
        to: mailOptions.to,
        from: mailOptions.from,
        subject: mailOptions.subject,
        htmlLength: mailOptions.html ? mailOptions.html.length : 0
      });

      const info = await transporter.sendMail(mailOptions);

      console.log('[DEBUG-INVOICE-EMAIL] Számla e-mail sikeresen elküldve:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        envelope: info.envelope,
        messageSize: info.messageSize
      });
      return { success: true, messageId: info.messageId, info };
    } catch (emailError) {
      console.error('[DEBUG-INVOICE-EMAIL] Hiba a számla e-mail küldésekor:', {
        error: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
        command: emailError.command,
        responseCode: emailError.responseCode,
        response: emailError.response,
        name: emailError.name
      });
      throw emailError;
    }
  } catch (error) {
    console.error('[DEBUG-INVOICE-EMAIL] Hiba a számla e-mail küldésekor:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    return { success: false, error: error.message };
  }
};

export default { sendInvoiceEmail };
