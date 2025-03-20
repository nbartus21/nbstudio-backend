import express from 'express';
import HostingPackage from '../models/HostingPackage.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all hosting packages
router.get('/hosting-packages', async (req, res) => {
  try {
    const packages = await HostingPackage.find().sort({ displayOrder: 1, type: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get public hosting packages (active only)
router.get('/public/hosting-packages', async (req, res) => {
  try {
    const packages = await HostingPackage.find({ isActive: true }).sort({ displayOrder: 1, type: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific hosting package
router.get('/hosting-packages/:id', async (req, res) => {
  try {
    const hostingPackage = await HostingPackage.findById(req.params.id);
    if (!hostingPackage) {
      return res.status(404).json({ message: 'Hosting package not found' });
    }
    res.json(hostingPackage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new hosting package
router.post('/hosting-packages', async (req, res) => {
  try {
    const newPackage = new HostingPackage(req.body);
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a hosting package
router.put('/hosting-packages/:id', async (req, res) => {
  try {
    const hostingPackage = await HostingPackage.findById(req.params.id);
    if (!hostingPackage) {
      return res.status(404).json({ message: 'Hosting package not found' });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      hostingPackage[key] = req.body[key];
    });
    
    const updatedPackage = await hostingPackage.save();
    res.json(updatedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a hosting package
router.delete('/hosting-packages/:id', async (req, res) => {
  try {
    const hostingPackage = await HostingPackage.findById(req.params.id);
    if (!hostingPackage) {
      return res.status(404).json({ message: 'Hosting package not found' });
    }
    
    await HostingPackage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Hosting package deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update display order of packages
router.put('/hosting-packages/reorder', async (req, res) => {
  try {
    const { packageOrders } = req.body;
    
    if (!packageOrders || !Array.isArray(packageOrders)) {
      return res.status(400).json({ message: 'Invalid request format' });
    }
    
    for (const item of packageOrders) {
      await HostingPackage.findByIdAndUpdate(item.id, { displayOrder: item.order });
    }
    
    res.json({ message: 'Package order updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;