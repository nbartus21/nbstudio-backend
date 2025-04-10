// Middleware for API key validation
export const checkApiKey = (req, res, next) => {
  // Get API key from request headers
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API kulcs szükséges' });
  }
  
  // Check if the API key is valid
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Érvénytelen API kulcs' });
  }
}; 