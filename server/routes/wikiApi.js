// server/routes/wikiApi.js
import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import WikiEntry from '../models/WikiEntry.js';

const router = express.Router();

// Public endpoints for AI Assistant to query the knowledge base
// GET wiki entry by search term
router.get('/search', async (req, res) => {
  try {
    const { query, language = 'en', limit = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Create language-specific search fields
    const searchField = `title.${language} content.${language} keywords.${language}`;
    
    // Perform text search based on language
    const entries = await WikiEntry.find(
      { $text: { $search: query, $language: language } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(parseInt(limit))
    .lean();
    
    // Format response to include only the requested language
    const formattedEntries = entries.map(entry => ({
      id: entry._id,
      title: entry.title[language],
      content: entry.content[language],
      keywords: entry.keywords[language],
      category: entry.category,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));
    
    res.json(formattedEntries);
  } catch (error) {
    console.error('Error searching wiki entries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await WikiEntry.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET entries by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { language = 'en' } = req.query;
    
    const entries = await WikiEntry.find({ category }).lean();
    
    // Format response to include only the requested language
    const formattedEntries = entries.map(entry => ({
      id: entry._id,
      title: entry.title[language],
      content: entry.content[language],
      keywords: entry.keywords[language],
      category: entry.category,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));
    
    res.json(formattedEntries);
  } catch (error) {
    console.error('Error fetching entries by category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI specific endpoint - generate response based on wiki knowledge
router.post('/ai-query', async (req, res) => {
  try {
    const { query, language = 'en' } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    // Search for relevant wiki entries
    const entries = await WikiEntry.find(
      { $text: { $search: query, $language: language } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(3)
    .lean();
    
    if (entries.length === 0) {
      return res.json({ 
        success: true,
        hasKnowledge: false,
        message: "No knowledge base entries found for this query."
      });
    }
    
    // Format the entries into context for the AI
    const context = entries.map(entry => ({
      title: entry.title[language],
      content: entry.content[language]
    })).join('\n\n');
    
    // Call DeepSeek API with context
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-a781f0251b034cf6b91f970b43d9caa5';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
    
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the knowledge base. 
                  Use the following knowledge base entries to answer the user's question. 
                  If the knowledge base doesn't contain relevant information, say so politely.
                  Current language: ${language}
                  Knowledge base entries:
                  ${context}`
      },
      {
        role: 'user',
        content: query
      }
    ];
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API error:', errorData);
      return res.status(response.status).json({ 
        message: 'Error with AI service',
        error: errorData 
      });
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      hasKnowledge: true,
      response: data.choices[0].message.content,
      sources: entries.map(entry => ({
        id: entry._id,
        title: entry.title[language],
        category: entry.category
      }))
    });
    
  } catch (error) {
    console.error('Error in AI query:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Protected endpoints (require authentication)
router.use(authMiddleware);

// GET all wiki entries (admin only)
router.get('/', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.userData.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const entries = await WikiEntry.find().sort({ updatedAt: -1 });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching wiki entries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET wiki entry by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await WikiEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Wiki entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error fetching wiki entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create new wiki entry
router.post('/', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.userData.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { title, content, keywords, category } = req.body;
    
    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required in all languages' });
    }
    
    // Validate multilingual content
    const languages = ['en', 'hu', 'de'];
    for (const lang of languages) {
      if (!title[lang] || !content[lang]) {
        return res.status(400).json({ message: `Title and content are required in ${lang} language` });
      }
    }
    
    const entry = new WikiEntry({
      title,
      content,
      keywords: keywords || { en: [], hu: [], de: [] },
      category,
      createdBy: req.userData.email
    });
    
    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating wiki entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update wiki entry
router.put('/:id', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.userData.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { title, content, keywords, category } = req.body;
    
    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required in all languages' });
    }
    
    // Validate multilingual content
    const languages = ['en', 'hu', 'de'];
    for (const lang of languages) {
      if (!title[lang] || !content[lang]) {
        return res.status(400).json({ message: `Title and content are required in ${lang} language` });
      }
    }
    
    const entry = await WikiEntry.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        keywords: keywords || { en: [], hu: [], de: [] },
        category,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!entry) {
      return res.status(404).json({ message: 'Wiki entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error updating wiki entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE wiki entry
router.delete('/:id', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.userData.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const entry = await WikiEntry.findByIdAndDelete(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Wiki entry not found' });
    }
    
    res.json({ message: 'Wiki entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting wiki entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;