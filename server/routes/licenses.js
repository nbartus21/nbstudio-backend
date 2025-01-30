import express from 'express';
import License from '../models/License.js';

const router = express.Router();

// Get all licenses
router.get('/licenses', async (req, res) => {
  try {
    const licenses = await License.find()
      .sort({ createdAt: -1 })
      .populate('usage.server');
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new license
router.post('/licenses', async (req, res) => {
  try {
    const license = new License(req.body);
    const savedLicense = await license.save();
    res.status(201).json(savedLicense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single license by ID
router.get('/licenses/:id', async (req, res) => {
  try {
    const license = await License.findById(req.params.id)
      .populate('usage.server');
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }
    res.json(license);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update license
router.put('/licenses/:id', async (req, res) => {
  try {
    const updatedLicense = await License.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('usage.server');
    
    if (!updatedLicense) {
      return res.status(404).json({ message: 'License not found' });
    }
    res.json(updatedLicense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete license
router.delete('/licenses/:id', async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }
    await License.deleteOne({ _id: req.params.id });
    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add usage entry to license
router.post('/licenses/:id/usage', async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }

    license.usage.push(req.body);
    const updatedLicense = await license.save();
    
    res.status(201).json(updatedLicense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove usage entry from license
router.delete('/licenses/:id/usage/:usageId', async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }

    license.usage = license.usage.filter(
      usage => usage._id.toString() !== req.params.usageId
    );
    
    const updatedLicense = await license.save();
    res.json(updatedLicense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;