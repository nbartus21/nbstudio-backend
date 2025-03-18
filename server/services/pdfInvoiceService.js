import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generates a PDF invoice document
 * @param {Object} invoice - The invoice data
 * @param {Object} project - The project data
 * @param {Object} res - Express response object to pipe the PDF to
 */
export const generateInvoicePDF = async (invoice, project, res) => {
  try {
    // PDF létrehozása - speciális karakterek kezelésével
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Számla-${invoice.number}`,
        Author: 'NB Studio',
        Producer: 'NB Studio Invoice System'
      },
      // Font és kódolási beállítások a speciális karakterek támogatásához
      lang: 'hu-HU',
      autoFirstPage: true
    });

    // Response headerek beállítása
    let fileName = `szamla-${invoice.number}`;
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Language', 'hu');

    // PDF streamelése a response-ba
    doc.pipe(res);
    
    // Egységes margó és pozíciók meghatározása
    const margin = {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50
    };
    
    const pageWidth = doc.page.width - margin.left - margin.right;
    const contentWidth = pageWidth;
    
    // Modern design - színek és stílusok - lágyabb színek
    const colors = {
      primary: '#1E6BB8',      // Elegáns kék
      secondary: '#2D3748',    // Sötét szürke
      accent: '#38B2AC',       // Türkizkék
      background: '#F7FAFC',   // Nagyon világos szürke háttér
      text: '#1A202C',         // Sötét szöveg
      lightText: '#4A5568',    // Világosabb szöveg
      border: '#E2E8F0',       // Szürke keret
      success: '#38A169',      // Zöld (fizetett)
      warning: '#E53E3E',      // Piros (lejárt)
      pending: '#DD6B20',      // Narancs (folyamatban)
    };
    
    // Segédfüggvény az oldalhatár ellenőrzésére
    const checkPageBreak = (y, requiredHeight, headerCallback) => {
      if (y + requiredHeight > doc.page.height - margin.bottom) {
        doc.addPage();
        if (headerCallback) headerCallback();
        return margin.top;
      }
      return y;
    };
    
    // ===== PDF Fejléc (minden oldalon) =====
    const renderHeader = () => {
      // Oldalfejléc háttér
      doc.rect(0, 0, doc.page.width, 120)
         .fillColor(colors.primary)
         .fill();
         
      // Fejléc alsó díszítőelem
      doc.rect(0, 120, doc.page.width, 6)
         .fillColor(colors.accent)
         .fill();
         
      // Logó hely
      try {
        const logoPath = join(__dirname, '..', 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin.left, 30, { width: 140, align: 'left' });
        }
      } catch (logoError) {
        console.warn('Logo betöltési hiba:', logoError.message);
      }
      
      // Számla cím és szám
      doc.font('Helvetica-Bold')
         .fontSize(28)
         .fillColor('white')
         .text('SZÁMLA', margin.left + 250, 40)
         .fontSize(14)
         .text(`Számlaszám: ${invoice.number}`, margin.left + 250, 75);
    };
    
    // ===== Lábléc render függvény =====
    const renderFooter = (pageNum) => {
      const footerTop = doc.page.height - margin.bottom;
      
      // Lábléc elválasztó vonal
      doc.strokeColor(colors.border)
         .lineWidth(0.5)
         .moveTo(margin.left, footerTop - 20)
         .lineTo(doc.page.width - margin.right, footerTop - 20)
         .stroke();
      
      // Cég adatok és oldalszám
      doc.fillColor(colors.lightText)
         .fontSize(8)
         .text('NB Studio - Bartus Norbert | www.nb-studio.net', margin.left, footerTop - 15, { 
            width: pageWidth - 100,
            align: 'left'
         })
         .text(`Oldal: ${pageNum}`, doc.page.width - margin.right - 60, footerTop - 15, { 
            align: 'right'
         });
      
      doc.text('Ez a számla elektronikusan készült és érvényes aláírás nélkül is.', margin.left, footerTop - 5, { 
        width: pageWidth,
        align: 'center'
      });
    };
    
    // Számlálók és vezérlők
    let currentY = 0;
    let pageNum = 1;
    
    // Az első oldal fejléce
    renderHeader();
    currentY = 140; // Fejléc magassága után kezdjük
    
    // ===== FEJLÉC INFORMÁCIÓK =====
    // Kelt és Fizetési határidő doboz
    doc.rect(margin.left, currentY, contentWidth, 80)
       .fillColor(colors.background)
       .fill();
    
    // Bal oldali infók
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Kiállítás dátuma:', margin.left + 20, currentY + 15)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(new Date(invoice.date).toLocaleDateString('hu-HU'), margin.left + 20, currentY + 35)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Fizetési határidő:', margin.left + 20, currentY + 55)
       .font('Helvetica')
       .fillColor(invoice.status === 'késedelmes' ? colors.warning : colors.text)
       .text(new Date(invoice.dueDate).toLocaleDateString('hu-HU'), margin.left + 20, currentY + 75);
    
    // Státusz jelölés
    let statusColor;
    let statusText;
    
    switch (invoice.status) {
      case 'fizetett':
        statusColor = colors.success;
        statusText = 'FIZETVE';
        break;
      case 'késedelmes':
        statusColor = colors.warning;
        statusText = 'LEJÁRT';
        break;
      case 'törölt':
        statusColor = colors.lightText;
        statusText = 'TÖRÖLT';
        break;
      default:
        statusColor = colors.primary;
        statusText = 'KIÁLLÍTVA';
    }
    
    // Státusz badge
    const badgeWidth = 140;
    const badgeX = doc.page.width - margin.right - badgeWidth - 20;
    
    doc.roundedRect(badgeX, currentY + 20, badgeWidth, 40, 5)
       .fillColor(statusColor)
       .fill();
       
    doc.fillColor('white')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(statusText, badgeX, currentY + 33, {
         width: badgeWidth,
         align: 'center'
       });
    
    // Fizetve dátum (ha fizetett)
    if (invoice.status === 'fizetett' && invoice.paidDate) {
      doc.fontSize(10)
         .fillColor('white')
         .text(`${new Date(invoice.paidDate).toLocaleDateString('hu-HU')}`, badgeX, currentY + 55, {
           width: badgeWidth,
           align: 'center'
         });
    }
    
    currentY += 100; // 80 a doboz + 20 margó
    
    // ===== KIÁLLÍTÓ ÉS VEVŐ ADATOK =====
    const boxHeight = 150;
    const boxWidth = contentWidth / 2 - 10;
    
    // Kiállító panel
    doc.roundedRect(margin.left, currentY, boxWidth, boxHeight, 3)
       .fillColor(colors.background)
       .fill()
       .strokeColor(colors.border)
       .lineWidth(0.5)
       .stroke();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Kiállító:', margin.left + 15, currentY + 15)
       .moveDown(0.5);
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(colors.text)
       .text('NB Studio - Bartus Norbert', margin.left + 15, null)
       .moveDown(0.3)
       .font('Helvetica')
       .fontSize(10)
       .fillColor(colors.lightText)
       .text('Adószám: 12345678-1-42')
       .text('Cím: 1234 Budapest, Példa utca 1.')
       .text('Email: info@nb-studio.net')
       .text('Telefon: +36 30 123 4567');
    
    // Vevő panel
    const clientBoxX = margin.left + boxWidth + 20;
    
    doc.roundedRect(clientBoxX, currentY, boxWidth, boxHeight, 3)
       .fillColor(colors.background)
       .fill()
       .strokeColor(colors.border)
       .lineWidth(0.5)
       .stroke();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Vevő:', clientBoxX + 15, currentY + 15)
       .moveDown(0.5);
    
    // Vevő adatok
    if (project.client) {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.text)
         .text(project.client.name || '', clientBoxX + 15, null);
      
      if (project.client.companyName) {
        doc.font('Helvetica')
           .text(project.client.companyName);
      }
      
      // Egyéb vevő adatok
      doc.fontSize(10)
         .fillColor(colors.lightText);
      
      if (project.client.taxNumber) {
        doc.text(`Adószám: ${project.client.taxNumber}`);
      }
      
      doc.text(`Email: ${project.client.email || ''}`);
      
      // Ha van cím adat, azt is kiírjuk
      if (project.client.address) {
        const { city, street, postalCode, country } = project.client.address;
        if (city || street || postalCode) {
          doc.text(`Cím: ${postalCode || ''} ${city || ''}, ${street || ''}`);
        }
        if (country) {
          doc.text(`Ország: ${country}`);
        }
      }
    }
    
    currentY += boxHeight + 25;
    
    // ===== TÉTELEK TÁBLÁZAT =====
    // Ellenőrizzük az items tömböt
    if (!invoice.items || !Array.isArray(invoice.items)) {
      invoice.items = []; // Üres tömböt hozunk létre, hogy ne crasheljen
    }
    
    // Táblázat fejléc
    const columnConfig = [
      { header: 'Tétel', width: 0.5, align: 'left' },    // Szélesség az össz szélesség %-ában
      { header: 'Mennyiség', width: 0.15, align: 'right' },
      { header: 'Egységár', width: 0.15, align: 'right' },
      { header: 'Összesen', width: 0.2, align: 'right' }
    ];
    
    // Oszlopszélességek és pozíciók kiszámítása
    const columnPositions = [];
    let positionX = margin.left;
    
    for (let i = 0; i < columnConfig.length; i++) {
      columnPositions.push(positionX);
      positionX += columnConfig[i].width * contentWidth;
    }
    
    // Táblázat fejléc render függvény
    const renderTableHeader = (y) => {
      // Táblázat fejléc háttér
      doc.rect(margin.left, y, contentWidth, 30)
         .fillColor(colors.primary)
         .fill();
      
      // Táblázat fejléc szöveg
      doc.fillColor('white')
         .fontSize(11)
         .font('Helvetica-Bold');
      
      // Oszloponként kiírjuk a fejlécet
      columnConfig.forEach((column, i) => {
        const colX = columnPositions[i];
        const colWidth = column.width * contentWidth;
        
        doc.text(
          column.header,
          colX + (column.align === 'right' ? 0 : 10),
          y + 10,
          {
            width: colWidth - 15,
            align: column.align
          }
        );
      });
      
      return y + 30;
    };
    
    // Táblázat fejléc
    currentY = renderTableHeader(currentY);
    
    // Táblázat sorok
    const rowHeight = 30;
    let alternateRow = false;
    
    // Függvény a táblázat fejléc kiiratásához új oldalon
    const renderTableHeaderOnNewPage = () => {
      renderHeader();
      renderFooter(pageNum);
      currentY = 140;
      return renderTableHeader(currentY);
    };
    
    // Végigmegyünk a tételeken
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      
      // Oldaltörés ellenőrzés
      if (currentY + rowHeight > doc.page.height - margin.bottom) {
        doc.addPage();
        pageNum++;
        currentY = renderTableHeaderOnNewPage();
      }
      
      // Sor háttér (váltakozó)
      if (alternateRow) {
        doc.rect(margin.left, currentY, contentWidth, rowHeight)
           .fillColor(colors.background)
           .fill();
      }
      
      // Sor adatok
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica');
      
      // Tétel neve
      doc.text(
        item.description || 'Ismeretlen tétel',
        columnPositions[0] + 10,
        currentY + 10,
        { width: columnConfig[0].width * contentWidth - 20 }
      );
      
      // Mennyiség
      doc.text(
        item.quantity.toString(),
        columnPositions[1],
        currentY + 10,
        { width: columnConfig[1].width * contentWidth - 15, align: 'right' }
      );
      
      // Egységár
      const currency = project.financial?.currency || invoice.currency || 'EUR';
      doc.text(
        `${item.unitPrice} ${currency}`,
        columnPositions[2],
        currentY + 10,
        { width: columnConfig[2].width * contentWidth - 15, align: 'right' }
      );
      
      // Összeg
      doc.text(
        `${item.total} ${currency}`,
        columnPositions[3],
        currentY + 10,
        { width: columnConfig[3].width * contentWidth - 15, align: 'right' }
      );
      
      // Léptetések
      currentY += rowHeight;
      alternateRow = !alternateRow;
    }
    
    // Ha nincsenek tételek, jelezzük
    if (invoice.items.length === 0) {
      doc.fillColor(colors.lightText)
         .fontSize(11)
         .font('Helvetica-Oblique')
         .text(
           'Nincsenek tételek a számlán',
           margin.left + 10,
           currentY + 15,
           { align: 'center', width: contentWidth - 20 }
         );
      
      currentY += 40;
    }
    
    // ===== VÉGÖSSZEG TÁBLÁZAT =====
    // Előtte kis távolság
    currentY += 20;
    
    // Oldaltörés ellenőrzés
    if (currentY + 80 > doc.page.height - margin.bottom) {
      doc.addPage();
      pageNum++;
      renderHeader();
      renderFooter(pageNum);
      currentY = 140;
    }
    
    // Jobb oldali végösszeg blokk
    const summaryWidth = 250;
    const summaryX = doc.page.width - margin.right - summaryWidth;
    
    // Vonal a végösszeg fölött
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(summaryX, currentY)
       .lineTo(doc.page.width - margin.right, currentY)
       .stroke();
    
    currentY += 10;
    
    // Végösszeg háttér
    doc.roundedRect(summaryX, currentY, summaryWidth, 40, 3)
       .fillColor(colors.primary)
       .fill();
       
    // Végösszeg szöveg
    doc.fillColor('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Végösszeg:', summaryX + 20, currentY + 12)
       .text(
         `${invoice.totalAmount} ${currency}`,
         summaryX + 20,
         currentY + 12,
         { width: summaryWidth - 40, align: 'right' }
       );
    
    currentY += 50;
    
    // Fizetett összeg (ha van)
    if (invoice.paidAmount > 0) {
      doc.roundedRect(summaryX, currentY, summaryWidth, 30, 3)
         .fillColor(invoice.status === 'fizetett' ? colors.success : colors.background)
         .fill();
         
      doc.fillColor(invoice.status === 'fizetett' ? 'white' : colors.text)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Fizetve:', summaryX + 20, currentY + 8)
         .text(
           `${invoice.paidAmount} ${currency}`,
           summaryX + 20,
           currentY + 8,
           { width: summaryWidth - 40, align: 'right' }
         );
         
      currentY += 40;
      
      // Ha maradt hátralék
      if (invoice.totalAmount > invoice.paidAmount) {
        doc.roundedRect(summaryX, currentY, summaryWidth, 30, 3)
           .fillColor(colors.warning)
           .fill();
           
        doc.fillColor('white')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('Fennmaradó összeg:', summaryX + 20, currentY + 8)
           .text(
             `${invoice.totalAmount - invoice.paidAmount} ${currency}`,
             summaryX + 20,
             currentY + 8,
             { width: summaryWidth - 40, align: 'right' }
           );
           
        currentY += 40;
      }
    }
    
    // ===== FIZETÉSI INFORMÁCIÓK =====
    // Oldaltörés ellenőrzés
    if (currentY + 120 > doc.page.height - margin.bottom) {
      doc.addPage();
      pageNum++;
      renderHeader();
      renderFooter(pageNum);
      currentY = 140;
    } else {
      currentY += 30;
    }
    
    // Csak kiállított vagy késedelmes számlánál
    if (invoice.status !== 'fizetett' && invoice.status !== 'törölt') {
      // Fizetési információk fejléc
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.secondary)
         .text('Fizetési információk', margin.left, currentY);
         
      currentY += 25;
      
      // Fizetési információk doboz
      doc.roundedRect(margin.left, currentY, contentWidth, 120, 3)
         .fillColor(colors.background)
         .fill()
         .strokeColor(colors.border)
         .lineWidth(0.5)
         .stroke();
         
      // Banki adatok
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text('Banki átutalás:', margin.left + 20, currentY + 15)
         .moveDown(0.3);
         
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.text)
         .text('Név: Bartus Norbert')
         .text('IBAN: DE47 6634 0014 0743 4638 00')
         .text('SWIFT/BIC: COBADEFFXXX')
         .text('Bank: Commerzbank AG')
         .moveDown(0.3)
         .font('Helvetica-Bold')
         .text(`Közlemény: ${invoice.number}`)
         .font('Helvetica');
         
      // Záradék
      doc.fontSize(10)
         .fillColor(colors.lightText)
         .text('A számla teljesítését elektronikusan igazoljuk. Köszönjük, hogy határidőre fizetnek.', margin.left + 20, currentY + 95);
    }
    
    // ===== JEGYZETEK (ha van) =====
    if (invoice.notes && invoice.notes.trim().length > 0) {
      // Oldaltörés ellenőrzés
      const notesHeight = Math.min(100, Math.max(30, Math.ceil(invoice.notes.length / 80) * 20));
      
      if (currentY + notesHeight + 50 > doc.page.height - margin.bottom) {
        doc.addPage();
        pageNum++;
        renderHeader();
        renderFooter(pageNum);
        currentY = 140;
      } else {
        currentY += 160;
      }
      
      // Jegyzetek fejléc
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(colors.secondary)
         .text('Megjegyzések', margin.left, currentY);
         
      currentY += 25;
      
      // Jegyzetek doboz
      doc.roundedRect(margin.left, currentY, contentWidth, notesHeight, 3)
         .fillColor(colors.background)
         .fill()
         .strokeColor(colors.border)
         .lineWidth(0.5)
         .stroke();
         
      // Jegyzetek szöveg
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.text)
         .text(invoice.notes, margin.left + 20, currentY + 15, {
           width: contentWidth - 40,
           align: 'left'
         });
    }
    
    // ===== FIZETETT PECSÉT (ha fizetett) =====
    if (invoice.status === 'fizetett') {
      // Nagy átlós "FIZETVE" pecsét
      doc.save()
         .rotate(30, { origin: [400, 450] })
         .rect(300, 400, 200, 100)
         .fillOpacity(0.8)
         .fillColor(colors.success)
         .fill()
         .fillOpacity(1)
         .fontSize(40)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text('FIZETVE', 330, 430, { align: 'center' })
         .restore();
    }
    
    // Lábléc az első oldalon
    renderFooter(pageNum);
    
    // PDF lezárása
    doc.end();
    
  } catch (error) {
    console.error('Hiba a PDF generálásánál:', error);
    throw error;
  }
};
