// cronJobs.js - Ismétlődő feladatok beállítása
import cron from 'node-cron';
import recurringInvoiceService from './services/recurringInvoiceService.js';
import mongoose from 'mongoose';

// Cron job-ok beállítása
export function setupCronJobs() {
  console.log('Cron job-ok beállítása...');

  // Ismétlődő számlák napi ellenőrzése (minden nap 01:00-kor)
  cron.schedule('0 1 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Ismétlődő számlák napi ellenőrzése...`);
    try {
      await recurringInvoiceService.checkAllRecurringInvoices();
    } catch (error) {
      console.error('Hiba az ismétlődő számlák napi ellenőrzésekor:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Budapest' // Beállíthatjuk a megfelelő időzónát
  });

  // Óránkénti ellenőrzés a késedelmes számláknál (minden óra 15. percében)
  cron.schedule('15 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Késedelmes számlák óránkénti ellenőrzése...`);
    try {
      // Itt lehetne egy funkció, ami frissíti a számla státuszát, ha lejárt a fizetési határidő
      // Példa: await checkOverdueInvoices();
    } catch (error) {
      console.error('Hiba a késedelmes számlák ellenőrzésekor:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Budapest'
  });

  // Heti összefoglaló jelentés (minden hétfő 7:00-kor)
  cron.schedule('0 7 * * 1', async () => {
    console.log(`[${new Date().toISOString()}] Heti összefoglaló jelentés generálása...`);
    try {
      // Itt lehetne egy funkció, ami heti összefoglaló jelentést készít a számlázásról
      // Példa: await generateWeeklyInvoiceReport();
    } catch (error) {
      console.error('Hiba a heti összefoglaló jelentés generálásakor:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Budapest'
  });

  // Kézi indítási lehetőség teszteléshez
  const manuallyTriggerRecurringInvoices = async () => {
    console.log('Ismétlődő számlák manuális ellenőrzése indítása...');
    try {
      await recurringInvoiceService.checkAllRecurringInvoices();
    } catch (error) {
      console.error('Hiba az ismétlődő számlák manuális ellenőrzésekor:', error);
    }
  };

  console.log('Cron job-ok sikeresen beállítva!');
  
  return {
    manuallyTriggerRecurringInvoices
  };
}

// Ez a függvény frissíti a számlák státuszát a fizetési határidő alapján
export async function checkOverdueInvoices() {
  try {
    const Project = mongoose.model('Project');
    
    // Keressük meg azokat a számlákat, amelyek határideje lejárt, de még nem lettek fizetettként vagy késedelmesként megjelölve
    const overdueCutoff = new Date();
    
    const projects = await Project.find({
      'invoices.status': 'kiállított',
      'invoices.dueDate': { $lt: overdueCutoff }
    });
    
    let updatedCount = 0;
    
    // Frissítsük a késedelmes számlákat
    for (const project of projects) {
      let modified = false;
      
      for (const invoice of project.invoices) {
        if (invoice.status === 'kiállított' && new Date(invoice.dueDate) < overdueCutoff) {
          invoice.status = 'késedelmes';
          modified = true;
          updatedCount++;
        }
      }
      
      if (modified) {
        await project.save();
      }
    }
    
    console.log(`Összesen ${updatedCount} számla státusza frissítve 'késedelmes'-re`);
    
  } catch (error) {
    console.error('Hiba a lejárt számlák ellenőrzésekor:', error);
    throw error;
  }
}

export default setupCronJobs; 