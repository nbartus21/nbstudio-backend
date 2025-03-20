import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import Partner from '../models/Partner.js';

const router = express.Router();

// GET all partners
router.get('/', auth, async (req, res) => {
  try {
    const partners = await Partner.find().sort({ updatedAt: -1 });
    res.json(partners);
  } catch (err) {
    console.error('Error fetching partners:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific partner
router.get('/:id', auth, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    res.json(partner);
  } catch (err) {
    console.error('Error fetching partner:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a new partner
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, link, active } = req.body;
    
    const newPartner = new Partner({
      name,
      description,
      link,
      active
    });
    
    const partner = await newPartner.save();
    res.status(201).json(partner);
  } catch (err) {
    console.error('Error creating partner:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a partner
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, link, active } = req.body;
    
    // Find and update the partner
    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        link,
        active,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    
    res.json(partner);
  } catch (err) {
    console.error('Error updating partner:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a partner
router.delete('/:id', auth, async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    
    res.json({ message: 'Partner deleted' });
  } catch (err) {
    console.error('Error deleting partner:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET only active partners (for public website)
router.get('/public/active', async (req, res) => {
  try {
    const partners = await Partner.find({ active: true }).sort({ updatedAt: -1 });
    res.json(partners);
  } catch (err) {
    console.error('Error fetching active partners:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;