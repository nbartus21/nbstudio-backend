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
      return res.status(401).json({ message: 'Nincs autentikációs token' });
    }

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Érvénytelen token' });
  }
};

// API kulcs ellenőrző middleware
export const apiKeyMiddleware = (req, res, next) => {
  // Implement your API key validation logic here
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API key is required' });
  }
  
  // Check if the API key is valid (customize this check)
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Invalid API key' });
  }
};

// PIN ellenőrző middleware a shared projektekhez
export const pinAuthMiddleware = (req, res, next) => {
  try {
    // URL-ből kinyerjük a PIN-t
    const url = req.originalUrl;
    const pinMatch = url.match(/[?&]pin=([^&]+)/);
    
    if (!pinMatch) {
      return res.status(401).json({ 
        message: 'Érvénytelen hozzáférés. A PIN hiányzik az URL-ből.',
        requireLogin: true 
      });
    }
    
    const pin = pinMatch[1];
    
    // Ellenőrizzük, hogy a PIN érvényes-e (ezt a project adatbázisából kell ellenőrizni)
    // Ez csak egy példa implementáció, a valódi ellenőrzést a project adatbázis alapján kell megvalósítani
    // Itt feltételezzük, hogy a PIN ellenőrzése más helyen történik meg
    
    // Frissítjük a felhasználó utolsó aktivitásának idejét
    if (req.session) {
      req.session.lastActivity = Date.now();
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Hiba történt a PIN ellenőrzése során', 
      requireLogin: true 
    });
  }
};

// Inaktivitás ellenőrző middleware - automatikus kijelentkeztetés 1 óra után
export const sessionTimeoutMiddleware = (req, res, next) => {
  const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 óra milliszekundumban
  
  if (req.session && req.session.lastActivity) {
    const currentTime = Date.now();
    const lastActivity = req.session.lastActivity;
    
    if (currentTime - lastActivity > TIMEOUT_DURATION) {
      // Ha az utolsó aktivitás több mint 1 órája volt, töröljük a session-t
      req.session.destroy((err) => {
        if (err) {
          console.error('Hiba a munkamenet törlésekor:', err);
        }
        return res.status(440).json({ 
          message: 'A munkamenet lejárt inaktivitás miatt. Kérjük, jelentkezzen be újra.',
          requireLogin: true 
        });
      });
    } else {
      // Frissítjük az utolsó aktivitás idejét
      req.session.lastActivity = currentTime;
      next();
    }
  } else {
    // Ha nincs session vagy lastActivity, akkor inicializáljuk
    if (req.session) {
      req.session.lastActivity = Date.now();
    }
    next();
  }
};

export default authMiddleware;