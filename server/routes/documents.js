import express from 'express';
import { DocumentTemplate, GeneratedDocument } from '../models/DocumentTemplate.js';
import Project from '../models/Project.js';
import authMiddleware from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sendDocumentShareEmail } from '../services/documentShareEmailService.js';

const router = express.Router();

// Egyszerű CORS middleware a nyilvános dokumentum végpontokhoz
const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');
  res.setHeader('Access-Control-Max-Age', '3600');

  // OPTIONS kérések kezelése
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// FONTOS: Engedélyezzük a hozzáférést a dokumentum létrehozásához API kulccsal IS,
// hogy a publikus kliensek is tudják használni
const apiKeyChecker = (req, res, next) => {
  // Ha van érvényes token, akkor engedjük tovább
  if (req.userData) {
    return next();
  }

  // Ellenőrizzük, hogy a kérés a CORS preflight-e (OPTIONS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Ha nincs token, ellenőrizzük az API kulcsot
  const apiKey = req.headers['x-api-key'];
  console.log('API Key ellenőrzés a dokumentum végponton:', req.originalUrl);
  console.log('Kapott fejlécek:', JSON.stringify(req.headers, null, 2));
  console.log('Kapott API kulcs:', apiKey ? 'Megkapva' : 'Nincs megadva');

  if (apiKey === 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0') {
    // Ha érvényes az API kulcs, állítsuk be egy alap userData objektumot
    req.userData = { email: 'api-client@example.com' };
    console.log('API kulcs ellenőrzés sikeres');
    return next();
  }

  // Ha sem token, sem érvényes API kulcs nincs, akkor 401
  console.error('API kulcs ellenőrzés sikertelen');
  console.error('Várt:', 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0');
  console.error('Kapott:', apiKey);
  return res.status(401).json({ message: 'Nincs autentikációs token' });
};

// Regisztráljuk a PDF generálás végpontot az authMiddleware előtt
// IMPROVED: Dokumentum PDF generálása és letöltése - közvetlen streamelés válaszba
const generatePDF = async (req, res) => {
  // Közös PDF generáló függvény, amit mindkét végpont használ
  // Nyelvi paraméter kezelése (alapértelmezett: hu)
  const language = req.query.language || 'hu';
  // Csak támogatott nyelvek engedélyezése
  const validLanguage = ['hu', 'en', 'de'].includes(language) ? language : 'hu';

  console.log(`PDF generálás kérés: documentId=${req.params.id}, language=${validLanguage}`);

  try {
    // Dokumentum lekérése adatbázisból
    const document = await GeneratedDocument.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');

    if (!document) {
      console.error(`Dokumentum nem található ezzel az ID-val: ${req.params.id}`);
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }

    console.log(`Megtalált dokumentum: ${document.name} (${document._id})`);

    // Generáljunk egy biztonságos fájlnevet a letöltéshez
    let fileName = validLanguage === 'hu' ? `dokumentum-${document.name}` :
                  (validLanguage === 'de' ? `dokument-${document.name}` : `document-${document.name}`);
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }

    // Set response headers immediately
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Define colors for PDF
    const colors = {
      primary: '#4F46E5', // indigo-600
      secondary: '#6B7280', // gray-500
      light: '#E5E7EB', // gray-200
      success: '#10B981', // green-500
      warning: '#F59E0B', // amber-500
      danger: '#EF4444', // red-500
      text: '#1F2937', // gray-800
      textLight: '#6B7280' // gray-500
    };

    // Create PDF document and pipe directly to response
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: document.name,
          Author: 'Norbert Bartus',
          Subject: document.templateId?.name || 'Document',
          Keywords: document.templateId?.tags?.join(', ') || 'document'
        },
        font: 'Helvetica', // Ez a betűtípus általában támogatja a magyar karaktereket
        autoFirstPage: true,
        bufferPages: true
      });

    // Pipe directly to response
    doc.pipe(res);

    // Catch errors in PDF generation and response
    doc.on('error', (err) => {
      console.error(`PDF generation error: ${err}`);
      // We can't send a proper error response here as headers are already sent
      // Just make sure the response is ended
      if (!res.finished) {
        doc.end();
      }
    });

    // Register fonts
    doc.registerFont('Helvetica', 'Helvetica');
    doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

    // Document title
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(colors.primary)
       .text('DOKUMENTUM', 50, 30)
       .fontSize(14)
       .fillColor(colors.secondary)
       .text(document.name, 50, 65);

    // Add date
    const dateText = validLanguage === 'hu' ? 'Készült:' :
                    (validLanguage === 'de' ? 'Erstellt am:' : 'Created on:');
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.textLight)
       .text(`${dateText} ${new Date().toLocaleDateString(
         validLanguage === 'hu' ? 'hu-HU' :
         validLanguage === 'de' ? 'de-DE' : 'en-US'
       )}`, 50, 90);

    doc.moveDown(2);

    // Company info
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.text)
       .text('Norbert Bartus', 50, 130);

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.textLight)
       .text('Salinenstraße 25', 50, 145)
       .text('76646 Bruchsal', 50, 160)
       .text('Baden-Württemberg, Deutschland', 50, 175);

    // Document content
    doc.moveDown(3);
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(colors.text)
       .text(validLanguage === 'hu' ? 'Dokumentum tartalma' :
             validLanguage === 'de' ? 'Dokumentinhalt' : 'Document content', 50, 220);

    doc.moveDown();

    // Dokumentum tartalom hozzáadása
    // HTML-ből tiszta szöveg konvertálása
    const content = document.htmlVersion || document.content;
    const plainText = content.replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor(colors.text)
       .text(plainText, 50, 250, {
         align: 'left',
         width: doc.page.width - 100,
         lineGap: 5
       });

    // Generate all pages first
    doc.flushPages();

    // Add page numbers and footer to each page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Lábléc pozíció (alul)
      const footerTop = doc.page.height - 50;

      // Company financial info
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor(colors.textLight);

      // Teljes lábléc szöveg egy sorban az oldalszámmal együtt
      const footerText = `Norbert Bartus | St.-Nr.: 68194547329 | USt-IdNr.: DE346419031 | ${validLanguage === 'hu' ? `${i+1}. oldal` : (validLanguage === 'de' ? `Seite ${i+1}` : `Page ${i+1}`)} / ${pageCount}`;
      doc.text(footerText, 50, footerTop, {
        align: 'center',
        width: doc.page.width - 100
      });
    }

    // Update document to increase download count
    document.downloadCount = (document.downloadCount || 0) + 1;
    document.lastDownloadedAt = new Date();
    await document.save();

    // Finalize PDF and send response
    doc.end();
    console.log(`PDF generálás befejezve: ${fileName}`);

  } catch (error) {
    console.error(`PDF generálási hiba: ${error.message}`);
    console.error(error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        message: 'Hiba történt a PDF generálása során',
        error: error.message
      });
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
};

// Eredeti végpont a PDF generáláshoz
router.get('/documents/:id/pdf', corsMiddleware, apiKeyChecker, generatePDF);

// Publikus végpont a PDF generáláshoz - ugyanazt a funkcionalitást biztosítja
router.get('/public/documents/:id/pdf', corsMiddleware, apiKeyChecker, generatePDF);

// Védett végpontok
router.use(authMiddleware);

// Fájl útvonalak beállítása
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/documents');

// Létrehozzuk a mappát, ha nem létezik
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Uploads directory created: ${uploadsDir}`);
  }
} catch (error) {
  console.error(`Error creating uploads directory: ${error.message}`);
}

// Összes dokumentumsablon lekérése
router.get('/document-templates', apiKeyChecker, async (req, res) => {
  try {
    const { type, language, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (language) query.language = language;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await DocumentTemplate.find(query).sort({ updatedAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Hiba a dokumentumsablonok lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Új dokumentumsablon létrehozása
router.post('/document-templates', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      content,
      variables,
      sections,
      styling,
      language,
      tags,
      isDefault
    } = req.body;

    // Alap ellenőrzések
    if (!name || !type || !content) {
      return res.status(400).json({ message: 'Név, típus és tartalom megadása kötelező' });
    }

    // Ha isDefault=true, akkor frissítsük a többi hasonló típusút
    if (isDefault) {
      await DocumentTemplate.updateMany(
        { type, language, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new DocumentTemplate({
      name,
      description,
      type,
      content,
      variables: variables || [],
      sections: sections || [],
      styling: styling || {},
      language: language || 'hu',
      tags: tags || [],
      isDefault,
      createdBy: req.userData.email
    });

    const savedTemplate = await template.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Hiba a dokumentumsablon létrehozásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentumsablon lekérése ID alapján
router.get('/document-templates/:id', apiKeyChecker, async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Dokumentumsablon nem található' });
    }

    res.json(template);
  } catch (error) {
    console.error('Hiba a dokumentumsablon lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentumsablon frissítése
router.put('/document-templates/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      content,
      variables,
      sections,
      styling,
      language,
      tags,
      isDefault
    } = req.body;

    // Alap ellenőrzések
    if (!name || !type || !content) {
      return res.status(400).json({ message: 'Név, típus és tartalom megadása kötelező' });
    }

    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Dokumentumsablon nem található' });
    }

    // Ha isDefault=true, akkor frissítsük a többi hasonló típusút
    if (isDefault && !template.isDefault) {
      await DocumentTemplate.updateMany(
        { type, language, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // Verziókezelés - ha a tartalmat módosítják
    let version = template.version;
    if (template.content !== content) {
      version += 1;
    }

    // Adatok frissítése
    template.name = name;
    template.description = description;
    template.type = type;
    template.content = content;
    template.variables = variables || template.variables;
    template.sections = sections || template.sections;
    template.styling = styling || template.styling;
    template.language = language || template.language;
    template.tags = tags || template.tags;
    template.isDefault = isDefault;
    template.version = version;
    template.updatedAt = new Date();

    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Hiba a dokumentumsablon frissítésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentumsablon törlése
router.delete('/document-templates/:id', async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Ellenőrzés, hogy használták-e már a sablont dokumentum generáláshoz
    const documentCount = await GeneratedDocument.countDocuments({ templateId: req.params.id });

    if (documentCount > 0) {
      // Opció 2: Archivált állapotba helyezzük törlés helyett
      template.isArchived = true;
      await template.save();
      return res.json({
        message: 'A sablon archiválva lett, mivel már készült belőle dokumentum',
        archived: true
      });
    }

    await DocumentTemplate.deleteOne({ _id: req.params.id });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dokumentum generálása sablon alapján
router.post('/documents/generate', apiKeyChecker, async (req, res) => {
  try {
    const { templateId, projectId, variables } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Sablon azonosító megadása kötelező' });
    }

    // Sablon és projekt lekérése
    const template = await DocumentTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Dokumentumsablon nem található' });
    }

    let projectData = {};
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Projekt nem található' });
      }
      projectData = project;
    }

    // Változók feldolgozása
    let processedContent = template.content;

    // Alapértelmezett változók
    const defaultVars = {
      currentDate: new Date().toLocaleDateString('hu-HU'),
      companyName: 'NB Studio',
      companyAddress: '1234 Budapest, Példa utca 1.',
      companyTaxId: '12345678-1-42',
      companyEmail: 'info@nb-studio.net',
      companyPhone: '+36 30 123 4567',
      companyWebsite: 'www.nb-studio.net'
    };

    // Projekt változók
    if (projectId) {
      const projectVars = {
        projectName: projectData.name,
        projectDescription: projectData.description || '',
        projectStartDate: projectData.startDate ? new Date(projectData.startDate).toLocaleDateString('hu-HU') : '',
        projectEndDate: projectData.expectedEndDate ? new Date(projectData.expectedEndDate).toLocaleDateString('hu-HU') : '',
        clientName: projectData.client?.name || '',
        clientEmail: projectData.client?.email || '',
        clientPhone: projectData.client?.phone || '',
        clientCompany: projectData.client?.companyName || '',
        clientTaxId: projectData.client?.taxNumber || '',
        clientAddress: projectData.client?.address ?
          `${projectData.client.address.postalCode || ''} ${projectData.client.address.city || ''}, ${projectData.client.address.street || ''}` : ''
      };

      // Minden projekt változó hozzáadása
      Object.entries(projectVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
    }

    // Alapértelmezett változók hozzáadása
    Object.entries(defaultVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    // Egyedi változók hozzáadása
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
    }

    // Generált dokumentum létrehozása
    const generateName = `${template.name} - ${new Date().toLocaleDateString('hu-HU')}`;

    const generatedDocument = new GeneratedDocument({
      templateId,
      projectId,
      name: generateName,
      content: processedContent,
      htmlVersion: processedContent, // Itt tárolhatjuk a HTML verziót is
      generatedBy: req.userData.email,
      version: 1
    });

    const savedDocument = await generatedDocument.save();

    // Frissítsük a sablon használati számát
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    await template.save();

    res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Hiba a dokumentum generálásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Összes generált dokumentum lekérése
router.get('/documents', apiKeyChecker, async (req, res) => {
  try {
    const { projectId, status } = req.query;
    let query = {};

    if (projectId) query.projectId = projectId;
    if (status) query.approvalStatus = status;

    const documents = await GeneratedDocument.find(query)
      .populate('templateId', 'name type')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Hiba a dokumentumok lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generált dokumentum lekérése ID alapján
router.get('/documents/:id', apiKeyChecker, async (req, res) => {
  try {
    console.log('Dokumentum lekérés, kért ID:', req.params.id);

    const document = await GeneratedDocument.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');

    if (!document) {
      console.log('Dokumentum nem található ezzel az ID-val');
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log('Visszaküldött dokumentum:', document._id, document.name);
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Dokumentum állapotának frissítése (jóváhagyási folyamat)
router.put('/documents/:id/status', async (req, res) => {
  try {
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Státusz megadása kötelező' });
    }

    const document = await GeneratedDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }

    // Státusz frissítése
    document.approvalStatus = status;

    // Ha jóváhagyva vagy elutasítva, akkor mentsük a felhasználót és időpontot
    if (status === 'approved') {
      document.approvedBy = req.userData.email;
      document.approvedAt = new Date();
    }

    // Ha van megjegyzés, adjuk hozzá
    if (comment) {
      document.comments.push({
        user: req.userData.email,
        text: comment,
        timestamp: new Date()
      });
    }

    // Mentés
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Hiba a dokumentum státuszának frissítésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum küldése emailben
router.post('/documents/:id/send', async (req, res) => {
  try {
    const { email, subject, message, language = 'hu' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email cím megadása kötelező' });
    }

    const document = await GeneratedDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }

    // Ha nincs még megosztási link, generáljunk egyet
    if (!document.sharing || !document.sharing.token) {
      // Lejárati dátum számítása (30 nap)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Token generálása
      const { v4: uuidv4 } = await import('uuid');
      const shareToken = uuidv4();

      // 6 jegyű PIN kód generálása
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      // Megosztási link generálása
      const shareLink = `https://project.nb-studio.net/shared-document/${shareToken}`;

      // Megosztási adatok mentése
      document.sharing = {
        token: shareToken,
        pin: pin,
        link: shareLink,
        expiresAt: expiryDate,
        createdAt: new Date()
      };

      await document.save();
    }

    // Email küldése
    const emailResult = await sendDocumentShareEmail(
      document,
      email,
      document.sharing.link,
      document.sharing.pin,
      language,
      message // Egyéni üzenet
    );

    if (!emailResult.success) {
      throw new Error(`Email küldési hiba: ${emailResult.error}`);
    }

    // Frissítsük a dokumentum állapotát
    document.approvalStatus = 'sent';
    document.sentTo = email;
    document.sentAt = new Date();

    await document.save();

    res.json({
      success: true,
      message: `Dokumentum sikeresen elküldve a következő címre: ${email}`,
      shareLink: document.sharing.link,
      pin: document.sharing.pin
    });
  } catch (error) {
    console.error('Hiba a dokumentum küldésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum megosztási link generálása (új verzió - sharing field használatával)
router.post('/documents/:id/share-document', async (req, res) => {
  try {
    const { expiryDays = 30 } = req.body;

    const document = await GeneratedDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }

    // Lejárati dátum számítása
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(expiryDays));

    // Token generálása
    const { v4: uuidv4 } = await import('uuid');
    const shareToken = uuidv4();

    // 6 jegyű PIN kód generálása
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Megosztási link generálása
    const shareLink = `https://project.nb-studio.net/shared-document/${shareToken}`;

    // Megosztási adatok mentése
    document.sharing = {
      token: shareToken,
      pin: pin,
      link: shareLink,
      expiresAt: expiryDate,
      createdAt: new Date()
    };

    await document.save();

    res.status(200).json({
      shareLink,
      pin,
      expiresAt: expiryDate,
      createdAt: document.sharing.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Dokumentum publikus adatainak lekérése token alapján
router.get('/public/shared-document/:token/info', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const document = await GeneratedDocument.findOne({ 'sharing.token': req.params.token });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Ellenőrizzük a lejárati dátumot
    if (document.sharing.expiresAt && new Date() > document.sharing.expiresAt) {
      return res.status(403).json({ message: 'A megtekintési link lejárt' });
    }

    // Csak minimális adatokat küldünk vissza PIN bekéréshez
    const basicInfo = {
      id: document._id,
      name: document.name,
      expiresAt: document.sharing.expiresAt,
      requiresPin: true,
      createdAt: document.createdAt
    };

    res.json(basicInfo);
  } catch (error) {
    console.error('Hiba a megosztott dokumentum információ lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum PIN kód ellenőrzése
router.post('/public/shared-document/:token/verify', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'PIN kód megadása kötelező' });
    }

    const document = await GeneratedDocument.findOne({ 'sharing.token': req.params.token });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Lejárat ellenőrzése
    if (document.sharing.expiresAt && new Date() > document.sharing.expiresAt) {
      return res.status(403).json({ message: 'A megosztási link lejárt' });
    }

    if (document.sharing.pin !== pin) {
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    const documentData = {
      id: document._id,
      name: document.name,
      content: document.htmlVersion || document.content,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    res.json(documentData);
  } catch (error) {
    console.error('Hiba a dokumentum megtekintésnél:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum törlése
router.delete('/documents/:id', async (req, res) => {
  try {
    const document = await GeneratedDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }

    await GeneratedDocument.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Dokumentum sikeresen törölve'
    });
  } catch (error) {
    console.error('Hiba a dokumentum törlésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Publikus dokumentum információ lekérése (PIN bekérés előtt)
router.get('/public/documents/:token/info', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const document = await GeneratedDocument.findOne({ publicToken: req.params.token });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Ellenőrizzük a lejárati dátumot
    if (document.publicViewExpires && new Date() > document.publicViewExpires) {
      return res.status(403).json({ message: 'A megtekintési link lejárt' });
    }

    // Csak minimális adatokat küldünk vissza PIN bekéréshez
    const basicInfo = {
      id: document._id,
      name: document.name,
      publicToken: document.publicToken,
      expiresAt: document.publicViewExpires,
      requiresPin: true,
      createdAt: document.createdAt
    };

    res.json(basicInfo);
  } catch (error) {
    console.error('Hiba a publikus dokumentum információ lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Publikus dokumentum megtekintési végpont PIN ellenőrzéssel
router.post('/public/documents/:token/verify', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'PIN kód megadása kötelező' });
    }

    const document = await GeneratedDocument.findOne({ publicToken: req.params.token })
      .populate('templateId')
      .populate('projectId');

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Ellenőrizzük a lejárati dátumot
    if (document.publicViewExpires && new Date() > document.publicViewExpires) {
      return res.status(403).json({ message: 'A megtekintési link lejárt' });
    }

    // Ellenőrizzük a PIN kódot
    if (document.publicPin !== pin) {
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    // Csak a szükséges adatokat küldjük vissza
    const sanitizedDocument = {
      id: document._id,
      name: document.name,
      content: document.htmlVersion || document.content,
      publicToken: document.publicToken,
      expiresAt: document.publicViewExpires,
      status: document.approvalStatus,
      createdAt: document.createdAt
    };

    res.json(sanitizedDocument);
  } catch (error) {
    console.error('Hiba a publikus dokumentum lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Ügyfél dokumentum elfogadás/elutasítás (régi végpont - publicToken használatával)
router.post('/public/documents/:token/response', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const { response, comment, pin } = req.body;

    if (!response || !['approve', 'reject'].includes(response)) {
      return res.status(400).json({ message: 'Érvénytelen válasz. Kérjük, válaszd az "approve" vagy "reject" opciót.' });
    }

    if (!pin) {
      return res.status(400).json({ message: 'PIN kód megadása kötelező' });
    }

    const document = await GeneratedDocument.findOne({ publicToken: req.params.token });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Ellenőrizzük a lejárati dátumot
    if (document.publicViewExpires && new Date() > document.publicViewExpires) {
      return res.status(403).json({ message: 'A dokumentum elfogadási link lejárt' });
    }

    // Ellenőrizzük a PIN kódot
    if (document.publicPin !== pin) {
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    // Frissítsük a dokumentum státuszát
    if (response === 'approve') {
      document.approvalStatus = 'clientApproved';
      document.clientApprovedAt = new Date();
    } else {
      document.approvalStatus = 'clientRejected';
      document.clientRejectedAt = new Date();
    }

    // Mentsük a megjegyzést, ha van
    if (comment) {
      document.clientApprovalComment = comment;
      document.comments.push({
        user: 'Client',
        text: comment,
        timestamp: new Date()
      });
    }

    await document.save();

    res.json({
      success: true,
      message: response === 'approve' ? 'Dokumentum sikeresen elfogadva' : 'Dokumentum elutasítva',
      documentStatus: document.approvalStatus
    });
  } catch (error) {
    console.error('Hiba a dokumentum ügyfél válaszának feldolgozásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Ügyfél dokumentum elfogadás/elutasítás (új végpont - sharing.token használatával)
router.post('/public/shared-document/:token/response', corsMiddleware, apiKeyChecker, async (req, res) => {
  try {
    const { response, comment, pin } = req.body;

    if (!response || !['approve', 'reject'].includes(response)) {
      return res.status(400).json({ message: 'Érvénytelen válasz. Kérjük, válaszd az "approve" vagy "reject" opciót.' });
    }

    if (!pin) {
      return res.status(400).json({ message: 'PIN kód megadása kötelező' });
    }

    const document = await GeneratedDocument.findOne({ 'sharing.token': req.params.token });

    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található vagy a link érvénytelen' });
    }

    // Ellenőrizzük a lejárati dátumot
    if (document.sharing.expiresAt && new Date() > document.sharing.expiresAt) {
      return res.status(403).json({ message: 'A dokumentum elfogadási link lejárt' });
    }

    // Ellenőrizzük a PIN kódot
    if (document.sharing.pin !== pin) {
      return res.status(403).json({ message: 'Érvénytelen PIN kód' });
    }

    // Frissítsük a dokumentum státuszát
    if (response === 'approve') {
      document.approvalStatus = 'clientApproved';
      document.clientApprovedAt = new Date();
    } else {
      document.approvalStatus = 'clientRejected';
      document.clientRejectedAt = new Date();
    }

    // Mentsük a megjegyzést, ha van
    if (comment) {
      document.clientApprovalComment = comment;
      document.comments.push({
        user: 'Client',
        text: comment,
        timestamp: new Date()
      });
    }

    await document.save();

    res.json({
      success: true,
      message: response === 'approve' ? 'Dokumentum sikeresen elfogadva' : 'Dokumentum elutasítva',
      documentStatus: document.approvalStatus
    });
  } catch (error) {
    console.error('Hiba a dokumentum ügyfél válaszának feldolgozásakor:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;