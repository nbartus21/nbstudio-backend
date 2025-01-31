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

dotenv.config();
const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

// SSL beállítások
const options = {
   key: fs.readFileSync('/root/ssl/private.key'),
   cert: fs.readFileSync('/root/ssl/certificate.crt')
};

// CORS beállítások
app.use(cors({
   origin: '*',
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization'],
   credentials: true,
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
       // HTTPS szerver indítása
       https.createServer(options, app).listen(port, host, () => {
           console.log(`Server running on https://${host}:${port}`);
       });
   })
   .catch((error) => {
       console.error('MongoDB connection error:', error);
   });