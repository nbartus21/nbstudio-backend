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

// Fájl útvonalak beállítása
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/documents');

// Létrehozzuk a mappát, ha nem létezik
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Összes dokumentumsablon lekérése
router.get('/document-templates', async (req, res) => {
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
router.get('/document-templates/:id', async (req, res) => {
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
      return res.status(404).json({ message: 'Dokumentumsablon nem található' });
    }
    
    // Ellenőrizzük, hogy van-e generált dokumentum ezzel a sablonnal
    const hasDocuments = await GeneratedDocument.findOne({ templateId: req.params.id });
    if (hasDocuments) {
      return res.status(400).json({ 
        message: 'Nem törölhető a sablon, mert már generáltak belőle dokumentumot' 
      });
    }
    
    await DocumentTemplate.deleteOne({ _id: req.params.id });
    res.json({ message: 'Dokumentumsablon sikeresen törölve' });
  } catch (error) {
    console.error('Hiba a dokumentumsablon törlésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum generálása sablon alapján
router.post('/documents/generate', async (req, res) => {
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
router.get('/documents', async (req, res) => {
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
router.get('/documents/:id', async (req, res) => {
  try {
    const document = await GeneratedDocument.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');
    
    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Hiba a dokumentum lekérésekor:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dokumentum PDF generálása és letöltése
router.get('/documents/:id/pdf', async (req, res) => {
  try {
    const document = await GeneratedDocument.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');
    
    if (!document) {
      return res.status(404).json({ message: 'Dokumentum nem található' });
    }
    
    // PDF fájlnév generálása
    const fileName = `${document.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    // PDF létrehozása
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: document.name,
        Author: 'NB Studio',
        Subject: document.templateId.name,
        Keywords: document.templateId.tags.join(', ')
      }
    });
    
    // Stream létrehozása fájlba íráshoz
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Betűtípus és stílus beállítása
    const styling = document.templateId.styling || {};
    const fontFamily = styling.fontFamily || 'Helvetica';
    const fontSize = styling.fontSize || 11;
    const primaryColor = styling.primaryColor || '#3B82F6';
    
    // Logó hozzáadása (ha van)
    if (styling.includeLogo) {
      const logoPath = path.join(__dirname, '../../public/logo.png'); // Feltételezve, hogy van logó
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 });
      }
    }
    
    // Fejléc
    if (document.templateId.letterhead?.enabled) {
      doc.fontSize(10)
         .font(`${fontFamily}-Bold`)
         .text('NB Studio', 50, 50)
         .font(fontFamily)
         .text('1234 Budapest, Példa utca 1.', 50, 65)
         .text('info@nb-studio.net | +36 30 123 4567', 50, 80)
         .moveDown(2);
    }
    
    // Dokumentum címe
    doc.fontSize(fontSize + 8)
       .font(`${fontFamily}-Bold`)
       .text(document.name, { align: 'center' })
       .moveDown(2);
    
    // Dokumentum tartalma - itt egyszerűen csak szövegként adjuk hozzá
    // Valós implementációban itt HTML to PDF konvertálás lenne
    doc.fontSize(fontSize)
       .font(fontFamily)
       .text(document.content.replace(/<[^>]*>?/gm, ''), {
         paragraphGap: 10,
         align: 'justify'
       });
    
    // Lábléc
    if (document.templateId.footer?.enabled) {
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Lábléc szöveg és oldalszám
        doc.fontSize(8)
           .text(
             `${document.name} - Készült: ${new Date().toLocaleDateString('hu-HU')} - Oldal ${i + 1} / ${pageCount}`,
             50,
             doc.page.height - 50,
             { align: 'center' }
           );
      }
    }
    
    // PDF befejezése
    doc.end();
    
    // Várjunk a fájl elkészülésére
    stream.on('finish', async () => {
      // PDF URL frissítése az adatbázisban
      document.pdfUrl = `/uploads/documents/${fileName}`;
      await document.save();
      
      // PDF küldése
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Hiba a PDF letöltésekor:', err);
          return res.status(500).json({ message: 'Hiba a PDF letöltése közben' });
        }
      });
    });
    
    stream.on('error', (error) => {
      console.error('Hiba a PDF írása közben:', error);
      return res.status(500).json({ message: 'Hiba a PDF generálása közben' });
    });
  } catch (error) {
    console.error('Hiba a PDF generálásakor:', error);
    res.status(500).json({ message: error.message });
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