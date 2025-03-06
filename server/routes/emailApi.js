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

// Segédfüggvény a template string-ek és változók kezelésére
const cleanValue = (value) => {
  if (!value) return '';
  // Ha a szöveg tartalmaz template változókat, akkor visszatérünk egy üres stringgel
  if (typeof value === 'string' && (value.includes('{{') || value.includes('$json'))) {
    return '';
  }
  return value;
};

// Email beküldési végpont N8N számára
router.post('/n8n-incoming-email', validateApiKey, async (req, res) => {
  try {
    console.log('Új bejövő email N8N-től');
    
    const { 
      from, subject, text, html, 
      to, cc, bcc, 
      messageId, inReplyTo, references, threadId,
      attachments
    } = req.body;
    
    // Értékek tisztítása
    const cleanedHtml = cleanValue(html);
    const cleanedText = cleanValue(text);
    
    console.log('Tisztított értékek:', {
      html: cleanedHtml ? 'Van tartalom' : 'Nincs tartalom',
      text: cleanedText ? 'Van tartalom' : 'Nincs tartalom'
    });
    
    // Email cím és név kibontása
    const fromParts = from.match(/^(?:(.+) )?<?([^>]+)>?$/);
    const clientName = fromParts ? fromParts[1] || '' : '';
    const clientEmail = fromParts ? fromParts[2] : from;
    
    // Ellenőrizzük, hogy válasz-e egy meglévő ticketre
    let ticket;
    
    if (inReplyTo) {
      // Keresünk ticket-et a válaszolt email ID alapján
      ticket = await SupportTicket.findOne({
        'emailData.messageId': inReplyTo
      });
      
      // Ha nem találunk, próbáljuk a hivatkozások alapján
      if (!ticket && references && references.length > 0) {
        ticket = await SupportTicket.findOne({
          'emailData.messageId': { $in: references }
        });
      }
      
      // Ha nem találunk és van threadId, próbáljuk a thread ID alapján
      if (!ticket && threadId) {
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
        content: cleanedHtml || cleanedText || 'Üres üzenet',
        from: clientEmail,
        timestamp: new Date(),
        isInternal: false,
        attachments: attachments ? attachments.map(att => ({
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
    console.log('Új ticket létrehozása N8N-től');
    
    const newTicket = new SupportTicket({
      subject: cleanValue(subject) || 'No Subject',
      content: cleanedHtml || cleanedText || 'Empty message',
      status: 'new',
      priority: 'medium', // Alapértelmezett
      client: {
        name: clientName,
        email: clientEmail
      },
      emailData: {
        messageId,
        inReplyTo,
        references: references || [],
        threadId,
        fromAddress: from,
        toAddress: to,
        ccAddress: cc || [],
        bccAddress: bcc || []
      },
      source: 'email',
      attachments: attachments ? attachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        url: att.url
      })) : []
    });
    
    await newTicket.save();
    
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

/**
 * CURL Import példa az n8n integrációhoz:
 * 
 * curl -X POST "https://admin.nb-studio.net:5001/api/email/n8n-incoming-email" \
 * -H "x-api-key: qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0" \
 * -H "Content-Type: application/json" \
 * -d '{
 *   "from": "{{ $json[0].from }}",
 *   "to": "{{ $json[0].to }}",
 *   "subject": "{{ $json[0].subject }}",
 *   "text": "{{ $json[0].text }}",
 *   "html": "{{ $json[0].html }}",
 *   "messageId": "{{ $json[0].messageId }}",
 *   "inReplyTo": {{ $json[0].inReplyTo ? JSON.stringify($json[0].inReplyTo) : "null" }},
 *   "references": {{ Array.isArray($json[0].references) ? JSON.stringify($json[0].references) : "[]" }},
 *   "threadId": {{ $json[0].threadId ? JSON.stringify($json[0].threadId) : "null" }},
 *   "attachments": {{ Array.isArray($json[0].attachments) ? JSON.stringify($json[0].attachments) : "[]" }}
 * }'
 */

export default router;