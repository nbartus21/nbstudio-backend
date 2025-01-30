import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';
import calculatorRoutes from './routes/calculators.js';
import projectRoutes from './routes/projects.js';
import domainRoutes from './routes/domains.js';
import serverRoutes from './routes/servers.js';
import licenseRoutes from './routes/licenses.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: [
    'http://38.242.208.190:5001',
    'http://38.242.208.190',
    'http://38.242.208.190:5173',
    'https://nb-studio.net',
    'https://www.nb-studio.net',
    // Development
    'https://nb-studio.net/de/blog',
    'https://nb-studio.net/hu/blog',
    'https://nb-studio.net/en/blog',
    '*'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Middleware-ek
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', postRoutes);
app.use('/api', contactRoutes);  // <-- Ide kell betenni az új route-ot
app.use('/api', calculatorRoutes); // masik uj
app.use('/api', projectRoutes); //uj projekt kezelo
app.use('/api', domainRoutes); //domain kezelo 
app.use('/api', serverRoutes); //server kezelo
app.use('/api', licenseRoutes); //license kezelo



// Alap route teszteléshez
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running' });
});

// MongoDB kapcsolódás és szerver indítás
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
