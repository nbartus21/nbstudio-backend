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
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
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
  return new Date(dateString).toLocaleDateString('hu-HU');
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
  console.log(`[DEBUG:${prefix}]`, ...args);
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