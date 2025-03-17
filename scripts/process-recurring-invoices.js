#!/usr/bin/env node

// CommonJS formátum használata a szélesebb kompatibilitás érdekében
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Környezeti változók betöltése közvetlenül, dotenv nélkül
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
    
    // Az API base URL összeállítása
    const baseUrl = env.FRONTEND_URL || 'http://localhost:5001';
    let apiBaseUrl = baseUrl;
    
    // Ha a FRONTEND_URL tartalmaz portot, azt lecseréljük a szerver portjára
    if (baseUrl.includes(':5173')) {
      apiBaseUrl = baseUrl.replace(':5173', ':5001');
    } else if (env.PORT) {
      // Ha van PORT környezeti változó, azt használjuk
      const urlObj = new URL(baseUrl);
      urlObj.port = env.PORT;
      apiBaseUrl = urlObj.toString();
    }
    
    // Eltávolítjuk a záró perjelet, ha van
    if (apiBaseUrl.endsWith('/')) {
      apiBaseUrl = apiBaseUrl.slice(0, -1);
    }
    
    const apiUrl = `${apiBaseUrl}/api/recurring/process`;
    
    console.log(`Calling API at ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
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