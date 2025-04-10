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

// Összes webtárhely lekérése
router.get('/hostings', async (req, res) => {
  try {
    const hostings = await Hosting.find().sort({ 'service.endDate': 1 });
    res.json(hostings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Új webtárhely létrehozása
router.post('/hostings', async (req, res) => {
  const hosting = new Hosting(req.body);
  try {
    const newHosting = await hosting.save();

    // Ha van projektId, akkor frissítsük a projektet is
    if (req.body.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(req.body.projectId);

      if (project) {
        // Ellenőrizzük, hogy a webtárhely már hozzá van-e adva a projekthez
        const hostingExists = project.hostings && project.hostings.some(h => h.hostingId && h.hostingId.toString() === newHosting._id.toString());

        if (!hostingExists) {
          // Adjuk hozzá a webtárhelyet a projekthez
          if (!project.hostings) project.hostings = [];

          project.hostings.push({
            hostingId: newHosting._id,
            planName: newHosting.plan.name,
            domainName: newHosting.service.domainName,
            endDate: newHosting.service.endDate,
            addedAt: new Date()
          });

          await project.save();
        }
      }
    }

    res.status(201).json(newHosting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Webtárhely frissítése
router.put('/hostings/:id', async (req, res) => {
  try {
    const hosting = await Hosting.findById(req.params.id);
    if (!hosting) {
      return res.status(404).json({ message: 'Webtárhely nem található' });
    }

    // Ellenőrizzük, hogy változott-e a projektId
    const oldProjectId = hosting.projectId ? hosting.projectId.toString() : null;
    const newProjectId = req.body.projectId || null;

    // Frissítsük a webtárhely adatait
    Object.assign(hosting, req.body);
    hosting.history.push({
      action: 'update',
      details: 'Webtárhely adatok frissítve'
    });

    const updatedHosting = await hosting.save();

    // Ha változott a projekt, frissítsük a projekt kapcsolatokat
    if (oldProjectId !== newProjectId) {
      const Project = (await import('../models/Project.js')).default;

      // Ha volt régi projekt, távolítsuk el a webtárhelyet
      if (oldProjectId) {
        const oldProject = await Project.findById(oldProjectId);
        if (oldProject && oldProject.hostings) {
          oldProject.hostings = oldProject.hostings.filter(h =>
            !h.hostingId || h.hostingId.toString() !== hosting._id.toString());
          await oldProject.save();
        }
      }

      // Ha van új projekt, adjuk hozzá a webtárhelyet
      if (newProjectId) {
        const newProject = await Project.findById(newProjectId);
        if (newProject) {
          // Ellenőrizzük, hogy a webtárhely már hozzá van-e adva a projekthez
          const hostingExists = newProject.hostings && newProject.hostings.some(h =>
            h.hostingId && h.hostingId.toString() === hosting._id.toString());

          if (!hostingExists) {
            // Adjuk hozzá a webtárhelyet a projekthez
            if (!newProject.hostings) newProject.hostings = [];

            newProject.hostings.push({
              hostingId: hosting._id,
              planName: hosting.plan.name,
              domainName: hosting.service.domainName,
              endDate: hosting.service.endDate,
              addedAt: new Date()
            });

            await newProject.save();
          }
        }
      }
    }

    res.json(updatedHosting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Webtárhely törlése
router.delete('/hostings/:id', async (req, res) => {
  try {
    const hosting = await Hosting.findById(req.params.id);
    if (!hosting) {
      return res.status(404).json({ message: 'Webtárhely nem található' });
    }

    // Ha van projektId, távolítsuk el a kapcsolatot
    if (hosting.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(hosting.projectId);
      if (project && project.hostings) {
        project.hostings = project.hostings.filter(h =>
          !h.hostingId || h.hostingId.toString() !== hosting._id.toString());
        await project.save();
      }
    }

    await Hosting.findByIdAndDelete(req.params.id);
    res.json({ message: 'Webtárhely sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rendelések lekérése (régi útvonal kompatibilitás miatt)
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