// routes/servers.js
import express from 'express';
import { Server } from '../models/Server.js';

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

// Update server
router.put('/servers/:id', async (req, res) => {
  try {
    const updatedServer = await Server.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedServer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete server
router.delete('/servers/:id', async (req, res) => {
  try {
    await Server.findByIdAndDelete(req.params.id);
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get server storage status
router.get('/servers/storage-status', async (req, res) => {
  try {
    const servers = await Server.find({
      'specifications.storage.used': { 
        $gt: 0 
      }
    }).select('name specifications.storage');
    
    res.json(servers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get servers nearing capacity
router.get('/servers/storage-alerts', async (req, res) => {
  try {
    const servers = await Server.find().select('name specifications.storage');
    const alerts = servers.filter(server => {
      const used = server.specifications.storage.used;
      const total = server.specifications.storage.total;
      return (used / total) > 0.8; // Alert at 80% usage
    });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});