import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// Értesítések lekérése
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.userData.userId,
      read: false 
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Értesítés olvasottnak jelölése
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Összes értesítés olvasottnak jelölése
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userData.userId, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;