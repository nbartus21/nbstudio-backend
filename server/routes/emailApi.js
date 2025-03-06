import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

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

// Teszt végpont
router.get('/test', (req, res) => {
  console.log('Email API teszt végpont meghívva');
  res.json({ message: 'Email API teszt végpont működik' });
});

// Email beküldési végpont N8N számára
router.post('/n8n-incoming-email', validateApiKey, async (req, res) => {
  try {
    console.log('Új bejövő email N8N-től');
    console.log('Email adatok:', JSON.stringify(req.body, null, 2));
    
    // Adatok kicsomagolása
    let { 
      from, subject, text, html, 
      to, cc, bcc, 
      messageId, inReplyTo, references, threadId,
      attachments
    } = req.body;
    
    // Ha az értékek template stringek, azokat kicseréljük üres értékekre vagy alapértelmezettekre
    if (typeof from === 'string' && from.startsWith('{{') && from.endsWith('}}')) {
      console.log('Template string észlelve a "from" mezőben, normalizálás...');
      from = '';
    }
    
    if (typeof subject === 'string' && subject.startsWith('{{') && subject.endsWith('}}')) {
      console.log('Template string észlelve a "subject" mezőben, normalizálás...');
      subject = 'No Subject';
    }
    
    if (typeof text === 'string' && text.startsWith('{{') && text.endsWith('}}')) {
      console.log('Template string észlelve a "text" mezőben, normalizálás...');
      text = '';
    }
    
    if (typeof html === 'string' && html.startsWith('{{') && html.endsWith('}}')) {
      console.log('Template string észlelve a "html" mezőben, normalizálás...');
      html = '';
    }
    
    if (typeof messageId === 'string' && messageId.startsWith('{{') && messageId.endsWith('}}')) {
      console.log('Template string észlelve a "messageId" mezőben, normalizálás...');
      messageId = `auto-${Date.now()}@nb-studio.net`;
    }
    
    // Ha a feladó üres vagy nem megfelelő
    if (!from || from.trim() === '') {
      console.error('Hiányzó feladó cím!');
      return res.status(400).json({
        success: false,
        message: 'A feladó cím (from) megadása kötelező'
      });
    }
    
    // Email cím és név kibontása
    const fromParts = from.match(/^(?:(.+) )?<?([^>]+)>?$/);
    const clientName = fromParts ? fromParts[1] || '' : '';
    const clientEmail = fromParts ? fromParts[2] : from;
    
    console.log('Kibontott feladó adatok:', { clientName, clientEmail });
    
    // Ellenőrizzük, hogy válasz-e egy meglévő ticketre
    let ticket;
    
    if (inReplyTo && inReplyTo !== null && typeof inReplyTo === 'string' && !inReplyTo.startsWith('{{')) {
      // Keresünk ticket-et a válaszolt email ID alapján
      ticket = await SupportTicket.findOne({
        'emailData.messageId': inReplyTo
      });
      
      // Ha nem találunk, próbáljuk a hivatkozások alapján
      if (!ticket && references && Array.isArray(references) && references.length > 0) {
        ticket = await SupportTicket.findOne({
          'emailData.messageId': { $in: references }
        });
      }
      
      // Ha nem találunk és van threadId, próbáljuk a thread ID alapján
      if (!ticket && threadId && threadId !== null && typeof threadId === 'string') {
        ticket = await SupportTicket.findOne({
          'emailData.threadId': threadId
        });
      }
    }
    
    // Ha ez válasz egy meglévő ticketre
    if (ticket) {
      console.log('Ez válasz egy meglévő ticketre:', ticket._id);
      
      // Válasz hozzáadása
      ticket.responses.push({
        content: html || text || 'Üres üzenet',
        from: clientEmail,
        timestamp: new Date(),
        isInternal: false,
        attachments: attachments && Array.isArray(attachments) ? attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          content: att.content,
          url: att.url
        })) : []
      });
      
      // Státusz frissítése closed-ról pending-re, ha az ügyfél válaszol
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        ticket.status = 'pending';
      }
      
      // Olvasatlannak jelölés
      ticket.isRead = false;
      ticket.updatedAt = new Date();
      
      await ticket.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Válasz sikeresen hozzáadva a tickethez',
        ticketId: ticket._id
      });
    }
    
    // Ha ez új ticket
    console.log('Új ticket létrehozása');
    
    const newTicket = new SupportTicket({
      subject: subject || 'No Subject',
      content: html || text || 'Empty message',
      status: 'new',
      priority: 'medium', // Alapértelmezett
      client: {
        name: clientName,
        email: clientEmail
      },
      emailData: {
        messageId: messageId || `auto-${Date.now()}@nb-studio.net`,
        inReplyTo: null,
        references: Array.isArray(references) ? references : [],
        threadId: null,
        fromAddress: from,
        toAddress: to || 'kontakt@nb-studio.net',
        ccAddress: cc && Array.isArray(cc) ? cc : [],
        bccAddress: bcc && Array.isArray(bcc) ? bcc : []
      },
      source: 'email',
      attachments: attachments && Array.isArray(attachments) ? attachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        url: att.url
      })) : []
    });
    
    await newTicket.save();
    console.log('Új ticket sikeresen létrehozva:', newTicket._id);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Ticket sikeresen létrehozva',
      ticketId: newTicket._id
    });
    
  } catch (error) {
    console.error('Hiba az email feldolgozásakor:', error);
    res.status(500).json({ 
      success: false,
      message: 'Szerver hiba a feldolgozás során', 
      error: error.message 
    });
  }
});

export default router;