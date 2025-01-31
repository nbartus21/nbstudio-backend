import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';
import Notification from '../models/Notification.js';


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
    console.log('Fetching notifications for user:', req.userData);
    const notifications = await Notification.find({ 
      userId: req.userData.email,
      read: false 
    }).sort({ createdAt: -1 });
    console.log('Found notifications:', notifications);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Értesítés olvasottnak jelölése
router.put('/notifications/:id/read', async (req, res) => {
  try {
    console.log('Marking notification as read:', req.params.id);
    console.log('User:', req.userData.email);
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.userData.email
      },
      { read: true },
      { new: true }
    );
    
    console.log('Updated notification:', notification);
    
    if (!notification) {
      console.log('Notification not found');
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
    console.log('Marking all notifications as read for user:', req.userData.email);
    
    const result = await Notification.updateMany(
      { 
        userId: req.userData.email,
        read: false 
      },
      { read: true }
    );
    
    console.log('Update result:', result);
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
    console.log('Creating test notification for user:', req.userData.email);
    const notification = new Notification({
      userId: req.userData.email,
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification',
      severity: 'info',
      read: false
    });
    
    await notification.save();
    console.log('Test notification created:', notification);
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(400).json({ message: error.message });
  }
});

// Értesítések generálása
router.post('/notifications/generate', async (req, res) => {
  try {
    console.log('Generating notification:', req.body);
    console.log('User:', req.userData.email);
    
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
    console.log('Generated notification:', notification);
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error generating notification:', error);
    res.status(400).json({ message: error.message });
  }
});

export default router;