import express from 'express';
import mongoose from 'mongoose';
import Template from '../models/Template.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js'; // Task modell importálása
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// =========== TEMPLATES ROUTES ===========

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find().sort({ updatedAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching translation templates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new template
router.post('/templates', async (req, res) => {
  try {
    const {
      name,
      description,
      sourceText,
      targetText,
      sourceLanguage,
      targetLanguage,
      category
    } = req.body;

    if (!name || !sourceText || !targetText) {
      return res.status(400).json({ message: 'Name, source text and target text are required' });
    }

    const template = new Template({
      name,
      description,
      sourceText,
      targetText,
      sourceLanguage: sourceLanguage || 'hu',
      targetLanguage: targetLanguage || 'de',
      category: category || 'email',
      createdBy: req.userData?.email || 'system'
    });

    const savedTemplate = await template.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    await Template.deleteOne({ _id: req.params.id });
    res.json({ message: 'Template removed' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========== NOTES ROUTES ===========

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

// =========== TASKS ROUTES ===========

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userData.email }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get task by ID
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new task
router.post('/tasks', async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      userId: req.userData.email
    });
    
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    await Task.deleteOne({ _id: req.params.id });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add update to task
router.post('/tasks/:id/updates', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const update = {
      content: req.body.content,
      progress: req.body.progress,
      createdAt: new Date()
    };
    
    task.updates.push(update);
    
    // Update progress if higher than current
    if (update.progress > task.progress) {
      task.progress = update.progress;
    }
    
    // Mark as completed if progress is 100%
    if (update.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
    }
    
    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Error adding task update:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;