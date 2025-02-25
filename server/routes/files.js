import express from 'express';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Védett végpontok
router.use(authMiddleware);

// Fájlok lekérése
router.get('/files', async (req, res) => {
  try {
    // Mivel nincs még fájl adatbázis, visszaadunk egy üres tömböt
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;