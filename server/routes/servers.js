import express from 'express';
import Server from '../models/Server.js';

const router = express.Router();

// Get all servers
router.get('/servers', async (req, res) => {
  try {
    const servers = await Server.find().sort({ name: 1 });
    res.json(servers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new server
router.post('/servers', async (req, res) => {
  try {
    const server = new Server(req.body);
    const savedServer = await server.save();
    res.status(201).json(savedServer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single server
router.get('/servers/:id', async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update server
router.put('/servers/:id', async (req, res) => {
    try {
      const updatedServer = await Server.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },  // Hozzáadva $set operátor
        { new: true, runValidators: true }  // Hozzáadva runValidators
      );
      if (!updatedServer) {
        return res.status(404).json({ message: 'Server not found' });
      }
      res.json(updatedServer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// Delete server
router.delete('/servers/:id', async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    await Server.deleteOne({ _id: req.params.id });
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;