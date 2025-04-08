import express from 'express';
import { DocumentTemplate, Document } from '../models/DocumentTemplate.js';
import Project from '../models/Project.js';
import authMiddleware from '../middleware/auth.js';
import documentService from '../services/documentService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// CORS middleware for public routes
const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// API key middleware for public access
const apiKeyMiddleware = (req, res, next) => {
  // Skip if user is already authenticated via token
  if (req.userData) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  const validApiKey = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
  
  if (apiKey === validApiKey) {
    req.userData = { email: 'api-client@nb-studio.net' };
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized access' });
};

// Public routes (with API key)
// Get document info by token
router.get('/public/documents/:token/info', corsMiddleware, apiKeyMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({ 'sharing.token': req.params.token });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check if sharing has expired
    if (document.sharing.expiresAt < new Date()) {
      return res.status(403).json({ message: 'Document sharing has expired' });
    }
    
    // Return basic document info
    return res.json({
      id: document._id,
      name: document.name,
      expiresAt: document.sharing.expiresAt,
      language: document.sharing.language || 'hu'
    });
  } catch (error) {
    console.error('Error getting document info:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify document PIN
router.post('/public/documents/:token/verify', corsMiddleware, apiKeyMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }
    
    try {
      const document = await documentService.verifyDocumentPin(req.params.token, pin);
      
      // Return document content
      return res.json({
        id: document._id,
        name: document.name,
        content: document.content,
        createdAt: document.createdAt
      });
    } catch (error) {
      return res.status(403).json({ message: error.message });
    }
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get document as PDF
router.get('/public/documents/:token/pdf', corsMiddleware, apiKeyMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({ 'sharing.token': req.params.token });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check if sharing has expired
    if (document.sharing.expiresAt < new Date()) {
      return res.status(403).json({ message: 'Document sharing has expired' });
    }
    
    // Get language from query parameter or document sharing settings
    const language = req.query.language || document.sharing.language || 'hu';
    
    // Generate PDF
    const pdfBuffer = await documentService.generatePDF(document, language);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${document.name}.pdf"`);
    
    // Increment download count
    document.downloads += 1;
    await document.save();
    
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Protected routes (require authentication)
router.use(authMiddleware);

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const { type, language } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (language) query.language = language;
    
    const templates = await DocumentTemplate.find(query).sort({ updatedAt: -1 });
    return res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { name, description, type, content, variables, language, isDefault } = req.body;
    
    if (!name || !type || !content) {
      return res.status(400).json({ message: 'Name, type, and content are required' });
    }
    
    // If setting as default, update other templates of same type/language
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
      language: language || 'hu',
      isDefault: isDefault || false,
      createdBy: req.userData.email
    });
    
    const savedTemplate = await template.save();
    return res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    return res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, description, type, content, variables, language, isDefault } = req.body;
    
    if (!name || !type || !content) {
      return res.status(400).json({ message: 'Name, type, and content are required' });
    }
    
    const template = await DocumentTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // If setting as default, update other templates of same type/language
    if (isDefault && !template.isDefault) {
      await DocumentTemplate.updateMany(
        { type, language, isDefault: true },
        { $set: { isDefault: false } }
      );
    }
    
    // Increment version if content has changed
    let version = template.version;
    if (template.content !== content) {
      version += 1;
    }
    
    // Update template
    template.name = name;
    template.description = description;
    template.type = type;
    template.content = content;
    template.variables = variables || template.variables;
    template.language = language || template.language;
    template.isDefault = isDefault;
    template.version = version;
    
    const updatedTemplate = await template.save();
    return res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Check if template is used by any documents
    const documentCount = await Document.countDocuments({ templateId: req.params.id });
    
    if (documentCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete template that is used by documents',
        documentCount
      });
    }
    
    await DocumentTemplate.deleteOne({ _id: req.params.id });
    return res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const { projectId, status } = req.query;
    const query = {};
    
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    
    const documents = await Document.find(query)
      .populate('templateId', 'name type')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });
    
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create document
router.post('/documents', async (req, res) => {
  try {
    const { templateId, projectId, name, variables } = req.body;
    
    if (!templateId || !name) {
      return res.status(400).json({ message: 'Template ID and name are required' });
    }
    
    // Get template
    const template = await DocumentTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Get project if provided
    let projectData = {};
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      projectData = project;
    }
    
    // Prepare variables for template processing
    const templateVariables = {
      // Add default variables
      ...documentService.getDefaultTemplateData(template.type, template.language),
      
      // Add project variables if available
      ...(projectId ? {
        projectName: projectData.name || '',
        projectDescription: projectData.description || '',
        clientName: projectData.client?.name || '',
        clientEmail: projectData.client?.email || '',
        clientPhone: projectData.client?.phone || '',
        clientCompany: projectData.client?.companyName || '',
      } : {}),
      
      // Add custom variables
      ...variables
    };
    
    // Process template
    const content = documentService.processTemplate(template.content, templateVariables);
    
    // Create document
    const document = new Document({
      templateId,
      projectId: projectId || null,
      name,
      content,
      status: 'draft',
      createdBy: req.userData.email
    });
    
    const savedDocument = await document.save();
    return res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get document by ID
router.get('/documents/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    return res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update document
router.put('/documents/:id', async (req, res) => {
  try {
    const { name, content, status } = req.body;
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Update document
    if (name) document.name = name;
    if (content) document.content = content;
    if (status) document.status = status;
    
    const updatedDocument = await document.save();
    return res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete document
router.delete('/documents/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    await Document.deleteOne({ _id: req.params.id });
    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get document as PDF
router.get('/documents/:id/pdf', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get language from query parameter
    const language = req.query.language || 'hu';
    
    // Generate PDF
    const pdfBuffer = await documentService.generatePDF(document, language);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${document.name}.pdf"`);
    
    // Increment download count
    document.downloads += 1;
    await document.save();
    
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Share document
router.post('/documents/:id/share', async (req, res) => {
  try {
    const { email, language } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Share document
    const result = await documentService.shareDocument(
      req.params.id,
      email,
      language || 'hu'
    );
    
    return res.json(result);
  } catch (error) {
    console.error('Error sharing document:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;