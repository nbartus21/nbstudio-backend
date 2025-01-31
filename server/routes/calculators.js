import express from 'express';
import Calculator from '../models/Calculator.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// API kulcs validáció middleware
const validateApiKey = (req, res, next) => {
  console.log('======= API Key Validation =======');
  console.log('Headers received:', req.headers);
  console.log('Received API Key:', req.headers['x-api-key']);
  console.log('Expected API Key:', process.env.PUBLIC_API_KEY);
  console.log('================================');
  
  const apiKey = req.headers['x-api-key'];
  
  if (!process.env.PUBLIC_API_KEY) {
    console.error('PUBLIC_API_KEY is not set in environment!');
    return res.status(500).json({ message: 'Server configuration error' });
  }
  
  if (!apiKey) {
    console.error('No API key provided in request');
    return res.status(401).json({ message: 'API key is required' });
  }

  if (apiKey === process.env.PUBLIC_API_KEY) {
    console.log('API Key validation successful');
    next();
  } else {
    console.error('API Key validation failed');
    res.status(401).json({ message: 'Invalid API key' });
  }
};

// Publikus kalkulátor végpont API kulcs védelemmel
router.post('/public/calculators', validateApiKey, async (req, res) => {
  try {
    const calculator = new Calculator(req.body);
    const savedCalculator = await calculator.save();
    res.status(201).json({
      success: true,
      message: 'Kalkuláció sikeresen elmentve'
    });
  } catch (error) {
    console.error('Calculator form error:', error);
    res.status(500).json({
      message: 'Hiba történt a kalkuláció mentése során'
    });
  }
});

// Create new calculator entry
router.post('/calculators', async (req, res) => {
  try {
    const calculator = new Calculator(req.body);
    const savedCalculator = await calculator.save();
    res.status(201).json(savedCalculator);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update calculator entry
router.put('/calculators/:id', async (req, res) => {
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

// Delete calculator entry
router.delete('/calculators/:id', async (req, res) => {
  try {
    await Calculator.findByIdAndDelete(req.params.id);
    res.json({ message: 'Calculator entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;