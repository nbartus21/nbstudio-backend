import express from 'express';
import Hosting from '../models/Hosting.js';
import HostingNotification from '../models/HostingNotification.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Publikus végpont - módosított útvonal, hogy egyezzen a frontenddel
router.post('/public/hosting/orders', async (req, res) => {
  try {
    const order = new Hosting({
      ...req.body,
      status: 'new',
      service: {
        ...req.body.service,
        status: 'pending'
      },
      payment: {
        status: 'pending'
      }
    });

    await order.save();

    const notification = new HostingNotification({
      type: 'new_order',
      title: 'Új hosting rendelés',
      message: `Új ${order.plan.name} csomag rendelés érkezett ${order.client.name} ügyféltől`,
      severity: 'info',
      orderId: order._id
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Rendelés sikeresen létrehozva',
      orderId: order._id
    });
  } catch (error) {
    console.error('Hiba a rendelés mentésekor:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a rendelés feldolgozása során',
      error: error.message
    });
  }
});

// Védett végpontok
router.use(authMiddleware);

// Rendelések lekérése
router.get('/hosting/orders', async (req, res) => {
  try {
    const orders = await Hosting.find()
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Értesítések kezelése
router.get('/hosting/notifications', async (req, res) => {
  try {
    const notifications = await HostingNotification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/hosting/notifications/:id/read', async (req, res) => {
  try {
    const notification = await HostingNotification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Státusz frissítések
router.put('/hosting/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Hosting.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }

    order.status = status;
    
    // Szolgáltatás státusz automatikus frissítése
    switch (status) {
      case 'processing':
        order.service.status = 'pending';
        break;
      case 'active':
        order.service.status = 'active';
        order.service.startDate = new Date();
        order.service.endDate = new Date();
        if (order.plan.billing === 'monthly') {
          order.service.endDate.setMonth(order.service.endDate.getMonth() + 1);
        } else {
          order.service.endDate.setFullYear(order.service.endDate.getFullYear() + 1);
        }
        break;
      case 'suspended':
      case 'cancelled':
        order.service.status = status;
        break;
    }

    await order.save();

    await HostingNotification.create({
      type: 'status_change',
      title: 'Rendelés státusza módosult',
      message: `${order.client.name} rendelésének új státusza: ${status}`,
      severity: status === 'active' ? 'success' : status === 'suspended' ? 'error' : 'info',
      orderId: order._id
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;