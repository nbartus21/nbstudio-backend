import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Minden notifications route védelme az authMiddleware-rel
router.use(authMiddleware);

// Értesítések lekérése a bejelentkezett felhasználónak
router.get('/notifications', async (req, res) => {
  try {
    // A req.userData a JWT tokenből jön az auth middleware-ből
    const notifications = await Notification.find({ 
      userId: req.userData.email, // email használata userId-ként
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
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.userData.email // Csak a saját értesítéseit módosíthatja
      },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Összes értesítés olvasottnak jelölése
router.put('/notifications/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 
        userId: req.userData.email,
        read: false 
      },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read', count: result.nModified });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Értesítések generálása (pl. domain lejárat esetén)
router.post('/notifications/generate', async (req, res) => {
  try {
    const { type, title, message, severity = 'info' } = req.body;
    
    const notification = new Notification({
      userId: req.userData.email,
      type,
      title,
      message,
      severity,
      read: false
    });
    
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;