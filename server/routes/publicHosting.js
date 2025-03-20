import express from 'express';
import HostingPackage from '../models/HostingPackage.js';

const router = express.Router();

// Get public hosting packages (active only)
router.get('/hosting-packages', async (req, res) => {
  try {
    const packages = await HostingPackage.find({ isActive: true })
      .sort({ displayOrder: 1, type: 1 });
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching public hosting packages:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a specific hosting package by ID (public endpoint)
router.get('/hosting-packages/:id', async (req, res) => {
  try {
    const hostingPackage = await HostingPackage.findOne({
      _id: req.params.id,
      isActive: true
    });
    
    if (!hostingPackage) {
      return res.status(404).json({ message: 'Hosting package not found' });
    }
    
    res.json(hostingPackage);
  } catch (error) {
    console.error('Error fetching public hosting package:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;