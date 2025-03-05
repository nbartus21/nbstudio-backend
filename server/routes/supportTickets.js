// routes/supportTickets.js
import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Globális változó a Socket.IO objektumnak
let io;

// Socket.IO inicializálása
export const initializeSocketIO = (socketIO) => {
  io = socketIO;
};

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

// =========== VÉDETT VÉGPONTOK ===========
router.use(authMiddleware);

// Összes ticket lekérése
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, assignedTo, tag, search, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Szűrések
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (tag) query.tags = tag;
    
    // Szöveg keresés
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Paginálás
    const skip = (page - 1) * limit;
    
    // Lekérdezés
    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Összes találat száma
    const total = await SupportTicket.countDocuments(query);
    
    res.json({
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Egy ticket lekérése
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Olvasottnak jelölés
    if (!ticket.isRead) {
      ticket.isRead = true;
      await ticket.save();
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ticket létrehozása manuálisan
router.post('/tickets', async (req, res) => {
  try {
    const ticketData = req.body;
    
    // Forrás beállítása, ha nincs megadva
    if (!ticketData.source) {
      ticketData.source = 'other';
    }
    
    const ticket = new SupportTicket(ticketData);
    const savedTicket = await ticket.save();
    
    // Értesítés létrehozása
    const notification = new Notification({
      userId: process.env.ADMIN_EMAIL || 'admin@example.com',
      type: 'ticket',
      title: 'Új ticket létrehozva',
      message: `Új ticket: ${ticket.subject}`,
      severity: ticket.priority === 'urgent' ? 'error' : 
               ticket.priority === 'high' ? 'warning' : 'info',
      link: `/support/tickets/${savedTicket._id}`
    });
    
    await notification.save();
    
    res.status(201).json(savedTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ticket frissítése
router.put('/tickets/:id', async (req, res) => {
  try {
    const { status, priority, assignedTo, tags, notes } = req.body;
    
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Frissíthető mezők
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (tags) ticket.tags = tags;
    
    // Dátum frissítése
    ticket.updatedAt = new Date();
    
    const updatedTicket = await ticket.save();
    
    // Socket.IO értesítés a frissítésről
    if (io) {
      io.to(`ticket_${ticket._id}`).emit('ticketStatusChanged', updatedTicket);
    }
    
    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Válasz küldése a ticketre
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    const { content, isInternal, attachments } = req.body;
    
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Válasz hozzáadása
    const newResponse = {
      content,
      from: req.userData.email,
      timestamp: new Date(),
      isInternal: isInternal || false,
      attachments: attachments || []
    };
    
    ticket.responses.push(newResponse);
    
    // Ha nem belső jegyzet, frissítsük a státuszt és küldjünk emailt
    if (!isInternal) {
      // Státusz frissítése, ha new vagy pending
      if (ticket.status === 'new' || ticket.status === 'pending') {
        ticket.status = 'open';
      }
      
      // Email küldése az ügyfélnek
      const mailOptions = {
        from: `"NB Studio Support" <${process.env.CONTACT_SMTP_USER || process.env.SMTP_USER}>`,
        to: ticket.client.email,
        subject: `Re: ${ticket.subject} [#${ticket._id.toString().slice(-6)}]`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">NB Studio Support</h2>
            <p>Tisztelt ${ticket.client.name || 'Ügyfelünk'}!</p>
            <p>${content.replace(/\n/g, '<br>')}</p>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 14px; color: #666;">
              Ez egy automatikus értesítés. Kérjük, ha válaszolni szeretne, egyszerűen válaszoljon erre az emailre.
            </p>
            <p style="font-size: 12px; color: #999;">
              Ticket azonosító: #${ticket._id.toString().slice(-6)}
            </p>
          </div>
        `,
        // Hivatkozások az eredeti emailre - így egy beszélgetésszálban marad a kommunikáció
        ...(ticket.emailData && ticket.emailData.messageId ? {
          headers: {
            'In-Reply-To': ticket.emailData.messageId,
            'References': ticket.emailData.references ? 
              [...ticket.emailData.references, ticket.emailData.messageId].join(' ') : 
              ticket.emailData.messageId
          }
        } : {})
      };
      
      await transporter.sendMail(mailOptions);
    }
    
    await ticket.save();
    
    // Socket.IO értesítés
    if (io) {
      io.to(`ticket_${ticket._id}`).emit('newResponse', ticket);
    }
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ticket törlése
router.delete('/tickets/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    await SupportTicket.deleteOne({ _id: req.params.id });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========== EMAIL WEBHOOK ENDPOINT ===========
// Ezt kivesszük az authMiddleware alól, mert ezt egy külső szolgáltató fogja hívni

export function setupEmailEndpoint(app) {
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

  // Új email webhook
  app.post('/api/incoming-email', validateApiKey, async (req, res) => {
    try {
      console.log('Új bejövő email webhook hívás');
      
      const { 
        from, subject, text, html, 
        to, cc, bcc, 
        messageId, inReplyTo, references, threadId,
        attachments, headers 
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
        
        // Értesítés küldése
        const notification = new Notification({
          userId: process.env.ADMIN_EMAIL || 'admin@example.com',
          type: 'ticket',
          title: 'Új válasz egy ticketre',
          message: `Ticket #${ticket._id.toString().slice(-6)}: Új válasz érkezett.`,
          severity: ticket.priority === 'urgent' ? 'error' : 
                  ticket.priority === 'high' ? 'warning' : 'info',
          link: `/support/tickets/${ticket._id}`
        });
        
        await notification.save();
        
        // Socket.IO értesítés ha van új üzenet
        if (io) {
          io.emit('newTicketResponse', ticket);
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Válasz sikeresen hozzáadva a tickethez',
          ticketId: ticket._id
        });
      }
      
      // Ha ez új ticket
      console.log('Új ticket létrehozása');
      
      // Csak akkor hozunk létre ticketet, ha a cél email a kontakt@nb-studio.net
      const targetEmail = process.env.CONTACT_SMTP_USER || 'kontakt@nb-studio.net';
      const isTargetEmail = to.includes(targetEmail);
      
      if (!isTargetEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nem a célcímnek küldött email, nem hozunk létre ticketet' 
        });
      }
      
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
          bccAddress: bcc || [],
          originalHeaders: headers
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
      
      // Értesítés küldése
      const notification = new Notification({
        userId: process.env.ADMIN_EMAIL || 'admin@example.com',
        type: 'ticket',
        title: 'Új support ticket',
        message: `Új ticket: ${subject || 'No Subject'}`,
        severity: 'info',
        link: `/support/tickets/${newTicket._id}`
      });
      
      await notification.save();
      
      // Socket.IO értesítés ha van új ticket
      if (io) {
        io.emit('newTicket', newTicket);
      }
      
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
        console.error('Hiba az automatikus válasz küldésekor:', emailError);
        // Nem szakítjuk meg a folyamatot, ha az email küldés sikertelen
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
}

export default router;