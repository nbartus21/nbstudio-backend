// invoiceService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

// PDF letöltés a szerverről API végponton keresztül
export const downloadInvoicePDF = async (projectId, invoiceId) => {
  try {
    // Axios kérés bináris adattal (blob)
    const response = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/invoices/${invoiceId}/pdf`, 
      { responseType: 'blob' }
    );
    
    // Fájlnév lekérése a Content-Disposition header-ből
    let filename = `szamla-${invoiceId}.pdf`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
        // Ellenőrizzük, hogy van-e .pdf kiterjesztés
        if (!filename.toLowerCase().endsWith('.pdf')) {
          filename += '.pdf';
        }
      }
    }
    
    // Blob URL létrehozása
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    // Letöltés indítása
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Blob URL felszabadítása
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Hiba a számla PDF letöltése során:', error);
    throw new Error('Nem sikerült letölteni a számlát PDF formátumban.');
  }
};