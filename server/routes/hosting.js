import express from 'express';
import Hosting from '../models/Hosting.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public endpoint a rendelések fogadásához
router.post('/hosting/orders/public', async (req, res) => {
  try {
    const order = new Hosting(req.body);
    await order.save();

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

// Összes rendelés lekérése
router.get('/hosting/orders', async (req, res) => {
  try {
    const orders = await Hosting.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Egy rendelés lekérése
router.get('/hosting/orders/:id', async (req, res) => {
  try {
    const order = await Hosting.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }
    res.json(order);
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
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Jegyzet hozzáadása
router.post('/hosting/orders/:id/notes', async (req, res) => {
  try {
    const { content, addedBy } = req.body;
    const order = await Hosting.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }

    order.notes.push({
      content,
      addedBy,
      addedAt: new Date()
    });

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fizetési státusz frissítése
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
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Szolgáltatás adatok frissítése
router.put('/hosting/orders/:id/service', async (req, res) => {
  try {
    const { domainName, serverIp, cpanelUsername } = req.body;
    const order = await Hosting.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Rendelés nem található' });
    }

    if (domainName) order.service.domainName = domainName;
    if (serverIp) order.service.serverIp = serverIp;
    if (cpanelUsername) order.service.cpanelUsername = cpanelUsername;

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;