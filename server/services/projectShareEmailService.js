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
  console.error('Hiányzó környezeti változók a projekt megosztás e-mail szolgáltatáshoz! Ellenőrizd a .env fájlt:');
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

console.log('Projekt megosztás e-mail szolgáltatás - SMTP Konfiguráció (jelszó nélkül):', {
  ...transporterConfig,
  auth: { user: CONTACT_SMTP_USER, pass: '******' }
});

// Nodemailer transporter létrehozása
let transporter;
try {
  transporter = nodemailer.createTransport(transporterConfig);

  // Teszteljük a kapcsolatot (aszinkron, nincs await, csak logolunk)
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP kapcsolat hiba a projekt megosztás e-mail szolgáltatásban:', error);
    } else {
      console.log('SMTP szerver kapcsolat OK a projekt megosztás e-mail szolgáltatásban, kész az emailek küldésére');
    }
  });
} catch (error) {
  console.error('Hiba a nodemailer transporter létrehozásakor a projekt megosztás e-mail szolgáltatásban:', error);
}

// E-mail sablon generálása különböző nyelveken
const generateEmailTemplate = (project, shareLink, pin, language = 'hu') => {
  // Alapértelmezett magyar sablon
  let subject = `Megosztott projekt hozzáférés: ${project.name}`;
  let greeting = `Kedves ${project.client.name}!`;
  let intro = `Norbert Bartus megosztott Önnel egy projektet az NB Studio rendszerében.`;
  let projectInfo = `Projekt neve: ${project.name}`;
  let accessInfo = 'Az alábbi linken és PIN kóddal férhet hozzá a projekthez:';
  let linkText = 'Projekt megtekintése';
  let pinInfo = `PIN kód: ${pin}`;
  let validUntil = project.sharing.expiresAt 
    ? `A hozzáférés érvényes: ${new Date(project.sharing.expiresAt).toLocaleDateString('hu-HU')}-ig` 
    : 'A hozzáférés korlátlan ideig érvényes.';
  let helpText = 'Ha kérdése van, kérjük, vegye fel a kapcsolatot velünk.';
  let signature = 'Üdvözlettel,<br>Norbert Bartus<br>NB Studio';

  // Angol sablon
  if (language === 'en') {
    subject = `Shared project access: ${project.name}`;
    greeting = `Dear ${project.client.name},`;
    intro = `Norbert Bartus has shared a project with you in the NB Studio system.`;
    projectInfo = `Project name: ${project.name}`;
    accessInfo = 'You can access the project using the following link and PIN code:';
    linkText = 'View Project';
    pinInfo = `PIN code: ${pin}`;
    validUntil = project.sharing.expiresAt 
      ? `Access valid until: ${new Date(project.sharing.expiresAt).toLocaleDateString('en-US')}` 
      : 'Access is valid indefinitely.';
    helpText = 'If you have any questions, please contact us.';
    signature = 'Best regards,<br>Norbert Bartus<br>NB Studio';
  }
  
  // Német sablon
  else if (language === 'de') {
    subject = `Geteilter Projektzugang: ${project.name}`;
    greeting = `Sehr geehrte(r) ${project.client.name},`;
    intro = `Norbert Bartus hat ein Projekt mit Ihnen im NB Studio-System geteilt.`;
    projectInfo = `Projektname: ${project.name}`;
    accessInfo = 'Sie können mit dem folgenden Link und PIN-Code auf das Projekt zugreifen:';
    linkText = 'Projekt ansehen';
    pinInfo = `PIN-Code: ${pin}`;
    validUntil = project.sharing.expiresAt 
      ? `Zugang gültig bis: ${new Date(project.sharing.expiresAt).toLocaleDateString('de-DE')}` 
      : 'Der Zugang ist unbegrenzt gültig.';
    helpText = 'Bei Fragen kontaktieren Sie uns bitte.';
    signature = 'Mit freundlichen Grüßen,<br>Norbert Bartus<br>NB Studio';
  }

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
        <p style="margin: 0; font-weight: bold;">${projectInfo}</p>
      </div>
      
      <p>${accessInfo}</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${shareLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">${linkText}</a>
      </div>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: center;">
        <p style="font-size: 18px; font-weight: bold; margin: 0;">${pinInfo}</p>
      </div>
      
      <p style="color: #6B7280; font-size: 14px;">${validUntil}</p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">
      
      <p>${helpText}</p>
      
      <div style="margin-top: 25px;">
        ${signature}
      </div>
    </div>
  `;

  return { subject, html };
};

// E-mail küldése a projekt megosztásáról
export const sendProjectShareEmail = async (project, shareLink, pin, language = 'hu') => {
  try {
    console.log(`Projekt megosztás e-mail küldése: ${project.name} - ${project.client.email} (${language})`);

    // Ellenőrizzük, hogy a transporter létezik-e
    if (!transporter) {
      console.error('A nodemailer transporter nincs konfigurálva');
      throw new Error('Email küldési szolgáltatás nincs megfelelően beállítva');
    }

    // E-mail sablon generálása
    const { subject, html } = generateEmailTemplate(project, shareLink, pin, language);

    // E-mail küldése
    const mailOptions = {
      from: `"Norbert Bartus" <${CONTACT_SMTP_USER}>`,
      to: project.client.email,
      subject: subject,
      html: html
    };

    console.log('Projekt megosztás e-mail küldése megkísérlése...', {
      to: project.client.email,
      subject: subject,
      from: `"Norbert Bartus" <${CONTACT_SMTP_USER}>`
    });

    try {
      // E-mail küldése
      console.log('E-mail küldése megkezdődik...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Projekt megosztás e-mail sikeresen elküldve:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });
      return { success: true, messageId: info.messageId, info };
    } catch (emailError) {
      console.error('Hiba a projekt megosztás e-mail küldésekor:', {
        error: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
        command: emailError.command
      });
      throw emailError;
    }
  } catch (error) {
    console.error('Hiba a projekt megosztás e-mail küldésekor:', error);
    return { success: false, error: error.message };
  }
};

export default { sendProjectShareEmail };
