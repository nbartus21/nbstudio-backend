import express from 'express';
import auth from '../middleware/auth.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// GET all settings
router.get('/', auth, async (req, res) => {
  try {
    const settings = await Setting.find().sort({ category: 1, key: 1 });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json(setting);
  } catch (err) {
    console.error('Error fetching setting by key:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE or UPDATE a setting
router.post('/', auth, async (req, res) => {
  try {
    const { key, value, description, category } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }
    
    // Upsert: Update if exists, create if doesn't
    const setting = await Setting.findOneAndUpdate(
      { key },
      { 
        key,
        value,
        description,
        category: category || 'general',
        updatedAt: new Date()
      },
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.json(setting);
  } catch (err) {
    console.error('Error creating/updating setting:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a setting
router.delete('/:key', auth, async (req, res) => {
  try {
    const setting = await Setting.findOneAndDelete({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({ message: 'Setting deleted' });
  } catch (err) {
    console.error('Error deleting setting:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET settings by category
router.get('/category/:category', auth, async (req, res) => {
  try {
    const settings = await Setting.find({ category: req.params.category }).sort({ key: 1 });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings by category:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public endpoint to get website settings
router.get('/public/website', async (req, res) => {
  try {
    const settings = await Setting.find({ category: 'website' });
    
    // Convert to a more convenient format for the frontend
    const formattedSettings = {};
    settings.forEach(setting => {
      formattedSettings[setting.key] = setting.value;
    });
    
    res.json(formattedSettings);
  } catch (err) {
    console.error('Error fetching public website settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
