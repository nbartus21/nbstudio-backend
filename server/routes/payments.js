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
  console.log('Payment link creation request received:', {
    headers: req.headers,
    body: req.body,
    method: req.method,
    path: req.path,
    url: req.originalUrl
  });
  
  try {
    // Ellenőrizzük, hogy van-e request body és kibontható-e
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Request body is empty or invalid');
      return res.status(400).json({ 
        success: false, 
        message: 'Hiányzó vagy érvénytelen kérés adatok',
        receivedBody: req.body 
      });
    }
    
    const { invoiceId, projectId, pin } = req.body;
    
    console.log('Processing payment request with data:', { invoiceId, projectId, pin: pin ? 'provided' : 'missing' });
    
    // Ellenőrizzük az azonosítókat
    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'Hiányzó számla azonosító' });
    }
    
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Hiányzó projekt azonosító' });
    }
    
    // Próbáljuk meg MongoDB ObjectId-ként kezelni, ha érvényes
    let isValidInvoiceId = true;
    let isValidProjectId = true;
    
    try {
      if (mongoose.Types.ObjectId.isValid(invoiceId)) {
        console.log('Invoice ID is valid MongoDB ObjectId');
      } else {
        console.log('Invoice ID is not a valid MongoDB ObjectId, but will try as string ID');
        isValidInvoiceId = false;
      }
    } catch (e) {
      console.log('Error validating invoice ID:', e.message);
      isValidInvoiceId = false;
    }
    
    try {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        console.log('Project ID is valid MongoDB ObjectId');
      } else {
        console.log('Project ID is not a valid MongoDB ObjectId, but will try as string ID');
        isValidProjectId = false;
      }
    } catch (e) {
      console.log('Error validating project ID:', e.message);
      isValidProjectId = false;
    }

    // Find the invoice in the database
    // Use the Project model to find the invoice within a project
    const Project = mongoose.model('Project');
    
    // Próbáljuk meg lekérni a projektet különböző módszerekkel
    let project = null;
    
    try {
      if (isValidProjectId) {
        project = await Project.findById(projectId);
      }
      
      // Ha nem találtuk meg ObjectId-val, próbáljuk string azonosítóval
      if (!project) {
        console.log('Project not found by ObjectId, trying by custom id field');
        project = await Project.findOne({ id: projectId });
      }
      
      // Ha továbbra sem találtuk meg, próbáljuk más mezőkkel
      if (!project) {
        console.log('Project not found by id field either, trying by name or other fields');
        project = await Project.findOne({
          $or: [
            { name: new RegExp(projectId, 'i') },
            { "sharing.token": projectId }
          ]
        });
      }
    } catch (projectError) {
      console.error('Error finding project:', projectError);
    }
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'A projekt nem található',
        projectId: projectId,
        validId: isValidProjectId
      });
    }
    
    console.log('Project found:', {
      projectId: project._id,
      projectName: project.name,
      invoiceCount: project.invoices?.length || 0
    });
    
    // Próbáljuk megtalálni a számlát a projektben
    let invoice = null;
    
    if (project.invoices && project.invoices.length > 0) {
      // Próbáljuk meg az id() függvényt, ami a MongoDB subdocument-ekhez való
      try {
        invoice = project.invoices.id(invoiceId);
      } catch (idError) {
        console.error('Error using invoices.id():', idError.message);
      }
      
      // Ha nem sikerült, próbáljuk kézzel keresni
      if (!invoice) {
        console.log('Invoice not found by .id() method, searching manually');
        invoice = project.invoices.find(inv => 
          (inv._id && inv._id.toString() === invoiceId) || 
          (inv.id && inv.id.toString() === invoiceId) ||
          (inv.number && inv.number.toString() === invoiceId)
        );
      }
    }
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'A számla nem található a projektben',
        invoiceId: invoiceId,
        projectId: projectId,
        invoiceCount: project.invoices?.length || 0
      });
    }
    
    console.log('Invoice found:', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.number,
      status: invoice.status,
      amount: invoice.totalAmount
    });

    // Check if invoice is already paid
    if (invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') {
      return res.status(400).json({ success: false, message: 'A számla már ki van fizetve' });
    }

    // Create a Stripe Checkout Session
    console.log('Creating Stripe Checkout session with data:', {
      currency: invoice.currency || 'eur',
      amount: invoice.totalAmount,
      amountInCents: Math.round(invoice.totalAmount * 100),
      origin: req.headers.origin || 'https://project.nb-studio.net',
      sharingToken: project.sharing?.token
    });
    
    // Létrehozzuk a sikeres és megszakított URL-eket
    let successUrl = `${req.headers.origin || 'https://project.nb-studio.net'}/shared-project/${project.sharing?.token || projectId}?success=true&invoice=${invoiceId}`;
    let cancelUrl = `${req.headers.origin || 'https://project.nb-studio.net'}/shared-project/${project.sharing?.token || projectId}?canceled=true`;
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: invoice.currency || 'eur',
            product_data: {
              name: `Számla #${invoice.number}`,
              description: `Fizetés a ${invoice.number} számú számlához - ${project.name}`,
            },
            unit_amount: Math.round(invoice.totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          invoiceId: invoice._id.toString(),
          projectId: project._id.toString(),
          invoiceNumber: invoice.number,
          projectName: project.name,
          pin: pin || '',
          sharingToken: project.sharing?.token || ''
        },
      });
      
      console.log('Stripe session created successfully:', {
        sessionId: session.id,
        url: session.url
      });
      
      res.json({ 
        success: true, 
        url: session.url,
        sessionId: session.id
      });
    } catch (stripeError) {
      console.error('Stripe session creation error:', stripeError);
      res.status(500).json({
        success: false,
        message: 'Hiba történt a Stripe fizetési munkamenet létrehozásakor',
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code
      });
    }
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