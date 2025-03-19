import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Környezeti változók ellenőrzése és alapértékek beállítása
const JWT_SECRET = process.env.JWT_SECRET || 'nb_studio_default_secret_key';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Meglévő login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email és jelszó megadása kötelező' });
  }
  
  if (email === ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { email: email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Hibás email vagy jelszó' });
  }
});

// Token érvényesség ellenőrzése endpoint
router.get('/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Nincs megadva token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token érvényesítve:', decoded.email);
    res.json({ valid: true, email: decoded.email });
  } catch (error) {
    console.error('Token érvényesítési hiba:', error.message);
    res.status(401).json({ message: 'Érvénytelen token', valid: false });
  }
});

export default router;