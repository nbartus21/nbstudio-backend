import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  // CORS preflight kérések átengedése
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    // Token kinyerése a header-ből
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('Hiányzó autentikációs token');
      return res.status(401).json({ message: 'Nincs autentikációs token' });
    }

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ellenőrizzük, hogy a decoded token tartalmazza-e az email mezőt
    if (!decoded.email) {
      console.log('Hiányzó email cím a tokenben', decoded);
      return res.status(401).json({ message: 'Érvénytelen tokentartalom - hiányzó email cím' });
    }
    
    req.userData = decoded;
    console.log('Sikeres autentikáció:', req.userData.email);
    
    next();
  } catch (error) {
    console.error('Token ellenőrzési hiba:', error.message);
    return res.status(401).json({ message: 'Érvénytelen token' });
  }
};

// API kulcs validáló middleware
export const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    console.log('Hiányzó API kulcs');
    return res.status(401).json({ message: 'API kulcs megadása kötelező' });
  }
  
  // API kulcs ellenőrzése
  if (apiKey === process.env.API_KEY) {
    console.log('Sikeres API kulcs autentikáció');
    next();
  } else {
    console.error('Érvénytelen API kulcs');
    res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }
};

export default authMiddleware;