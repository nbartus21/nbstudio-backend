import mongoose from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId
 * Checks if the ID parameter is a valid MongoDB ObjectId
 */
export const validateObjectId = (req, res, next) => {
  const idParam = req.params.id;
  
  if (!idParam) {
    return res.status(400).json({ message: 'ID parameter is required' });
  }
  
  if (!mongoose.Types.ObjectId.isValid(idParam)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  next();
};

/**
 * Validate request body against a schema
 * @param {Object} schema - Joi schema for validation
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
};

/**
 * Validate request query parameters against a schema
 * @param {Object} schema - Joi schema for validation
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
}; 