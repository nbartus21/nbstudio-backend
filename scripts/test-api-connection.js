#!/usr/bin/env node

// Egyszerű API elérhetőség tesztelő szkript
import fetch from 'node-fetch';

console.log('API elérhetőség teszt script');

// Teszteljük a lokális és a távoli API-t is különböző portokkal
const urlsToTest = [
  'http://localhost:5001',
  'http://localhost:5173',
  'http://127.0.0.1:5001',
  'http://38.242.208.190:5001',
  'http://38.242.208.190:5173'
];

// Függvény a HTTP kérés küldésére, időtúllépés kezeléssel
async function testUrl(url) {
  console.log(`\nTesztelés: ${url}`);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 másodperces időtúllépés
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    console.log(`✅ Sikeres kapcsolat: ${url}`);
    console.log(`   Státuszkód: ${response.status}`);
    console.log(`   Státusz szöveg: ${response.statusText}`);
    
    try {
      const text = await response.text();
      console.log(`   Válasz hossza: ${text.length} karakter`);
    } catch (error) {
      console.log(`   Válasz olvasási hiba: ${error.message}`);
    }
    
    return { success: true, url, status: response.status };
  } catch (error) {
    clearTimeout(timeout);
    
    console.log(`❌ Sikertelen kapcsolat: ${url}`);
    console.log(`   Hiba: ${error.name} - ${error.message}`);
    
    if (error.code) {
      console.log(`   Hibakód: ${error.code}`);
    }
    
    return { success: false, url, error: error.message };
  }
}

// Futtatjuk a teszteket
async function runTests() {
  console.log('API elérhetőség tesztelése...');
  
  const results = [];
  
  for (const url of urlsToTest) {
    const result = await testUrl(url);
    results.push(result);
  }
  
  console.log('\n--- Összesített eredmények ---');
  console.log(`Tesztelve: ${results.length} URL`);
  console.log(`Sikeres: ${results.filter(r => r.success).length}`);
  console.log(`Sikertelen: ${results.filter(r => !r.success).length}`);
  
  // Végkövetkeztetés
  if (results.some(r => r.success)) {
    console.log('\n✅ A szerver elérhető valamely URL-en!');
  } else {
    console.log('\n❌ A szerver egyetlen tesztelt URL-en sem elérhető!');
    console.log('   Kérjük ellenőrizze, hogy a szerver fut-e, és a tűzfal nem blokkolja-e a kapcsolatot.');
  }
}

runTests().catch(error => {
  console.error('Teszt futtatási hiba:', error);
  process.exit(1);
});