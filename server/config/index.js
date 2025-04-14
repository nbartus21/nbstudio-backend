/**
 * Configuration
 * 
 * Central configuration management for the Document Management System.
 * This loads environment variables and provides a unified configuration object.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Document Management System configuration
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI,
  
  // Document storage settings
  documents: {
    storagePath: process.env.DOCUMENT_STORAGE_PATH || './uploads/documents',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10),
    allowedTypes: (process.env.ALLOWED_DOCUMENT_TYPES || 'pdf,docx,xlsx,pptx,txt,jpg,png').split(','),
    defaultLanguage: process.env.DEFAULT_DOCUMENT_LANGUAGE || 'hu',
    pdfGenerationTimeout: parseInt(process.env.PDF_GENERATION_TIMEOUT || '30000', 10)
  },
  
  // Security settings
  security: {
    pinSalt: process.env.PIN_SALT,
    encryptionKey: process.env.DOCUMENT_ENCRYPTION_KEY,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiryTime: '7d'
  },
  
  // Cloud storage settings
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION
  }
};

export default config; 