import express from 'express';
import mongoose from 'mongoose';
import Template from '../models/Template.js';

const router = express.Router();

// Összes sablon lekérdezése
router.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sablon létrehozása
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
      sourceLanguage,
      targetLanguage,
      category,
      createdBy: req.userData?.userId || 'system'
    });

    const savedTemplate = await template.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sablon lekérdezése ID alapján
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sablon frissítése
router.put('/templates/:id', async (req, res) => {
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

    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    template.name = name;
    template.description = description;
    template.sourceText = sourceText;
    template.targetText = targetText;
    template.sourceLanguage = sourceLanguage;
    template.targetLanguage = targetLanguage;
    template.category = category;
    template.updatedAt = Date.now();

    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sablon törlése
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    await template.deleteOne();
    res.json({ message: 'Template removed' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sablonok keresése
router.get('/templates/search', async (req, res) => {
  try {
    const { query, category, sourceLanguage, targetLanguage } = req.query;
    
    let searchQuery = {};
    
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { sourceText: { $regex: query, $options: 'i' } },
        { targetText: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (category) searchQuery.category = category;
    if (sourceLanguage) searchQuery.sourceLanguage = sourceLanguage;
    if (targetLanguage) searchQuery.targetLanguage = targetLanguage;
    
    const templates = await Template.find(searchQuery).sort({ updatedAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;