import express from 'express';
import Contact from '../models/Contact.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// API kulcs middleware - ezt előre hozzuk és kiegészítjük debug logokkal
const validateApiKey = (req, res, next) => {
  console.log('======= API Key Validation =======');
  console.log('Headers received:', req.headers);
  console.log('Received API Key:', req.headers['x-api-key']);
  console.log('Expected API Key:', process.env.PUBLIC_API_KEY);
  console.log('Environment variables:', process.env);
  console.log('================================');
  
  const apiKey = req.headers['x-api-key'];
  
  if (!process.env.PUBLIC_API_KEY) {
    console.error('PUBLIC_API_KEY is not set in environment!');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  
  if (!apiKey) {
    console.error('No API key provided in request');
    return res.status(401).json({ message: 'API key is required' });
  }

  if (apiKey === process.env.PUBLIC_API_KEY) {
    console.log('API Key validation successful');
    next();
  } else {
    console.error('API Key validation failed');
    console.log('Keys do not match:');
    console.log('Received:', apiKey);
    console.log('Expected:', process.env.PUBLIC_API_KEY);
    res.status(401).json({ message: 'Invalid API key' });
  }
};

// Get all contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new contact
router.post('/contacts', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    const savedContact = await contact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete contact
router.delete('/contacts/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publikus üzenetküldő végpont API kulcs védelemmel
router.post('/public/contact', validateApiKey, async (req, res) => {
  try {
    // Alapvető validáció
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'Minden mező kitöltése kötelező'
      });
    }

    // Spam védelem - rate limiting implementálható itt
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      status: 'new',
      priority: 'medium',
      category: 'inquiry'
    });

    const savedContact = await contact.save();
    res.status(201).json({
      success: true,
      message: 'Üzenet sikeresen elküldve'
    });
  } catch (error) {
    console.error('Kontakt űrlap hiba:', error);
    res.status(500).json({
      message: 'Hiba történt az üzenet küldése során'
    });
  }
});



export default router;