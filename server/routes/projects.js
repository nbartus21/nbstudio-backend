import express from 'express';
import Project from '../models/Project.js';

const router = express.Router();

// Összes projekt lekérése
router.get('/projects', async (req, res) => {
    try {
      console.log('Fetching projects...');
      const projects = await Project.find().sort({ createdAt: -1 });
      console.log('Projects found:', projects.length);
      res.json(projects);
    } catch (error) {
      console.error('Error in GET /projects:', error);
      res.status(500).json({ 
        message: 'Error fetching projects',
        error: error.message 
      });
    }
  });

// Új projekt létrehozása
router.post('/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Projekt módosítása
router.put('/projects/:id', async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Számla hozzáadása projekthez
router.post('/projects/:id/invoices', async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Projekt nem található' });
      }
  
      if (!project.invoices) {
        project.invoices = [];
      }
  
      project.invoices.push(req.body);
      
      // Számoljuk újra a teljes számlázott összeget
      project.financial.totalBilled = project.invoices.reduce(
        (sum, invoice) => sum + (invoice.totalAmount || 0), 
        0
      );
  
      const updatedProject = await project.save();
      
      console.log('Számla hozzáadva:', updatedProject.invoices[updatedProject.invoices.length - 1]);
      
      res.status(201).json(updatedProject);
    } catch (error) {
      console.error('Hiba a számla létrehozásakor:', error);
      res.status(400).json({ 
        message: 'Hiba a számla létrehozásakor', 
        error: error.message 
      });
    }
  });


// Fizetési link létrehozása email ellenőrzéssel
router.post('/create-payment-link', async (req, res) => {
  try {
    const { amount, currency, invoice_id, email } = req.body;
    
    // Projekt és számla ellenőrzése
    const project = await Project.findOne({
      'invoices._id': invoice_id,
      'client.email': email.toLowerCase()
    });

    if (!project) {
      return res.status(403).json({ 
        error: 'Nem megfelelő hozzáférés vagy érvénytelen számla.' 
      });
    }

    // Ha az email stimmel, létrehozzuk a Stripe fizetési linket
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Számla #${invoice_id}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      customer_email: email, // Email előre kitöltése
      metadata: {
        invoice_id: invoice_id
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Payment link error:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;