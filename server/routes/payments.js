import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

console.log('Initializing payments router without Stripe');

// Fizetési link létrehozása számlához - Stripe nélkül
router.post('/create-payment-link', async (req, res) => {
  console.log('Payment link creation request received');
  
  // A Stripe fizetési rendszer el lett távolítva
  return res.status(503).json({
    success: false,
    message: 'A bankkártyás fizetési lehetőség jelenleg nem elérhető. Kérjük, használja a banki átutalást.',
    error: 'Payment service unavailable'
  });
});

// Webhook végpont - Stripe nélkül
router.post('/webhook', async (req, res) => {
  console.log('Webhook request received, but Stripe is disabled');
  
  return res.status(503).json({
    success: false,
    message: 'A fizetési webhook szolgáltatás jelenleg nem elérhető.',
    error: 'Payment service unavailable'
  });
});

export default router;
