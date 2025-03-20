import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import HostingPackagesDisplay from './HostingPackagesDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net:5001/api';

const WebhostingOrder = ({ language = 'en' }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client: {
      name: '',
      email: '',
      phone: '',
      company: '',
      vatNumber: '',
      address: {
        street: '',
        city: '',
        postcode: '',
        country: language === 'de' ? 'DE' : language === 'hu' ? 'HU' : 'EN'
      }
    },
    service: {
      domainName: '',
      domainType: 'new'
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  // Handle package selection
  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setStep(2);
    window.scrollTo(0, 0);
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle address field changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      client: {
        ...prev.client,
        address: {
          ...prev.client.address,
          [name]: value
        }
      }
    }));
  };
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Client validation
    if (!formData.client.name.trim()) newErrors['client.name'] = true;
    if (!formData.client.email.trim()) newErrors['client.email'] = true;
    if (!/^\S+@\S+\.\S+$/.test(formData.client.email)) newErrors['client.email'] = true;
    if (!formData.client.phone.trim()) newErrors['client.phone'] = true;
    
    // Address validation
    if (!formData.client.address.street.trim()) newErrors['address.street'] = true;
    if (!formData.client.address.city.trim()) newErrors['address.city'] = true;
    if (!formData.client.address.postcode.trim()) newErrors['address.postcode'] = true;
    
    // Service validation
    if (!formData.service.domainName.trim()) newErrors['service.domainName'] = true;
    
    // Domain name validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(formData.service.domainName)) {
      newErrors['service.domainName'] = true;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the order object
      const orderData = {
        client: formData.client,
        plan: {
          type: selectedPackage.type,
          name: selectedPackage.name,
          billing: selectedPackage.selectedBilling,
          price: selectedPackage.price,
          storage: selectedPackage.resources.storage,
          bandwidth: selectedPackage.resources.bandwidth,
          domains: selectedPackage.resources.domains,
          databases: selectedPackage.resources.databases,
          accounts: selectedPackage.resources.accounts
        },
        service: formData.service,
        status: 'new',
        payment: {
          status: 'pending'
        }
      };
      
      // Send the order to the API
      const response = await api.post(`${API_URL}/public/hosting/orders`, orderData);
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      const data = await response.json();
      setOrderData(data);
      setOrderComplete(true);
      setStep(3);
      window.scrollTo(0, 0);
      
    } catch (error) {
      console.error('Error creating hosting order:', error);
      alert('There was an error processing your order. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Back to packages
  const handleBackToPackages = () => {
    setSelectedPackage(null);
    setStep(1);
    window.scrollTo(0, 0);
  };
  
  // Reset form
  const handleResetForm = () => {
    setSelectedPackage(null);
    setStep(1);
    setFormData({
      client: {
        name: '',
        email: '',
        phone: '',
        company: '',
        vatNumber: '',
        address: {
          street: '',
          city: '',
          postcode: '',
          country: language === 'de' ? 'DE' : language === 'hu' ? 'HU' : 'EN'
        }
      },
      service: {
        domainName: '',
        domainType: 'new'
      }
    });
    setErrors({});
    setOrderComplete(false);
    setOrderData(null);
    window.scrollTo(0, 0);
  };
  
  // Translations
  const translations = {
    steps: {
      1: {
        en: 'Select Package',
        de: 'Paket auswählen',
        hu: 'Csomag kiválasztása'
      },
      2: {
        en: 'Your Information',
        de: 'Ihre Informationen',
        hu: 'Adatok megadása'
      },
      3: {
        en: 'Order Complete',
        de: 'Bestellung abgeschlossen',
        hu: 'Rendelés teljesítve'
      }
    },
    formLabels: {
      personalInfo: {
        en: 'Personal Information',
        de: 'Persönliche Informationen',
        hu: 'Személyes adatok'
      },
      name: {
        en: 'Full Name',
        de: 'Vollständiger Name',
        hu: 'Teljes név'
      },
      email: {
        en: 'Email Address',
        de: 'E-Mail-Adresse',
        hu: 'Email cím'
      },
      phone: {
        en: 'Phone Number',
        de: 'Telefonnummer',
        hu: 'Telefonszám'
      },
      company: {
        en: 'Company Name (Optional)',
        de: 'Firmenname (Optional)',
        hu: 'Cégnév (Opcionális)'
      },
      vatNumber: {
        en: 'VAT Number (Optional)',
        de: 'Umsatzsteuer-ID (Optional)',
        hu: 'Adószám (Opcionális)'
      },
      address: {
        en: 'Address',
        de: 'Adresse',
        hu: 'Cím'
      },
      street: {
        en: 'Street Address',
        de: 'Straße',
        hu: 'Utca, házszám'
      },
      city: {
        en: 'City',
        de: 'Stadt',
        hu: 'Város'
      },
      postcode: {
        en: 'Postal Code',
        de: 'Postleitzahl',
        hu: 'Irányítószám'
      },
      country: {
        en: 'Country',
        de: 'Land',
        hu: 'Ország'
      },
      domainInfo: {
        en: 'Domain Information',
        de: 'Domain-Informationen',
        hu: 'Domain adatok'
      },
      domainName: {
        en: 'Domain Name',
        de: 'Domainname',
        hu: 'Domain név'
      },
      domainExample: {
        en: 'e.g. yourdomain.com',
        de: 'z.B. ihredomain.de',
        hu: 'pl. tedomained.hu'
      },
      domainType: {
        en: 'Domain Type',
        de: 'Domain-Typ',
        hu: 'Domain típus'
      },
      newDomain: {
        en: 'Register a new domain',
        de: 'Neue Domain registrieren',
        hu: 'Új domain regisztrálása'
      },
      transferDomain: {
        en: 'Transfer an existing domain',
        de: 'Bestehende Domain übertragen',
        hu: 'Meglévő domain áthozása'
      }
    },
    packageInfo: {
      en: 'Selected Package',
      de: 'Ausgewähltes Paket',
      hu: 'Kiválasztott csomag'
    },
    billing: {
      monthly: {
        en: 'Monthly',
        de: 'Monatlich',
        hu: 'Havi'
      },
      annual: {
        en: 'Annual',
        de: 'Jährlich',
        hu: 'Éves'
      }
    },
    buttons: {
      back: {
        en: 'Back to Packages',
        de: 'Zurück zu den Paketen',
        hu: 'Vissza a csomagokhoz'
      },
      submit: {
        en: 'Submit Order',
        de: 'Bestellung absenden',
        hu: 'Rendelés elküldése'
      },
      processing: {
        en: 'Processing...',
        de: 'Verarbeitung...',
        hu: 'Feldolgozás...'
      },
      newOrder: {
        en: 'Place Another Order',
        de: 'Neue Bestellung aufgeben',
        hu: 'Új rendelés feladása'
      }
    },
    success: {
      title: {
        en: 'Order Successfully Submitted!',
        de: 'Bestellung erfolgreich aufgegeben!',
        hu: 'Rendelés sikeresen leadva!'
      },
      message: {
        en: 'Thank you for your order. We have received your hosting package request and will process it shortly.',
        de: 'Vielen Dank für Ihre Bestellung. Wir haben Ihre Hosting-Paketanfrage erhalten und werden sie in Kürze bearbeiten.',
        hu: 'Köszönjük a rendelését. Megkaptuk a tárhely csomag kérését és hamarosan feldolgozzuk.'
      },
      orderNumber: {
        en: 'Order Reference:',
        de: 'Bestellnummer:',
        hu: 'Rendelési azonosító:'
      },
      nextSteps: {
        en: 'Next Steps:',
        de: 'Nächste Schritte:',
        hu: 'Következő lépések:'
      },
      step1: {
        en: 'You will receive a confirmation email shortly.',
        de: 'Sie erhalten in Kürze eine Bestätigungs-E-Mail.',
        hu: 'Hamarosan kap egy megerősítő emailt.'
      },
      step2: {
        en: 'Our team will review your order and contact you if additional information is needed.',
        de: 'Unser Team wird Ihre Bestellung prüfen und Sie kontaktieren, wenn zusätzliche Informationen benötigt werden.',
        hu: 'Csapatunk átnézi a rendelését és kapcsolatba lép Önnel, ha további információra van szükség.'
      },
      step3: {
        en: 'Once the order is processed, you will receive login details for your hosting account.',
        de: 'Sobald die Bestellung bearbeitet wurde, erhalten Sie die Anmeldedaten für Ihr Hosting-Konto.',
        hu: 'Amint a rendelést feldolgoztuk, megkapja a belépési adatokat a tárhely fiókjához.'
      }
    },
    validation: {
      required: {
        en: 'This field is required',
        de: 'Dieses Feld ist erforderlich',
        hu: 'Ez a mező kötelező'
      },
      email: {
        en: 'Please enter a valid email address',
        de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
        hu: 'Kérjük adjon meg egy érvényes email címet'
      },
      domain: {
        en: 'Please enter a valid domain name',
        de: 'Bitte geben Sie einen gültigen Domainnamen ein',
        hu: 'Kérjük adjon meg egy érvényes domain nevet'
      }
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-10">
        <div className="flex justify-between items-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {i < step ? '✓' : i}
              </div>
              <div className={`mt-2 ${
                i <= step ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {translations.steps[i][language]}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-2 flex justify-between">
          <div className={`h-1 w-full ${step > 1 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          <div className={`h-1 w-full ${step > 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
        </div>
      </div>
      
      {/* Step 1: Package Selection */}
      {step === 1 && (
        <HostingPackagesDisplay 
          language={language} 
          onSelectPackage={handleSelectPackage} 
        />
      )}
      
      {/* Step 2: Customer Information */}
      {step === 2 && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-4 bg-blue-600 text-white">
              <h2 className="text-xl font-bold">{translations.packageInfo[language]}</h2>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{selectedPackage.name}</h3>
                  <p className="text-gray-600">
                    {selectedPackage.type === 'reseller' 
                      ? translations.formLabels.domainType.transferDomain[language] 
                      : translations.formLabels.domainType.newDomain[language]}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'hu-HU', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(selectedPackage.price)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {translations.billing[selectedPackage.selectedBilling][language]}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Personal Information */}
            <div className="p-4 bg-blue-600 text-white">
              <h2 className="text-xl font-bold">{translations.formLabels.personalInfo[language]}</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.name[language]}*
                </label>
                <input
                  type="text"
                  name="client.name"
                  value={formData.client.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['client.name'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['client.name'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.required[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.email[language]}*
                </label>
                <input
                  type="email"
                  name="client.email"
                  value={formData.client.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['client.email'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['client.email'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.email[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.phone[language]}*
                </label>
                <input
                  type="tel"
                  name="client.phone"
                  value={formData.client.phone}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['client.phone'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['client.phone'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.required[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.company[language]}
                </label>
                <input
                  type="text"
                  name="client.company"
                  value={formData.client.company}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.vatNumber[language]}
                </label>
                <input
                  type="text"
                  name="client.vatNumber"
                  value={formData.client.vatNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Address Information */}
            <div className="p-4 bg-blue-50 border-t border-b border-blue-100">
              <h3 className="font-medium text-blue-800">{translations.formLabels.address[language]}</h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.street[language]}*
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.client.address.street}
                  onChange={handleAddressChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['address.street'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['address.street'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.required[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.city[language]}*
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.client.address.city}
                  onChange={handleAddressChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['address.city'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['address.city'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.required[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.postcode[language]}*
                </label>
                <input
                  type="text"
                  name="postcode"
                  value={formData.client.address.postcode}
                  onChange={handleAddressChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['address.postcode'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['address.postcode'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.required[language]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.country[language]}
                </label>
                <select
                  name="country"
                  value={formData.client.address.country}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DE">Deutschland</option>
                  <option value="HU">Magyarország</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                </select>
              </div>
            </div>
            
            {/* Domain Information */}
            <div className="p-4 bg-blue-50 border-t border-b border-blue-100">
              <h3 className="font-medium text-blue-800">{translations.formLabels.domainInfo[language]}</h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {translations.formLabels.domainName[language]}*
                </label>
                <input
                  type="text"
                  name="service.domainName"
                  value={formData.service.domainName}
                  onChange={handleChange}
                  placeholder={translations.formLabels.domainExample[language]}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors['service.domainName'] ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['service.domainName'] && (
                  <p className="mt-1 text-sm text-red-600">{translations.validation.domain[language]}</p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations.formLabels.domainType[language]}
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="service.domainType"
                      value="new"
                      checked={formData.service.domainType === 'new'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2">{translations.formLabels.newDomain[language]}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="service.domainType"
                      value="transfer"
                      checked={formData.service.domainType === 'transfer'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2">{translations.formLabels.transferDomain[language]}</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={handleBackToPackages}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {translations.buttons.back[language]}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    {translations.buttons.processing[language]}
                  </>
                ) : (
                  translations.buttons.submit[language]
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Step 3: Order Complete */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 bg-green-50 border-b border-green-100">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-800">
                {translations.success.title[language]}
              </h2>
              <p className="mt-2 text-gray-600">
                {translations.success.message[language]}
              </p>
            </div>
            
            <div className="p-6">
              {orderData && (
                <div className="mb-6 bg-blue-50 rounded-md p-4 inline-block">
                  <p className="text-blue-800 font-medium">
                    {translations.success.orderNumber[language]}{' '}
                    <span className="font-bold">{orderData.orderId}</span>
                  </p>
                </div>
              )}
              
              <div className="text-left mt-6">
                <h3 className="font-bold text-gray-800 mb-3">
                  {translations.success.nextSteps[language]}
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{translations.success.step1[language]}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{translations.success.step2[language]}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{translations.success.step3[language]}</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={handleResetForm}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {translations.buttons.newOrder[language]}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhostingOrder;