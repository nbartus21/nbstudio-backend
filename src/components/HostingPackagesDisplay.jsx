import React, { useState, useEffect } from 'react';
import { fetchPublicHostingPackages } from '../services/hostingPackageService';
import { Check, Server, Database, HardDrive, Globe } from 'lucide-react';

const HostingPackagesDisplay = ({ language = 'en', onSelectPackage }) => {
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [packageType, setPackageType] = useState('regular');
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Fetch data
  useEffect(() => {
    const getPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicHostingPackages();
        setPackages(data);
        
        // Initial filtering
        const filtered = data.filter(pkg => pkg.type === packageType);
        setFilteredPackages(filtered);
      } catch (err) {
        console.error('Error fetching hosting packages:', err);
        setError('Failed to load hosting packages');
      } finally {
        setLoading(false);
      }
    };

    getPackages();
  }, []);

  // Filter packages when type or billing cycle changes
  useEffect(() => {
    if (packages.length > 0) {
      const filtered = packages.filter(pkg => pkg.type === packageType);
      setFilteredPackages(filtered);
    }
  }, [packageType, packages]);

  // Get price based on billing cycle
  const getPrice = (pkg) => {
    return billingCycle === 'monthly' ? pkg.pricing.monthly : pkg.pricing.annual;
  };

  // Get price calculation description
  const getPriceDescription = (pkg) => {
    if (billingCycle === 'monthly') {
      return language === 'en' 
        ? 'per month' 
        : language === 'de' 
          ? 'pro Monat' 
          : 'havonta';
    } else {
      return language === 'en' 
        ? 'per year' 
        : language === 'de' 
          ? 'pro Jahr' 
          : 'évente';
    }
  };

  // Get features in the current language
  const getFeatures = (pkg) => {
    return pkg.features[language] || pkg.features.en || [];
  };

  // Currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'hu-HU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Translations for UI elements
  const translations = {
    title: {
      en: 'Web Hosting Packages',
      de: 'Webhosting-Pakete',
      hu: 'Webtárhely Csomagok'
    },
    packageTypes: {
      regular: {
        en: 'Regular Hosting',
        de: 'Reguläres Hosting',
        hu: 'Normál Tárhely'
      },
      reseller: {
        en: 'Reseller Hosting',
        de: 'Reseller-Hosting',
        hu: 'Viszonteladói Tárhely'
      }
    },
    billingCycles: {
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
    resources: {
      storage: {
        en: 'Storage',
        de: 'Speicher',
        hu: 'Tárhely'
      },
      bandwidth: {
        en: 'Bandwidth',
        de: 'Bandbreite',
        hu: 'Sávszélesség'
      },
      domains: {
        en: 'Domains',
        de: 'Domains',
        hu: 'Domainek'
      },
      databases: {
        en: 'Databases',
        de: 'Datenbanken',
        hu: 'Adatbázisok'
      },
      accounts: {
        en: 'Accounts',
        de: 'Konten',
        hu: 'Fiókok'
      }
    },
    selectButton: {
      en: 'Select Package',
      de: 'Paket auswählen',
      hu: 'Csomag választása'
    },
    loading: {
      en: 'Loading packages...',
      de: 'Pakete werden geladen...',
      hu: 'Csomagok betöltése...'
    },
    error: {
      en: 'Error loading packages',
      de: 'Fehler beim Laden der Pakete',
      hu: 'Hiba a csomagok betöltésekor'
    },
    noPackages: {
      en: 'No packages available',
      de: 'Keine Pakete verfügbar',
      hu: 'Nincsenek elérhető csomagok'
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">{translations.loading[language]}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {translations.error[language]}
      </div>
    );
  }

  if (filteredPackages.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        {translations.noPackages[language]}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-center mb-8">{translations.title[language]}</h2>
      
      {/* Package Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setPackageType('regular')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              packageType === 'regular'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
          >
            {translations.packageTypes.regular[language]}
          </button>
          <button
            type="button"
            onClick={() => setPackageType('reseller')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              packageType === 'reseller'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300 border-l-0`}
          >
            {translations.packageTypes.reseller[language]}
          </button>
        </div>
      </div>
      
      {/* Billing Cycle Selector */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              billingCycle === 'monthly'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
          >
            {translations.billingCycles.monthly[language]}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              billingCycle === 'annual'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300 border-l-0`}
          >
            {translations.billingCycles.annual[language]}
          </button>
        </div>
      </div>
      
      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPackages.map((pkg) => (
          <div key={pkg._id} className="border rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className={`${packageType === 'reseller' ? 'bg-purple-600' : 'bg-blue-600'} text-white p-4 text-center`}>
              <h3 className="text-xl font-bold">{pkg.name}</h3>
              <div className="mt-2 text-3xl font-bold">
                {formatCurrency(getPrice(pkg))}
                <span className="text-sm font-normal ml-1">{getPriceDescription(pkg)}</span>
              </div>
            </div>
            
            {/* Description */}
            <div className="p-4 bg-gray-50 text-center border-b">
              <p>{pkg.description[language]}</p>
            </div>
            
            {/* Resources */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">{translations.resources.storage[language]}</p>
                    <p className="font-medium">{pkg.resources.storage} GB</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">{translations.resources.bandwidth[language]}</p>
                    <p className="font-medium">{pkg.resources.bandwidth} GB</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Globe className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">{translations.resources.domains[language]}</p>
                    <p className="font-medium">{pkg.resources.domains}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Server className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {pkg.type === 'reseller' 
                        ? translations.resources.accounts[language]
                        : translations.resources.databases[language]}
                    </p>
                    <p className="font-medium">
                      {pkg.type === 'reseller' 
                        ? pkg.resources.accounts
                        : pkg.resources.databases}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="pt-4 border-t border-gray-200">
                <ul className="space-y-3">
                  {getFeatures(pkg).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Action Button */}
              <div className="pt-6">
                <button
                  onClick={() => onSelectPackage({
                    ...pkg,
                    selectedBilling: billingCycle,
                    price: getPrice(pkg)
                  })}
                  className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                    packageType === 'reseller' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {translations.selectButton[language]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HostingPackagesDisplay;