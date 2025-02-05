import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import Contact from './models/Contact.js'; 
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
import Calculator from './models/Calculator.js';  // Ezt add hozzá
import accountingRoutes from './routes/accounting.js';

dotenv.config();

const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

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

// FONTOS: Publikus végpontok az auth middleware ELŐTT
const publicContactRouter = express.Router();
publicContactRouter.post('/contact', validateApiKey, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const contact = new Contact({
      name,
      email,
      subject: 'Contact Form Submission',
      message,
      status: 'new'
    });
    const savedContact = await contact.save();
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
app.use('/api/public', publicContactRouter);

// Új publikus végpont a kalkulátorhoz
const publicCalculatorRouter = express.Router();
publicCalculatorRouter.post('/calculators', validateApiKey, async (req, res) => {
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
app.use('/api/public', publicCalculatorRouter);

// CORS és egyéb middleware-k után, de az auth middleware ELŐTT
const publicProjectRouter = express.Router();
publicProjectRouter.use(validateApiKey);
app.use('/api/public/projects', projectRoutes);  // Publikus végpontok

// Auth routes
app.use('/api/auth', authRoutes);

// Védett végpontok
app.use('/api', postRoutes);
app.use('/api', authMiddleware); // Az auth middleware csak ezután jön
app.use('/api', contactRoutes);
app.use('/api', calculatorRoutes);  // Áthelyezve az auth middleware után
app.use('/api', projectRoutes);
app.use('/api', domainRoutes);
app.use('/api', serverRoutes);
app.use('/api', licenseRoutes);
app.use('/api', notificationRoutes);  // <- Ez az új sor
app.use('/api/accounting', accountingRoutes);




// Alap route teszteléshez
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB kapcsolódás és HTTPS szerver indítás
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    https.createServer(options, app).listen(port, host, () => {
      console.log(`Server running on https://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });