import express from 'express';
import mongoose from 'mongoose';
import Stripe from 'stripe';

const router = express.Router();

// Használjuk a környezeti változóban definiált Stripe Secret Key-t
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51QmjbrG2GB8RzYFBotDBVtSaWeDlhZ8fURnDB20HIIz9XzaqLaMFTStyNo4XWThSge1wRoZTVrKM5At5xnXVLIzf00jCtmKyXX';

// Inicializáljuk a Stripe-ot 
console.log('Initializing Stripe with key starting with:', STRIPE_SECRET_KEY.substring(0, 10) + '...');

// Stripe API objektum létrehozása explicit opcióval
// Stripe inicializálás részletes hibakezeléssel
let stripe;
try {
  console.log('Initializing Stripe with API version: 2023-10-16');
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16', // Az aktuális Stripe API verzió
    typescript: false,
    appInfo: {
      name: 'NB Studio',
      version: '1.0.0',
    },
    maxNetworkRetries: 3,
    timeout: 30000, // 30 másodperc
    protocol: 'https'
  });
  console.log('Stripe initialization successful');
} catch (error) {
  console.error('Stripe initialization error:', error);
  console.error('Will attempt to initialize on first request');
}

// Generate a payment link for an invoice
router.post('/create-payment-link', async (req, res) => {
  console.log('Payment link creation request received:', {
    headers: req.headers,
    body: req.body,
    method: req.method,
    path: req.path,
    url: req.originalUrl
  });
  
  // Ha a stripe még nincs inicializálva, próbáljuk meg most
  if (!stripe) {
    try {
      console.log('Stripe not initialized yet, attempting to initialize now');
      stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        typescript: false,
        appInfo: {
          name: 'NB Studio',
          version: '1.0.0',
        },
        maxNetworkRetries: 3,
        timeout: 30000,
        protocol: 'https'
      });
      console.log('Stripe late initialization successful');
    } catch (initError) {
      console.error('Stripe late initialization failed:', initError);
      return res.status(500).json({
        success: false,
        message: 'A fizetési szolgáltatás jelenleg nem érhető el',
        error: 'Stripe API initialization error'
      });
    }
  }
  
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
    
    // Részletes naplózás a request adatairól
    console.log('Request body details:');
    console.log('- Type:', typeof req.body);
    console.log('- Keys:', Object.keys(req.body));
    console.log('- Content:', JSON.stringify(req.body, null, 2));
    
    const { invoiceId, projectId, pin } = req.body;
    
    console.log('Processing payment request with data:', { 
      invoiceId, 
      projectId, 
      pin: pin ? 'provided' : 'missing',
      invoiceIdType: typeof invoiceId,
      projectIdType: typeof projectId
    });
    
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
      console.log('Searching for project with multiple methods');
      
      // Ellenőrizzük először, hogy a Project model elérhető-e
      const Project = mongoose.model('Project');
      console.log('Project model successfully accessed');
      
      // Első próbálkozás: MongoDB ObjectId alapján keresés
      if (isValidProjectId) {
        console.log('Searching project by _id (ObjectId):', projectId);
        project = await Project.findById(projectId);
        if (project) {
          console.log('Project found by _id search');
        }
      }
      
      // Második próbálkozás: egyedi ID mező alapján keresés
      if (!project) {
        console.log('Project not found by ObjectId, trying by custom id field');
        project = await Project.findOne({ id: projectId });
        if (project) {
          console.log('Project found by id field search');
        }
      }
      
      // Harmadik próbálkozás: megosztási token alapján keresés
      if (!project) {
        console.log('Project not found by id field either, trying by sharing.token');
        project = await Project.findOne({ "sharing.token": projectId });
        if (project) {
          console.log('Project found by sharing.token search');
        }
      }
      
      // Negyedik próbálkozás: név vagy más mezők alapján
      if (!project) {
        console.log('Project not found by sharing.token either, trying other fields');
        project = await Project.findOne({
          $or: [
            { name: new RegExp(projectId, 'i') },
            { shareToken: projectId },
            { token: projectId }
          ]
        });
        if (project) {
          console.log('Project found by other fields search');
        }
      }
      
      // Nincs találat, debug információk
      if (!project) {
        console.log('Project not found by any method, checking if projects exist');
        
        // Ellenőrizzük, hogy léteznek-e egyáltalán projektek
        const projectCount = await Project.countDocuments();
        console.log(`Total project count in database: ${projectCount}`);
        
        // Ha vannak projektek, nézzük meg párat közülük
        if (projectCount > 0) {
          const sampleProjects = await Project.find().limit(3).select('_id name sharing');
          console.log('Sample projects in database:');
          sampleProjects.forEach((p, i) => {
            console.log(`- Project ${i+1}: _id=${p._id}, name="${p.name}", hasSharing=${Boolean(p.sharing)}`);
            if (p.sharing && p.sharing.token) {
              console.log(`  sharing.token=${p.sharing.token}`);
            }
          });
        }
      }
    } catch (projectError) {
      console.error('Error finding project:', projectError);
      console.error('Project error stack:', projectError.stack);
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
    
    console.log('Searching for invoice in project, invoices count:', project.invoices?.length || 0);
    
    if (project.invoices && project.invoices.length > 0) {
      // Részletes naplózás a projektben található számlákról
      console.log('Listing all invoices in project:');
      project.invoices.forEach((inv, idx) => {
        console.log(`Invoice ${idx+1}:`, {
          _id: inv._id?.toString() || 'undefined',
          id: inv.id?.toString() || 'undefined',
          number: inv.number?.toString() || 'undefined',
          status: inv.status || 'undefined',
          totalAmount: inv.totalAmount || 'undefined'
        });
      });
      
      // Próbáljuk meg az id() függvényt, ami a MongoDB subdocument-ekhez való
      try {
        console.log('Attempting to find invoice using .id() method with invoiceId:', invoiceId);
        invoice = project.invoices.id(invoiceId);
        if (invoice) {
          console.log('Invoice found using .id() method');
        }
      } catch (idError) {
        console.error('Error using invoices.id():', idError.message);
      }
      
      // Ha nem sikerült, próbáljuk kézzel keresni
      if (!invoice) {
        console.log('Invoice not found by .id() method, searching manually');
        
        // Keresés _id alapján
        console.log('Searching by _id comparison');
        invoice = project.invoices.find(inv => 
          inv._id && (inv._id.toString() === invoiceId || inv._id.equals(invoiceId))
        );
        if (invoice) {
          console.log('Invoice found by _id comparison');
        }
        
        // Ha nem sikerült, keresés id alapján
        if (!invoice) {
          console.log('Searching by id field');
          invoice = project.invoices.find(inv => 
            inv.id && inv.id.toString() === invoiceId
          );
          if (invoice) {
            console.log('Invoice found by id field');
          }
        }
        
        // Ha nem sikerült, keresés number alapján
        if (!invoice) {
          console.log('Searching by number field');
          invoice = project.invoices.find(inv => 
            inv.number && inv.number.toString() === invoiceId
          );
          if (invoice) {
            console.log('Invoice found by number field');
          }
        }
        
        // Ha még mindig nincs találat, talán az invoiceId nem string
        if (!invoice && typeof invoiceId !== 'string') {
          console.log('Converting invoiceId to string and trying again');
          const invoiceIdStr = String(invoiceId);
          invoice = project.invoices.find(inv => 
            (inv._id && inv._id.toString() === invoiceIdStr) || 
            (inv.id && inv.id.toString() === invoiceIdStr) ||
            (inv.number && inv.number.toString() === invoiceIdStr)
          );
          if (invoice) {
            console.log('Invoice found after converting ID to string');
          }
        }
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
      // Ellenőrizzük a kötelező mezőket
      if (!invoice.totalAmount || typeof invoice.totalAmount !== 'number') {
        throw new Error('Invalid invoice amount: ' + JSON.stringify(invoice.totalAmount));
      }
      
      // Tartalék érték létrehozása az adatoknak
      const productName = invoice.number ? `Számla #${invoice.number}` : 'Számla fizetés';
      const productDesc = invoice.number && project.name
        ? `Fizetés a ${invoice.number} számú számlához - ${project.name}`
        : 'Számla fizetés';
        
      // Log egy teszt API hívás eredménye (csak debug céllal)
      try {
        // Teszt API hívás a Stripe inicializálás ellenőrzéséhez
        const test = await stripe.customers.list({ limit: 1 });
        console.log('Stripe API test successful, found customers:', test.data.length);
      } catch (testError) {
        console.error('Stripe API test failed:', testError.message);
      }
      
      // Adatok tisztítása és előkészítése
      let metadataValues = {};
      try {
        metadataValues = {
          invoiceId: invoice._id?.toString() || '',
          projectId: project._id?.toString() || '',
          invoiceNumber: invoice.number?.toString() || '',
          projectName: project.name?.toString() || '',
          pin: (pin || '')?.toString(),
          sharingToken: (project.sharing?.token || '')?.toString(),
          testValue: 'test123'
        };
      } catch (metadataError) {
        console.error('Error preparing metadata:', metadataError);
        metadataValues = { testValue: 'test123' };
      }
      
      // Stripe Checkout Session létrehozása egyszerűbb konfigurációval
      console.log('Creating Stripe session with clean data');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: Math.round(Math.abs(invoice.totalAmount) * 100), // Convert to cents, use absolute value
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadataValues,
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