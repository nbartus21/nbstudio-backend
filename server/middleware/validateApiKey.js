const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      console.log('API Key validation failed:', {
        received: apiKey,
        expected: process.env.PUBLIC_API_KEY
      });
      return res.status(401).json({ 
        success: false,
        message: 'Érvénytelen API kulcs' 
      });
    }
    
    next();
  };
  
  export default validateApiKey;