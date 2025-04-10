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
import SharedWebhosting from './models/SharedWebhosting.js';

// Import routes
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';
import calculatorRoutes from './routes/calculators.js';
import projectRoutes from './routes/projects.js';
import domainRoutes from './routes/domains.js';
// Eltávolítva: serverRoutes, licenseRoutes
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
// Document router removed
import chatApiRouter from './routes/chatApi.js';
import paymentsRouter from './routes/payments.js';
import invoicesRouter from './routes/invoices.js';
import partnersRouter from './routes/partners.js';
import webPagesRouter from './routes/webpages.js';
import settingsRouter from './routes/settings.js';
import sharedWebhostingRoutes from './routes/sharedwebhosting.js';

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
// Növeljük a maximális kérés méretet 100MB-ra, hogy nagyobb fájlokat is lehessen feltölteni
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
    // Kihagyjuk a monitoring végpontokat és az értesítéseket a naplózásból
    if (!req.url.includes('/monitoring/system') &&
        !req.url.includes('/monitoring/network') &&
        !req.url.includes('/monitoring/security') &&
        !req.url.includes('/notifications')) {
      console.log(`${req.method} ${req.url}`);
      // Eltávolítva a részletes naplózás
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

// Public endpoints for shared webhosting customer portal
publicRouter.get('/shared-webhosting/:token', validateApiKey, async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Requesting shared webhosting with token: ${token}`);
    
    const webhosting = await SharedWebhosting.findOne({ 'sharing.token': token });
    
    if (!webhosting) {
      return res.status(404).json({ message: 'Shared webhosting not found' });
    }
    
    res.json({ success: true, webhosting });
  } catch (error) {
    console.error('Error fetching shared webhosting:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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

// Importáljuk a szükséges függvényeket a projects.js fájlból
import { verifyPin, uploadToS3 } from './routes/projects.js';

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

// SharedWebhosting PIN verification endpoints - multiple routes for accessibility
app.post('/api/webhosting/verify-pin', validateApiKey, async (req, res) => {
  console.log('Request from /api/webhosting/verify-pin route');
  const webhostingVerifyPin = sharedWebhostingRoutes.stack.find(r => r.route && r.route.path === '/verify-pin').route.stack[0].handle;
  await webhostingVerifyPin(req, res);
});

app.post('/api/public/webhosting/verify-pin', validateApiKey, async (req, res) => {
  console.log('Request from /api/public/webhosting/verify-pin route');
  const webhostingVerifyPin = sharedWebhostingRoutes.stack.find(r => r.route && r.route.path === '/verify-pin').route.stack[0].handle;
  await webhostingVerifyPin(req, res);
});

app.post('/webhosting/verify-pin', validateApiKey, async (req, res) => {
  console.log('Request from /webhosting/verify-pin route');
  const webhostingVerifyPin = sharedWebhostingRoutes.stack.find(r => r.route && r.route.path === '/verify-pin').route.stack[0].handle;
  await webhostingVerifyPin(req, res);
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

// Document endpoint removed

// Végpont a megosztott projektek changelog bejegyzéseinek lekéréséhez
app.get('/api/public/projects/:token/changelog', validateApiKey, async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Megosztott projekt changelog lekérése (Token: ${token})`);

    // Keresés a sharing.token mezőben
    let project = await mongoose.model('Project').findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await mongoose.model('Project').findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    console.log(`Megosztott projekt megtalálva: ${project.name}, changelog bejegyzések száma: ${project.changelog?.length || 0}`);

    // Ellenőrizzük, hogy a changelog el van-e rejtve
    if (project.sharing && project.sharing.hideChangelog) {
      console.log(`Changelog el van rejtve ennél a megosztott projektnél: ${project.name}`);
      return res.json([]);
    }

    // Visszaadjuk a changelog bejegyzéseket
    res.json(project.changelog || []);
  } catch (error) {
    console.error('Hiba a megosztott projekt changelog lekérdezése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Végpont a changelog bejegyzésekhez való hozzászólások hozzáadásához
app.post('/api/public/projects/:token/changelog/:entryId/comments', validateApiKey, async (req, res) => {
  try {
    const { token, entryId } = req.params;
    const commentData = req.body;

    console.log(`Hozzászólás hozzáadása changelog bejegyzéshez (Token: ${token}, EntryId: ${entryId})`);

    if (!commentData.text || !commentData.author) {
      return res.status(400).json({ message: 'Hiányzó hozzászólás adatok' });
    }

    // Keresés a sharing.token mezőben
    let project = await mongoose.model('Project').findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await mongoose.model('Project').findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    // Keressük meg a changelog bejegyzést
    const changelogEntryIndex = project.changelog.findIndex(entry => entry._id.toString() === entryId);

    if (changelogEntryIndex === -1) {
      console.log(`Changelog bejegyzés nem található: ${entryId}`);
      return res.status(404).json({ message: 'Changelog bejegyzés nem található' });
    }

    // Hozzászólás objektum létrehozása
    const newComment = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      text: commentData.text,
      author: commentData.author,
      timestamp: new Date().toISOString(),
      isAdminComment: commentData.isAdminComment || false
    };

    // Inicializáljuk a comments tömböt, ha még nem létezik
    if (!project.changelog[changelogEntryIndex].comments) {
      project.changelog[changelogEntryIndex].comments = [];
    }

    // Hozzászólás hozzáadása a changelog bejegyzéshez
    project.changelog[changelogEntryIndex].comments.push(newComment);

    // Projekt mentése
    await project.save();

    console.log(`Hozzászólás sikeresen hozzáadva a changelog bejegyzéshez: ${entryId}`);

    // Visszaadjuk a frissített changelog bejegyzést
    res.status(201).json(project.changelog[changelogEntryIndex]);
  } catch (error) {
    console.error('Hiba a hozzászólás hozzáadása során:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Közvetlen végpont a megosztott projektek fájljainak lekéréséhez
app.get('/api/public/shared-projects/:token/files', validateApiKey, async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Megosztott projekt fájlok lekérése (Token: ${token})`);

    // Keresés a sharing.token mezőben
    let project = await mongoose.model('Project').findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await mongoose.model('Project').findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    console.log(`Megosztott projekt megtalálva: ${project.name}, fájlok száma: ${project.files?.length || 0}`);

    // Ellenőrizzük, hogy a fájlok el vannak-e rejtve
    if (project.sharing && project.sharing.hideFiles) {
      console.log(`Fájlok el vannak rejtve ennél a megosztott projektnél: ${project.name}`);
      return res.json([]);
    }

    // Szűrjük a fájlokat, hogy csak a nem törölteket küldjük vissza
    const activeFiles = (project.files || []).filter(file => !file.isDeleted);

    console.log(`Aktív fájlok száma: ${activeFiles.length}`);

    res.json(activeFiles);
  } catch (error) {
    console.error('Hiba a megosztott projekt fájlok lekérdezése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt' });
  }
});

// Közvetlen végpont a megosztott projektekhez tartozó fájlok törléséhez
app.delete('/api/public/shared-projects/:token/files/:fileId', validateApiKey, async (req, res) => {
  try {
    const { token, fileId } = req.params;
    console.log(`Megosztott projekthez tartozó fájl törlése (Token: ${token}, FileId: ${fileId})`);

    // Keresés a sharing.token mezőben
    let project = await mongoose.model('Project').findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await mongoose.model('Project').findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    // Keressük meg a fájlt a projektben
    const fileIndex = project.files.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      console.log(`Fájl nem található: ${fileId}`);
      return res.status(404).json({ message: 'Fájl nem található' });
    }

    // Logikai törlés - megjelöljük a fájlt töröltként
    project.files[fileIndex].isDeleted = true;
    project.files[fileIndex].deletedAt = new Date();

    await project.save();
    console.log(`Fájl sikeresen törölve: ${fileId}`);

    // Visszaadjuk a nem törölt fájlokat
    const activeFiles = project.files.filter(file => !file.isDeleted);
    res.json({ message: 'Fájl sikeresen törölve', files: activeFiles });
  } catch (error) {
    console.error('Hiba a fájl törlése során:', error);
    res.status(500).json({ message: 'Szerver hiba történt', error: error.message });
  }
});

// Közvetlen végpont a megosztott projektekhez tartozó fájlok feltöltéséhez
// Növelt méretkorláttal a nagy fájlok kezeléséhez
app.post('/api/public/shared-projects/:token/files', validateApiKey, async (req, res) => {
  // Hibaüzenetek ellenőrzése a kérés méretével kapcsolatban
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 100 * 1024 * 1024) {
    console.error('Túl nagy fájl feltöltési kísérlet:', {
      contentLength: req.headers['content-length'],
      maxAllowed: '100MB'
    });
    return res.status(413).json({
      message: 'Something went wrong!',
      error: 'request entity too large',
      maxSize: '100MB'
    });
  }
  try {
    const { token } = req.params;
    const fileData = req.body;
    console.log(`Megosztott projekthez fájl feltöltés (Token: ${token})`);

    // Keresés a sharing.token mezőben
    let project = await mongoose.model('Project').findOne({ 'sharing.token': token });

    // Ha nem találja, próbáljuk a régebbi shareToken mezővel is
    if (!project) {
      project = await mongoose.model('Project').findOne({ shareToken: token });
    }

    if (!project) {
      console.log(`Megosztott projekt nem található a tokennel: ${token}`);
      return res.status(404).json({ message: 'Megosztott projekt nem található' });
    }

    console.log(`Megosztott projekt megtalálva: ${project.name}`);

    // Validáljuk a fájl adatokat
    if (!fileData.id || !fileData.name || !fileData.size || !fileData.type) {
      console.log('Hiányzó kötelező adatok a fájlnál');
      return res.status(400).json({ message: 'Hiányzó fájl adatok' });
    }

    // Előkészítjük a fájl objektumot a MongoDB számára
    const fileToSave = {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      uploadedAt: new Date(),
      uploadedBy: fileData.uploadedBy || 'Ügyfél',
      s3url: fileData.s3url || null,
      s3key: fileData.s3key || null,
      isDeleted: false
    };

    // Ha van fájltartalom, feltöltjük az S3-ba
    if (fileData.content) {
      try {
        const s3Result = await uploadToS3({
          ...fileData,
          projectId: project._id.toString()
        });

        // S3 adatok hozzáadása
        fileToSave.s3url = s3Result.s3url;
        fileToSave.s3key = s3Result.key;

        // Content eltávolítása, mert már feltöltöttük S3-ba
        delete fileData.content;
      } catch (s3Error) {
        console.error('Hiba az S3 feltöltés során:', s3Error);
        return res.status(500).json({
          message: 'Hiba a fájl feltöltése során',
          error: s3Error.message
        });
      }
    }

    // Az új fájl objektum hozzáadása a tömbhöz
    if (!project.files) {
      project.files = [];
    }

    // Ellenőrizzük, hogy ez a fájl nem létezik-e már (id alapján)
    const existingFileIndex = project.files.findIndex(f => f.id === fileToSave.id);
    if (existingFileIndex !== -1) {
      console.log(`Már létező fájl frissítése az ID alapján: ${fileToSave.id}`);
      Object.assign(project.files[existingFileIndex], fileToSave);
    } else {
      // Új fájl hozzáadása
      project.files.push(fileToSave);
    }

    await project.save();
    console.log(`Fájl sikeresen mentve a megosztott projekthez: ${fileToSave.name}`);

    // Csak a nem törölt fájlokat küldjük vissza
    const activeFiles = project.files.filter(f => !f.isDeleted);
    res.status(201).json({
      message: 'Fájl sikeresen hozzáadva',
      files: activeFiles
    });
  } catch (error) {
    console.error('Hiba a fájl feltöltése során:', error);
    res.status(500).json({
      message: 'Szerver hiba történt',
      error: error.message
    });
  }
});

// ==============================================
// PUBLIC PDF ENDPOINTS (No authentication required)
// ==============================================

// Document functionality removed

// Public Invoice PDF endpoint
app.get('/api/projects/:projectId/invoices/:invoiceId/pdf', async (req, res) => {
  // Nyelvi paraméter kezelése (alapértelmezett: hu)
  const language = req.query.language || 'hu';
  // Csak támogatott nyelvek engedélyezése
  const validLanguage = ['hu', 'en', 'de'].includes(language) ? language : 'hu';

  // Fordítások a különböző nyelvekhez
  const translations = {
    en: {
      invoice: "INVOICE",
      invoiceNumber: "Invoice Number",
      issueDate: "Issue Date",
      dueDate: "Due Date",
      provider: "PROVIDER",
      client: "CLIENT",
      item: "Item",
      quantity: "Quantity",
      unitPrice: "Unit Price",
      total: "Total",
      grandTotal: "Grand Total",
      paid: "Paid",
      vatExempt: "VAT exempt according to § 19 Abs. 1 UStG.",
      footer: "This invoice was created electronically and is valid without signature.",
      status: {
        issued: "Issued",
        paid: "Paid",
        overdue: "Overdue",
        cancelled: "Cancelled"
      },
      taxId: "Tax ID",
      paymentInfo: "PAYMENT INFORMATION",
      summary: "SUMMARY",
      subtotal: "Subtotal",
      vat: "VAT (0%)",
      reference: "Reference"
    },
    de: {
      invoice: "RECHNUNG",
      invoiceNumber: "Rechnungsnummer",
      issueDate: "Ausstellungsdatum",
      dueDate: "Fälligkeitsdatum",
      provider: "ANBIETER",
      client: "KUNDE",
      item: "Artikel",
      quantity: "Menge",
      unitPrice: "Stückpreis",
      total: "Gesamt",
      grandTotal: "Gesamtsumme",
      paid: "Bezahlt",
      vatExempt: "Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.",
      footer: "Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.",
      status: {
        issued: "Ausgestellt",
        paid: "Bezahlt",
        overdue: "Überfällig",
        cancelled: "Storniert"
      },
      taxId: "Steuernummer",
      paymentInfo: "ZAHLUNGSINFORMATIONEN",
      summary: "ZUSAMMENFASSUNG",
      subtotal: "Zwischensumme",
      vat: "MwSt. (0%)",
      reference: "Verwendungszweck"
    },
    hu: {
      invoice: "SZÁMLA",
      invoiceNumber: "Számlaszám",
      issueDate: "Kiállítás dátuma",
      dueDate: "Fizetési határidő",
      provider: "KIÁLLÍTÓ",
      client: "ÜGYFÉL",
      item: "Tétel",
      quantity: "Mennyiség",
      unitPrice: "Egységár",
      total: "Összesen",
      grandTotal: "Végösszeg",
      paid: "Fizetve",
      vatExempt: "Alanyi adómentes a § 19 Abs. 1 UStG. szerint.",
      footer: "Ez a számla elektronikusan készült és érvényes aláírás nélkül is.",
      status: {
        issued: "Kiállítva",
        paid: "Fizetve",
        overdue: "Lejárt",
        cancelled: "Törölve"
      },
      taxId: "Adószám",
      paymentInfo: "FIZETÉSI INFORMÁCIÓK",
      summary: "ÖSSZEGZÉS",
      subtotal: "Részösszeg",
      vat: "ÁFA (0%)",
      reference: "Közlemény"
    }
  };

  // Fordítások betöltése a megfelelő nyelvhez
  const t = translations[validLanguage];
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
          Title: `${t.invoice}-${invoice.number}`,
          Author: 'Norbert Bartus'
        }
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      // Set filename based on language
      const fileName = validLanguage === 'hu' ? `szamla-${invoice.number}.pdf` :
                      (validLanguage === 'de' ? `rechnung-${invoice.number}.pdf` : `invoice-${invoice.number}.pdf`);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      // Pipe to response
      doc.pipe(res);

      // Betűtípusok beállítása
      doc.registerFont('Helvetica', 'Helvetica');
      doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

      // Modern design - színek és stílusok
      const colors = {
        primary: '#2563EB',     // Fő kék szín
        secondary: '#1E293B',   // Sötét szürke
        accent: '#3B82F6',      // Világos kék
        text: '#1E293B',        // Sötét szöveg
        light: '#F8FAFC',       // Világos háttér
        success: '#10B981',     // Zöld (fizetett)
        warning: '#F59E0B',     // Narancs (lejárt)
        border: '#E2E8F0',      // Szegély szín
        background: '#FFFFFF',  // Fehér háttér
        lightBlue: '#EFF6FF',   // Világos kék háttér
        darkBlue: '#1E40AF',    // Sötét kék kiemelésekhez
      };

      // Vékony színes sáv a lap tetején
      doc.rect(0, 0, doc.page.width, 8)
         .fill(colors.primary);

      // Fejléc terület
      doc.rect(0, 8, doc.page.width, 120)
         .fill(colors.background);

      // Logo hozzáadása (ha létezik)
      try {
        const logoPath = join(__dirname, 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 20, { width: 100 });
        }
      } catch (logoError) {
        console.warn('Logo betöltési hiba:', logoError.message);
      }

      // Státusz jelölés a fejlécben
      let statusColor = colors.accent;
      let statusText = t.status.issued;

      if (invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') {
        statusColor = colors.success;
        statusText = t.status.paid;
      } else if (invoice.status === 'késedelmes' || invoice.status === 'overdue' || invoice.status === 'überfällig') {
        statusColor = colors.warning;
        statusText = t.status.overdue;
      } else if (invoice.status === 'törölt' || invoice.status === 'cancelled' || invoice.status === 'storniert') {
        statusColor = '#9CA3AF';
        statusText = t.status.cancelled;
      }

      // Számla felirat és szám
      doc.font('Helvetica-Bold')
         .fontSize(28)
         .fillColor(colors.primary)
         .text(t.invoice, 50, 30)
         .fontSize(14)
         .fillColor(colors.secondary)
         .text(`#${invoice.number}`, 50, 65);

      // Státusz badge
      const statusBadgeWidth = 80;
      const statusBadgeHeight = 22;
      const statusBadgeX = 50;
      const statusBadgeY = 85;

      doc.roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 4)
         .fill(statusColor);

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('white')
         .text(statusText, statusBadgeX, statusBadgeY + 6, { width: statusBadgeWidth, align: 'center' });

      // Jobb oldali dátum információk
      const rightColumnX = 400;
      doc.fontSize(10)
         .fillColor(colors.secondary)
         .text(`${t.issueDate}:`, rightColumnX, 30, { align: 'right' })
         .fontSize(12)
         .fillColor(colors.primary)
         .text(new Date(invoice.date).toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')), rightColumnX, 45, { align: 'right' })
         .fontSize(10)
         .fillColor(colors.secondary)
         .text(`${t.dueDate}:`, rightColumnX, 65, { align: 'right' })
         .fontSize(12)
         .fillColor(colors.primary)
         .text(new Date(invoice.dueDate).toLocaleDateString(validLanguage === 'hu' ? 'hu-HU' : (validLanguage === 'de' ? 'de-DE' : 'en-US')), rightColumnX, 80, { align: 'right' });

      // Vékony elválasztó vonal a fejléc után
      doc.rect(50, 140, doc.page.width - 100, 1)
         .fill(colors.border);

      // Kiállító és vevő adatok
      const infoStartY = 160;

      // Kiállító adatok
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(colors.primary)
         .text(t.provider, 50, infoStartY);

      doc.rect(50, infoStartY + 18, 220, 1)
         .fill(colors.primary);

      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor(colors.secondary)
         .text('Norbert Bartus', 50, infoStartY + 25)
         .font('Helvetica')
         .fontSize(9)
         .fillColor(colors.text)
         .text('Salinenstraße 25', 50, infoStartY + 40)
         .text('76646 Bruchsal, Baden-Württemberg', 50, infoStartY + 52)
         .text('Deutschland', 50, infoStartY + 64)
         .text('St.-Nr.: 68194547329', 50, infoStartY + 76)
         .text('USt-IdNr.: DE346419031', 50, infoStartY + 88)
         .text('IBAN: DE47 6634 0018 0473 4638 00', 50, infoStartY + 100)
         .text('BANK: Commerzbank AG', 50, infoStartY + 112)
         .text('SWIFT/BIC: COBADEFFXXX', 50, infoStartY + 124);

      // Kleinunternehmer megjegyzés
      doc.fontSize(7)
         .fillColor('#666666')
         .text(t.vatExempt, 50, infoStartY + 140, {
           width: 220
         });

      // Vevő adatok
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(colors.primary)
         .text(t.client, 320, infoStartY);

      doc.rect(320, infoStartY + 18, 220, 1)
         .fill(colors.primary);

      if (project.client) {
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(colors.secondary)
           .text(project.client.companyName || project.client.name || '', 320, infoStartY + 25);

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text);

        let rowY = infoStartY + 40;

        if (project.client.companyName && project.client.name) {
          doc.text(project.client.name, 320, rowY);
          rowY += 12;
        }

        if (project.client.taxNumber) {
          doc.text(`${t.taxId}: ${project.client.taxNumber}`, 320, rowY);
          rowY += 12;
        }

        if (project.client.email) {
          doc.text(`Email: ${project.client.email}`, 320, rowY);
          rowY += 12;
        }

        if (project.client.phone) {
          doc.text(`Telefon: ${project.client.phone}`, 320, rowY);
          rowY += 12;
        }

        if (project.client.address) {
          const { city, street, postalCode, country } = project.client.address;
          if (city || street || postalCode) {
            doc.text(`${postalCode || ''} ${city || ''}, ${street || ''}`, 320, rowY);
            rowY += 12;
          }
          if (country) {
            doc.text(country, 320, rowY);
          }
        }
      }

      // Tételek táblázat
      const tableStartY = infoStartY + 180;

      // Táblázat fejléc
      doc.rect(50, tableStartY, doc.page.width - 100, 30)
         .fill(colors.primary);

      const tableHeaders = [t.item, t.quantity, t.unitPrice, t.total];
      const tableColumnWidths = [245, 80, 90, 80]; // Javított oszlopszélességek
      const columnPositions = [50];

      // Kiszámoljuk a pozíciókat
      for (let i = 1; i < tableHeaders.length; i++) {
        columnPositions.push(columnPositions[i - 1] + tableColumnWidths[i - 1]);
      }

      // Táblázat fejléc szöveg
      doc.font('Helvetica-Bold')
         .fillColor('white')
         .fontSize(10);

      tableHeaders.forEach((header, i) => {
        const position = columnPositions[i];
        const align = i === 0 ? 'left' : 'right';
        const padding = i === 0 ? 8 : 8;

        doc.text(header, position + padding, tableStartY + 10, {
          width: tableColumnWidths[i] - (padding * 2),
          align: align
        });
      });

      // Táblázat sorok
      let currentY = tableStartY + 30;
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

          // Oldaltörés ellenőrzése
          if (currentY > 700) {
            doc.addPage();
            currentPage++;
            currentY = 50;

            // Új oldal fejléce
            doc.rect(50, currentY, doc.page.width - 100, 30)
               .fill(colors.primary);

            doc.font('Helvetica-Bold')
               .fillColor('white')
               .fontSize(10);

            tableHeaders.forEach((header, i) => {
              const position = columnPositions[i];
              const align = i === 0 ? 'left' : 'right';
              const padding = i === 0 ? 8 : 8;

              doc.text(header, position + padding, currentY + 10, {
                width: tableColumnWidths[i] - (padding * 2),
                align: align
              });
            });

            currentY += 30;
            rowBackground = true;
          }

          // Zebra csíkos táblázat
          if (rowBackground) {
            doc.rect(50, currentY, doc.page.width - 100, 25)
               .fill('#F9FAFB');
          }

          // Vékony elválasztó vonal minden sor után
          doc.rect(50, currentY + 25, doc.page.width - 100, 0.5)
             .fill(colors.border);

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
            const padding = i === 0 ? 8 : 8;

            doc.text(cell, position + padding, currentY + 8, {
              width: tableColumnWidths[i] - (padding * 2),
              align: align
            });
          });

          currentY += 25;
          rowBackground = !rowBackground;
        });
      }

      // Összegzés és fizetési információk
      const summaryStartY = currentY + 20;

      // Fizetési információk
      doc.roundedRect(50, summaryStartY, 250, 120, 4)
         .fillAndStroke(colors.lightBlue, colors.border);

      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor(colors.primary)
         .text(t.paymentInfo, 65, summaryStartY + 15);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(colors.text)
         .text('IBAN:', 65, summaryStartY + 40, { continued: true })
         .font('Helvetica-Bold')
         .text(' DE47 6634 0018 0473 4638 00')
         .font('Helvetica')
         .text('SWIFT/BIC:', 65, summaryStartY + 55, { continued: true })
         .font('Helvetica-Bold')
         .text(' COBADEFFXXX')
         .font('Helvetica')
         .text('Bank:', 65, summaryStartY + 70, { continued: true })
         .font('Helvetica-Bold')
         .text(' Commerzbank AG')
         .font('Helvetica')
         .text(`${t.reference}:`, 65, summaryStartY + 85, { continued: true })
         .font('Helvetica-Bold')
         .text(` ${invoice.number}`);

      // Összegzés
      doc.roundedRect(350, summaryStartY, 220, 120, 4)
         .fillAndStroke(colors.lightBlue, colors.border);

      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor(colors.primary)
         .text(t.summary, 365, summaryStartY + 15);

      // Részösszeg sor
      doc.font('Helvetica')
         .fillColor(colors.text)
         .fontSize(10)
         .text(`${t.subtotal}:`, 365, summaryStartY + 40, { width: 100, align: 'left' })
         .text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 465, summaryStartY + 40, { width: 90, align: 'right' });

      // ÁFA sor (ha van)
      doc.text(`${t.vat}:`, 365, summaryStartY + 60, { width: 100, align: 'left' })
         .text('0.00 EUR', 465, summaryStartY + 60, { width: 90, align: 'right' });

      // Végösszeg kiemelése
      doc.roundedRect(365, summaryStartY + 80, 190, 30, 4)
         .fill(colors.primary);

      // Végösszeg kiírása
      doc.font('Helvetica-Bold')
         .fillColor('white')
         .fontSize(12);
      doc.text(`${t.grandTotal}:`, 375, summaryStartY + 90, { width: 100, align: 'left' });
      doc.text(`${invoice.totalAmount} ${invoice.currency || 'EUR'}`, 465, summaryStartY + 90, { width: 80, align: 'right' });

      // Finalize the PDF content before adding footer
      // Get the total number of pages
      const pages = doc.bufferedPageRange();

      // For each page, add the footer
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Lábléc - feljebb helyezve
        const footerTop = doc.page.height - 60;

        // Vékony vonal a lábléc tetején
        doc.rect(50, footerTop - 5, doc.page.width - 100, 0.5)
           .fill(colors.border);

        // Lábléc szöveg és oldalszám egy sorban
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor(colors.secondary);

        // Teljes lábléc szöveg egy sorban az oldalszámmal együtt
        const pageText = validLanguage === 'hu' ? `${i + 1}. oldal` : (validLanguage === 'de' ? `Seite ${i + 1}` : `Page ${i + 1}`);
        const footerText = `Norbert Bartus | www.nb-studio.net | ${t.footer} | ${pageText}`;
        doc.text(footerText, 50, footerTop, {
          align: 'center',
          width: doc.page.width - 100
        });
      }

      // Finalize the PDF
      doc.end();
      console.log('PDF generation completed using modern design');

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
// Eltávolítva: serverRoutes, licenseRoutes
app.use('/api', notificationRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api', hostingRoutes);
app.use('/api', filesRoutes);
app.use('/api', commentsRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/translation/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/support', supportTicketRouter);
// Document router removed
app.use('/api', invoicesRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/webpages', webPagesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', sharedWebhostingRoutes);

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

  // Alkalmazzuk a body parser-t a projekt alkalmazáshoz is, növelt méretkorláttal
  projectApp.use(express.json({ limit: '100mb' }));
  projectApp.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
    // Document handling removed
    {
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
// Fájl írása a lemezre a szerver indításakor
import path from 'path';
const startupFilePath = path.join(process.cwd(), 'server-started.txt');
fs.writeFileSync(startupFilePath, `Szerver indítva: ${new Date().toISOString()}\n`, { flag: 'a' });
console.log('Fájl sikeresen írva a szerver indításakor:', startupFilePath);

// Egyedi naplóbejegyzés, amely könnyen azonosítható
console.log('EGYEDI_NAPLOBEJEGYZES_SZERVER_INDITAS: Szerver indítás kezdete');
console.log('EGYEDI_NAPLOBEJEGYZES_SZERVER_INDITAS: Git commit:', 'fd7072dc461a07479dc0ab7ecc8b2d0f1b02425c');
console.log('EGYEDI_NAPLOBEJEGYZES_SZERVER_INDITAS: Időpont:', new Date().toISOString());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

    // Fájl írása a lemezre a MongoDB kapcsolat után
    const mongoConnectedFilePath = path.join(process.cwd(), 'mongo-connected.txt');
    fs.writeFileSync(mongoConnectedFilePath, `MongoDB kapcsolat sikeres: ${new Date().toISOString()}\n`, { flag: 'a' });
    console.log('Fájl sikeresen írva a MongoDB kapcsolat után:', mongoConnectedFilePath);

    // Start HTTPS API server
    https.createServer(sslOptions, app).listen(port, host, () => {
      console.log(`API Server running on https://${host}:${port}`);

      // Fájl írása a lemezre a szerver indítása után
      const serverStartedFilePath = path.join(process.cwd(), 'api-server-started.txt');
      fs.writeFileSync(serverStartedFilePath, `API szerver indítása sikeres: ${new Date().toISOString()}\n`, { flag: 'a' });
      console.log('Fájl sikeresen írva a szerver indítása után:', serverStartedFilePath);
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