import express from 'express';
import auth from '../middleware/auth.js';
import WebPage from '../models/WebPage.js';

const router = express.Router();

// GET all web pages
router.get('/', auth, async (req, res) => {
  try {
    const webPages = await WebPage.find().sort({ updatedAt: -1 });
    res.json(webPages);
  } catch (err) {
    console.error('Error fetching web pages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific web page by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const webPage = await WebPage.findById(req.params.id);
    if (!webPage) {
      return res.status(404).json({ message: 'Web page not found' });
    }
    res.json(webPage);
  } catch (err) {
    console.error('Error fetching web page:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific web page by identifier
router.get('/byIdentifier/:identifier', async (req, res) => {
  try {
    const webPage = await WebPage.findOne({ identifier: req.params.identifier });
    if (!webPage) {
      return res.status(404).json({ message: 'Web page not found' });
    }
    res.json(webPage);
  } catch (err) {
    console.error('Error fetching web page by identifier:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a new web page
router.post('/', auth, async (req, res) => {
  try {
    const { identifier, title, content, active } = req.body;
    
    // Check if identifier already exists
    const existingPage = await WebPage.findOne({ identifier });
    if (existingPage) {
      return res.status(400).json({ message: 'A page with this identifier already exists' });
    }
    
    const newWebPage = new WebPage({
      identifier,
      title,
      content,
      active
    });
    
    const webPage = await newWebPage.save();
    res.status(201).json(webPage);
  } catch (err) {
    console.error('Error creating web page:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a web page
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, active } = req.body;
    
    // Find and update the web page
    const webPage = await WebPage.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        active,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!webPage) {
      return res.status(404).json({ message: 'Web page not found' });
    }
    
    res.json(webPage);
  } catch (err) {
    console.error('Error updating web page:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a web page
router.delete('/:id', auth, async (req, res) => {
  try {
    const webPage = await WebPage.findByIdAndDelete(req.params.id);
    
    if (!webPage) {
      return res.status(404).json({ message: 'Web page not found' });
    }
    
    res.json({ message: 'Web page deleted' });
  } catch (err) {
    console.error('Error deleting web page:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET only active web pages (for public website)
router.get('/public/active', async (req, res) => {
  try {
    const webPages = await WebPage.find({ active: true }).sort({ updatedAt: -1 });
    res.json(webPages);
  } catch (err) {
    console.error('Error fetching active web pages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;