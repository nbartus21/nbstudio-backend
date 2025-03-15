import express from 'express';
import mongoose from 'mongoose';
import Stripe from 'stripe';

const router = express.Router();

// Ellenőrizzük a STRIPE_SECRET_KEY eléhetőségét
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY környezeti változó nincs beállítva!');
  console.error('Használjuk a .env fájlban megadott értéket: sk_test_51QmjbrG2Q8BRzYFBotBDVtSaWeDlhZ8fURnDB20HItI29XaqLaMFTStyNo4XWThSge1wRoZTVrKMSA5tXnXVLIZf00jCtmKyXX');
}

// Inicializáljuk a Stripe-ot az .env fájlból vagy az alapértelmezett értékkel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51QmjbrG2Q8BRzYFBotBDVtSaWeDlhZ8fURnDB20HItI29XaqLaMFTStyNo4XWThSge1wRoZTVrKMSA5tXnXVLIZf00jCtmKyXX');

// Generate a payment link for an invoice
router.post('/create-payment-link', async (req, res) => {
  try {
    const { invoiceId, projectId, pin } = req.body;
    
    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen számla azonosító' });
    }

    // Find the invoice in the database
    // Use the Project model to find the invoice within a project
    const Project = mongoose.model('Project');
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'A projekt nem található' });
    }
    
    const invoice = project.invoices.id(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'A számla nem található' });
    }

    // Check if invoice is already paid
    if (invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') {
      return res.status(400).json({ success: false, message: 'A számla már ki van fizetve' });
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: invoice.currency || 'eur',
          product_data: {
            name: `Invoice #${invoice.number}`,
            description: `Payment for invoice #${invoice.number}`,
          },
          unit_amount: Math.round(invoice.totalAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/shared-project/${projectId}?success=true&invoice=${invoiceId}`,
      cancel_url: `${req.headers.origin}/shared-project/${projectId}?canceled=true`,
      metadata: {
        invoiceId: invoiceId.toString(),
        projectId: projectId.toString(),
        pin: pin || ''
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Stripe payment link creation error:', error);
    // Részletesebb hibaüzenet, hogy könnyebben diagnosztizálható legyen
    res.status(500).json({ 
      success: false, 
      message: 'Hiba történt a fizetési link létrehozásakor',
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Webhook for handling Stripe payment events
router.post('/webhook', (req, res, next) => {
  // Express.raw middleware helyett manuális kezelés
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody || '{}', sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract metadata
    const { invoiceId, projectId } = session.metadata;
    
    if (invoiceId && projectId) {
      try {
        // Update invoice status in the project
        const Project = mongoose.model('Project');
        const project = await Project.findById(projectId);
        
        if (project) {
          const invoice = project.invoices.id(invoiceId);
          
          if (invoice) {
            invoice.status = 'fizetett';
            invoice.paidDate = new Date();
            invoice.paidAmount = session.amount_total / 100; // Convert from cents
            invoice.paymentMethod = 'card';
            invoice.paymentReference = session.payment_intent;
            
            await project.save();
            console.log(`Invoice ${invoiceId} marked as paid via Stripe payment in project ${projectId}`);
          } else {
            console.error(`Invoice ${invoiceId} not found in project ${projectId}`);
          }
        } else {
          console.error(`Project ${projectId} not found`);
        }
      } catch (error) {
        console.error('Error updating invoice after payment:', error);
      }
    }
  }

  res.json({ received: true });
});

export default router;