import express from 'express';
import Calculator from '../models/Calculator.js';

const router = express.Router();

// Get all calculator entries
router.get('/calculators', async (req, res) => {
  try {
    const calculators = await Calculator.find().sort({ createdAt: -1 });
    res.json(calculators);
  } catch (error) {
    res.status(500).json({ message: error.message });
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