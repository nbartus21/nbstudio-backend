import Project from '../models/Project.js';

// Számla sorszám generálása
export const generateInvoiceNumber = async () => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Lekérjük az összes projektet, hogy megtaláljuk a legutolsó számlaszámot
    const projects = await Project.find({
      'invoices.number': { $regex: `^INV-${year}${month}` }
    });
    
    // Kigyűjtjük az összes számlaszámot
    let invoiceNumbers = [];
    projects.forEach(project => {
      project.invoices.forEach(invoice => {
        if (invoice.number && invoice.number.startsWith(`INV-${year}${month}`)) {
          invoiceNumbers.push(invoice.number);
        }
      });
    });
    
    // Rendezzük a számlaszámokat
    invoiceNumbers.sort();
    
    // Meghatározzuk a következő sorszámot
    let nextNumber = 1;
    if (invoiceNumbers.length > 0) {
      const lastNumber = invoiceNumbers[invoiceNumbers.length - 1];
      const lastSeq = parseInt(lastNumber.split('-')[2], 10);
      nextNumber = lastSeq + 1;
    }
    
    // Formázzuk a számlaszámot
    const invoiceNumber = `INV-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
    
    return invoiceNumber;
  } catch (error) {
    console.error('Hiba a számlaszám generálásakor:', error);
    // Fallback: egyedi számlaszám generálása időbélyeggel
    const timestamp = Date.now().toString().slice(-8);
    return `INV-${timestamp}`;
  }
};

export default {
  generateInvoiceNumber
};
