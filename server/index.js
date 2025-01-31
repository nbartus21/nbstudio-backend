import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';
import calculatorRoutes from './routes/calculators.js';
import projectRoutes from './routes/projects.js';
import domainRoutes from './routes/domains.js';
import serverRoutes from './routes/servers.js';
import licenseRoutes from './routes/licenses.js';
import authMiddleware from './middleware/auth.js';
import authRoutes from './routes/auth.js';

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

// Auth routes
app.use('/api/auth', authRoutes);

// Védett végpontok
app.use('/api', authMiddleware); // Az auth middleware csak ezután jön
app.use('/api', postRoutes);
app.use('/api', contactRoutes);
app.use('/api', calculatorRoutes);
app.use('/api', projectRoutes);
app.use('/api', domainRoutes);
app.use('/api', serverRoutes);
app.use('/api', licenseRoutes);

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