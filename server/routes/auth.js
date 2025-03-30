import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Helyette definiáljunk egy saját auth middleware-t
const authMiddlewareForBackup = (req, res, next) => {
  try {
    // Token kinyerése a header-ből
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Nincs autentikációs token' });
    }

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Érvénytelen token' });
  }
};

// Azonosítjuk a könyvtárstruktúrát
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const router = express.Router();

// Magic link tokenek tárolása (éles környezetben ezt adatbázisban tárolnánk)
const magicLinkTokens = new Map();

// Környezeti változók ellenőrzése és alapértékek beállítása
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const JWT_SECRET = process.env.JWT_SECRET || 'nb_studio_default_secret_key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://admin.nb-studio.net';

// Ellenőrizzük, hogy a kötelező környezeti változók be vannak-e állítva
if (!SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
  console.error('Hiányzó környezeti változók! Ellenőrizd a .env fájlt:');
  console.error('- SMTP_USER: ' + (SMTP_USER ? 'OK' : 'HIÁNYZIK'));
  console.error('- SMTP_PASS: ' + (SMTP_PASS ? 'OK' : 'HIÁNYZIK'));
  console.error('- ADMIN_EMAIL: ' + (ADMIN_EMAIL ? 'OK' : 'HIÁNYZIK'));
}

// SMTP beállítások a .env fájlból
const transporterConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
};

console.log('SMTP Konfiguráció (jelszó nélkül):', {
  ...transporterConfig,
  auth: { user: SMTP_USER, pass: '******' }
});

// Nodemailer transporter létrehozása
let transporter;
try {
  transporter = nodemailer.createTransport(transporterConfig);
  // Teszteljük a kapcsolatot (aszinkron, nincs await, csak logolunk)
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP kapcsolat hiba:', error);
    } else {
      console.log('SMTP szerver kapcsolat OK, kész az emailek küldésére');
    }
  });
} catch (error) {
  console.error('Hiba a nodemailer transporter létrehozásakor:', error);
}

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

// Magic link kérés route
router.post('/request-magic-link', async (req, res) => {
  console.log('Magic link kérés beérkezett:', req.body);
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email cím megadása kötelező' });
  }
  
  // Ellenőrizzük, hogy az email egyezik-e az admin email-jével
  if (email !== ADMIN_EMAIL) {
    console.log(`Email nem egyezik az admin címével. Beérkezett: ${email}, Elvárt: ${ADMIN_EMAIL}`);
    return res.status(400).json({ 
      message: 'Nincs ilyen email címmel regisztrált admin felhasználó' 
    });
  }
  
  // Ellenőrizzük, hogy a transporter létezik-e
  if (!transporter) {
    console.error('A nodemailer transporter nincs konfigurálva');
    return res.status(500).json({ 
      message: 'Email küldési szolgáltatás nincs megfelelően beállítva' 
    });
  }
  
  try {
    // Generálunk egy egyedi tokent
    const token = crypto.randomBytes(32).toString('hex');
    console.log('Token generálva:', token.substring(0, 10) + '...');
    
    // Eltároljuk a tokent és az emailt
    magicLinkTokens.set(token, {
      email,
      createdAt: new Date(),
      // 15 percig érvényes
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    
    // Magic link összeállítása
    const magicLink = `${FRONTEND_URL}/magic-login?token=${token}`;
    console.log('Magic link generálva:', magicLink);
    
    // Email küldése
    const mailOptions = {
      from: `"NB Studio Admin" <${SMTP_USER}>`,
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
    
    console.log('Email küldés megkísérlése...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email elküldve:', info.messageId);
    
    res.json({ 
      message: 'Bejelentkezési link elküldve a megadott email címre',
      email: email
    });
    
  } catch (error) {
    console.error('Magic link küldési hiba részletek:', error);
    res.status(500).json({ 
      message: 'Hiba történt a bejelentkezési link küldése során',
      error: error.message
    });
  }
});

// Magic link érvényesítés route
router.post('/verify-magic-link', (req, res) => {
  console.log('Magic link token ellenőrzés beérkezett');
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ message: 'Token megadása kötelező' });
  }
  
  // Ellenőrizzük, hogy létezik-e a token
  if (!magicLinkTokens.has(token)) {
    console.log('Token nem található:', token.substring(0, 10) + '...');
    return res.status(400).json({ message: 'Érvénytelen vagy lejárt link' });
  }
  
  const tokenData = magicLinkTokens.get(token);
  console.log('Token adatok:', {
    email: tokenData.email,
    createdAt: tokenData.createdAt,
    expiresAt: tokenData.expiresAt
  });
  
  // Ellenőrizzük a token érvényességét
  if (new Date() > tokenData.expiresAt) {
    console.log('Token lejárt');
    magicLinkTokens.delete(token);
    return res.status(400).json({ message: 'A link lejárt' });
  }
  
  // Generálunk egy JWT tokent a bejelentkezéshez
  const jwtToken = jwt.sign(
    { email: tokenData.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Töröljük a felhasznált tokent
  magicLinkTokens.delete(token);
  console.log('Sikeres magic link bejelentkezés:', tokenData.email);
  
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
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token érvényesítve:', decoded.email);
    res.json({ valid: true, email: decoded.email });
  } catch (error) {
    console.error('Token érvényesítési hiba:', error.message);
    res.status(401).json({ message: 'Érvénytelen token', valid: false });
  }
});

// Backup készítési endpoint - autentikációval védett
router.get('/create-backup', authMiddlewareForBackup, async (req, res) => {
  try {
    console.log('Backup készítési kérés fogadva');
    
    // Ellenőrizzük, hogy az autentikált felhasználó admin-e
    if (req.userData.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Nincs jogosultság a művelethez' });
    }
    
    // Az összes Mongoose modell lekérdezése
    const collections = mongoose.connection.collections;
    const backup = {};
    
    // Végigiterálunk az összes collection-ön
    for (const [name, collection] of Object.entries(collections)) {
      console.log(`${name} collection mentése...`);
      
      // Az összes dokumentum lekérdezése az adott collection-ből
      const documents = await collection.find({}).toArray();
      backup[name] = documents;
    }
    
    // Ideiglenes fájl létrehozása a backup számára
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupDir = path.join(__dirname, '../../backup');
    const backupFilePath = path.join(backupDir, `backup_${timestamp}.json`);
    
    // Ellenőrizzük, hogy létezik-e a backup könyvtár, ha nem, akkor létrehozzuk
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup adatok írása a fájlba
    fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));
    
    console.log(`Backup sikeresen létrehozva: ${backupFilePath}`);
    
    // A fájl visszaküldése a kliensnek
    res.download(backupFilePath, `nb_studio_backup_${timestamp}.json`, (err) => {
      if (err) {
        console.error('Hiba a fájl letöltésekor:', err);
      } else {
        // Töröljük a fájlt a letöltés után (opcionális)
        // fs.unlinkSync(backupFilePath);
      }
    });
  } catch (error) {
    console.error('Backup készítési hiba:', error);
    res.status(500).json({ 
      message: 'Hiba történt a backup készítése során',
      error: error.message
    });
  }
});

export default router;