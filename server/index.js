import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
// PDF generation dependencies
import PDFDocument from 'pdfkit';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { setupCronJobs } from './cronJobs.js';

// Import models
import Contact from './models/Contact.js';
import Hosting from './models/Hosting.js';
import HostingNotification from './models/HostingNotification.js';
import Calculator from './models/Calculator.js';
import Post from './models/Post.js';
import Note from './models/Note.js';
import Task from './models/Task.js';

// Import routes
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';
import calculatorRoutes from './routes/calculators.js';
import projectRoutes from './routes/projects.js';
import domainRoutes from './routes/domains.js';
import serverRoutes from './routes/servers.js';
import licenseRoutes from './routes/licenses.js';
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';
import accountingRoutes from './routes/accounting.js';
import hostingRoutes from './routes/hosting.js';
import filesRoutes from './routes/files.js';
import commentsRoutes from './routes/comments.js';
import translationRoutes from './routes/translation.js';
import notesRoutes from './routes/notes.js';
import tasksRoutes from './routes/tasks.js';
import supportTicketRouter, { setupEmailEndpoint, initializeSocketIO } from './routes/supportTickets.js';
import emailApiRouter from './routes/emailApi.js';
import documentsRouter from './routes/documents.js';
import chatApiRouter from './routes/chatApi.js';
import paymentsRouter from './routes/payments.js';

// Import middleware
import authMiddleware from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

// Create HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://admin.nb-studio.net',
      'https://nb-studio.net',
      'https://www.nb-studio.net',
      'https://project.nb-studio.net',
      'http://38.242.208.190:5173',
      'http://localhost:5173',
      '*',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO for support tickets
initializeSocketIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected to Socket.IO:', socket.id);
  
  socket.on('joinTicket', (ticketId) => {
    console.log(`${socket.id} joined ticket_${ticketId} room`);
    socket.join(`ticket_${ticketId}`);
  });
  
  socket.on('leaveTicket', (ticketId) => {
    console.log(`${socket.id} left ticket_${ticketId} room`);
    socket.leave(`ticket_${ticketId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// SSL configuration
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/fullchain.pem')
  };
  console.log('SSL certificates loaded successfully');
} catch (error) {
  console.error('Error loading SSL certificates:', error.message);
  process.exit(1);
}

// CORS configuration
const corsOptions = {
  origin: [
    'https://admin.nb-studio.net',
    'https://nb-studio.net',
    'https://www.nb-studio.net',
    'https://project.nb-studio.net',
    'https://project.nb-studio.net:5555',
    'http://38.242.208.190:5173',
    'http://38.242.208.190',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  // Hard-coded API key az egyszerűség kedvéért - ideális esetben környezeti változóból jönne
  const apiKey = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
  const receivedApiKey = req.headers['x-api-key'];
  
  console.log('API Key validation for route:', req.originalUrl);
  console.log('Headers received:', JSON.stringify(req.headers, null, 2));
  console.log('Received API key:', receivedApiKey ? 'Received' : 'Not provided');
  
  // Speciális kezelés a payments végpontokhoz
  if (req.originalUrl.includes('/payments/') && req.method === 'POST') {
    console.log('Payments endpoint detected - skip API key validation temporarily for debugging');
    return next();
  }
  
  if (!receivedApiKey) {
    console.error('No API key received in the request');
    return res.status(401).json({ 
      message: 'API key is required',
      url: req.originalUrl,
      method: req.method
    });
  }

  if (receivedApiKey === apiKey) {
    console.log('API key validation successful');
    next();
  } else {
    console.error('API key validation failed');
    console.error('Expected:', apiKey);
    console.error('Received:', receivedApiKey);
    res.status(401).json({ 
      message: 'Invalid API key',
      url: req.originalUrl,
      method: req.method
    });
  }
};

// Debug middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// ==============================================
// PUBLIC ENDPOINTS (No authentication required)
// ==============================================
// Note: PDF generation functionality is implemented in route handlers
// such as invoices.js, projects.js, and other modules that need to 
// generate PDF documents
const publicRouter = express.Router();

// Payments routes - don't require authentication
app.use('/api/payments', validateApiKey, paymentsRouter);

// Contact form endpoint
publicRouter.post('/contact', validateApiKey, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }
    
    const contact = new Contact({
      name,
      email,
      subject: subject || 'Contact Form Submission',
      message,
      status: 'new'
    });
    
    await contact.save();
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      message: 'Error sending message'
    });
  }
});

// Calculator endpoint
publicRouter.post('/calculators', validateApiKey, async (req, res) => {
  try {
    const calculator = new Calculator(req.body);
    await calculator.save();
    
    res.status(201).json({
      success: true,
      message: 'Calculation saved successfully'
    });
  } catch (error) {
    console.error('Calculator form error:', error);
    res.status(500).json({
      message: 'Error saving calculation'
    });
  }
});

// Hosting order endpoint
publicRouter.post('/hosting/orders', validateApiKey, async (req, res) => {
  try {
    const order = new Hosting(req.body);
    await order.save();

    // Create notification for new order
    const notification = new HostingNotification({
      type: 'new_order',
      title: 'New hosting order',
      message: `New ${order.plan.name} package ordered by ${order.client.name}`,
      severity: 'info',
      orderId: order._id,
      link: '/hosting'
    });
    
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id
    });
  } catch (error) {
    console.error('Hosting order error:', error);
    res.status(500).json({
      message: 'Error processing order'
    });
  }
});

// Register public endpoints
app.use('/api/public', publicRouter);

// Public chat endpoint - külön kezelő a root path számára
app.post('/api/public/chat', validateApiKey, async (req, res) => {
  try {
    console.log('Root chat API kérés érkezett a /api/public/chat útvonalra');
    
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Érvénytelen kérés formátum' });
    }
    
    // Call DeepSeek API
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-a781f0251b034cf6b91f970b43d9caa5';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
    
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: messages,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('DeepSeek API hiba:', errorData);
        return res.status(response.status).json({ 
          message: 'Hiba az AI szolgáltatásnál',
          error: errorData 
        });
      }
      
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      console.error('Hiba a DeepSeek API hívása során:', error);
      return res.status(500).json({ 
        message: 'Hiba az AI szolgáltatás elérése során',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Általános hiba a chat kezelése során:', error);
    res.status(500).json({ 
      message: 'Szerverhiba a chat kérés feldolgozása során',
      error: error.message 
    });
  }
});

// A többi chat útvonal is használhatja ugyanezt a routert
app.use('/api/public/chat', validateApiKey, chatApiRouter);

// Add authenticated chat endpoints
app.use('/api/chat', authMiddleware, chatApiRouter);

// Public blog posts endpoint (no auth required)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find({ published: true }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public project endpoints
app.use('/api/public/projects', validateApiKey, projectRoutes);

// Email API routes
app.use('/api/email', emailApiRouter);

// Setup email webhook for support tickets
setupEmailEndpoint(app);

// Auth routes (for login/logout)
app.use('/api/auth', authRoutes);

// ==============================================
// PUBLIC ENDPOINTS FOR SHARED PROJECTS (No authentication required)
// ==============================================

// Public endpoint to fetch project documents 
app.get('/api/public/projects/:projectId/documents', validateApiKey, async (req, res) => {
  try {
    console.log(`Public documents request for project ID: ${req.params.projectId}`);
    
    // Import necessary models
    const GeneratedDocument = mongoose.model('GeneratedDocument');
    
    // Find documents for this project
    const documents = await GeneratedDocument.find({ 
      projectId: req.params.projectId 
    }).populate('templateId', 'name type').sort({ createdAt: -1 });
    
    console.log(`Found ${documents.length} documents for project ${req.params.projectId}`);
    res.json(documents);
  } catch (error) {
    console.error(`Error fetching public project documents: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==============================================
// PUBLIC PDF ENDPOINTS (No authentication required)
// ==============================================

// Public Document PDF endpoint
app.get('/api/documents/:id/pdf', async (req, res) => {
  try {
    console.log(`Public PDF generation request for document ID: ${req.params.id}`);
    
    // Import necessary models if not available
    const GeneratedDocument = mongoose.model('GeneratedDocument');
    
    // Find the document
    const document = await GeneratedDocument.findById(req.params.id)
      .populate('templateId')
      .populate('projectId');
    
    if (!document) {
      console.error(`Document not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`Found document: ${document.name} (${document._id})`);
    
    // Generate safe filename for download with .pdf extension
    let fileName = `${document.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`;
    // Ellenőrizzük, hogy van-e .pdf kiterjesztés
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Create PDF document and pipe to response
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: document.name,
        Author: 'NB Studio',
        Subject: document.templateId?.name || 'Document',
        Keywords: document.templateId?.tags?.join(', ') || 'document'
      },
      autoFirstPage: true,
      bufferPages: true
    });
    
    // Pipe directly to response
    doc.pipe(res);
    
    // Error handling
    doc.on('error', (err) => {
      console.error(`PDF generation error: ${err}`);
      if (!res.finished) {
        doc.end();
      }
    });
    
    // Add header
    doc.fontSize(18).text(document.name, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString('hu-HU')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Add document content
    // Convert HTML to plain text
    const content = document.htmlVersion || document.content;
    const plainText = content.replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
    
    doc.fontSize(12).text(plainText, {
      align: 'left',
      columns: 1,
      lineGap: 5
    });
    
    // Generate all pages
    doc.flushPages();
    
    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer position
      const footerY = doc.page.height - 50;
      
      doc.fontSize(8)
         .text(
           `${document.name} - ${i + 1}/${pageCount} page`, 
           50, 
           footerY, 
           { align: 'center', width: doc.page.width - 100 }
         );
    }
    
    // Update document tracking info
    try {
      document.downloadCount = (document.downloadCount || 0) + 1;
      document.lastDownloadedAt = new Date();
      await document.save();
    } catch (saveErr) {
      console.error(`Error updating document tracking: ${saveErr.message}`);
      // Continue with PDF generation even if tracking update fails
    }
    
    // Finalize PDF
    doc.end();
    console.log(`PDF generation completed for: ${fileName}`);
    
  } catch (error) {
    console.error(`PDF generation error: ${error.message}`);
    console.error(error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error generating PDF', 
        error: error.message 
      });
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
});

// Public Invoice PDF endpoint
app.get('/api/projects/:projectId/invoices/:invoiceId/pdf', async (req, res) => {
  try {
    console.log(`Public PDF generation request for invoice. Project ID: ${req.params.projectId}, Invoice ID: ${req.params.invoiceId}`);
    
    // Import Project model if not already available
    const Project = mongoose.model('Project');
    
    // Find the project and invoice
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      console.error(`Project not found with ID: ${req.params.projectId}`);
      return res.status(404).json({ message: 'Projekt nem található' });
    }
    
    // Find the invoice in the project
    const invoice = project.invoices.id(req.params.invoiceId);
    
    if (!invoice) {
      console.error(`Invoice not found with ID: ${req.params.invoiceId} in project ${req.params.projectId}`);
      return res.status(404).json({ message: 'Számla nem található' });
    }
    
    // Generate PDF using PDFKit
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Számla-${invoice.number}`,
          Author: 'NB Studio',
          Creator: 'NB Studio Backend',
          Producer: 'PDFKit'
        },
        lang: 'hu-HU',
        displayTitle: true,
        font: 'Helvetica'
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=szamla-${invoice.number}.pdf`);
      
      // Pipe to response
      doc.pipe(res);
      
      // Define colors
      const colors = {
        primary: '#2563EB',    // Kék (főszín)
        text: '#111827',       // Sötét szürke (szöveg)
        lightText: '#6B7280',  // Világos szürke (másodlagos szöveg)
        accent: '#F3F4F6',     // Nagyon világos szürke (háttér)
        success: '#10B981',    // Zöld (fizetve állapot)
        warning: '#F59E0B',    // Sárga (lejárt állapot)
        border: '#E5E7EB'      // Szürke (szegély)
      };
      
      // Add top margin
      doc.moveDown(2);
      
      // Logo placeholder and company info (top section)
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(colors.primary)
         .text('NB STUDIO', 50, 60);
      
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(colors.lightText)
         .text('Bartus Norbert', 50, 85)
         .text('1234 Budapest, Példa utca 1.')
         .text('Adószám: 12345678-1-42')
         .text('info@nb-studio.net');
      
      // Számla title in the right column
      doc.font('Helvetica-Bold')
         .fontSize(28)
         .fillColor(colors.text)
         .text('SZÁMLA', 350, 60, { align: 'right' });
      
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor(colors.text)
         .text(`Számlaszám: ${invoice.number}`, 350, 90, { align: 'right' });
      
      // Add horizontal line
      doc.moveTo(50, 130)
         .lineTo(550, 130)
         .strokeColor(colors.border)
         .stroke();
      
      // Invoice details
      doc.fontSize(10)
         .fillColor(colors.lightText)
         .text('Kiállítás dátuma:', 50, 150);
        
      doc.fontSize(12)
         .fillColor(colors.text)
         .text(new Date(invoice.date).toLocaleDateString('hu-HU'), 150, 150);
      
      doc.fontSize(10)
         .fillColor(colors.lightText)
         .text('Fizetési határidő:', 50, 170);
        
      doc.fontSize(12)
         .fillColor(colors.text)
         .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), 150, 170);
      
      // Invoice status
      const statusLabel = invoice.status === 'fizetett' ? 'FIZETVE' : 
                         invoice.status === 'késedelmes' ? 'LEJÁRT' : 'KIÁLLÍTVA';
      const statusColor = invoice.status === 'fizetett' ? colors.success : 
                         invoice.status === 'késedelmes' ? colors.warning : colors.primary;
      
      doc.fontSize(10)
         .fillColor(colors.lightText)
         .text('Státusz:', 50, 190);
      
      doc.fontSize(11)
         .fillColor(statusColor)
         .font('Helvetica-Bold')
         .text(statusLabel, 150, 190);
      
      doc.font('Helvetica');
      
      // Customer box
      doc.rect(350, 150, 200, 90)
         .fillColor(colors.accent)
         .fill();
      
      doc.fillColor(colors.lightText)
         .fontSize(10)
         .text('Vevő:', 360, 155);
      
      // Check if client exists and has proper properties
      if (project.client) {
        doc.fillColor(colors.text)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(project.client.name || '', 360, 170);
           
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(colors.text);
           
        if (project.client.companyName) {
          doc.text(project.client.companyName, 360, 190);
        }
           
        if (project.client.taxNumber) {
          doc.text(`Adószám: ${project.client.taxNumber}`, 360, 205);
        }
           
        doc.text(`Email: ${project.client.email || ''}`, 360, 220);
      }
      
      // Items section title
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(colors.text)
         .text('Tételek', 50, 260);
      
      // Items table
      const tableTop = 290;
      const tableHeaders = ['Leírás', 'Mennyiség', 'Egységár', 'Összesen'];
      const columnWidths = [270, 70, 80, 80];
      
      // Table header background
      doc.rect(50, tableTop, 500, 25)
         .fillColor(colors.accent)
         .fill();
      
      // Table header text
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(colors.text);
      
      let xPosition = 50;
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        const padding = i === 0 ? 10 : 0;
        const width = columnWidths[i];
        
        doc.text(header, xPosition + padding, tableTop + 8, {
          width: width - padding,
          align: align
        });
        
        xPosition += width;
      });
      
      // Reset font
      doc.font('Helvetica');
      
      // Table rows
      let yPosition = tableTop + 35;
      let totalAmount = 0;
      
      // Check if items exist and are in proper format
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item, i) => {
          const quantity = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          const amount = quantity * unitPrice;
          totalAmount += amount;
          
          // Add subtle line between rows
          if (i > 0) {
            doc.moveTo(50, yPosition - 10)
               .lineTo(550, yPosition - 10)
               .strokeColor(colors.border)
               .strokeOpacity(0.5)
               .stroke();
          }
          
          // Reset to normal opacity
          doc.strokeOpacity(1);
          
          // Item cells
          xPosition = 50;
          
          // Description
          doc.fillColor(colors.text)
             .fontSize(10)
             .text(item.description || '', xPosition + 10, yPosition, { 
               width: columnWidths[0] - 10 
             });
          
          xPosition += columnWidths[0];
          
          // Quantity
          doc.text(quantity.toString(), xPosition, yPosition, { 
            width: columnWidths[1], 
            align: 'right' 
          });
          
          xPosition += columnWidths[1];
          
          // Unit price
          doc.text(`${unitPrice} EUR`, xPosition, yPosition, { 
            width: columnWidths[2], 
            align: 'right' 
          });
          
          xPosition += columnWidths[2];
          
          // Total amount
          doc.font('Helvetica-Bold')
             .text(`${amount} EUR`, xPosition, yPosition, { 
               width: columnWidths[3], 
               align: 'right' 
             });
          
          doc.font('Helvetica');
          
          // Move to next row
          yPosition += 40;
        });
      }
      
      // Totals section background
      const totalsTop = yPosition + 10;
      doc.rect(300, totalsTop, 250, 80)
         .fillColor(colors.accent)
         .fill();
      
      // Totals section content
      doc.fillColor(colors.text)
         .font('Helvetica')
         .fontSize(11)
         .text('Részösszeg:', 320, totalsTop + 15)
         .text('ÁFA (0%):', 320, totalsTop + 35)
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('Végösszeg:', 320, totalsTop + 55);
      
      // Totals amounts
      doc.font('Helvetica')
         .fontSize(11)
         .text(`${invoice.totalAmount || totalAmount} EUR`, 530, totalsTop + 15, { align: 'right' })
         .text('0 EUR', 530, totalsTop + 35, { align: 'right' })
         .font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(colors.primary)
         .text(`${invoice.totalAmount || totalAmount} EUR`, 530, totalsTop + 55, { align: 'right' });
      
      // Payment information section
      const paymentTop = totalsTop + 110;
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(colors.text)
         .text('Fizetési információk', 50, paymentTop);
      
      doc.strokeColor(colors.primary)
         .lineWidth(1)
         .moveTo(50, paymentTop + 20)
         .lineTo(200, paymentTop + 20)
         .stroke();
      
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(colors.text)
         .moveDown()
         .text('Banki átutalás:', 50, paymentTop + 35)
         .fillColor(colors.lightText)
         .text('IBAN:', 50, paymentTop + 50)
         .text('SWIFT/BIC:', 50, paymentTop + 65)
         .text('Bank:', 50, paymentTop + 80)
         .text('Közlemény:', 50, paymentTop + 95);
      
      doc.fillColor(colors.text)
         .font('Helvetica-Bold')
         .text('DE47 6634 0014 0743 4638 00', 130, paymentTop + 50)
         .text('COBADEFFXXX', 130, paymentTop + 65)
         .text('Commerzbank AG', 130, paymentTop + 80)
         .text(invoice.number, 130, paymentTop + 95);
      
      // QR code section
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(colors.primary)
         .text('QR kód mutatása', 450, paymentTop + 35, { align: 'center' });
      
      // Simple QR code placeholder
      doc.rect(400, paymentTop + 50, 100, 100)
         .strokeColor(colors.primary)
         .lineWidth(1)
         .stroke();
      
      // Footer
      const footerTop = doc.page.height - 100;
      
      // Footer line
      doc.moveTo(50, footerTop)
         .lineTo(550, footerTop)
         .strokeColor(colors.border)
         .lineWidth(1)
         .stroke();
      
      // Footer text
      doc.fontSize(10)
         .fillColor(colors.text)
         .text('Köszönjük, hogy minket választott!', 50, footerTop + 15, { align: 'center', width: 500 });
      
      doc.fontSize(8)
         .fillColor(colors.lightText)
         .text('Ez a számla elektronikusan készült és érvényes aláírás nélkül is.', 50, footerTop + 35, { 
           align: 'center', 
           width: 500 
         });
      
      // Finalize the PDF
      doc.end();
      console.log('PDF generation completed using PDFKit with modern design');
      
    } catch (pdfError) {
      console.error('Error generating PDF with PDFKit:', pdfError);
      res.status(500).json({ 
        message: 'Hiba történt a PDF generálása során', 
        error: pdfError.message 
      });
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Hiba történt a PDF generálása során' });
  }
});

// ==============================================
// PROTECTED ENDPOINTS (Require authentication)
// ==============================================
app.use('/api', authMiddleware);
app.use('/api', postRoutes);
app.use('/api', contactRoutes);
app.use('/api', calculatorRoutes);
app.use('/api', projectRoutes);
app.use('/api', domainRoutes);
app.use('/api', serverRoutes);
app.use('/api', licenseRoutes);
app.use('/api', notificationRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api', hostingRoutes);
app.use('/api', filesRoutes);
app.use('/api', commentsRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/translation/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/support', supportTicketRouter);
app.use('/api', documentsRouter);

// Fix for transactions endpoint directly accessing the accountingRoutes
app.use('/api/transactions', (req, res, next) => {
  // Redirect to accounting/transactions to match the client's request
  console.log('Redirecting from /api/transactions to /api/accounting/transactions');
  req.url = req.url === '/' ? '/transactions' : req.url;
  req.baseUrl = '/api/accounting';
  next();
}, accountingRoutes);

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API server is running',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ==============================================
// PROJECT DOMAIN HANDLING
// ==============================================
function setupProjectDomain() {
  // Create a separate Express app for project.nb-studio.net
  const projectApp = express();
  
  // Apply CORS settings for project app
  projectApp.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  }));
  
  // Handle Socket.IO proxying
  projectApp.use('/socket.io', (req, res) => {
    console.log('Proxying socket.io request');
    proxyRequest(req, res, 'socket.io');
  });
  
  // Proxy all other requests to the frontend app running on port 5173
  projectApp.use((req, res) => {
    console.log(`Proxying request to local frontend: ${req.method} ${req.url}`);
    proxyRequest(req, res);
  });
  
  // Request proxying function
  function proxyRequest(req, res, path) {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path ? `/${path}${req.url}` : req.url,
      method: req.method,
      headers: { ...req.headers }
    };
    
    // Update host header for local routing
    options.headers.host = 'localhost:5173';
    
    const proxyReq = http.request(options, (proxyRes) => {
      // Forward response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Use same status code
      res.statusCode = proxyRes.statusCode;
      
      // Pipe response body
      proxyRes.pipe(res);
    });
    
    // Handle proxy errors
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Proxy error', 
          message: err.message 
        }));
      }
    });
    
    // Forward request body if present
    if (req.body) {
      proxyReq.write(JSON.stringify(req.body));
    }
    
    // Pipe request data if streaming
    if (req.readable) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  }
  
  // Start project domain server on a different port (5555)
  try {
    const projectPort = 5555;
    
    https.createServer(sslOptions, projectApp).listen(projectPort, host, () => {
      console.log(`Project domain server running on https://${host}:${projectPort}`);
      console.log('Important: Set up iptables rule to forward traffic from port 443 to port 5555 for project.nb-studio.net:');
      console.log('iptables -t nat -A PREROUTING -p tcp -d project.nb-studio.net --dport 443 -j REDIRECT --to-port 5555');
    });
  } catch (error) {
    console.error('Failed to start project domain server:', error);
  }
}

// ==============================================
// SERVER STARTUP
// ==============================================
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB kapcsolat létesítve');
  
  // Cron job-ok beállítása
  const cronJobController = setupCronJobs();
  app.set('cronJobController', cronJobController);
  
  // Start HTTPS API server
  https.createServer(sslOptions, app).listen(port, host, () => {
    console.log(`API Server running on https://${host}:${port}`);
  });
  
  // Start HTTP server for Socket.IO
  const socketPort = parseInt(port) + 1;
  httpServer.listen(socketPort, host, () => {
    console.log(`Socket.IO server running on http://${host}:${socketPort}`);
  });
  
  // Setup project domain handling
  setupProjectDomain();
} catch (error) {
  console.error('MongoDB kapcsolódási hiba:', error);
  process.exit(1);
}