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

export default router;