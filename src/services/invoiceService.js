// invoiceService.js
import PDFDocument from 'pdfkit';

export const generateInvoicePDF = async (invoice, project) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Számla-${invoice.number}`,
        Author: 'NB Studio',
      }
    });

    // Fejléc
    doc.fontSize(20).text('SZÁMLA', { align: 'center' });
    doc.moveDown();

    // Számla alapadatok
    doc.fontSize(12)
      .text(`Számlaszám: ${invoice.number}`)
      .text(`Dátum: ${new Date(invoice.date).toLocaleDateString('hu-HU')}`)
      .text(`Fizetési határidő: ${new Date(invoice.dueDate).toLocaleDateString('hu-HU')}`)
      .moveDown();

    // Kiállító adatok
    doc.fontSize(12)
      .text('Kiállító:', { underline: true })
      .text('NB Studio')
      .text('Adószám: 12345678-1-42')
      .text('Cím: 1234 Budapest, Példa utca 1.')
      .moveDown();

    // Vevő adatok
    if (project?.client) {
      doc.text('Vevő:', { underline: true })
        .text(project.client.name || 'N/A')
        .text(`Adószám: ${project.client.taxNumber || 'N/A'}`)
        .text(`Email: ${project.client.email || 'N/A'}`)
        .moveDown();
    }

    // Táblázat fejléc
    const startX = 50;
    let currentY = doc.y;

    doc.fontSize(10)
      .text('Megnevezés', startX, currentY, { width: 200 })
      .text('Mennyiség', startX + 220, currentY, { width: 70 })
      .text('Egységár', startX + 300, currentY, { width: 70 })
      .text('Összesen', startX + 380, currentY, { width: 70 });

    doc.moveDown();
    currentY = doc.y;

    // Vonal húzása
    doc.moveTo(startX, currentY).lineTo(startX + 450, currentY).stroke();
    doc.moveDown();

    // Tételek
    invoice.items.forEach(item => {
      currentY = doc.y;
      doc.fontSize(10)
        .text(item.description, startX, currentY, { width: 200 })
        .text(item.quantity.toString(), startX + 220, currentY, { width: 70 })
        .text(`${item.unitPrice} €`, startX + 300, currentY, { width: 70 })
        .text(`${item.total} €`, startX + 380, currentY, { width: 70 });
      doc.moveDown();
    });

    // Összesítés
    doc.moveDown()
      .fontSize(12)
      .text('Összesítés:', { underline: true })
      .moveDown()
      .text(`Végösszeg: ${invoice.totalAmount} €`, { bold: true })
      .text(`Fizetve: ${invoice.paidAmount} €`)
      .text(`Fennmaradó összeg: ${invoice.totalAmount - invoice.paidAmount} €`);

    // Lezáró szöveg
    doc.moveDown()
      .fontSize(10)
      .text('Köszönjük, hogy minket választott!', { align: 'center' })
      .text(`Számla kiállítva: ${new Date().toLocaleDateString('hu-HU')}`, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Hiba a PDF generálása során:', error);
    throw new Error('Nem sikerült létrehozni a PDF dokumentumot');
  }
};

export const downloadInvoice = async (invoice, project) => {
  try {
    const doc = await generateInvoicePDF(invoice, project);
    
    // Blob létrehozása a PDF dokumentumból
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBlob = new Blob(chunks, { type: 'application/pdf' });
        resolve(pdfBlob);
      });
      
      doc.on('error', (err) => {
        reject(new Error('Hiba a PDF generálása során: ' + err.message));
      });
      
      doc.end();
    });
  } catch (error) {
    console.error('Hiba a számla letöltése során:', error);
    throw error;
  }
};