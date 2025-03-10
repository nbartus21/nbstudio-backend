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

// Hozzáadni a fájl végéhez:
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

export default authMiddleware;