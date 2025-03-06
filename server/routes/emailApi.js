import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();



// Email transporter beállítása
const transporter = nodemailer.createTransport({
  host: process.env.CONTACT_SMTP_HOST || process.env.SMTP_HOST,
  port: process.env.CONTACT_SMTP_PORT || process.env.SMTP_PORT,
  secure: process.env.CONTACT_SMTP_SECURE === 'true',
  auth: {
    user: process.env.CONTACT_SMTP_USER || process.env.SMTP_USER,
    pass: process.env.CONTACT_SMTP_PASS || process.env.SMTP_PASS
  }
});


router.get('/test', (req, res) => {
    console.log('Email API teszt végpont meghívva');
    res.json({ message: 'Email API teszt végpont működik' });
  });

// API kulcs ellenőrző middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!process.env.EMAIL_WEBHOOK_API_KEY) {
    return res.status(500).json({ message: 'API kulcs nincs beállítva a szerveren' });
  }
  
  if (!apiKey || apiKey !== process.env.EMAIL_WEBHOOK_API_KEY) {
    return res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }
  
  next();
};

// Egyszerűsített teszt POST végpont
router.post('/n8n-incoming-email-test', validateApiKey, (req, res) => {
    console.log('Egyszerű POST teszt meghívva');
    console.log('Kapott adatok:', req.body);
    res.json({ 
      success: true, 
      message: 'Teszt végpont működik',
      receivedData: req.body
    });
  });

// Email beküldési végpont N8N számára
// Az eredeti végpontot módosítsd így
router.post('/n8n-incoming-email', validateApiKey, async (req, res) => {
    try {
      console.log('1. Új bejövő email N8N-től - ellenőrzés kezdődik');
      
      const { 
        from, subject, text, html, 
        to, cc, bcc, 
        messageId, inReplyTo, references, threadId,
        attachments
      } = req.body;
      
      console.log('2. Email adatok sikeresen kiolvasva:', { from, subject });
      
      // Email cím és név kibontása
      const fromParts = from ? from.match(/^(?:(.+) )?<?([^>]+)>?$/) : null;
      const clientName = fromParts ? fromParts[1] || '' : '';
      const clientEmail = fromParts ? fromParts[2] : from;
      
      console.log('3. Feladó feldolgozva:', { clientName, clientEmail });
      
      // Alapvető adatok ellenőrzése a ticket létrehozásához
      if (!clientEmail || !subject) {
        console.log('Hiányzó alapvető adatok:', { clientEmail, subject });
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező mezők: feladó email és tárgy'
        });
      }
      
      console.log('4. Új ticket létrehozása egyszerűsített módban');
      
      // Egyszerűsített ticket létrehozás
      const newTicket = new SupportTicket({
        subject: subject || 'No Subject',
        content: html || text || 'Empty message',
        status: 'new',
        priority: 'medium',
        client: {
          name: clientName,
          email: clientEmail
        },
        source: 'email'
      });
      
      console.log('5. Ticket objektum létrehozva, mentés előtt');
      
      await newTicket.save();
      
      console.log('6. Ticket sikeresen elmentve:', newTicket._id);
      
      // Automatikus válasz küldés mellőzve a tesztelés során
      
      return res.status(201).json({ 
        success: true, 
        message: 'Ticket sikeresen létrehozva',
        ticketId: newTicket._id
      });
      
    } catch (error) {
      console.error('HIBA a feldolgozás során:', error);
      res.status(500).json({ 
        success: false,
        message: 'Szerver hiba a feldolgozás során', 
        error: error.message,
        stack: error.stack  // Részletes hibajelentés a hibakereséshez
      });
    }
  });

export default router;