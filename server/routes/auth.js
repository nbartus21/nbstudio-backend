import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Magic link tokenek tárolása (éles környezetben ezt adatbázisban tárolnánk)
const magicLinkTokens = new Map();

// SMTP beállítások a .env fájlból
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Meglévő login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { email: email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Hibás email vagy jelszó' });
  }
});

// Magic link kérés route
router.post('/request-magic-link', async (req, res) => {
  const { email } = req.body;
  
  // Ellenőrizzük, hogy az email egyezik-e az admin email-jével
  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(400).json({ 
      message: 'Nincs ilyen email címmel regisztrált admin felhasználó' 
    });
  }
  
  try {
    // Generálunk egy egyedi tokent
    const token = crypto.randomBytes(32).toString('hex');
    
    // Eltároljuk a tokent és az emailt
    magicLinkTokens.set(token, {
      email,
      createdAt: new Date(),
      // 15 percig érvényes
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    
    // Magic link összeállítása
    const baseUrl = process.env.FRONTEND_URL || 'https://admin.nb-studio.net';
    const magicLink = `${baseUrl}/magic-login?token=${token}`;
    
    // Email küldése
    const mailOptions = {
      from: `"NB Studio Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Bejelentkezés az NB Studio Admin felületre',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">NB Studio Admin Bejelentkezés</h2>
          <p>Kattints az alábbi gombra a bejelentkezéshez. A link 15 percig érvényes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Bejelentkezés
            </a>
          </div>
          <p style="color: #6B7280; font-size: 14px;">
            Ha nem te kérted ezt az emailt, hagyd figyelmen kívül.
          </p>
          <p style="color: #6B7280; font-size: 14px;">
            A link csak egy készülékről használható egyszer.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ 
      message: 'Bejelentkezési link elküldve a megadott email címre',
      email: email
    });
    
  } catch (error) {
    console.error('Magic link küldési hiba:', error);
    res.status(500).json({ 
      message: 'Hiba történt a bejelentkezési link küldése során' 
    });
  }
});

// Magic link érvényesítés route
router.post('/verify-magic-link', (req, res) => {
  const { token } = req.body;
  
  // Ellenőrizzük, hogy létezik-e a token
  if (!magicLinkTokens.has(token)) {
    return res.status(400).json({ message: 'Érvénytelen vagy lejárt link' });
  }
  
  const tokenData = magicLinkTokens.get(token);
  
  // Ellenőrizzük a token érvényességét
  if (new Date() > tokenData.expiresAt) {
    magicLinkTokens.delete(token);
    return res.status(400).json({ message: 'A link lejárt' });
  }
  
  // Generálunk egy JWT tokent a bejelentkezéshez
  const jwtToken = jwt.sign(
    { email: tokenData.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Töröljük a felhasznált tokent
  magicLinkTokens.delete(token);
  
  res.json({ 
    token: jwtToken,
    email: tokenData.email
  });
});

// Token érvényesség ellenőrzése endpoint
router.get('/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Nincs megadva token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true });
  } catch (error) {
    res.status(401).json({ message: 'Érvénytelen token', valid: false });
  }
});

export default router;