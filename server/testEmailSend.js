import { sendProjectShareEmail } from './services/projectShareEmailService.js';

// Teszt e-mail küldése a szerver indításakor
export const testEmailSend = async () => {
  try {
    console.log('TESZT E-MAIL KÜLDÉS INDÍTÁSA...');
    
    // Teszt projekt objektum létrehozása
    const testProject = {
      name: 'Teszt Projekt',
      client: {
        name: 'Teszt Ügyfél',
        email: 'nbartus21@gmail.com' // Ide írd a saját e-mail címedet
      }
    };
    
    // Teszt számla adatok
    const testInvoiceSubject = 'TESZT - Számla e-mail küldés';
    const testInvoiceDetails = 'Ez egy teszt e-mail a számla e-mail küldés teszteléséhez.\n\nSzámla szám: TEST-123\nKiállítás dátuma: 2025-04-06\nÖsszeg: 100 EUR';
    
    // E-mail küldése a projectShareEmailService használatával
    console.log('TESZT E-MAIL KÜLDÉSE MEGKEZDŐDIK...');
    const emailResult = await sendProjectShareEmail(
      testProject,
      'https://project.nb-studio.net',
      testInvoiceDetails,
      'hu',
      testInvoiceSubject
    );
    
    console.log('TESZT E-MAIL KÜLDÉS EREDMÉNYE:', emailResult);
    return emailResult;
  } catch (error) {
    console.error('TESZT E-MAIL KÜLDÉS HIBA:', error);
    return { success: false, error: error.message };
  }
};

// Exportáljuk a függvényt, hogy a szerver indításakor meghívhassuk
export default testEmailSend;
