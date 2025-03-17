// scripts/process-recurring-invoices.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

// A környezeti változók betöltése
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Token generálás a JWT_SECRET-tel
const generateToken = () => {
  // Egyszerű admin felhasználói azonosító
  const payload = {
    id: 'system-cron',
    email: process.env.ADMIN_EMAIL,
    isAdmin: true
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const processRecurringInvoices = async () => {
  try {
    const token = generateToken();
    
    // Az API base URL összeállítása
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    const apiUrl = `${baseUrl.replace(':5173', ':5001')}/api/recurring/process`;
    
    console.log(`Calling API at ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.message || response.statusText}`);
    }
    
    console.log('Recurring invoices processed successfully:', data);
  } catch (error) {
    console.error('Error processing recurring invoices:', error);
    process.exit(1);
  }
};

// Futtatás
processRecurringInvoices();