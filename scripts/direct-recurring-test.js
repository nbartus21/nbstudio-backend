#!/usr/bin/env node

// Közvetlen API teszt - egyszerűsített szkript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT Secret kiolvasása közvetlenül a környezeti változókból
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const jwtSecretMatch = envContent.match(/JWT_SECRET=(.+)/);

if (!jwtSecretMatch) {
  console.error('JWT_SECRET nem található a .env fájlban');
  process.exit(1);
}

const JWT_SECRET = jwtSecretMatch[1].trim();

// Token generálás
const generateToken = () => {
  const payload = {
    id: 'system-cron',
    email: 'test@example.com',
    isAdmin: true
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

// API kérés küldése
const callApi = async () => {
  // Az API végpont a tesztelt és működő URL-en
  const apiUrl = 'http://localhost:5173/api/recurring/process';
  console.log(`API kérés küldése: ${apiUrl}`);
  
  // Generáljunk tokent
  const token = generateToken();
  console.log('Token generálva');
  
  try {
    // Időtúllépés kezelése
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Kérés küldése
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Státusz:', response.status, response.statusText);
    
    // Válasz feldolgozása
    let responseData;
    try {
      responseData = await response.json();
      console.log('Válasz:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      const text = await response.text();
      console.log('Válasz szöveg:', text);
    }
    
    if (!response.ok) {
      console.error('Sikertelen kérés:', response.status, response.statusText);
    } else {
      console.log('Sikeres kérés!');
    }
    
  } catch (error) {
    console.error('Hiba történt:', error.name, error.message);
    if (error.code) {
      console.error('Hibakód:', error.code);
    }
  }
};

// Futtatás
callApi()
  .then(() => console.log('Teszt befejezve'))
  .catch(err => console.error('Végzetes hiba:', err));