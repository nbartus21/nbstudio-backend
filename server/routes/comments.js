import express from 'express';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Védett végpontok
router.use(authMiddleware);

// Kommentek lekérése
router.get('/comments', async (req, res) => {
  try {
    // Mivel nincs még komment adatbázis, visszaadunk egy üres tömböt
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;