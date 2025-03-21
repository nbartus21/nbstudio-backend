import express from 'express';
import ContentPage from '../models/ContentPage.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get all content pages
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contentPages = await ContentPage.find().sort({ slug: 1 });
    res.status(200).json(contentPages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific content page by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    const contentPage = await ContentPage.findOne({ slug });
    
    if (!contentPage) {
      return res.status(404).json({ message: 'Content page not found' });
    }
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update a content page
router.put('/:slug', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ message: 'Content is required and must be an object' });
    }
    
    // Convert the content object to a Map if it's not already
    const contentMap = new Map(Object.entries(content));
    
    // Use findOneAndUpdate with upsert:true to create if not exists
    const contentPage = await ContentPage.findOneAndUpdate(
      { slug },
      { content: contentMap },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public API endpoint to get a content page
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!['terms', 'privacy', 'cookies', 'imprint'].includes(slug)) {
      return res.status(400).json({ message: 'Invalid content page slug' });
    }
    
    const contentPage = await ContentPage.findOne({ slug });
    
    if (!contentPage) {
      return res.status(404).json({ message: 'Content page not found' });
    }
    
    res.status(200).json(contentPage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
