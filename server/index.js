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

// Import models
import Contact from './models/Contact.js';
import Hosting from './models/Hosting.js';
import HostingNotification from './models/HostingNotification.js';
import Calculator from './models/Calculator.js';
import Post from './models/Post.js';
import Note from './models/Note.js';
import Task from './models/Task.js';
import Partner from './models/Partner.js';
import WebPage from './models/WebPage.js';

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
import invoicesRouter from './routes/invoices.js';
import partnersRouter from './routes/partners.js';
import webPagesRouter from './routes/webpages.js';

// Import middleware
import authMiddleware from './middleware/auth.js';

// Load environment variables
dotenv.config();

// CORS fejléc segédmetódus létrehozása
const allowCors = (req, res) => {
  // Ne használjunk wildcard-ot, hanem az eredeti origin-t add vissza, ha van
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Ha nincs origin, akkor használjuk az engedélyezett origin-eket
    const allowedOrigins = [
      'https://admin.nb-studio.net',
      'https://nb-studio.net',
      'https://www.nb-studio.net',
      'https://project.nb-studio.net',
      'http://38.242.208.190:5173',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    // Ha van referer, próbáljuk abból kinyerni az origin-t
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

        if (allowedOrigins.includes(refererOrigin)) {
          res.header('Access-Control-Allow-Origin', refererOrigin);
        } else {
          // Alapértelmezett beállítás, ha nem találunk jobb opciót
          res.header('Access-Control-Allow-Origin', 'https://project.nb-studio.net');
        }
      } catch (e) {
        // Alapértelmezett beállítás hiba esetén
        res.header('Access-Control-Allow-Origin', 'https://project.nb-studio.net');
      }
    } else {
      // Alapértelmezett beállítás, ha nincs referer
      res.header('Access-Control-Allow-Origin', 'https://project.nb-studio.net');
    }
  }

  // Engedélyezzük a credentials használatát
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.header('Access-Control-Max-Age', '86400');
};

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
app.use((req, res, next) => {
  // CORS előkezelés minden kérésre
  allowCors(req, res);

  // OPTIONS kérés kezelése közvetlenül
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS kérés kezelése közvetlenül');
    return res.status(200).end();
  }

  next();
});

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
    // Kihagyjuk a monitoring végpontokat a naplózásból
    if (!req.url.includes('/monitoring/system') &&
        !req.url.includes('/monitoring/network') &&
        !req.url.includes('/monitoring/security')) {
      console.log(`${req.method} ${req.url}`);
    }
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

// Public partners endpoint (no auth required)
app.get('/api/public/partners', validateApiKey, async (req, res) => {
  try {
    const partners = await Partner.find({ active: true }).sort({ updatedAt: -1 });
    res.json(partners);
  } catch (error) {
    console.error('Error fetching public partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public web pages endpoint (no auth required)
app.get('/api/public/webpages', validateApiKey, async (req, res) => {
  try {
    const webPages = await WebPage.find({ active: true }).sort({ updatedAt: -1 });
    res.json(webPages);
  } catch (error) {
    console.error('Error fetching public web pages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public web page by identifier (no auth required)
app.get('/api/public/webpages/:identifier', validateApiKey, async (req, res) => {
  try {
    const webPage = await WebPage.findOne({
      identifier: req.params.identifier,
      active: true
    });

    if (!webPage) {
      return res.status(404).json({ message: 'Web page not found' });
    }

    res.json(webPage);
  } catch (error) {
    console.error('Error fetching public web page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Importáljuk a PIN ellenőrző függvényt
import { verifyPin } from './routes/projects.js';

// Különböző útvonalon regisztráljuk ugyanazt a PIN ellenőrző végpontot
// Így biztosítjuk, hogy több URL-ről is elérhető legyen

// 1. A public/projects alá
app.use('/api/public/projects', validateApiKey, projectRoutes);

// 2. Közvetlenül az api alá is
app.post('/api/verify-pin', validateApiKey, async (req, res) => {
  console.log('Request from /api/verify-pin route');
  await verifyPin(req, res);
});

// 3. Gyökérkönyvtárba is
app.post('/verify-pin', validateApiKey, async (req, res) => {
  console.log('Request from root /verify-pin route');
  await verifyPin(req, res);
});

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

    // Generate PDF using single-page design
    try {
      console.log('Generating single-page PDF for invoice:', invoice.number);
      // Create PDF document with explicit options to prevent auto page breaks
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40, // Kisebb margó
        bufferPages: true, // Buffer pages for more control
        autoFirstPage: true, // Automatically create first page
        layout: 'portrait',
        info: {
          Title: `Számla-${invoice.number}`,
          Author: 'NB Studio - Single Page'
        }
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=szamla-${invoice.number}.pdf`);

      // Pipe to response
      doc.pipe(res);

      // Betűtípusok beállítása
      doc.registerFont('Helvetica', 'Helvetica');
      doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

      // Kompakt design - színek és stílusok
      const colors = {
        primary: '#2563EB', // Modern kék
        secondary: '#1E293B', // Sötét szürke
        accent: '#3B82F6', // Világos kék
        text: '#1E293B', // Sötét szöveg
        light: '#F8FAFC', // Világos háttér
        success: '#10B981', // Zöld (fizetett)
        warning: '#F59E0B', // Narancs (lejárt)
        border: '#E2E8F0', // Szegély szín
        background: '#FFFFFF', // Fehér háttér
      };

      // Ultra-kompakt fejléc - csak egy vékony csík a tetején
      const headerHeight = 80; // Nagyon alacsony fejléc

      // Fejléc háttér
      doc.rect(0, 0, doc.page.width, headerHeight)
         .fill(colors.primary);

      // Dekoratív elemek a fejlécben - minimális
      doc.circle(doc.page.width - 60, 40, 40)
         .fill('rgba(255, 255, 255, 0.1)');

      // Fejléc szöveg kompakt stílusban
      doc.font('Helvetica-Bold')
         .fontSize(24) // Kisebb betűméret
         .fillColor('white')
         .text('SZÁMLA', 40, 20, { width: 150 })
         .fontSize(14) // Kisebb betűméret
         .font('Helvetica')
         .text(`#${invoice.number}`, 40, 50, { width: 150 });

      // Státusz jelölés a fejlécben
      let statusColor = colors.accent;
      let statusText = 'Számla'; // "Kiállítva" helyett "Számla"

      if (invoice.status === 'fizetett') {
        statusColor = colors.success;
        statusText = 'Fizetve';
      } else if (invoice.status === 'késedelmes') {
        statusColor = colors.warning;
        statusText = 'Lejárt';
      } else if (invoice.status === 'törölt') {
        statusColor = '#9CA3AF';
        statusText = 'Törölve';
      }

      // Státusz badge - kompakt méret, bal oldalra helyezve
      const statusBadgeWidth = 80;
      const statusBadgeHeight = 20;
      const statusBadgeX = 40; // Bal oldalra helyezve
      const statusBadgeY = 15;

      doc.roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 10)
         .fill(statusColor);

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('white')
         .text(statusText, statusBadgeX, statusBadgeY + 5, { width: statusBadgeWidth, align: 'center' });

      // Jobbra igazított fejléc info - kompakt elrendezés
      const rightColumnX = 400;
      doc.fontSize(9)
         .fillColor('rgba(255, 255, 255, 0.9)')
         .text('Kiállítás dátuma:', rightColumnX, 20, { align: 'right' }) // "Kiállítás:" helyett "Kiállítás dátuma:"
         .fontSize(10)
         .fillColor('white')
         .text(new Date(invoice.date).toLocaleDateString('hu-HU'), rightColumnX, 35, { align: 'right' })
         .fontSize(9)
         .fillColor('rgba(255, 255, 255, 0.9)')
         .text('Fizetési határidő:', rightColumnX, 50, { align: 'right' })
         .fontSize(10)
         .fillColor('white')
         .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), rightColumnX, 65, { align: 'right' });

      // Vékony színsáv a fejléc alatt
      doc.rect(0, headerHeight, doc.page.width, 2) // Nagyon vékony sáv
         .fill(colors.accent);

      // Kiállító és vevő adatok - kompakt elrendezés
      const startY = headerHeight + 5; // Nagyon közel a fejléchez

      // Háttér téglalapok a kiállító és vevő adatokhoz - kiállító még magasabb a cím és céges adatok miatt
      doc.roundedRect(40, startY, 220, 200, 5) // Még magasabb a kiállító téglalap
         .fillAndStroke('#F9FAFB', colors.border);

      doc.roundedRect(280, startY, 270, 120, 5) // Vevő téglalap változatlan
         .fillAndStroke('#F9FAFB', colors.border);

      // Kiállító adatok - egyértelmű pozíciókkal
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(colors.primary);
      doc.text('KIÁLLÍTÓ', 50, startY + 10, { lineBreak: false });

      // Vízszintes vonal
      doc.moveTo(50, startY + 25)
         .lineTo(240, startY + 25)
         .lineWidth(1)
         .stroke(colors.primary);

      // Kiállító adatok - minden sor külön text() hívással, explicit pozíciókkal
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(colors.secondary);
      doc.text('Norbert Bartus', 50, startY + 35, { lineBreak: false });

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.text);
      doc.text('Salinenstraße 25', 50, startY + 65, { lineBreak: false });
      doc.text('76646 Bruchsal, Baden-Württemberg', 50, startY + 80, { lineBreak: false });
      doc.text('Deutschland', 50, startY + 95, { lineBreak: false });
      doc.text('St.-Nr.: 68194547329', 50, startY + 110, { lineBreak: false });
      doc.text('USt-IdNr.: DE346419031', 50, startY + 125, { lineBreak: false });
      doc.text('IBAN: DE47 6634 0018 0473 4638 00', 50, startY + 140, { lineBreak: false });
      doc.text('BANK: Commerzbank AG', 50, startY + 155, { lineBreak: false });
      doc.text('SWIFT/BIC: COBADEFFXXX', 50, startY + 170, { lineBreak: false });

      // Kleinunternehmer megjegyzés
      doc.fontSize(8)
         .fillColor('#666666');
      doc.text('Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.', 50, startY + 185, {
        width: 190,
        lineBreak: false
      });

      // Vevő adatok - egyértelmű pozíciókkal
      if (project.client) {
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(colors.primary);
        doc.text('VEVŐ', 290, startY + 10, { lineBreak: false });

        // Vízszintes vonal
        doc.moveTo(290, startY + 25)
           .lineTo(530, startY + 25)
           .lineWidth(1)
           .stroke(colors.primary);

        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(colors.secondary);
        doc.text(project.client.companyName || project.client.name || '', 290, startY + 35, { lineBreak: false });

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text);

        // Fix pozíciók minden sorhoz
        let rowY = startY + 50;

        if (project.client.companyName && project.client.name) {
          doc.text(project.client.name, 290, rowY, { lineBreak: false });
          rowY += 15;
        }

        if (project.client.taxNumber) {
          doc.text(`Adószám: ${project.client.taxNumber}`, 290, rowY, { lineBreak: false });
          rowY += 15;
        }

        if (project.client.email) {
          doc.text(`Email: ${project.client.email}`, 290, rowY, { lineBreak: false });
          rowY += 15;
        }

        if (project.client.phone) {
          doc.text(`Telefon: ${project.client.phone}`, 290, rowY, { lineBreak: false });
          rowY += 15;
        }

        if (project.client.address) {
          const { city, street, postalCode, country } = project.client.address;
          if (city || street || postalCode) {
            doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 290, rowY, { lineBreak: false });
            rowY += 15;
          }
          if (country) {
            doc.text(country, 290, rowY, { lineBreak: false });
          }
        }
      }

      // Tételek cím - fix pozíció, még magasabbra helyezve a kiállító adatok miatt
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(colors.secondary);
      doc.text('TÉTELEK', 40, startY + 210, { lineBreak: false }); // Még magasabbra helyezve

      // Vízszintes vonal a cím alatt - fix pozíció, még magasabbra helyezve
      const tableTop = startY + 225; // Még magasabbra helyezve
      doc.moveTo(40, tableTop)
         .lineTo(550, tableTop)
         .lineWidth(0.5)
         .stroke(colors.border);

      // Táblázat fejléc - fix pozíció
      const tableHeaderTop = tableTop + 5;
      const tableHeaders = ['Tétel', 'Mennyiség', 'Egységár', 'Összesen'];
      const tableColumnWidths = [240, 80, 100, 100];
      const columnPositions = [40];

      for (let i = 1; i < tableColumnWidths.length; i++) {
        columnPositions[i] = columnPositions[i-1] + tableColumnWidths[i-1];
      }

      // Kompakt táblázat fejléc - fix pozíció
      doc.roundedRect(40, tableHeaderTop, 520, 25, 3)
         .fillAndStroke(colors.primary, colors.primary);

      // Táblázat fejléc szöveg - explicit opciókkal
      doc.font('Helvetica-Bold')
         .fillColor('white')
         .fontSize(10);

      tableHeaders.forEach((header, i) => {
        const position = columnPositions[i];
        const align = i === 0 ? 'left' : 'right';
        const padding = i === 0 ? 5 : 10;

        doc.text(header, position + padding, tableHeaderTop + 8, {
          width: tableColumnWidths[i] - (padding * 2),
          align: align,
          lineBreak: false
        });
      });

      // Táblázat sorok - kompakt
      let currentY = tableHeaderTop + 25;
      let currentPage = 1;
      let rowBackground = true;

      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item, index) => {
          if (!item || typeof item !== 'object') {
            console.log(`Hibás tétel formátum a(z) ${index}. indexnél:`, item);
            return;
          }

          item.description = item.description || 'Nincs leírás';
          item.quantity = typeof item.quantity === 'number' ? item.quantity : 0;
          item.unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
          item.total = typeof item.total === 'number' ? item.total : 0;

          if (currentY > 700) {
            doc.addPage();
            currentPage++;
            currentY = 50;

            // Új oldal fejléce - kompakt
            doc.roundedRect(40, currentY, 520, 25, 3)
               .fillAndStroke(colors.primary, colors.primary);

            doc.font('Helvetica-Bold')
               .fillColor('white')
               .fontSize(10);

            tableHeaders.forEach((header, i) => {
              const position = columnPositions[i];
              const align = i === 0 ? 'left' : 'right';
              const padding = i === 0 ? 5 : 10;

              doc.text(header, position + padding, currentY + 8, {
                width: tableColumnWidths[i] - (padding * 2),
                align: align
              });
            });

            currentY += 25;
            rowBackground = true;
          }

          // Zebra csikos táblázat - kompakt
          if (rowBackground) {
            doc.roundedRect(40, currentY, 520, 20, 0)
               .fillAndStroke('#F9FAFB', colors.border);
          } else {
            doc.roundedRect(40, currentY, 520, 20, 0)
               .fillAndStroke('#FFFFFF', colors.border);
          }

          doc.font('Helvetica')
             .fillColor(colors.text)
             .fontSize(9);

          const currency = invoice.currency || 'EUR';
          const row = [
            item.description,
            item.quantity.toString(),
            `${item.unitPrice} ${currency}`,
            `${item.total} ${currency}`
          ];

          row.forEach((cell, i) => {
            const position = columnPositions[i];
            const align = i === 0 ? 'left' : 'right';
            const padding = i === 0 ? 5 : 10;

            doc.text(cell, position + padding, currentY + 6, {
              width: tableColumnWidths[i] - (padding * 2),
              align: align,
              lineBreak: false
            });
          });

          currentY += 20;
          rowBackground = !rowBackground;
        });
      }

      // Összegzés táblázat - ultra-kompakt, explicit opciókkal - kisebb távolsággal
      const summaryStartY = currentY + 2; // Kisebb távolság

      // QR kód generálása a SEPA átutaláshoz
      try {
        const QRCode = require('qrcode');
        const fs = require('fs');
        const { join } = require('path');

        // Ideiglenes mappa létrehozása, ha nem létezik
        const tempDir = join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // QR kód fájl útvonala
        const qrCodePath = join(tempDir, `qr-${invoice._id || Date.now()}.png`);

        // SEPA QR kód adatok
        const currency = invoice.currency || 'EUR';
        const amount = invoice.totalAmount.toFixed(2);
        const qrData = [
          'BCD',                                    // Service Tag
          '002',                                    // Version
          '1',                                      // Encoding
          'SCT',                                    // SEPA Credit Transfer
          'COBADEFFXXX',                           // BIC
          'Norbert Bartus',                        // Beneficiary name
          'DE47663400180473463800',               // IBAN
          `${currency}${amount}`,                  // Amount
          '',                                      // Purpose code (empty)
          invoice.number || '',                    // Reference
          `RECHNUNG ${invoice.number}`             // Description
        ].join('\n');

        // QR kód generálása
        QRCode.toFileSync(qrCodePath, qrData, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 120
        });

        // QR kód hozzáadása a PDF-hez
        if (fs.existsSync(qrCodePath)) {
          // QR kód háttér
          doc.roundedRect(40, summaryStartY, 150, 150, 5)
             .fillAndStroke('#F9FAFB', colors.border);

          // QR kód cím
          doc.font('Helvetica-Bold')
             .fontSize(10)
             .fillColor(colors.primary)
             .text('SEPA átutalás QR kód', 40, summaryStartY + 10, { width: 150, align: 'center', lineBreak: false });

          // QR kód kép
          doc.image(qrCodePath, 55, summaryStartY + 25, { width: 120 });

          // QR kód magyarázat
          doc.fontSize(8)
             .fillColor(colors.text)
             .text('Szkennelje be a QR kódot a banki alkalmazásával a gyors fizetéshez', 40, summaryStartY + 130, {
               width: 150,
               align: 'center',
               lineBreak: false
             });

          // Ideiglenes fájl törlése
          fs.unlinkSync(qrCodePath);
        }
      } catch (qrError) {
        console.error('QR kód generálási hiba:', qrError);
        // Folytatjuk a PDF generálást QR kód nélkül
      }

      // Összegzés háttér - extrém kompakt
      doc.roundedRect(350, summaryStartY, 210, 35, 3) // Extrém kis magasság
         .fillAndStroke('#F9FAFB', colors.border);

      // Részösszeg sor - extrém kompakt
      doc.font('Helvetica')
         .fillColor(colors.text)
         .fontSize(9);
      doc.text('Részösszeg:', 360, summaryStartY + 6, { width: 100, align: 'left', lineBreak: false }); // Még kisebb távolság
      doc.text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 450, summaryStartY + 6, { width: 100, align: 'right', lineBreak: false });

      // ÁFA sor (ha van) - extrém kompakt
      doc.text('ÁFA (0%):', 360, summaryStartY + 16, { width: 100, align: 'left', lineBreak: false }); // Még kisebb távolság
      doc.text('0.00 EUR', 450, summaryStartY + 16, { width: 100, align: 'right', lineBreak: false });

      // Végösszeg kiemelése - extrém kompakt
      doc.roundedRect(350, summaryStartY + 26, 210, 15, 3) // Extrém kis magasság és távolság
         .fillAndStroke(colors.primary, colors.primary);

      // Végösszeg kiírása - extrém kompakt
      doc.font('Helvetica-Bold')
         .fillColor('white')
         .fontSize(10);
      doc.text('Végösszeg:', 360, summaryStartY + 29, { width: 100, align: 'left', lineBreak: false }); // Extrém kis távolság
      doc.text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 450, summaryStartY + 29, { width: 100, align: 'right', lineBreak: false }); // Extrém kis távolság

      // Finalize the PDF content before adding footer
      // Get the total number of pages
      const pages = doc.bufferedPageRange();

      // For each page, add the footer
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Egyszerű lábléc egy sorban - sokkal magasabbra helyezve
        const footerTop = doc.page.height - 70; // Sokkal magasabbra helyezve

        // Nincs vonal a lábléc tetején

        // Lábléc szöveg - abszolút pozícióban
        doc.font('Helvetica')
           .fontSize(7)
           .fillColor(colors.secondary);

        // Egyszerű lábléc szöveg - visszatérés az eredetihez
        const footerText = 'Norbert Bartus | www.nb-studio.net | Ez a számla elektronikusan készült és érvényes aláírás nélkül is. | ' + (i + 1) + '. oldal';
        doc.text(footerText, 40, footerTop + 5, {
          align: 'center',
          width: doc.page.width - 80,
          lineBreak: false,
          continued: false
        });
      }

      // Finalize the PDF
      doc.end();
      console.log('PDF generation completed using modern design');

      // Próbáljunk QR kódot generálni a fizetéshez
      try {
        // QR kód kép generálása (ha van QRCode modul)
        const QRCode = require('qrcode');
        // QR kód generálás logika...
      } catch (qrError) {
        console.warn('QR kód generálási hiba:', qrError.message);
        // Folytatjuk a PDF generálást QR kód nélkül
      }

    } catch (pdfError) {
      console.error('Error generating PDF with fallback method:', pdfError);
      res.status(500).json({ message: 'Hiba történt a PDF generálása során', error: pdfError.message });
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
app.use('/api', invoicesRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/webpages', webPagesRouter);

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

  // Alkalmazzuk a body parser-t a projekt alkalmazáshoz is
  projectApp.use(express.json({ limit: '50mb' }));
  projectApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

  // OPTIONS kérés kezelése
  projectApp.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS kérés kezelése');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(200).end();
      return;
    }
    next();
  });

  // Proxy all other requests to the frontend app running on port 5173
  projectApp.use((req, res) => {
    // A /public/documents/ elérési útvonalat az API szerverre irányítjuk
    if (req.url.startsWith('/public/documents/')) {
      console.log(`Redirecting document request to API server: ${req.method} ${req.url}`);

      // Csak POST és PUT kérések esetén csomagoljuk a body-t
      if (['POST', 'PUT'].includes(req.method) && req.body) {
        handleAPIProxyWithBody(req, res);
      } else {
        // GET, DELETE, OPTIONS stb. esetén nincs szükség body-ra
        handleAPIProxyWithoutBody(req, res);
      }
    } else {
      // Minden más kérést átirányítunk a frontendes alkalmazáshoz
      console.log(`Proxying request to local frontend: ${req.method} ${req.url}`);
      proxyRequest(req, res);
    }
  });

  // API Proxy kezelése body-val
  function handleAPIProxyWithBody(req, res) {
    try {
      const bodyData = JSON.stringify(req.body);

      const apiOptions = {
        hostname: 'localhost',
        port: port,
        path: `/api${req.url}`,
        method: req.method,
        headers: { ...req.headers }
      };

      // Header-ek beállítása
      apiOptions.headers.host = `localhost:${port}`;
      apiOptions.headers['x-api-key'] = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
      apiOptions.headers['content-type'] = 'application/json';
      apiOptions.headers['content-length'] = Buffer.byteLength(bodyData);

      const proxyReq = http.request(apiOptions, (proxyRes) => {
        // Válasz header-ek továbbítása
        Object.keys(proxyRes.headers).forEach(key => {
          res.setHeader(key, proxyRes.headers[key]);
        });

        res.statusCode = proxyRes.statusCode;

        // Válasz pipe-olása
        proxyRes.pipe(res);
      });

      // Időtúllépés és hibaellenőrzés
      proxyReq.setTimeout(30000, () => {
        console.error('API Proxy request timeout');
        proxyReq.abort();
        sendErrorResponse(res, 504, 'API Proxy timeout', 'A kérés időtúllépés miatt megszakadt');
      });

      proxyReq.on('error', (err) => {
        console.error('API Proxy error:', err);
        sendErrorResponse(res, 502, 'API Proxy error', err.message);
      });

      // Kérés küldése a body-val
      proxyReq.write(bodyData);
      proxyReq.end();

    } catch (error) {
      console.error('Error in handleAPIProxyWithBody:', error);
      sendErrorResponse(res, 500, 'API Proxy error', 'Hiba a kérés feldolgozása során');
    }
  }

  // API Proxy kezelése body nélkül
  function handleAPIProxyWithoutBody(req, res) {
    try {
      const apiOptions = {
        hostname: 'localhost',
        port: port,
        path: `/api${req.url}`,
        method: req.method,
        headers: { ...req.headers }
      };

      // Header-ek beállítása
      apiOptions.headers.host = `localhost:${port}`;
      apiOptions.headers['x-api-key'] = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

      const proxyReq = http.request(apiOptions, (proxyRes) => {
        // Válasz header-ek továbbítása
        Object.keys(proxyRes.headers).forEach(key => {
          res.setHeader(key, proxyRes.headers[key]);
        });

        res.statusCode = proxyRes.statusCode;

        // Válasz pipe-olása
        proxyRes.pipe(res);
      });

      // Időtúllépés és hibaellenőrzés
      proxyReq.setTimeout(30000, () => {
        console.error('API Proxy request timeout');
        proxyReq.abort();
        sendErrorResponse(res, 504, 'API Proxy timeout', 'A kérés időtúllépés miatt megszakadt');
      });

      proxyReq.on('error', (err) => {
        console.error('API Proxy error:', err);
        sendErrorResponse(res, 502, 'API Proxy error', err.message);
      });

      // Kérés lezárása (body nélkül)
      proxyReq.end();

    } catch (error) {
      console.error('Error in handleAPIProxyWithoutBody:', error);
      sendErrorResponse(res, 500, 'API Proxy error', 'Hiba a kérés feldolgozása során');
    }
  }

  // Hibaüzenet küldése
  function sendErrorResponse(res, statusCode, title, message) {
    if (!res.headersSent) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: title,
        message: message
      }));
    }
  }

  // Frontend alkalmazáshoz való átirányítás
  function proxyRequest(req, res, path) {
    try {
      let bodyData = '';

      if (['POST', 'PUT'].includes(req.method) && req.body) {
        bodyData = JSON.stringify(req.body);
      }

      const options = {
        hostname: 'localhost',
        port: 5173,
        path: path ? `/${path}${req.url}` : req.url,
        method: req.method,
        headers: { ...req.headers }
      };

      // Update host header for local routing
      options.headers.host = 'localhost:5173';

      // Állítsuk be a content-length header-t, ha van body
      if (bodyData) {
        options.headers['content-type'] = 'application/json';
        options.headers['content-length'] = Buffer.byteLength(bodyData);
      }

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

      // Időtúllépés beállítása
      proxyReq.setTimeout(30000, () => {
        console.error('Frontend Proxy request timeout');
        proxyReq.abort();
        sendErrorResponse(res, 504, 'Frontend Proxy timeout', 'A kérés időtúllépés miatt megszakadt');
      });

      // Handle proxy errors
      proxyReq.on('error', (err) => {
        console.error('Frontend Proxy error:', err);
        sendErrorResponse(res, 502, 'Frontend Proxy error', err.message);
      });

      // Átküldjük a kérés törzsét, ha van
      if (bodyData) {
        proxyReq.write(bodyData);
        proxyReq.end();
      } else if (req.readable) {
        // Adatok streamelése, ha van
        req.pipe(proxyReq);
      } else {
        // Kérés befejezése
        proxyReq.end();
      }
    } catch (error) {
      console.error('Error in proxyRequest:', error);
      sendErrorResponse(res, 500, 'Frontend Proxy error', 'Hiba a kérés feldolgozása során');
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
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

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
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });