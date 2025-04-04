// API és alkalmazás konfigurációs beállítások

// API alap URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_URL = 'https://admin.nb-studio.net:5001/api';
export const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

// Alapértelmezett nyelv
export const DEFAULT_LANGUAGE = 'hu';

// Támogatott nyelvek
export const SUPPORTED_LANGUAGES = ['hu', 'en', 'de'];

// Alapértelmezett pénznem
export const DEFAULT_CURRENCY = 'EUR';

// Egyéb alkalmazás beállítások
export const APP_CONFIG = {
  appName: 'NB Studio',
  companyName: 'NB Studio',
  companyTaxId: '12345678-1-42',
  companyAddress: '1234 Budapest, Példa utca 1.',
  companyEmail: 'info@nb-studio.net',
  companyPhone: '+36 30 123 4567',
  bankAccount: 'DE47 6634 0014 0743 4638 00',
  swift: 'COBADEFFXXX'
};