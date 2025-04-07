import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Környezeti változók betöltése
dotenv.config();

// SMTP beállítások a .env fájlból
const SMTP_HOST = process.env.SMTP_HOST || 'nb-hosting.hu';
const SMTP_PORT = process.env.SMTP_PORT || 25;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || 'noreply@nb-hosting.hu';
const SMTP_PASS = process.env.SMTP_PASS;

// Ellenőrizzük, hogy a kötelező környezeti változók be vannak-e állítva
if (!SMTP_USER || !SMTP_PASS) {
  console.error('Hiányzó környezeti változók a számla értesítés e-mail szolgáltatáshoz! Ellenőrizd a .env fájlt:');
  console.error('- SMTP_USER: ' + (SMTP_USER ? 'OK' : 'HIÁNYZIK'));
  console.error('- SMTP_PASS: ' + (SMTP_PASS ? 'OK' : 'HIÁNYZIK'));
}

// SMTP beállítások
const transporterConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
};

// Transporter létrehozása
const transporter = nodemailer.createTransport(transporterConfig);

// E-mail sablon generálása különböző nyelveken
const generateEmailTemplate = (invoice, project, language = 'hu') => {
  // Számla adatok formázása
  const invoiceNumber = invoice.number || 'N/A';
  const invoiceDate = invoice.date ? new Date(invoice.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'hu-HU') : 'N/A';
  const invoiceDueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'hu-HU') : 'N/A';
  const invoiceAmount = invoice.totalAmount ? invoice.totalAmount.toLocaleString(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'hu-HU') : '0';
  const currency = project.financial?.currency || 'EUR';
  
  // Projekt megosztási link generálása
  const shareLink = project.sharing?.token ? 
    `https://project.nb-studio.net/shared-project/${project.sharing.token}` : 
    'https://project.nb-studio.net';

  // Nyelv alapján különböző sablonok
  if (language === 'en') {
    // Angol sablon
    return {
      subject: `New Invoice: ${invoiceNumber} - NB Studio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #3B82F6;">New Invoice</h2>
          <p>Dear ${project.client.name},</p>
          <p>A new invoice has been created for your project <strong>${project.name}</strong>.</p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4B5563;">Invoice Details</h3>
            <p style="margin: 8px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${invoiceDate}</p>
            <p style="margin: 8px 0;"><strong>Due Date:</strong> ${invoiceDueDate}</p>
            <p style="margin: 8px 0;"><strong>Amount:</strong> ${invoiceAmount} ${currency}</p>
          </div>
          
          <p>You can view the invoice details and download the invoice by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareLink}" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Invoice
            </a>
          </div>
          
          <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Norbert Bartus</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6B7280;">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
  } else if (language === 'de') {
    // Német sablon
    return {
      subject: `Neue Rechnung: ${invoiceNumber} - NB Studio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #3B82F6;">Neue Rechnung</h2>
          <p>Sehr geehrte(r) ${project.client.name},</p>
          <p>Eine neue Rechnung wurde für Ihr Projekt <strong>${project.name}</strong> erstellt.</p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4B5563;">Rechnungsdetails</h3>
            <p style="margin: 8px 0;"><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
            <p style="margin: 8px 0;"><strong>Datum:</strong> ${invoiceDate}</p>
            <p style="margin: 8px 0;"><strong>Fälligkeitsdatum:</strong> ${invoiceDueDate}</p>
            <p style="margin: 8px 0;"><strong>Betrag:</strong> ${invoiceAmount} ${currency}</p>
          </div>
          
          <p>Sie können die Rechnungsdetails einsehen und die Rechnung herunterladen, indem Sie auf die Schaltfläche unten klicken:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareLink}" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Rechnung ansehen
            </a>
          </div>
          
          <p>Wenn Sie Fragen zu dieser Rechnung haben, zögern Sie bitte nicht, uns zu kontaktieren.</p>
          
          <p>Mit freundlichen Grüßen,<br>Norbert Bartus</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6B7280;">
            <p>Dies ist eine automatische Benachrichtigung. Bitte antworten Sie nicht auf diese E-Mail.</p>
          </div>
        </div>
      `
    };
  } else {
    // Magyar sablon (alapértelmezett)
    return {
      subject: `Új számla: ${invoiceNumber} - NB Studio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #3B82F6;">Új számla</h2>
          <p>Tisztelt ${project.client.name}!</p>
          <p>Új számla készült az Ön <strong>${project.name}</strong> projektjéhez.</p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4B5563;">Számla adatok</h3>
            <p style="margin: 8px 0;"><strong>Számlaszám:</strong> ${invoiceNumber}</p>
            <p style="margin: 8px 0;"><strong>Dátum:</strong> ${invoiceDate}</p>
            <p style="margin: 8px 0;"><strong>Fizetési határidő:</strong> ${invoiceDueDate}</p>
            <p style="margin: 8px 0;"><strong>Összeg:</strong> ${invoiceAmount} ${currency}</p>
          </div>
          
          <p>A számla részleteit megtekintheti és letöltheti az alábbi gombra kattintva:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareLink}" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Számla megtekintése
            </a>
          </div>
          
          <p>Amennyiben kérdése van a számlával kapcsolatban, kérjük, vegye fel velünk a kapcsolatot.</p>
          
          <p>Üdvözlettel,<br>Bartus Norbert</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6B7280;">
            <p>Ez egy automatikus értesítés. Kérjük, ne válaszoljon erre az e-mailre.</p>
          </div>
        </div>
      `
    };
  }
};

// E-mail küldése az új számláról
export const sendInvoiceNotificationEmail = async (invoice, project, language = 'hu') => {
  try {
    console.log(`[DEBUG] Számla értesítő e-mail küldése: ${invoice.number} - ${project.client.email} (${language})`);
    
    // Ellenőrizzük, hogy van-e e-mail cím
    if (!project.client || !project.client.email) {
      console.error('[DEBUG] Hiányzó ügyfél e-mail cím');
      throw new Error('Az ügyfél e-mail címe hiányzik');
    }
    
    // Ellenőrizzük, hogy a transporter létezik-e
    if (!transporter) {
      console.error('[DEBUG] A nodemailer transporter nincs konfigurálva');
      throw new Error('Email küldési szolgáltatás nincs megfelelően beállítva');
    }

    // E-mail sablon generálása
    console.log('[DEBUG] E-mail sablon generálása...');
    const { subject, html } = generateEmailTemplate(invoice, project, language);
    console.log('[DEBUG] E-mail sablon generálása kész. Tárgy:', subject);

    // E-mail küldése
    const mailOptions = {
      from: `"Norbert Bartus" <${SMTP_USER}>`,
      to: project.client.email,
      subject: subject,
      html: html
    };

    console.log('[DEBUG] Számla értesítő e-mail küldése megkísérlése...', {
      to: project.client.email,
      subject: subject,
      from: `"Norbert Bartus" <${SMTP_USER}>`,
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      smtpSecure: SMTP_SECURE,
      smtpUser: SMTP_USER
    });

    // E-mail küldése
    console.log('[DEBUG] E-mail küldése megkezdődik...');
    const info = await transporter.sendMail(mailOptions);
    console.log('[DEBUG] Számla értesítő e-mail sikeresen elküldve:', {
      messageId: info.messageId,
      response: info.response
    });
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error('[DEBUG] Hiba a számla értesítő e-mail küldésekor:', error);
    throw error;
  }
};

export default {
  sendInvoiceNotificationEmail
};
