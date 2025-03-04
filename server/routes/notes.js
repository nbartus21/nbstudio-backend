import express from 'express';
import Note from '../models/Note.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all notes for the authenticated user
router.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find({ createdBy: req.userData.email }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new note
router.post('/notes', async (req, res) => {
  try {
    const { title, content, tags, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Process tags if they're provided as a string
    let processedTags = tags;
    if (typeof tags === 'string') {
      processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const note = new Note({
      title,
      content,
      tags: processedTags || [],
      category: category || 'general',
      createdBy: req.userData.email
    });

    const savedNote = await note.save();
    res.status(201).json(savedNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get note by ID
router.get('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update note
router.put('/notes/:id', async (req, res) => {
  try {
    const { title, content, tags, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Process tags if they're provided as a string
    let processedTags = tags;
    if (typeof tags === 'string') {
      processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const note = await Note.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    note.title = title;
    note.content = content;
    note.tags = processedTags || [];
    note.category = category || 'general';
    note.updatedAt = Date.now();

    const updatedNote = await note.save();
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete note
router.delete('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ 
      _id: req.params.id,
      createdBy: req.userData.email 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search notes
router.get('/notes/search', async (req, res) => {
  try {
    const { query, category, tags } = req.query;
    
    let searchQuery = { createdBy: req.userData.email };
    
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    if (category) {
      searchQuery.category = category;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      searchQuery.tags = { $all: tagArray };
    }
    
    const notes = await Note.find(searchQuery).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;