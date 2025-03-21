import express from 'express';
import auth from '../middleware/auth.js';
import WebsiteContent from '../models/WebsiteContent.js';

const router = express.Router();

// GET all website content pages
router.get('/', auth, async (req, res) => {
  try {
    const contents = await WebsiteContent.find().sort({ page: 1 });
    res.json(contents);
  } catch (err) {
    console.error('Error fetching website content:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific content page
router.get('/:page', auth, async (req, res) => {
  try {
    const content = await WebsiteContent.findOne({ page: req.params.page });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (err) {
    console.error('Error fetching content page:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE or UPDATE website content (upsert)
router.post('/:page', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const page = req.params.page;
    
    // Validate page type
    if (!['cookies', 'privacy', 'terms', 'imprint'].includes(page)) {
      return res.status(400).json({ message: 'Invalid page type' });
    }
    
    // Find and update or create new
    const updatedContent = await WebsiteContent.findOneAndUpdate(
      { page },
      { 
        content,
        updatedAt: Date.now()
      },
      { new: true, upsert: true }
    );
    
    res.json(updatedContent);
  } catch (err) {
    console.error('Error saving website content:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a content page
router.delete('/:page', auth, async (req, res) => {
  try {
    const content = await WebsiteContent.findOneAndDelete({ page: req.params.page });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json({ message: 'Content deleted' });
  } catch (err) {
    console.error('Error deleting content:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET public website content (for the frontend website)
router.get('/public/:page', async (req, res) => {
  try {
    const page = req.params.page;
    
    // Validate page type
    if (!['cookies', 'privacy', 'terms', 'imprint'].includes(page)) {
      return res.status(400).json({ message: 'Invalid page type' });
    }
    
    const content = await WebsiteContent.findOne({ page, active: true });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json(content);
  } catch (err) {
    console.error('Error fetching public content:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;