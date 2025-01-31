import express from 'express';
import Contact from '../models/Contact.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// API kulcs middleware - ezt előre hozzuk és kiegészítjük debug logokkal
const validateApiKey = (req, res, next) => {
  console.log('Received API Key:', req.headers['x-api-key']); // Debug log
  console.log('Expected API Key:', process.env.PUBLIC_API_KEY); // Debug log
  
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey === process.env.PUBLIC_API_KEY) {
    next();
  } else {
    console.log('API Key validation failed'); // Debug log
    res.status(401).json({ message: 'Érvénytelen API kulcs' });
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