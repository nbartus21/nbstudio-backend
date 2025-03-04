import express from 'express';
import mongoose from 'mongoose';
import Template from '../models/Template.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

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

export default router;