import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';  // Új import a proxy-hoz
import { Server } from 'socket.io';  // Socket.IO importálása
import fs from 'fs';
import Contact from './models/Contact.js';
import Hosting from './models/Hosting.js';
import HostingNotification from './models/HostingNotification.js';
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';
import calculatorRoutes from './routes/calculators.js';
import projectRoutes from './routes/projects.js';
import domainRoutes from './routes/domains.js';
import serverRoutes from './routes/servers.js';
import licenseRoutes from './routes/licenses.js';
import authMiddleware from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';
import Calculator from './models/Calculator.js';
import accountingRoutes from './routes/accounting.js';
import hostingRoutes from './routes/hosting.js';
import Post from './models/Post.js';
import filesRoutes from './routes/files.js';
import commentsRoutes from './routes/comments.js';
import monitoringRoutes from './routes/monitoring.js';
import translationRoutes from './routes/translation.js'; // Import translation routes
import supportTicketRouter, { setupEmailEndpoint, initializeSocketIO } from './routes/supportTickets.js'; // Support ticket router importálása
import Note from './models/Note.js';

dotenv.config();

const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

// HTTP szerver létrehozása Express app-ból Socket.IO-hoz
const server = http.createServer(app);

// Socket.IO inicializálása
const io = new Server(server, {
  cors: {
    origin: [
      'https://admin.nb-studio.net',
      'https://nb-studio.net',
      'https://www.nb-studio.net',
      'https://project.nb-studio.net',
      'http://38.242.208.190:5173',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO kapcsolatok kezelése
io.on('connection', (socket) => {
  console.log('Kliens csatlakozott a Socket.IO-hoz:', socket.id);
  
  // Csatlakozás egy ticket-specifikus szobához
  socket.on('joinTicket', (ticketId) => {
    console.log(`${socket.id} csatlakozott a ticket_${ticketId} szobához`);
    socket.join(`ticket_${ticketId}`);
  });
  
  // Szoba elhagyása
  socket.on('leaveTicket', (ticketId) => {
    console.log(`${socket.id} elhagyta a ticket_${ticketId} szobát`);
    socket.leave(`ticket_${ticketId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Kliens lecsatlakozott:', socket.id);
  });
});

// Inicializáljuk a Socket.IO-t a supportTickets routerben
initializeSocketIO(io);

// SSL beállítások
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/fullchain.pem')
};

// CORS beállítások
app.use(cors({
  origin: [
    'https://admin.nb-studio.net',
    'https://nb-studio.net',
    'https://www.nb-studio.net',
    'https://project.nb-studio.net',  // Új domain hozzáadva
    'https://project.nb-studio.net:5555',  // Új domain hozzáadva
    'http://38.242.208.190:5173',
    'http://38.242.208.190',
    'https://www.nb-studio.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware-ek
app.use(express.json());

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  console.log('======= API Key Validation =======');
  console.log('Headers received:', req.headers);
  console.log('Received API Key:', req.headers['x-api-key']);
  console.log('Expected API Key:', process.env.PUBLIC_API_KEY);
  console.log('================================');
  
  const apiKey = req.headers['x-api-key'];
  
  if (!process.env.PUBLIC_API_KEY) {
    console.error('PUBLIC_API_KEY is not set in environment!');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  
  if (!apiKey) {
    console.error('No API key provided in request');
    return res.status(401).json({ message: 'API key is required' });
  }

  if (apiKey === process.env.PUBLIC_API_KEY) {
    console.log('API Key validation successful');
    next();
  } else {
    console.error('API Key validation failed');
    console.log('Keys do not match:');
    console.log('Received:', apiKey);
    console.log('Expected:', process.env.PUBLIC_API_KEY);
    res.status(401).json({ message: 'Invalid API key' });
  }
};

// Debug middleware
app.use((req, res, next) => {
  console.log('========= Request Debug =========');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Environment PUBLIC_API_KEY:', process.env.PUBLIC_API_KEY ? 'Set' : 'Not set');
  console.log('===============================');
  next();
});

// PUBLIKUS VÉGPONTOK
const publicRouter = express.Router();

// Contact végpont
publicRouter.post('/contact', validateApiKey, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const contact = new Contact({
      name,
      email,
      subject: 'Contact Form Submission',
      message,
      status: 'new'
    });
    await contact.save();
    res.status(201).json({
      success: true,
      message: 'Üzenet sikeresen elküldve'
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      message: 'Hiba történt az üzenet küldése során'
    });
  }
});

// Calculator végpont
publicRouter.post('/calculators', validateApiKey, async (req, res) => {
  try {
    const calculator = new Calculator(req.body);
    await calculator.save();
    res.status(201).json({
      success: true,
      message: 'Kalkuláció sikeresen mentve'
    });
  } catch (error) {
    console.error('Calculator form error:', error);
    res.status(500).json({
      message: 'Hiba történt a kalkuláció mentése során'
    });
  }
});

// Hosting rendelés végpont
publicRouter.post('/hosting/orders', validateApiKey, async (req, res) => {
  try {
    const order = new Hosting(req.body);
    await order.save();

    // Értesítés létrehozása új rendelésről
    const notification = new HostingNotification({
      type: 'new_order',
      title: 'Új hosting rendelés',
      message: `Új ${order.plan.name} csomag rendelés érkezett ${order.client.name} ügyféltől`,
      severity: 'info',
      orderId: order._id,
      link: '/hosting'
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Rendelés sikeresen létrehozva',
      orderId: order._id
    });
  } catch (error) {
    console.error('Hosting order error:', error);
    res.status(500).json({
      message: 'Hiba történt a rendelés feldolgozása során'
    });
  }
});

// Publikus végpontok regisztrálása
app.use('/api/public', publicRouter);

// PUBLIKUS BLOG VÉGPONTOK - auth middleware előtt!
app.use('/api/posts', async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Projects publikus végpontok
app.use('/api/public/projects', validateApiKey, projectRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Email webhook végpont beállítása - ez nincs auth middleware mögött!
setupEmailEndpoint(app);

// VÉDETT VÉGPONTOK
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
app.use('/api', monitoringRoutes); // Monitoring API útvonalak
app.use('/api/translation', translationRoutes); // Add translation routes
app.use('/api/support', supportTicketRouter); // Support ticket API végpontok hozzáadása

// Alap route teszteléshez
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB kapcsolódás és API szerver indítás
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // API szerver indítása
    https.createServer(options, app).listen(port, host, () => {
      console.log(`API Server running on https://${host}:${port}`);
    });
    
    // Socket.IO szerver indítása (HTTP szerveren)
    server.listen(port + 1, host, () => {
      console.log(`Socket.IO server running on http://${host}:${port + 1}`);
    });
    
    // Project domain kezelése
    setupProjectDomain();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Project domain kezelő funkció
function setupProjectDomain() {
  // Proxy alkalmazás a project.nb-studio.net domain-hez
  const projectApp = express();
  
  // CORS beállítások a projekt alkalmazáshoz
  projectApp.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  }));
  
  // Webhook support (socket.io, websocket)
  projectApp.use('/socket.io', (req, res) => {
    console.log('Proxying socket.io request');
    proxyRequest(req, res, 'socket.io');
  });
  
  // Proxy middleware, ami a HTTP kéréseket továbbítja a helyi 5173-as portra
  projectApp.use((req, res) => {
    console.log(`Proxying request to 5173: ${req.method} ${req.url}`);
    proxyRequest(req, res);
  });
  
  // Proxy funkció
  function proxyRequest(req, res, path) {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path ? `/${path}${req.url}` : req.url,
      method: req.method,
      headers: { ...req.headers }
    };
    
    // Host header módosítása
    options.headers.host = 'localhost:5173';
    
    const proxyReq = http.request(options, (proxyRes) => {
      // Response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Status code
      res.statusCode = proxyRes.statusCode;
      
      // Pipe response
      proxyRes.pipe(res);
    });
    
    // Error handler
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      }
    });
    
    // Ha van adat a kérésben, továbbítjuk
    if (req.body) {
      proxyReq.write(JSON.stringify(req.body));
    }
    
    // Ha van adatfolyam (file upload, stb), továbbítjuk
    if (req.readable) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  }
  
  // Project szerver indítása a 443-as porton
  try {
    // A port 3000-re állítjuk, hogy ne ütközzön a meglévő szerverrel
    // Az iptables fogja átirányítani a 443-as port forgalmát
    const projectPort = 5555;
    
    https.createServer(options, projectApp).listen(projectPort, host, () => {
      console.log(`Project server running on https://${host}:${projectPort}`);
      console.log('NOTE: Make sure to set up iptables rule to forward traffic from port 443 to 3000 for project.nb-studio.net');
      console.log('Example command:');
      console.log('iptables -t nat -A PREROUTING -p tcp -d project.nb-studio.net --dport 443 -j REDIRECT --to-port 3000');
    });
  } catch (error) {
    console.error('Failed to start project server:', error);
  }
}

export default app;