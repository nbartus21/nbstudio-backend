import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer'; // Email küldéshez
import PDFDocument from 'pdfkit'; // PDF generáláshoz
import fs from 'fs'; // Fájlrendszer műveletekhez (pl. logo)
import path from 'path'; // Útvonalak kezeléséhez
import dotenv from 'dotenv'; // Környezeti változókhoz

// Modellek és middleware-ek importálása
import Document from '../models/Document.js';
import authMiddleware from '../middleware/auth.js'; // Authentikációs middleware

dotenv.config(); // .env fájl betöltése

const router = express.Router();

// --- Védett (Authentikált) Útvonalak ---

// Új dokumentum létrehozása
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, client, expiresAt, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'A cím és a tartalom megadása kötelező.' });
    }

    const newDocument = new Document({
      title,
      content,
      client, // Teljes ügyfél objektum átadása
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: status || 'draft',
      createdBy: req.user.id, // Authentikált felhasználó ID-ja
      // A PIN és sharingToken automatikusan generálódik a pre-save hook által
    });

    const savedDocument = await newDocument.save();
    // A generált PIN-t és tokent is visszaadjuk
    res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Hiba az új dokumentum létrehozásakor:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validációs hiba', errors: error.errors });
    }
    res.status(500).json({ message: 'Szerverhiba a dokumentum létrehozásakor.', error: error.message });
  }
});

// Összes (nem törölt) dokumentum listázása (authentikált felhasználóknak)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Csak azokat a dokumentumokat listázzuk, amelyeket az aktuális felhasználó hozott létre
    // és nincsenek logikailag törölve.
    const documents = await Document.find({ createdBy: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Hiba a dokumentumok listázásakor:', error);
    res.status(500).json({ message: 'Szerverhiba a dokumentumok listázásakor.', error: error.message });
  }
});

// Egyedi dokumentum lekérése ID alapján (authentikált felhasználóknak)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Érvénytelen dokumentum ID.' });
    }
    const document = await Document.findOne({ _id: req.params.id, createdBy: req.user.id, isDeleted: false });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy nincs jogosultsága megtekinteni.' });
    }
     if (document.isExpired()) {
        document.status = 'expired';
        await document.save();
    }
    res.json(document);
  } catch (error) {
    console.error('Hiba a dokumentum lekérésekor:', error);
    res.status(500).json({ message: 'Szerverhiba a dokumentum lekérésekor.', error: error.message });
  }
});

// Dokumentum frissítése ID alapján (authentikált felhasználóknak)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Érvénytelen dokumentum ID.' });
    }
    const { title, content, client, expiresAt, status } = req.body;

    const updatedData = { title, content, client, status };
     if (expiresAt !== undefined) { // Csak akkor frissítjük, ha meg van adva (lehet null is)
        updatedData.expiresAt = expiresAt ? new Date(expiresAt) : null;
     }


    const updatedDocument = await Document.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id, isDeleted: false },
      updatedData,
      { new: true, runValidators: true } // Visszaadja a frissített dokumentumot és futtatja a validátorokat
    );

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy nincs jogosultsága módosítani.' });
    }
    res.json(updatedDocument);
  } catch (error) {
    console.error('Hiba a dokumentum frissítésekor:', error);
     if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validációs hiba', errors: error.errors });
    }
    res.status(500).json({ message: 'Szerverhiba a dokumentum frissítésekor.', error: error.message });
  }
});

// Dokumentum logikai törlése ID alapján (authentikált felhasználóknak)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Érvénytelen dokumentum ID.' });
    }
    const deletedDocument = await Document.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!deletedDocument) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy nincs jogosultsága törölni.' });
    }
    res.json({ message: 'Dokumentum sikeresen törölve (logikailag).' });
  } catch (error) {
    console.error('Hiba a dokumentum törlésekor:', error);
    res.status(500).json({ message: 'Szerverhiba a dokumentum törlésekor.', error: error.message });
  }
});


// --- Email Küldéshez Nodemailer Transporter Létrehozása ---

const createTransporter = () => {
    // Használjuk a megosztott CONTACT SMTP beállításokat, ha vannak, különben a sima SMTP-t
    const host = process.env.CONTACT_SMTP_HOST || process.env.SMTP_HOST;
    const port = process.env.CONTACT_SMTP_PORT || process.env.SMTP_PORT;
    const secure = process.env.CONTACT_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true';
    const user = process.env.CONTACT_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.CONTACT_SMTP_PASS || process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
        console.error("SMTP konfigurációs adatok hiányoznak a .env fájlból!");
        return null; // Vagy dobhatnánk hibát is
    }

     // Ellenőrizzük a secure beállítást a port alapján, ha nincs explicit megadva
    let effectiveSecure = secure;
    if (process.env.CONTACT_SMTP_SECURE === undefined && process.env.SMTP_SECURE === undefined) {
        effectiveSecure = port === '465'; // Gyakori SSL port
    }


    console.log(`Nodemailer transporter létrehozása: host=${host}, port=${port}, secure=${effectiveSecure}, user=${user}`);


    return nodemailer.createTransport({
        host: host,
        port: parseInt(port, 10),
        secure: effectiveSecure, // true for 465, false for other ports like 587 or 25
        auth: {
            user: user,
            pass: pass,
        },
        // Helyi fejlesztéshez szükséges lehet, ha self-signed cert van
        // tls: {
        //    rejectUnauthorized: false
        // }
    });
};


// Email sablonok nyelvek szerint
const getEmailContent = (language, document, shareUrl) => {
  const linkText = {
    hu: 'Dokumentum Megtekintése',
    en: 'View Document',
    de: 'Dokument Anzeigen',
  };

  const subjectText = {
     hu: `Megosztott dokumentum: ${document.title}`,
     en: `Shared Document: ${document.title}`,
     de: `Geteiltes Dokument: ${document.title}`,
  }

  const bodyText = {
    hu: `
      <p>Tisztelt Címzett!</p>
      <p>Önnel megosztottak egy dokumentumot: <strong>${document.title}</strong></p>
      <p>A dokumentum megtekintéséhez kattintson az alábbi linkre:</p>
      <p><a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">${linkText[language]}</a></p>
      <p>A dokumentum megtekintéséhez szüksége lehet a következő PIN kódra: <strong>${document.pin}</strong></p>
      ${document.expiresAt ? `<p>Figyelem: A dokumentum ${new Date(document.expiresAt).toLocaleDateString(language)} dátumig érhető el.</p>` : ''}
      <p>Üdvözlettel,<br>NB-Studio Rendszer</p>
    `,
    en: `
      <p>Dear Recipient,</p>
      <p>A document has been shared with you: <strong>${document.title}</strong></p>
      <p>To view the document, please click the link below:</p>
      <p><a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">${linkText[language]}</a></p>
      <p>You may need the following PIN code to view the document: <strong>${document.pin}</strong></p>
      ${document.expiresAt ? `<p>Please note: The document is available until ${new Date(document.expiresAt).toLocaleDateString('en-US')}.</p>` : ''}
      <p>Sincerely,<br>NB-Studio System</p>
    `,
    de: `
      <p>Sehr geehrte(r) Empfänger(in),</p>
      <p>Ein Dokument wurde mit Ihnen geteilt: <strong>${document.title}</strong></p>
      <p>Um das Dokument anzuzeigen, klicken Sie bitte auf den folgenden Link:</p>
      <p><a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">${linkText[language]}</a></p>
      <p>Möglicherweise benötigen Sie den folgenden PIN-Code, um das Dokument anzuzeigen: <strong>${document.pin}</strong></p>
      ${document.expiresAt ? `<p>Bitte beachten Sie: Das Dokument ist bis zum ${new Date(document.expiresAt).toLocaleDateString('de-DE')} verfügbar.</p>` : ''}
      <p>Mit freundlichen Grüßen,<br>NB-Studio System</p>
    `,
  };

  return {
    subject: subjectText[language] || subjectText['hu'], // Alapértelmezett magyar
    html: bodyText[language] || bodyText['hu'],
  };
};


// Dokumentum megosztása emailben (authentikált felhasználóknak)
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Érvénytelen dokumentum ID.' });
    }
    const { email, language = 'hu' } = req.body; // Nyelv alapértelmezetten magyar

    if (!email) {
      return res.status(400).json({ message: 'Az email cím megadása kötelező.' });
    }
     const validLanguages = ['hu', 'en', 'de'];
    if (!validLanguages.includes(language)) {
         return res.status(400).json({ message: `Érvénytelen nyelv kód: ${language}. Támogatott nyelvek: ${validLanguages.join(', ')}` });
    }


    const document = await Document.findOne({ _id: req.params.id, createdBy: req.user.id, isDeleted: false });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy nincs jogosultsága megosztani.' });
    }
    if (document.status !== 'active') {
        return res.status(400).json({ message: 'Csak aktív státuszú dokumentum osztható meg.' });
    }
     if (document.isExpired()) {
        document.status = 'expired';
        await document.save();
        return res.status(400).json({ message: 'A dokumentum lejárt, nem osztható meg.' });
    }

    const transporter = createTransporter();
     if (!transporter) {
        return res.status(500).json({ message: 'Email küldési szolgáltatás nincs megfelelően konfigurálva.' });
    }


    // Megosztási URL összeállítása (FRONTEND_URL használatával)
    const frontendUrl = process.env.FRONTEND_URL || 'https://project.nb-studio.net'; // Használj env változót!
    const shareUrl = `${frontendUrl}/shared-document/${document.sharingToken}`;

    const { subject, html } = getEmailContent(language, document, shareUrl);

     // Feladó email címe (használjuk a CONTACT vagy sima SMTP usert)
    const fromEmail = process.env.CONTACT_SMTP_USER || process.env.SMTP_USER;


    const mailOptions = {
      from: `"NB-Studio" <${fromEmail}>`,
      to: email,
      subject: subject,
      html: html,
    };

    // Email küldése
    await transporter.sendMail(mailOptions);

    // Megosztás rögzítése a dokumentumban
    document.sharedWith.push({ email, language });
    await document.save();

    console.log(`Dokumentum (${document._id}) sikeresen megosztva ezzel: ${email}, nyelv: ${language}`);
    res.json({ message: `Dokumentum sikeresen megosztva ${email} címmel.` });

  } catch (error) {
    console.error('Hiba a dokumentum megosztásakor:', error);
     if (error.code === 'ECONNREFUSED' || error.errno === -111) {
        return res.status(503).json({ message: 'Nem sikerült csatlakozni az SMTP szerverhez. Ellenőrizze a konfigurációt és a szerver elérhetőségét.' });
     }
     if (error.responseCode === 550 || error.response?.includes('Recipient address rejected')) {
         return res.status(400).json({ message: 'Érvénytelen vagy nem létező email cím.' });
     }
    res.status(500).json({ message: 'Szerverhiba a dokumentum megosztásakor.', error: error.message });
  }
});


// --- Nyilvános (API Kulccsal Védett) Útvonalak ---

// Megosztott dokumentum adatainak lekérése token alapján (PIN nélkül)
router.get('/public/shared-document/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const document = await Document.findActiveByToken(token); // Használjuk a statikus metódust

    if (!document) {
      return res.status(404).json({ message: 'A megosztott dokumentum nem található, lejárt vagy érvénytelen.' });
    }

     // Csak a szükséges adatokat adjuk vissza, PIN nélkül
     res.json({
        title: document.title,
        // content: document.content, // A tartalmat csak PIN ellenőrzés után adjuk vissza
        expiresAt: document.expiresAt,
        createdAt: document.createdAt,
        // client: document.client // Ügyfél adatokat sem adjuk ki alapból
        requiresPin: true // Mindig kérjük a PIN-t a tartalomhoz
      });

  } catch (error) {
    console.error('Hiba a megosztott dokumentum lekérésekor:', error);
    res.status(500).json({ message: 'Szerverhiba a megosztott dokumentum lekérésekor.' });
  }
});


// PIN ellenőrzése megosztott dokumentumhoz
router.post('/public/shared-document/:token/verify-pin', async (req, res) => {
  try {
    const { token } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'PIN kód megadása kötelező.' });
    }

    const document = await Document.findActiveByToken(token);

    if (!document) {
      return res.status(404).json({ message: 'A megosztott dokumentum nem található, lejárt vagy érvénytelen.' });
    }

    if (document.pin !== pin) {
      return res.status(401).json({ message: 'Érvénytelen PIN kód.' });
    }

    // Sikeres PIN ellenőrzés után visszaadjuk a teljes dokumentumot (kivéve a PIN-t és tokent)
    // Vagy csak a tartalmat és az ügyfél adatokat, ahogy szükséges
    res.json({
        message: "PIN elfogadva.",
        document: {
             title: document.title,
             content: document.content,
             client: document.client,
             expiresAt: document.expiresAt,
             createdAt: document.createdAt,
              // A PIN-t és a tokent sosem adjuk vissza
        }
    });

  } catch (error) {
    console.error('Hiba a PIN ellenőrzésekor:', error);
    res.status(500).json({ message: 'Szerverhiba a PIN ellenőrzésekor.' });
  }
});


// Megosztott dokumentum PDF generálása token alapján (PIN ellenőrzés szükséges lehetne, de most kihagyjuk)
// Ez az útvonal NYILVÁNOS, de API kulccsal védett a server.js-ben
router.get('/public/shared-document/:token/pdf', async (req, res) => {
    // Nyelvi paraméter kezelése (alapértelmezett: hu) - ugyanaz, mint a számlánál
    const language = req.query.language || 'hu';
    const validLanguage = ['hu', 'en', 'de'].includes(language) ? language : 'hu';

  try {
    const { token } = req.params;
    const document = await Document.findActiveByToken(token);

    if (!document) {
      return res.status(404).json({ message: 'A megosztott dokumentum nem található, lejárt vagy érvénytelen.' });
    }

    // Itt jön a PDF generálás logikája, ami nagyon hasonló a server/index.js-ben lévő számla generáláshoz
    // Adaptáljuk azt a logikát ide, hogy a 'Document' adatait használja.

     // --- PDF Generálás Kezdete (Számla logika alapján adaptálva) ---

     const translations = { // Ugyanazok a fordítások, mint a számlánál, esetleg bővítve dokumentum specifikus szavakkal
        en: {
          document: "DOCUMENT",
          documentNumber: "Document ID", // Vagy használhatnánk a címet
          issueDate: "Issue Date",
          expiryDate: "Expiry Date",
          provider: "PROVIDER", // Vagy "Creator"
          client: "CLIENT", // Vagy "Recipient"
          content: "Content",
          pinCode: "PIN Code",
          footer: "This document was created electronically.",
          status: { draft: "Draft", active: "Active", expired: "Expired", cancelled: "Cancelled"},
           taxId: "Tax ID",
           // ... egyéb szükséges fordítások
           generatedOn: "Generated on",
           validUntil: "Valid until",
           notApplicable: "N/A",
           page: "Page",
           confidential: "CONFIDENTIAL DOCUMENT",
           accessInfo: "Access Information"
        },
        de: {
          document: "DOKUMENT",
          documentNumber: "Dokument-ID",
          issueDate: "Ausstellungsdatum",
          expiryDate: "Ablaufdatum",
          provider: "AUSSTELLER",
          client: "EMPFÄNGER",
          content: "Inhalt",
          pinCode: "PIN-Code",
          footer: "Dieses Dokument wurde elektronisch erstellt.",
          status: { draft: "Entwurf", active: "Aktiv", expired: "Abgelaufen", cancelled: "Storniert"},
           taxId: "Steuernummer",
          // ...
           generatedOn: "Erstellt am",
           validUntil: "Gültig bis",
           notApplicable: "N. z.",
           page: "Seite",
           confidential: "VERTRAULICHES DOKUMENT",
           accessInfo: "Zugangsinformationen"
        },
        hu: {
          document: "DOKUMENTUM",
          documentNumber: "Dokumentum Azonosító",
          issueDate: "Létrehozás dátuma",
          expiryDate: "Lejárat dátuma",
          provider: "KIÁLLÍTÓ",
          client: "CÍMZETT",
          content: "Tartalom",
          pinCode: "PIN kód",
          footer: "Ez a dokumentum elektronikusan készült.",
          status: { draft: "Piszkozat", active: "Aktív", expired: "Lejárt", cancelled: "Törölt"},
           taxId: "Adószám",
          // ...
           generatedOn: "Generálva",
           validUntil: "Érvényes eddig",
           notApplicable: "Nincs megadva",
           page: "Oldal",
           confidential: "BIZALMAS DOKUMENTUM",
           accessInfo: "Hozzáférési Információk"
        }
      };

      const t = translations[validLanguage];
      const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
          autoFirstPage: true,
          layout: 'portrait',
          info: {
              Title: `${t.document} - ${document.title}`,
              Author: 'Norbert Bartus', // Vagy a létrehozó felhasználó neve, ha elérhető
          }
      });

        // Fájlnév beállítása (ékezetek nélkülire cserélve)
        const safeTitle = document.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const fileName = `${t.document.toLowerCase()}_${safeTitle}_${document._id.toString().substring(0, 8)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        doc.pipe(res);

        // --- PDF Tartalom (Számla stílus alapján) ---

        const colors = { // Ugyanazok a színek
            primary: '#2563EB',
            secondary: '#1E293B',
            accent: '#3B82F6',
            text: '#1E293B',
            light: '#F8FAFC',
            success: '#10B981', // Aktív státuszhoz
            warning: '#F59E0B', // Lejárt státuszhoz
            danger: '#EF4444', // Törölt státuszhoz
            border: '#E2E8F0',
            background: '#FFFFFF',
            lightBlue: '#EFF6FF',
        };

        // Betűtípusok
        doc.registerFont('Helvetica', 'Helvetica');
        doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

         // Felső sáv
        doc.rect(0, 0, doc.page.width, 8).fill(colors.primary);

        // Fejléc terület
        doc.rect(0, 8, doc.page.width, 100).fill(colors.background);

        // Logo (ha van)
        // const __dirname = path.dirname(new URL(import.meta.url).pathname); // ES Module kompatibilis __dirname
        // const logoPath = path.join(__dirname, '..', 'public', 'logo.png'); // Korrigált útvonal
        // try {
        //    if (fs.existsSync(logoPath)) {
        //      doc.image(logoPath, 50, 20, { width: 100 });
        //    }
        // } catch (logoError) { console.warn('Logo betöltési hiba:', logoError.message); }

        // Cím és Státusz
        doc.font('Helvetica-Bold').fontSize(24).fillColor(colors.primary).text(t.document, 50, 30);
        doc.fontSize(14).fillColor(colors.secondary).text(document.title, 50, 60, {width: 350});

         // Státusz badge
         let statusColor = colors.secondary;
         let statusText = t.status[document.status] || document.status;
         if (document.status === 'active') statusColor = colors.success;
         else if (document.status === 'expired') statusColor = colors.warning;
         else if (document.status === 'cancelled') statusColor = colors.danger;

         const statusBadgeWidth = 80;
         const statusBadgeHeight = 22;
         const statusBadgeX = doc.page.width - 50 - statusBadgeWidth;
         const statusBadgeY = 30;
         doc.roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 4).fill(statusColor);
         doc.font('Helvetica-Bold').fontSize(10).fillColor('white').text(statusText, statusBadgeX, statusBadgeY + 6, { width: statusBadgeWidth, align: 'center' });

        // Dátum információk jobb oldalon
        const rightColumnX = 400;
        doc.fontSize(9).fillColor(colors.secondary).text(`${t.generatedOn}:`, rightColumnX, 60, { align: 'right' });
        doc.fontSize(10).fillColor(colors.primary).text(new Date(document.createdAt).toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')), rightColumnX, 75, { align: 'right' });

        doc.fontSize(9).fillColor(colors.secondary).text(`${t.validUntil}:`, rightColumnX, 90, { align: 'right' });
        doc.fontSize(10).fillColor(colors.primary).text(document.expiresAt ? new Date(document.expiresAt).toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')) : t.notApplicable, rightColumnX, 105, { align: 'right' });

        // Elválasztó vonal
        doc.rect(50, 125, doc.page.width - 100, 1).fill(colors.border);

        // Kiállító és Címzett adatok
        const infoStartY = 145;

        // Kiállító (Provider)
        doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.primary).text(t.provider, 50, infoStartY);
        doc.rect(50, infoStartY + 16, 220, 1).fill(colors.primary);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.secondary).text('Norbert Bartus', 50, infoStartY + 22); // Vagy a rendszer neve
        doc.font('Helvetica').fontSize(9).fillColor(colors.text)
            .text('Salinenstraße 25', 50, infoStartY + 37)
            .text('76646 Bruchsal, Deutschland', 50, infoStartY + 49)
            .text('St.-Nr.: 68194547329', 50, infoStartY + 61);
             //.text(`Email: noreply@nb-hosting.hu`, 50, infoStartY + 73); // Opcionális

        // Címzett (Client/Recipient)
         if (document.client && (document.client.name || document.client.companyName)) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.primary).text(t.client, 320, infoStartY);
            doc.rect(320, infoStartY + 16, 220, 1).fill(colors.primary);

             let clientName = document.client.companyName || document.client.name;
             let clientContact = document.client.companyName ? document.client.name : null; // Ha van cég, a név a kontakt

            doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.secondary).text(clientName, 320, infoStartY + 22);
             if(clientContact) doc.font('Helvetica').fontSize(9).fillColor(colors.text).text(clientContact, 320, infoStartY + 37);

             let rowY = clientContact ? infoStartY + 49 : infoStartY + 37;

             if (document.client.taxNumber) {
                doc.font('Helvetica').fontSize(9).fillColor(colors.text).text(`${t.taxId}: ${document.client.taxNumber}`, 320, rowY); rowY += 12;
            }
             if (document.client.email) {
                doc.font('Helvetica').fontSize(9).fillColor(colors.text).text(`Email: ${document.client.email}`, 320, rowY); rowY += 12;
             }
             if (document.client.address) {
                const { street, city, postalCode, country } = document.client.address;
                 if (street) { doc.text(street, 320, rowY); rowY += 12; }
                 if (postalCode || city) { doc.text(`${postalCode || ''} ${city || ''}`, 320, rowY); rowY += 12; }
                 if (country) { doc.text(country, 320, rowY); }
            }
         }

        // Tartalom rész
        const contentStartY = infoStartY + 120; // Hely biztosítása a címzett adatoknak
        doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.primary).text(t.content, 50, contentStartY);
        doc.rect(50, contentStartY + 18, doc.page.width - 100, 1).fill(colors.primary);

        // A dokumentum tartalmának megjelenítése (feltételezzük, hogy egyszerű szöveg vagy HTML, amit szöveggé alakítunk)
        // Egyszerűsített megjelenítés:
         doc.font('Helvetica').fontSize(10).fillColor(colors.text)
             .text(document.content.replace(/<[^>]*>?/gm, ''), 50, contentStartY + 30, { // HTML tagek eltávolítása egyszerűen
                 width: doc.page.width - 100,
                 align: 'justify'
             });

        // Hozzáférési információk (PIN) a lap alja felé
        const accessInfoY = doc.page.height - 150;
         doc.roundedRect(50, accessInfoY, doc.page.width - 100, 50, 4).fill(colors.lightBlue);
         doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.primary).text(t.accessInfo, 65, accessInfoY + 10);
         doc.font('Helvetica').fontSize(10).fillColor(colors.text)
            .text(`${t.pinCode}:`, 65, accessInfoY + 28, { continued: true })
            .font('Helvetica-Bold')
            .text(` ${document.pin}`);
        doc.font('Helvetica').fontSize(8).fillColor(colors.secondary)
            .text(`(${t.confidential})`, 65, accessInfoY + 40);


        // Lábléc minden oldalra
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            const footerTop = doc.page.height - 60;
            doc.rect(50, footerTop - 5, doc.page.width - 100, 0.5).fill(colors.border);
            const pageText = `${t.page} ${i + 1}`;
            const footerText = `Norbert Bartus | www.nb-studio.net | ${t.footer} | ${pageText}`;
            doc.font('Helvetica').fontSize(8).fillColor(colors.secondary)
               .text(footerText, 50, footerTop, { align: 'center', width: doc.page.width - 100 });
        }

        doc.end();
        console.log(`PDF sikeresen generálva a(z) ${document._id} dokumentumhoz.`);

        // --- PDF Generálás Vége ---

  } catch (error) {
    console.error('Hiba a megosztott dokumentum PDF generálásakor:', error);
    // Ne küldjünk JSON hibát, ha a header már elküldésre került (pl. PDF stream közben)
     if (!res.headersSent) {
         res.status(500).json({ message: 'Szerverhiba a PDF generálásakor.' });
     } else {
         console.error("Hiba történt a PDF stream küldése közben.");
         // Lehet, hogy itt már nem tudunk mit tenni, a kapcsolat megszakadhatott
     }
  }
});


export default router; 