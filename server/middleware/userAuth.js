import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'nb_studio_default_secret_key';

// Kliens felhasználói autentikáció ellenőrzése
const userAuthMiddleware = async (req, res, next) => {
  try {
    // Token kinyerése a header-ből
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Nincs autentikációs token' });
    }

    // Token ellenőrzése
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Ellenőrizzük, hogy a felhasználó létezik-e még
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Felhasználó nem található' });
    }
    
    // Ellenőrizzük, hogy a felhasználó aktív-e
    if (!user.active) {
      return res.status(403).json({ message: 'A felhasználói fiók inaktív' });
    }
    
    // Frissítjük a bejelentkezési időt
    user.lastLoginAt = new Date();
    await user.save();
    
    // Felhasználói adatok hozzáadása a request objektumhoz
    req.userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      language: user.language
    };
    
    next();
  } catch (error) {
    console.error('Felhasználói autentikációs hiba:', error);
    return res.status(401).json({ message: 'Érvénytelen token' });
  }
};

// Admin jogosultság ellenőrzése
export const adminOnly = (req, res, next) => {
  if (req.userData && req.userData.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin jogosultság szükséges a művelethez' });
  }
};

export default userAuthMiddleware; 