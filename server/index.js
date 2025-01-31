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
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5001;

app.use(cors({
    origin: [
        'http://38.242.208.190:5001',
        'http://38.242.208.190',
        'http://38.242.208.190:5173',
        'https://nb-studio.net',
        'https://www.nb-studio.net',
        // Development
        'http://localhost:5173',
        'http://localhost:3000'
    ],
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

// MongoDB kapcsolódás és szerver indítás
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(port, host, () => {
            console.log(`Server running on http://${host}:${port}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });