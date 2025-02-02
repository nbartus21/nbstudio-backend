import express from 'express';
import BiometricCredential from '../models/BiometricCredential.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Biometrikus credential regisztrálása
router.post('/biometric/register', authMiddleware, async (req, res) => {
  try {
    const { credentialId, publicKey } = req.body;
    const userId = req.userData.email;

    // Ellenőrizzük, hogy van-e már regisztrált credential
    let credential = await BiometricCredential.findOne({ userId });
    
    if (credential) {
      // Ha van, frissítjük
      credential.credentialId = credentialId;
      credential.publicKey = publicKey;
      await credential.save();
    } else {
      // Ha nincs, újat hozunk létre
      credential = new BiometricCredential({
        userId,
        credentialId,
        publicKey
      });
      await credential.save();
    }

    res.status(201).json({ message: 'Biometric credential registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Biometrikus credential ellenőrzése
router.post('/biometric/verify', async (req, res) => {
  try {
    const { credentialId, authenticatorData } = req.body;
    
    const credential = await BiometricCredential.findOne({ credentialId });
    if (!credential) {
      return res.status(404).json({ message: 'Credential not found' });
    }

    // Itt történne a biometrikus adat validálása
    // Valós implementációban ez komplexebb lenne

    // Ha sikeres a validáció, visszaadjuk a felhasználó adatait
    res.json({
      userId: credential.userId,
      // További szükséges adatok...
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Biometrikus credential törlése
router.delete('/biometric', authMiddleware, async (req, res) => {
  try {
    const userId = req.userData.email;
    await BiometricCredential.deleteOne({ userId });
    res.json({ message: 'Biometric credential deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;