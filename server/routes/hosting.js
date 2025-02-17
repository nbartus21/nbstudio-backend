// routes/hosting.js
import express from 'express';
import Hosting from '../models/Hosting.js';
import HostingNotification from '../models/HostingNotification.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public endpoint a rendelések fogadásához
router.post('/hosting/orders/public', async (req, res) => {
  try {
    const order = new Hosting(req.body);
    await order.save();

    // Értesítés létrehozása új rendelésről
    const notification = new HostingNotification({
      type: 'new_order',
      title: 'Új hosting rendelés',
      message: `Új ${order.plan.name} csomag rendelés érkezett ${order.client.name} ügyféltől`,
      severity: 'info',
      orderId: order._id,
      link: '/hosting'
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
      message: 'Hiba történt a rendelés feldolgozása során'
    });
  }
});

// Protected routes
router.use(authMiddleware);

// Értesítések lekérése
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

// Értesítés olvasottnak jelölése
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

// Összes értesítés olvasottnak jelölése
router.put('/hosting/notifications/read-all', async (req, res) => {
  try {
    await HostingNotification.updateMany(
      { read: false },
      { read: true }
    );
    res.json({ message: 'Minden értesítés olvasottnak jelölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rendelés státuszának frissítése
router.put('/hosting/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Hosting.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }

    const oldStatus = order.status;
    order.status = status;
    
    // Szolgáltatás státuszának automatikus frissítése
    switch (status) {
      case 'processing':
        order.service.status = 'pending';
        break;
      case 'active':
        order.service.status = 'active';
        order.service.startDate = new Date();
        // Az endDate beállítása a billing cycle alapján
        const endDate = new Date();
        if (order.plan.billing === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        order.service.endDate = endDate;
        break;
      case 'suspended':
        order.service.status = 'suspended';
        break;
      case 'cancelled':
        order.service.status = 'cancelled';
        break;
    }

    await order.save();

    // Értesítés létrehozása a státuszváltozásról
    const notification = new HostingNotification({
      type: 'status_change',
      title: 'Rendelés státusza módosult',
      message: `${order.client.name} rendelésének új státusza: ${status}`,
      severity: status === 'active' ? 'success' : 
                status === 'suspended' ? 'error' : 'info',
      orderId: order._id,
      link: '/hosting'
    });
    await notification.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fizetés beérkezésének kezelése
router.put('/hosting/orders/:id/payment', async (req, res) => {
  try {
    const { status, method, transactionId } = req.body;
    const order = await Hosting.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }

    order.payment.status = status;
    if (method) order.payment.method = method;
    if (transactionId) order.payment.transactionId = transactionId;
    
    if (status === 'paid') {
      order.payment.paidAt = new Date();

      // Értesítés létrehozása a beérkezett fizetésről
      const notification = new HostingNotification({
        type: 'payment_received',
        title: 'Fizetés beérkezett',
        message: `${order.client.name} rendelésének fizetése megérkezett`,
        severity: 'success',
        orderId: order._id,
        link: '/hosting'
      });
      await notification.save();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Szolgáltatás lejáratának ellenőrzése (cron job)
const checkExpiringServices = async () => {
  try {
    const orders = await Hosting.find({ 
      'status': 'active',
      'service.endDate': { $exists: true }
    });

    for (const order of orders) {
      const endDate = new Date(order.service.endDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        // Értesítés a közelgő lejáratról
        const notification = new HostingNotification({
          type: 'expiry_warning',
          title: 'Szolgáltatás hamarosan lejár',
          message: `${order.client.name} szolgáltatása ${daysUntilExpiry} nap múlva lejár`,
          severity: 'warning',
          orderId: order._id,
          link: '/hosting'
        });
        await notification.save();
      }
    }
  } catch (error) {
    console.error('Error checking expiring services:', error);
  }
};

// Cron job indítása (naponta egyszer)
setInterval(checkExpiringServices, 24 * 60 * 60 * 1000);

export default router;