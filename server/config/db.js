/**
 * Database Connection
 * 
 * Handles MongoDB connection setup and management.
 */

import mongoose from 'mongoose';
import config from './index.js';

/**
 * Connect to MongoDB database
 * @returns {Promise} MongoDB connection promise
 */
const connectDB = async () => {
  try {
    // Check if MongoDB URI is configured
    if (!config.mongoUri) {
      throw new Error('MongoDB connection URI is not defined in environment variables');
    }

    // Set mongoose options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(config.mongoUri, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Close MongoDB connection
 * Used mainly for testing or when shutting down the application gracefully
 */
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
};

export { connectDB, closeConnection }; 