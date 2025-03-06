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
router.post('/n8n-incoming-email', validateApiKey, async (req, res) => {
  try {
    console.log('Új bejövő email N8N-től');
    
    const { 
      from, subject, text, html, 
      to, cc, bcc, 
      messageId, inReplyTo, references, threadId,
      attachments
    } = req.body;
    
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
        content: html || text || 'Üres üzenet',
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
      
      // Nem hozunk létre notification-t - elkerüljük a hibát
      
      return res.status(200).json({ 
        success: true, 
        message: 'Válasz sikeresen hozzáadva a tickethez',
        ticketId: ticket._id
      });
    }
    
    // Ha ez új ticket
    console.log('Új ticket létrehozása N8N-től');
    
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
    
    // Nem hozunk létre notification-t - elkerüljük a hibát
    
    // Automatikus válasz küldése
    try {
      const mailOptions = {
        from: `"NB Studio Support" <${process.env.CONTACT_SMTP_USER}>`,
        to: clientEmail,
        subject: `Re: ${subject || 'Your support request'} [#${newTicket._id.toString().slice(-6)}]`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">NB Studio Support</h2>
            <p>Tisztelt ${clientName || 'Ügyfelünk'}!</p>
            <p>Köszönjük megkeresését! Ticket-jét rögzítettük rendszerünkben. Kollégáink hamarosan felveszik Önnel a kapcsolatot.</p>
            <p>Ticket azonosító: #${newTicket._id.toString().slice(-6)}</p>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 14px; color: #666;">
              Ez egy automatikus értesítés. További kérdések esetén egyszerűen válaszoljon erre az e-mailre.
            </p>
          </div>
        `,
        headers: {
          'In-Reply-To': messageId,
          'References': messageId
        }
      };
      
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.log('Email küldési hiba, de folytatjuk:', emailError.message);
      // Folytatás hibák ellenére
    }
    
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