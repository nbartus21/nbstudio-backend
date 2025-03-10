import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import Contact from './models/Contact.js';
import Hosting from './models/Hosting.js';
import HostingNotification from './models/HostingNotification.js';
import Task from './models/Task.js';
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
import translationRoutes from './routes/translation.js';
import notesRoutes from './routes/notes.js';
import supportTicketRouter, { setupEmailEndpoint, initializeSocketIO } from './routes/supportTickets.js';
import Note from './models/Note.js';
import emailApiRouter from './routes/emailApi.js';
import tasksRoutes from './routes/tasks.js';


dotenv.config();

const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

// HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Socket.IO initialization
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

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  // Tároljuk az API kulcsot egy változóban, hogy konzisztens legyen
  const apiKey = process.env.PUBLIC_API_KEY;
  const receivedApiKey = req.headers['x-api-key'];
  
  console.log('API Key ellenőrzés:');
  console.log('Beállított API kulcs:', apiKey ? 'Beállítva' : 'Nincs beállítva');
  console.log('Kapott API kulcs:', receivedApiKey ? 'Kapott' : 'Nincs megadva');
  
  if (!apiKey) {
    console.error('PUBLIC_API_KEY nincs beállítva a környezeti változókban!');
    return res.status(500).json({ message: 'Szerver konfigurációs hiba' });
  }
  
  if (!receivedApiKey) {
    console.error('Nem érkezett API kulcs a kérésben');
    return res.status(401).json({ message: 'API kulcs megadása kötelező' });
  }

  if (receivedApiKey === apiKey) {
    console.log('API kulcs ellenőrzés sikeres');
    next();
  } else {
    console.error('API kulcs ellenőrzés sikertelen');
    res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }
};

// Pass Socket.IO to the support ticket router
initializeSocketIO(io);

// Basic Socket.IO connection handling
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
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/fullchain.pem')
};

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

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Use the imported validateApiKey instead of defining it inline

// Debug middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// PUBLIC ENDPOINTS
const publicRouter = express.Router();

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
app.use('/api/tasks', tasksRoutes); // Add hozzá ezt a sort




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
app.use('/api/email', emailApiRouter);

// Setup email webhook for support tickets
setupEmailEndpoint(app);

// Auth routes (for login/logout)
app.use('/api/auth', authRoutes);

// PROTECTED ENDPOINTS (require auth)
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
app.use('/api', monitoringRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/support', supportTicketRouter); // Support ticket endpoints

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

// MongoDB connection and server startup
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
  });

// Project domain handling
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