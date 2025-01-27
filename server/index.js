import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import postRoutes from './routes/posts.js';
import contactRoutes from './routes/contacts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: [
    'https://nbstudio-backend.onrender.com',
    'https://nbstudio-backend-1.onrender.com',
    'https://nb-studio.net' // Új domain hozzáadva
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
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