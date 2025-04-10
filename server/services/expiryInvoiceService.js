import Domain from '../models/Domain.js';
import Hosting from '../models/Hosting.js';
import Project from '../models/Project.js';
import { generateInvoiceNumber } from './invoiceService.js';

// Domain lejárat előtti számla generálás
export const generateDomainExpiryInvoices = async () => {
  try {
    const now = new Date();
    const threeWeeksFromNow = new Date();
    threeWeeksFromNow.setDate(now.getDate() + 21); // 3 hét (21 nap)
    
    console.log(`Ellenőrzés domain lejárat előtti számlák generálásához: ${now.toISOString()}`);
    
    // Keressük meg a domainek, amelyek 3 héten belül lejárnak
    const domains = await Domain.find({
      expiryDate: { $gt: now, $lte: threeWeeksFromNow },
      projectId: { $ne: null } // Csak azok a domainek, amelyek projekthez vannak kapcsolva
    });
    
    console.log(`${domains.length} domain található, amely 3 héten belül lejár és projekthez van kapcsolva`);
    
    let generatedCount = 0;
    const results = [];
    
    // Minden domain-hez generáljunk számlát, ha még nincs
    for (const domain of domains) {
      try {
        // Ellenőrizzük, hogy van-e már számla ehhez a domain lejárathoz
        const project = await Project.findById(domain.projectId);
        
        if (!project) {
          console.log(`Projekt nem található a domain-hez: ${domain.name}`);
          continue;
        }
        
        // Ellenőrizzük, hogy van-e már számla ehhez a domain lejárathoz
        const existingInvoice = project.invoices.find(inv => 
          inv.description && 
          inv.description.includes(`${domain.name} domain megújítás`) &&
          Math.abs(new Date(inv.date).getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000 // 30 napon belül
        );
        
        if (existingInvoice) {
          console.log(`Már létezik számla a domain megújításhoz: ${domain.name}`);
          continue;
        }
        
        // Új számla létrehozása
        const invoiceNumber = await generateInvoiceNumber();
        const dueDate = new Date(domain.expiryDate);
        dueDate.setDate(dueDate.getDate() - 7); // Fizetési határidő 1 héttel a lejárat előtt
        
        const newInvoice = {
          number: invoiceNumber,
          date: now,
          dueDate: dueDate,
          status: 'kiállított',
          items: [{
            description: `${domain.name} domain megújítás`,
            quantity: 1,
            unitPrice: domain.cost,
            total: domain.cost
          }],
          totalAmount: domain.cost,
          description: `${domain.name} domain megújítás (lejárat: ${domain.expiryDate.toLocaleDateString()})`,
          notes: `Automatikusan generált számla a domain megújításhoz.`
        };
        
        // Számla hozzáadása a projekthez
        project.invoices.push(newInvoice);
        await project.save();
        
        console.log(`Számla sikeresen létrehozva a domain megújításhoz: ${domain.name}`);
        generatedCount++;
        
        results.push({
          domainName: domain.name,
          projectId: project._id,
          projectName: project.name,
          invoiceNumber: invoiceNumber,
          amount: domain.cost
        });
        
        // Domain előzményekhez hozzáadjuk a számla generálást
        domain.history.push({
          action: 'invoice_generated',
          details: `Számla generálva a domain megújításhoz: ${invoiceNumber}`
        });
        
        await domain.save();
      } catch (error) {
        console.error(`Hiba a domain számla generálásakor (${domain.name}):`, error);
      }
    }
    
    return { generatedCount, results };
  } catch (error) {
    console.error('Hiba a domain lejárat előtti számlák generálásakor:', error);
    return { generatedCount: 0, error: error.message };
  }
};

// Hosting lejárat előtti számla generálás
export const generateHostingExpiryInvoices = async () => {
  try {
    const now = new Date();
    const threeWeeksFromNow = new Date();
    threeWeeksFromNow.setDate(now.getDate() + 21); // 3 hét (21 nap)
    
    console.log(`Ellenőrzés hosting lejárat előtti számlák generálásához: ${now.toISOString()}`);
    
    // Keressük meg a hostingokat, amelyek 3 héten belül lejárnak
    const hostings = await Hosting.find({
      'service.endDate': { $gt: now, $lte: threeWeeksFromNow },
      projectId: { $ne: null } // Csak azok a hostingok, amelyek projekthez vannak kapcsolva
    });
    
    console.log(`${hostings.length} hosting található, amely 3 héten belül lejár és projekthez van kapcsolva`);
    
    let generatedCount = 0;
    const results = [];
    
    // Minden hostinghoz generáljunk számlát, ha még nincs
    for (const hosting of hostings) {
      try {
        // Ellenőrizzük, hogy van-e már számla ehhez a hosting lejárathoz
        const project = await Project.findById(hosting.projectId);
        
        if (!project) {
          console.log(`Projekt nem található a hostinghoz: ${hosting.service.domainName}`);
          continue;
        }
        
        // Ellenőrizzük, hogy van-e már számla ehhez a hosting lejárathoz
        const existingInvoice = project.invoices.find(inv => 
          inv.description && 
          inv.description.includes(`${hosting.service.domainName} webtárhely megújítás`) &&
          Math.abs(new Date(inv.date).getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000 // 30 napon belül
        );
        
        if (existingInvoice) {
          console.log(`Már létezik számla a hosting megújításhoz: ${hosting.service.domainName}`);
          continue;
        }
        
        // Új számla létrehozása
        const invoiceNumber = await generateInvoiceNumber();
        const dueDate = new Date(hosting.service.endDate);
        dueDate.setDate(dueDate.getDate() - 7); // Fizetési határidő 1 héttel a lejárat előtt
        
        const newInvoice = {
          number: invoiceNumber,
          date: now,
          dueDate: dueDate,
          status: 'kiállított',
          items: [{
            description: `${hosting.service.domainName} webtárhely megújítás (${hosting.plan.name})`,
            quantity: 1,
            unitPrice: hosting.plan.price,
            total: hosting.plan.price
          }],
          totalAmount: hosting.plan.price,
          description: `${hosting.service.domainName} webtárhely megújítás (lejárat: ${new Date(hosting.service.endDate).toLocaleDateString()})`,
          notes: `Automatikusan generált számla a webtárhely megújításhoz.`
        };
        
        // Számla hozzáadása a projekthez
        project.invoices.push(newInvoice);
        await project.save();
        
        console.log(`Számla sikeresen létrehozva a hosting megújításhoz: ${hosting.service.domainName}`);
        generatedCount++;
        
        results.push({
          hostingDomain: hosting.service.domainName,
          projectId: project._id,
          projectName: project.name,
          invoiceNumber: invoiceNumber,
          amount: hosting.plan.price
        });
        
        // Hosting előzményekhez hozzáadjuk a számla generálást
        hosting.history.push({
          action: 'invoice_generated',
          details: `Számla generálva a webtárhely megújításhoz: ${invoiceNumber}`
        });
        
        await hosting.save();
      } catch (error) {
        console.error(`Hiba a hosting számla generálásakor (${hosting.service.domainName}):`, error);
      }
    }
    
    return { generatedCount, results };
  } catch (error) {
    console.error('Hiba a hosting lejárat előtti számlák generálásakor:', error);
    return { generatedCount: 0, error: error.message };
  }
};

// Mindkét típusú lejárat ellenőrzése és számla generálás
export const processExpiryInvoices = async () => {
  try {
    console.log('Lejárat előtti számlák generálása indul...');
    
    const domainResults = await generateDomainExpiryInvoices();
    const hostingResults = await generateHostingExpiryInvoices();
    
    const totalGenerated = domainResults.generatedCount + hostingResults.generatedCount;
    
    console.log(`Lejárat előtti számlák generálása befejezve. Összesen ${totalGenerated} számla generálva.`);
    console.log(`- Domain számlák: ${domainResults.generatedCount}`);
    console.log(`- Hosting számlák: ${hostingResults.generatedCount}`);
    
    return {
      totalGenerated,
      domainResults,
      hostingResults
    };
  } catch (error) {
    console.error('Hiba a lejárat előtti számlák generálása során:', error);
    return { totalGenerated: 0, error: error.message };
  }
};

export default {
  generateDomainExpiryInvoices,
  generateHostingExpiryInvoices,
  processExpiryInvoices
};
