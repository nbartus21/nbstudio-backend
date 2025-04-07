import React, { useState, useEffect } from 'react';
import {
  User, X, Mail, Phone, Building, Save, AtSign,
  MapPin, Globe, CreditCard, Loader, FileText
} from 'lucide-react';
import { debugLog } from './shared/utils';

// API URL és key - ugyanazok mint a többi komponensben
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

// --- Az API URL helyes végpontjai ---
const API_ENDPOINTS = {
  // Több végpontot is megpróbálunk, a fő végpont: /public/projects/verify-pin
  verifyPin: [
    '/public/projects/verify-pin',      // Elsődleges végpont
    '/verify-pin',                      // Másodlagos végpont
    '/api/verify-pin',                  // Harmadlagos végpont
    '/api/public/projects/verify-pin'   // Negyedleges végpont (ez duplázódás, de megpróbáljuk)
  ]
};

// Translation data for all UI elements
const translations = {
  en: {
    editProfile: "Edit Profile",
    personalInfo: "Personal Information",
    name: "Name",
    namePlaceholder: "Enter your name",
    email: "Email address",
    emailPlaceholder: "your.email@example.com",
    phone: "Phone number",
    phonePlaceholder: "+1 123 456 7890",
    language: "Preferred language",
    languages: {
      en: "English",
      de: "German",
      hu: "Hungarian"
    },
    companyInfo: "Company Information",
    companyName: "Company name",
    companyNamePlaceholder: "Enter company name",
    taxNumber: "Tax number",
    taxNumberPlaceholder: "Enter tax number",
    euVatNumber: "EU VAT number",
    euVatNumberPlaceholder: "Enter EU VAT number",
    registrationNumber: "Registration number",
    registrationNumberPlaceholder: "Enter registration number",
    address: "Address",
    country: "Country",
    countryPlaceholder: "Select your country",
    postalCode: "Postal code",
    postalCodePlaceholder: "Enter postal code",
    city: "City",
    cityPlaceholder: "Enter city",
    street: "Street",
    streetPlaceholder: "Enter street and number",
    buttons: {
      cancel: "Cancel",
      save: "Save Changes",
      saving: "Saving..."
    },
    validation: {
      nameRequired: "Name is required",
      emailRequired: "Email is required",
      emailInvalid: "Please enter a valid email address",
      phoneInvalid: "Please enter a valid phone number",
      changesSaved: "Your profile has been updated successfully!",
      errorSaving: "An error occurred while saving your profile."
    }
  },
  de: {
    editProfile: "Profil bearbeiten",
    personalInfo: "Persönliche Informationen",
    name: "Name",
    namePlaceholder: "Geben Sie Ihren Namen ein",
    email: "E-Mail-Adresse",
    emailPlaceholder: "ihre.email@beispiel.com",
    phone: "Telefonnummer",
    phonePlaceholder: "+49 123 456 7890",
    language: "Bevorzugte Sprache",
    languages: {
      en: "Englisch",
      de: "Deutsch",
      hu: "Ungarisch"
    },
    companyInfo: "Unternehmensinformationen",
    companyName: "Unternehmensname",
    companyNamePlaceholder: "Geben Sie den Firmennamen ein",
    taxNumber: "Steuernummer",
    taxNumberPlaceholder: "Geben Sie die Steuernummer ein",
    euVatNumber: "EU-Umsatzsteuer-Identifikationsnummer",
    euVatNumberPlaceholder: "Geben Sie die EU-USt-IdNr. ein",
    registrationNumber: "Handelsregisternummer",
    registrationNumberPlaceholder: "Geben Sie die Handelsregisternummer ein",
    address: "Adresse",
    country: "Land",
    countryPlaceholder: "Wählen Sie Ihr Land",
    postalCode: "Postleitzahl",
    postalCodePlaceholder: "Geben Sie die Postleitzahl ein",
    city: "Stadt",
    cityPlaceholder: "Geben Sie die Stadt ein",
    street: "Straße",
    streetPlaceholder: "Geben Sie Straße und Hausnummer ein",
    buttons: {
      cancel: "Abbrechen",
      save: "Änderungen speichern",
      saving: "Speichern..."
    },
    validation: {
      nameRequired: "Name ist erforderlich",
      emailRequired: "E-Mail ist erforderlich",
      emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
      phoneInvalid: "Bitte geben Sie eine gültige Telefonnummer ein",
      changesSaved: "Ihr Profil wurde erfolgreich aktualisiert!",
      errorSaving: "Beim Speichern Ihres Profils ist ein Fehler aufgetreten."
    }
  },
  hu: {
    editProfile: "Profil szerkesztése",
    personalInfo: "Személyes adatok",
    name: "Név",
    namePlaceholder: "Adja meg a nevét",
    email: "E-mail cím",
    emailPlaceholder: "email@pelda.hu",
    phone: "Telefonszám",
    phonePlaceholder: "+36 30 123 4567",
    language: "Preferált nyelv",
    languages: {
      en: "Angol",
      de: "Német",
      hu: "Magyar"
    },
    companyInfo: "Cég adatok",
    companyName: "Cégnév",
    companyNamePlaceholder: "Adja meg a cégnevet",
    taxNumber: "Adószám",
    taxNumberPlaceholder: "Adja meg az adószámot",
    euVatNumber: "EU adószám",
    euVatNumberPlaceholder: "Adja meg az EU adószámot",
    registrationNumber: "Cégjegyzékszám",
    registrationNumberPlaceholder: "Adja meg a cégjegyzékszámot",
    address: "Cím",
    country: "Ország",
    countryPlaceholder: "Válassza ki az országot",
    postalCode: "Irányítószám",
    postalCodePlaceholder: "Adja meg az irányítószámot",
    city: "Város",
    cityPlaceholder: "Adja meg a várost",
    street: "Utca",
    streetPlaceholder: "Adja meg az utcát és házszámot",
    buttons: {
      cancel: "Mégse",
      save: "Mentés",
      saving: "Mentés..."
    },
    validation: {
      nameRequired: "A név megadása kötelező",
      emailRequired: "Az e-mail cím megadása kötelező",
      emailInvalid: "Kérjük, adjon meg egy érvényes e-mail címet",
      phoneInvalid: "Kérjük, adjon meg egy érvényes telefonszámot",
      changesSaved: "A profil sikeresen frissítve!",
      errorSaving: "Hiba történt a profil mentése során."
    }
  }
};

// A list of countries for the dropdown
const countries = [
  { code: 'AT', name: { en: 'Austria', de: 'Österreich', hu: 'Ausztria' } },
  { code: 'DE', name: { en: 'Germany', de: 'Deutschland', hu: 'Németország' } },
  { code: 'HU', name: { en: 'Hungary', de: 'Ungarn', hu: 'Magyarország' } },
  { code: 'UK', name: { en: 'United Kingdom', de: 'Vereinigtes Königreich', hu: 'Egyesült Királyság' } },
  { code: 'US', name: { en: 'United States', de: 'Vereinigte Staaten', hu: 'Egyesült Államok' } }
];

const ProfileEditModal = ({
  user,
  project,
  onClose,
  onSave,
  showSuccessMessage,
  showErrorMessage,
  language = 'hu',
  onLanguageChange = null
}) => {
  const t = translations[language] || translations.hu;

  // Initialize form state with user data or empty values
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    preferredLanguage: user?.preferredLanguage || language,
    companyName: user?.companyName || '',
    taxNumber: user?.taxNumber || '',
    euVatNumber: user?.euVatNumber || '',
    registrationNumber: user?.registrationNumber || '',
    country: user?.address?.country || '',
    postalCode: user?.address?.postalCode || '',
    city: user?.address?.city || '',
    street: user?.address?.street || ''
  });

  // Form validation errors
  const [errors, setErrors] = useState({});
  // Loading state for save button
  const [isSaving, setIsSaving] = useState(false);

  // Set initial form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || language,
        companyName: user.companyName || '',
        taxNumber: user.taxNumber || '',
        euVatNumber: user.euVatNumber || '',
        registrationNumber: user.registrationNumber || '',
        country: user.address?.country || '',
        postalCode: user.address?.postalCode || '',
        city: user.address?.city || '',
        street: user.address?.street || ''
      });
    }
  }, [user, language]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for the field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle language selection
  const handleLanguageChange = (lang) => {
    setFormData(prev => ({
      ...prev,
      preferredLanguage: lang
    }));
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};

    // Basic validation rules
    if (!formData.name.trim()) {
      newErrors.name = t.validation.nameRequired;
    }

    if (!formData.email.trim()) {
      newErrors.email = t.validation.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t.validation.emailInvalid;
    }

    if (formData.phone && !/^[+]?[\d() -]{8,20}$/.test(formData.phone)) {
      newErrors.phone = t.validation.phoneInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission with API call
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    debugLog('ProfileEditModal-submit', 'Saving profile data to API');

    try {
      // Format the data for saving
      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        preferredLanguage: formData.preferredLanguage,
        companyName: formData.companyName,
        taxNumber: formData.taxNumber,
        euVatNumber: formData.euVatNumber,
        registrationNumber: formData.registrationNumber,
        address: {
          country: formData.country,
          postalCode: formData.postalCode,
          city: formData.city,
          street: formData.street
        }
      };

      // Adatbázisba mentés sikeres volt-e?
      let savedToDB = false;

      // 1. Frissítsük a projekt kliens adatait az API-n keresztül
      if (project && project._id) {
        const projectId = project._id;
        debugLog('ProfileEditModal-submit', 'Projekt azonosító:', projectId);

        // Egyszerűsített adat struktúra a projekt frissítéshez
        const simplifiedProjectData = {
          client: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            companyName: formData.companyName,
            taxNumber: formData.taxNumber,
            euVatNumber: formData.euVatNumber,
            registrationNumber: formData.registrationNumber,
            address: {
              country: formData.country,
              postalCode: formData.postalCode,
              city: formData.city,
              street: formData.street
            }
          }
        };

        // 1.1 Először próbáljuk meg a közvetlen PUT kérést a projekt frissítésére
        try {
          debugLog('ProfileEditModal-submit', `Közvetlen projekt frissítés a /projects/${projectId} végponton`);

          const directProjectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify(simplifiedProjectData),
            credentials: 'omit' // Egyszerűsítés: nincs szükség süti küldésre
          });

          debugLog('ProfileEditModal-submit', 'Közvetlen projekt frissítés válasz státusz:', directProjectResponse.status);

          if (directProjectResponse.ok) {
            debugLog('ProfileEditModal-submit', 'MongoDB mentés sikeres!');
            savedToDB = true;

            try {
              const responseData = await directProjectResponse.json();
              debugLog('ProfileEditModal-submit', 'Szerver válasz:', responseData);
            } catch (parseError) {
              debugLog('ProfileEditModal-submit', 'Válasz feldolgozási hiba:', parseError);
            }
          } else {
            debugLog('ProfileEditModal-submit', 'Közvetlen projekt frissítés hiba:', {
              status: directProjectResponse.status,
              statusText: directProjectResponse.statusText
            });

            // 1.2 Ha a közvetlen frissítés nem sikerült, próbáljuk meg a verify-pin végpontot
            debugLog('ProfileEditModal-submit', 'Próbálkozás a verify-pin végponttal');

            // Próbáljuk meg kinyerni a token-t és PIN-t a localStorage-ból
            let token = null;
            let pin = null;

            // Keressük meg a megfelelő session-t a localStorage-ban
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('project_session_')) {
                try {
                  const sessionData = JSON.parse(localStorage.getItem(key));
                  if (sessionData && sessionData.project && sessionData.project._id === projectId) {
                    token = key.replace('project_session_', '');
                    pin = sessionData.pin;
                    break;
                  }
                } catch (e) {
                  console.error('Session parse error:', e);
                }
              }
            }

            if (token) {
              debugLog('ProfileEditModal-submit', 'Token megtalálva a localStorage-ban:', token);

              // Próbáljuk meg kinyerni a PIN kódot a localStorage-ból
              let savedPin = '';
              try {
                const sessionData = JSON.parse(localStorage.getItem(`project_session_${token}`));
                if (sessionData && sessionData.pin) {
                  savedPin = sessionData.pin;
                  debugLog('ProfileEditModal-submit', 'PIN kód megtalálva a localStorage-ban');
                }
              } catch (e) {
                console.error('Session parse error:', e);
              }

              // Készítsünk egy updateProject objektumot a verify-pin végponthoz
              const updateProjectData = {
                token: token,
                pin: savedPin || pin || '',
                updateProject: simplifiedProjectData
              };

              // Próbáljuk meg a verify-pin végpontot
              try {
                const verifyPinResponse = await fetch(`${API_URL}/public/projects/verify-pin`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                  },
                  body: JSON.stringify(updateProjectData),
                  credentials: 'omit'
                });

                debugLog('ProfileEditModal-submit', 'Verify-pin válasz státusz:', verifyPinResponse.status);

                if (verifyPinResponse.ok) {
                  debugLog('ProfileEditModal-submit', 'Verify-pin frissítés sikeres!');
                  savedToDB = true;

                  try {
                    const responseData = await verifyPinResponse.json();
                    debugLog('ProfileEditModal-submit', 'Verify-pin válasz:', responseData);
                  } catch (parseError) {
                    debugLog('ProfileEditModal-submit', 'Verify-pin válasz feldolgozási hiba:', parseError);
                  }
                } else {
                  debugLog('ProfileEditModal-submit', 'Verify-pin frissítés hiba:', {
                    status: verifyPinResponse.status,
                    statusText: verifyPinResponse.statusText
                  });
                }
              } catch (verifyPinError) {
                debugLog('ProfileEditModal-submit', 'Hálózati hiba a verify-pin során:', verifyPinError);
              }
            } else {
              debugLog('ProfileEditModal-submit', 'Nem található token a localStorage-ban');
            }
          }
        } catch (directError) {
          debugLog('ProfileEditModal-submit', 'Hálózati hiba a projekt frissítése során:', directError);
        }
      }

      // 2. Helyi frissítések, akár sikeres volt a szerveroldali mentés, akár nem

      // Ha van language change callback és változott a nyelv, frissítsük
      if (onLanguageChange && formData.preferredLanguage !== language) {
        onLanguageChange(formData.preferredLanguage);
      }

      // Lokális callback a szülő komponensnek - mindig frissítjük a helyi adatokat
      if (onSave) {
        onSave(updatedUser);
      }

      // 3. Sikeres üzenet és modal bezárása
      if (showSuccessMessage) {
        if (savedToDB) {
          // Ha sikerült a MongoDB mentés
          showSuccessMessage(t.validation.changesSaved);
        } else if (project && project._id) {
          // Ha volt projekt ID, de nem sikerült a MongoDB mentés
          showSuccessMessage(t.validation.changesSaved + " (Helyi mentés - adatbázis frissítés sikertelen)");
        } else {
          // Ha nem volt projekt ID
          showSuccessMessage(t.validation.changesSaved + " (Helyi mentés)");
        }
      }

      // Modal bezárása késleltetéssel
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      debugLog('ProfileEditModal-submit', 'Error saving profile', error);
      if (showErrorMessage) {
        showErrorMessage(t.validation.errorSaving + " - " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-medium flex items-center">
            <User className="h-5 w-5 mr-2 text-gray-500" />
            {t.editProfile}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Személyes adatok */}
              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-4">{t.personalInfo}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.name} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`pl-10 block w-full border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder={t.namePlaceholder}
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.email} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <AtSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`pl-10 block w-full border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder={t.emailPlaceholder}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.phone}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`pl-10 block w-full border ${errors.phone ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder={t.phonePlaceholder}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.language}
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('hu')}
                        className={`px-3 py-2 text-sm rounded-md ${
                          formData.preferredLanguage === 'hu'
                            ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t.languages.hu}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('de')}
                        className={`px-3 py-2 text-sm rounded-md ${
                          formData.preferredLanguage === 'de'
                            ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t.languages.de}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('en')}
                        className={`px-3 py-2 text-sm rounded-md ${
                          formData.preferredLanguage === 'en'
                            ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t.languages.en}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cég adatok */}
              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-4">{t.companyInfo}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.companyName}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t.companyNamePlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.taxNumber}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="taxNumber"
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t.taxNumberPlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="euVatNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.euVatNumber}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="euVatNumber"
                        name="euVatNumber"
                        value={formData.euVatNumber}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t.euVatNumberPlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.registrationNumber}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="registrationNumber"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t.registrationNumberPlaceholder}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cím adatok */}
              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-4">{t.address}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.country}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">{t.countryPlaceholder}</option>
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name[language] || country.name.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.postalCode}
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={t.postalCodePlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.city}
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={t.cityPlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.street}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t.streetPlaceholder}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSaving}
          >
            {t.buttons.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
          >
            {isSaving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t.buttons.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t.buttons.save}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;