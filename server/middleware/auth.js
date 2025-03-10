// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Auth middleware to protect routes
const authMiddleware = (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      console.error('Authorization header missing');
      return res.status(401).json({ message: 'Authorization required' });
    }
    
    // Format should be: "Bearer token"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.error('Invalid authorization format');
      return res.status(401).json({ message: 'Invalid authorization format' });
    }
    
    const token = parts[1];
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user data to the request
    req.userData = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    console.log('User authenticated:', req.userData.email);
    
    // Proceed to the route
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export default authMiddleware;