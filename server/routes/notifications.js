import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';


const router = express.Router();

// Minden notifications route védelme az authMiddleware-rel
router.use(authMiddleware);

// Debug route a token ellenőrzésére
router.get('/notifications/debug', (req, res) => {
  console.log('Debug endpoint hit');
  console.log('Auth header:', req.headers.authorization);
  console.log('User data from token:', req.userData);
  res.json({
    message: 'Debug info logged',
    userData: req.userData
  });
});

// Értesítések lekérése a bejelentkezett felhasználónak
router.get('/notifications', async (req, res) => {
  try {
    // Eltávolítva a részletes naplózás
    const notifications = await Notification.find({
      userId: req.userData.email,
      read: false
    }).sort({ createdAt: -1 });
    // Eltávolítva a részletes naplózás
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Értesítés olvasottnak jelölése
router.put('/notifications/:id/read', async (req, res) => {
  try {
    // Eltávolítva a részletes naplózás

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userData.email
      },
      { read: true },
      { new: true }
    );

    // Eltávolítva a részletes naplózás

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(400).json({ message: error.message });
  }
});

// Összes értesítés olvasottnak jelölése
router.put('/notifications/read-all', async (req, res) => {
  try {
    // Eltávolítva a részletes naplózás

    const result = await Notification.updateMany(
      {
        userId: req.userData.email,
        read: false
      },
      { read: true }
    );

    // Eltávolítva a részletes naplózás
    res.json({
      message: 'All notifications marked as read',
      count: result.nModified
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(400).json({ message: error.message });
  }
});

// Test értesítés létrehozása
router.post('/notifications/test', async (req, res) => {
  try {
    // Eltávolítva a részletes naplózás
    const notification = new Notification({
      userId: req.userData.email,
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification',
      severity: 'info',
      read: false
    });

    await notification.save();
    // Eltávolítva a részletes naplózás
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(400).json({ message: error.message });
  }
});

// Értesítések generálása
router.post('/notifications/generate', async (req, res) => {
  try {
    // Eltávolítva a részletes naplózás

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
    // Eltávolítva a részletes naplózás
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error generating notification:', error);
    res.status(400).json({ message: error.message });
  }
});

export default router;