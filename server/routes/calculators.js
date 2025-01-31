import express from 'express';
import Calculator from '../models/Calculator.js';
import dotenv from 'dotenv';
import authMiddleware from '../middleware/auth.js';
dotenv.config();

const router = express.Router();

const validateApiKey = (req, res, next) => {
 const apiKey = req.headers['x-api-key'];
 
 if (!process.env.PUBLIC_API_KEY) {
   return res.status(500).json({ message: 'Szerver konfigurációs hiba' });
 }
 
 if (!apiKey) {
   return res.status(401).json({ message: 'API kulcs szükséges' });
 }

 if (apiKey === process.env.PUBLIC_API_KEY) {
   next();
 } else {
   res.status(401).json({ message: 'Érvénytelen API kulcs' });
 }
};

// Publikus végpont
router.post('/public/calculators', validateApiKey, async (req, res) => {
 try {
   const calculator = new Calculator(req.body);
   await calculator.save();
   res.status(201).json({
     success: true,
     message: 'Kalkuláció sikeresen mentve'
   });
 } catch (error) {
   console.error('Kalkulátor űrlap hiba:', error);
   res.status(500).json({
     message: 'Hiba történt a kalkuláció mentése során'
   });
 }
});

// Védett végpontok
router.get('/calculators', authMiddleware, async (req, res) => {
  try {
    const entries = await Calculator.find().sort({ createdAt: -1 });
    console.log('Talált kalkulációk:', entries);
    res.json(entries);
  } catch (error) {
    console.error('Lekérési hiba:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/calculators', authMiddleware, async (req, res) => {
 try {
   const calculator = new Calculator(req.body);
   const savedCalculator = await calculator.save();
   res.status(201).json(savedCalculator);
 } catch (error) {
   res.status(400).json({ message: error.message });
 }
});

router.put('/calculators/:id', authMiddleware, async (req, res) => {
 try {
   const updatedCalculator = await Calculator.findByIdAndUpdate(
     req.params.id,
     req.body,
     { new: true }
   );
   res.json(updatedCalculator);
 } catch (error) {
   res.status(400).json({ message: error.message });
 }
});

router.delete('/calculators/:id', authMiddleware, async (req, res) => {
 try {
   await Calculator.findByIdAndDelete(req.params.id);
   res.json({ message: 'Kalkulátor bejegyzés sikeresen törölve' });
 } catch (error) {
   res.status(500).json({ message: error.message });
 }
});

export default router;