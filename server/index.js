import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
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
import quoteRoutes from './routes/quotes.js';
import Quote from './models/Quote.js';


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
    '*',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: false,
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

// Árajánlat publikus végpontok - ÚJ RÉSZ
publicRouter.get('/quotes/:token', validateApiKey, async (req, res) => {
  const { token } = req.params;
  
  try {
    // Árajánlat lekérdezése token alapján
    const quote = await Quote.findOne({ shareToken: token });
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // Publikus adatok küldése
    const publicQuoteData = {
      quoteNumber: quote.quoteNumber,
      client: quote.client,
      items: quote.items,
      subtotal: quote.subtotal,
      vat: quote.vat,
      totalAmount: quote.totalAmount,
      status: quote.status,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      requiresPin: true
    };
    
    res.status(200).json(publicQuoteData);
  } catch (error) {
    console.error('Hiba az árajánlat lekérdezésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat lekérdezésekor' });
  }
});

publicRouter.post('/quotes/:token/action', validateApiKey, async (req, res) => {
  const { token } = req.params;
  const { pin, action, reason, notes } = req.body;
  
  // PIN kód és művelet ellenőrzése
  if (!pin) {
    return res.status(400).json({ message: 'PIN kód megadása kötelező' });
  }
  
  if (!action || (action !== 'accept' && action !== 'reject' && action !== 'verify')) {
    return res.status(400).json({ message: 'Érvénytelen művelet' });
  }
  
  try {
    const quote = await Quote.findOne({ shareToken: token });
    
    if (!quote) {
      return res.status(404).json({ message: 'Árajánlat nem található' });
    }
    
    // PIN kód ellenőrzése
    if (quote.sharePin !== pin) {
      return res.status(401).json({ message: 'Érvénytelen PIN kód' });
    }
    
    // Csak ellenőrzés, akkor itt visszatérünk
    if (action === 'verify') {
      return res.status(200).json({ message: 'PIN kód ellenőrzése sikeres' });
    }
    
    // Ellenőrizzük, hogy az árajánlat nem járt-e le
    const now = new Date();
    const validUntil = new Date(quote.validUntil);
    
    if (now > validUntil) {
      // Frissítsük a státuszt lejártra, ha még nem tettük meg
      if (quote.status !== 'lejárt') {
        quote.status = 'lejárt';
        await quote.save();
      }
      
      return res.status(400).json({ message: 'Az árajánlat érvényessége lejárt' });
    }
    
    // Művelet végrehajtása
    let updateData = {};
    let message = '';
    
    if (action === 'accept') {
      updateData = {
        status: 'elfogadva',
        acceptedAt: now,
        clientNotes: notes || '',
        updatedAt: now
      };
      message = 'Árajánlat sikeresen elfogadva';
      
      // Ha projekthez van rendelve, akkor frissítjük a projekt státuszt
      if (quote.projectId) {
        await mongoose.model('Project').findByIdAndUpdate(
          quote.projectId,
          { $set: { quoteAccepted: true } }
        );
      }
    } else if (action === 'reject') {
      if (!reason) {
        return res.status(400).json({ message: 'Elutasítás esetén az indoklás megadása kötelező' });
      }
      
      updateData = {
        status: 'elutasítva',
        rejectedAt: now,
        rejectionReason: reason,
        clientNotes: notes || '',
        updatedAt: now
      };
      message = 'Árajánlat elutasítva';
    }
    
    // Árajánlat frissítése
    const updatedQuote = await Quote.findByIdAndUpdate(
      quote._id,
      { $set: updateData },
      { new: true }
    );
    
    res.status(200).json({ message, quote: updatedQuote });
  } catch (error) {
    console.error('Hiba az árajánlat kezelésekor:', error);
    res.status(500).json({ message: 'Szerver hiba az árajánlat kezelésekor' });
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
app.use('/api', quoteRoutes); // a védett végpontokhoz

// Auth routes
app.use('/api/auth', authRoutes);

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

export default app;