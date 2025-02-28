import express from 'express';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  createQuoteForProject,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
  getQuoteByToken,
  clientQuoteAction,
  generateInvoiceFromQuote
} from '../controllers/quoteController.js';

const router = express.Router();

// Privát végpontok (bejelentkezést igényelnek)
// Árajánlatok kezelése
router.get('/quotes', getQuotes);
router.get('/quotes/:id', getQuoteById);
router.post('/quotes', createQuote);
router.put('/quotes/:id', updateQuote);
router.patch('/quotes/:id/status', updateQuoteStatus);
router.delete('/quotes/:id', deleteQuote);
router.post('/quotes/:id/invoice', generateInvoiceFromQuote);

// Projekthez kapcsolódó árajánlatok
router.post('/projects/:projectId/quotes', createQuoteForProject);
router.get('/projects/:projectId/quotes', (req, res) => {
  req.query.projectId = req.params.projectId;
  getQuotes(req, res);
});

// Publikus végpontok (ügyfél általi eléréshez)
// Árajánlat megtekintése token alapján - FIGYELEM: Ezek publikus végpontok
// A validateApiKey middleware-t kell használni
router.get('/public/quotes/:token', getQuoteByToken);

// Árajánlat elfogadása vagy elutasítása
router.post('/public/quotes/:token/action', clientQuoteAction);

// PIN kód ellenőrzése (opcionális, ha az árajánlatot PIN-nel is védeni akarjuk)
router.post('/public/quotes/:token/verify-pin', (req, res) => {
  const { token } = req.params;
  const { pin } = req.body;
  
  // Az ellenőrzési logikát már tartalmazza a clientQuoteAction metódus,
  // itt csak egy egyszerűsített ellenőrzést végzünk
  req.body.action = 'verify'; // Csak ellenőrzés, nincs tényleges művelet
  clientQuoteAction(req, res);
});

export default router;