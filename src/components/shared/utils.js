// Közös segédfüggvények

// Biztonságos projektazonosító lekérdezés
export const getProjectId = (project) => {
  if (!project) return null;
  
  // Elsődlegesen az _id mezőt használjuk
  if (project._id) return project._id;
  
  // Ha nincs _id, de van id, azt használjuk
  if (project.id) return project.id;
  
  // Ha nincs azonosító, generáljunk egy egyedi ideiglenes azonosítót
  const tempId = `temp_${Date.now()}`;
  debugLog('getProjectId', 'Nincs projekt azonosító, ideiglenes generálva', { tempId });
  return tempId;
};

// Méret formázás emberi olvasható formára
export const formatFileSize = (bytes) => {
  try {
    // Ellenőrizzük, hogy érvényes-e a szám
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
      console.warn('Invalid file size:', bytes);
      return 'Ismeretlen méret';
    }
    
    // Konvertáljuk számmá
    const size = Number(bytes);
    
    if (size < 1024) return size + ' B';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else if (size < 1073741824) return (size / 1048576).toFixed(1) + ' MB';
    else return (size / 1073741824).toFixed(1) + ' GB';
  } catch (error) {
    console.error('File size formatting error:', error);
    return 'Hiba a méret formázásában';
  }
};

// Teljes dátum formázás
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Rövid dátum formázás
export const formatShortDate = (dateString) => {
  try {
    // Ellenőrizzük, hogy érvényes-e a dátum
    if (!dateString) return 'Ismeretlen dátum';
    
    const date = new Date(dateString);
    
    // Ellenőrizzük, hogy érvényes dátum-e
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return 'Érvénytelen dátum';
    }
    
    return date.toLocaleDateString('hu-HU');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Hiba a dátum formázásában';
  }
};

// Sikeres és hibás üzenetek kezelésének segédfüggvényei
export const showMessage = (setMessage, message, duration = 3000) => {
  setMessage(message);
  setTimeout(() => {
    setMessage('');
  }, duration);
};

// SEPA QR kód adat generálás
export const generateSepaQrData = (invoice) => {
  const amount = typeof invoice.totalAmount === 'number' 
    ? invoice.totalAmount.toFixed(2) 
    : '0.00';

  return [
    'BCD',                                    // Service Tag
    '002',                                    // Version
    '1',                                      // Encoding
    'SCT',                                    // SEPA Credit Transfer
    'COBADEFF371',                           // BIC
    'Norbert Bartus',                        // Beneficiary name
    'DE47663400180473463800',               // IBAN
    `EUR${amount}`,                          // Amount in EUR
    '',                                      // Customer ID (empty)
    invoice.number || '',                    // Invoice number
    `RECHNUNG ${invoice.number}`             // Reference
  ].join('\n');
};

// Debug segédfüggvény - konzolra írja az információkat egy egyedi prefixszel
export const debugLog = (prefix, ...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG:${prefix}][${timestamp}]`, ...args);
  
  // Ha az első argumentum hiba objektum, akkor stack trace-t is kiírunk
  if (args.length > 0 && args[0] instanceof Error) {
    console.error(`[DEBUG:${prefix}][${timestamp}] Error stack trace:`, args[0].stack);
  }
  
  // Ha az utolsó argumentumban objektum van, azt részletesen kiírjuk
  if (args.length > 0) {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'object' && lastArg !== null) {
      try {
        console.log(`[DEBUG:${prefix}][${timestamp}] Részletes objektum:`, JSON.stringify(lastArg, null, 2));
      } catch (e) {
        console.log(`[DEBUG:${prefix}][${timestamp}] Az objektum nem szerializálható:`, lastArg);
      }
    }
  }
};

// Projekt adatok betöltése localStorage-ből
export const loadFromLocalStorage = (project, key) => {
  try {
    // Projekt azonosító biztonságos lekérdezése
    const projectId = typeof project === 'object' ? getProjectId(project) : project;
    
    if (!projectId) {
      debugLog('loadFromLocalStorage', 'Nincs érvényes projektazonosító');
      return [];
    }
    
    debugLog('loadFromLocalStorage', `Betöltés: project_${projectId}_${key}`);
    const savedData = localStorage.getItem(`project_${projectId}_${key}`);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      debugLog('loadFromLocalStorage', 'Sikeres betöltés', parsedData);
      return parsedData;
    }
  } catch (error) {
    debugLog('loadFromLocalStorage', 'Hiba:', error);
  }
  return [];
};

// Projekt adatok mentése localStorage-be
export const saveToLocalStorage = (project, key, data) => {
  try {
    // Projekt azonosító biztonságos lekérdezése
    const projectId = typeof project === 'object' ? getProjectId(project) : project;
    
    if (!projectId) {
      debugLog('saveToLocalStorage', 'Nincs érvényes projektazonosító');
      return false;
    }
    
    debugLog('saveToLocalStorage', `Mentés: project_${projectId}_${key}`, data);
    localStorage.setItem(`project_${projectId}_${key}`, JSON.stringify(data));
    debugLog('saveToLocalStorage', 'Sikeres mentés');
    return true;
  } catch (error) {
    debugLog('saveToLocalStorage', 'Hiba:', error);
    return false;
  }
};