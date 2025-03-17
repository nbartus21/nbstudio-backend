#!/usr/bin/env node

// ESM formátum használata a package.json "type": "module" beállítás miatt
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Elérési útvonalak beállítása ESM módban
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Környezeti változók betöltése közvetlenül
const loadEnv = () => {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env fájl nem található:', envPath);
    process.exit(1);
  }

  const envData = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envData.split('\n').forEach(line => {
    // Kommentek és üres sorok kihagyása
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Idézőjelek eltávolítása
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      
      envVars[key] = value;
    }
  });

  return envVars;
};

// Környezeti változók betöltése
const env = loadEnv();

// Token generálás a JWT_SECRET-tel
const generateToken = () => {
  if (!env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET nincs megadva a .env fájlban');
    process.exit(1);
  }

  // Admin felhasználói azonosító
  const payload = {
    id: 'system-cron',
    email: env.ADMIN_EMAIL || 'system@example.com',
    isAdmin: true
  };
  
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
};

const processRecurringInvoices = async () => {
  try {
    const token = generateToken();
    
    // Az API base URL összeállítása - használjuk a helyi szervert, 
    // mivel a távoli szerver nem elérhető
    console.log('Környezeti változók - FRONTEND_URL:', env.FRONTEND_URL, 'PORT:', env.PORT);
    
    // Közvetlenül a helyi szervert használjuk túlzott URL-manipuláció nélkül
    const apiUrl = 'http://localhost:5001/api/recurring/process';
    
    console.log('Használt szerver API URL:', apiUrl, '(közvetlenül helyi szervert használunk)');
    
    console.log(`Calling API at ${apiUrl}`);
    
    console.log('Fetching with timeout...');
    // Időtúllépés kezelése
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 másodperc időtúllépés
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout); // Töröljük az időtúllépést
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Időtúllépés: a szerver nem válaszolt 10 másodpercen belül');
      }
      throw error;
    }
    
    // Válasz feldolgozása
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${typeof data === 'object' ? data.message : data}`);
    }
    
    console.log('Recurring invoices processed successfully:', data);
    return data;
  } catch (error) {
    console.error('Error processing recurring invoices:', error);
    throw error;
  }
};

// Futtatás
processRecurringInvoices()
  .then(result => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed with error:', err);
    process.exit(1);
  });