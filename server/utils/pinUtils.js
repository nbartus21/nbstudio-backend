/**
 * PIN Code Utility Functions
 * 
 * Helper functions for handling PIN codes in the Document Management System.
 */

import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Generates a random PIN code
 * @param {number} [length=6] - Length of the PIN code
 * @returns {string} - Generated PIN code
 */
const generatePin = (length = 6) => {
  // Generate a random numeric PIN code
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
};

/**
 * Hashes a PIN code for secure storage
 * @param {string} pin - PIN code to hash
 * @returns {string} - Hashed PIN code
 */
const hashPin = (pin) => {
  if (!pin) throw new Error('PIN code is required');
  if (!config.security.pinSalt) throw new Error('PIN salt is not configured');
  
  // Create a salted hash of the PIN code
  return crypto
    .createHmac('sha256', config.security.pinSalt)
    .update(pin)
    .digest('hex');
};

/**
 * Verifies a PIN code against a stored hash
 * @param {string} pin - PIN code to verify
 * @param {string} hashedPin - Stored hashed PIN code
 * @returns {boolean} - True if the PIN is valid
 */
const verifyPin = (pin, hashedPin) => {
  if (!pin || !hashedPin) return false;
  
  // Hash the provided PIN and compare with the stored hash
  const newHashedPin = hashPin(pin);
  return crypto.timingSafeEqual(
    Buffer.from(newHashedPin, 'hex'),
    Buffer.from(hashedPin, 'hex')
  );
};

export default {
  generatePin,
  hashPin,
  verifyPin
}; 