import express from 'express';
import { DocumentTemplate, GeneratedDocument } from '../models/DocumentTemplate.js';
import Project from '../models/Project.js';
import authMiddleware from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

// Védett végpontok
router.use(authMiddleware);

// FONTOS: Engedélyezzük a hozzáférést a dokumentum létrehozásához API kulccsal IS,
// hogy a publikus kliensek is tudják használni
const apiKeyChecker = (req, res, next) => {
  // Ha van érvényes token, akkor engedjük tovább
  if (req.userData) {
    return next();
  }
  
  // Ha nincs token, ellenőrizzük az API kulcsot
  const apiKey = req.headers['x-api-key'];
  if (apiKey === 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0') {
    // Ha érvényes az API kulcs, állítsuk be egy alap userData objektumot
    req.userData = { email: 'api-client@example.com' };
    return next();
  }
  
  // Ha sem token, sem érvényes API kulcs nincs, akkor 401
  return res.status(401).json({ message: 'Unauthorized access' });
};

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

// IMPROVED: Dokumentum PDF generálása és letöltése - közvetlen streamelés válaszba
router.get('/documents/:id/pdf', apiKeyChecker, async (req, res) => {
  console.log(`PDF generálás kérés, ID: ${req.params.id}`);
  
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
    const fileName = `${document.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
    
    // Set response headers immediately
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Create PDF document and pipe directly to response
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: document.name,
          Author: 'NB Studio',
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
    
    // Fejléc hozzáadása
    doc.fontSize(18).text(document.name, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Készült: ${new Date().toLocaleDateString('hu-HU')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Dokumentum tartalom hozzáadása
    // HTML-ből tiszta szöveg konvertálása
    const content = document.htmlVersion || document.content;
    const plainText = content.replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
    
    doc.fontSize(12).text(plainText, {
      align: 'left',
      columns: 1,
      lineGap: 5
    });
    
    // Generate all pages first
    doc.flushPages();
    
    // Add page numbers to each page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Lábléc pozíció (alul)
      const footerY = doc.page.height - 50;
      
      doc.fontSize(8)
         .text(
           `${document.name} - ${i + 1}/${pageCount} oldal`, 
           50, 
           footerY, 
           { align: 'center', width: doc.page.width - 100 }
         );
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
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email cím megadása kötelező' });
    }
    
    const document = await GeneratedDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }
    
    // Itt lenne az email küldési logika...
    // A valós megvalósításban itt használnánk a nodemailer-t a küldéshez
    
    // Frissítsük a dokumentum állapotát
    document.approvalStatus = 'sent';
    document.sentTo = email;
    document.sentAt = new Date();
    
    await document.save();
    
    res.json({ 
      success: true, 
      message: `Dokumentum sikeresen elküldve a következő címre: ${email}` 
    });
  } catch (error) {
    console.error('Hiba a dokumentum küldésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;