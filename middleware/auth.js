// ... existing code ...

const authMiddleware = (req, res, next) => {
  try {
    console.log('Auth middleware checking request:', {
      path: req.path,
      method: req.method,
      headers: req.headers
    });
    
    // Token ellenőrzése a kérés fejlécében
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      console.log('No token found in request');
      // Ha nincs token, de ez egy nyilvános útvonal, akkor engedjük tovább
      if (isPublicRoute(req.path)) {
        console.log('Public route accessed without token');
        return next();
      }
      
      console.error('Authentication required for protected route');
      return res.status(403).json({ success: false, message: 'Hitelesítés szükséges' });
    }
    
    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.userData = decoded;
    
    console.log('User authenticated:', req.user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({ success: false, message: 'Érvénytelen token', error: error.message });
  }
};

// Segédfüggvény a nyilvános útvonalak ellenőrzésére
function isPublicRoute(path) {
  const publicRoutes = [
    '/projectshared/verify-pin',
    // Egyéb nyilvános útvonalak...
  ];
  
  return publicRoutes.some(route => path.startsWith(route));
}

// ... existing code ...