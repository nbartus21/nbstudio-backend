import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Globe, 
  ChevronDown, 
  LayoutDashboard, 
  FileText as InvoiceIcon,
  Server,
  Globe as DomainIcon,
  Check,
  AlertTriangle 
} from 'lucide-react';
import { debugLog } from './shared/utils';

// Főbb fordítások
const translations = {
  en: {
    overview: "Overview",
    invoices: "Invoices",
    domains: "Domains",
    webhosting: "Webhosting",
    logout: "Logout",
    client: "Client",
    lastUpdate: "Last update",
    close: "Close",
    changeLanguage: "Change Language",
    languageChanged: "Language changed successfully",
    status: {
      active: "Active",
      suspended: "Suspended",
      cancelled: "Cancelled"
    },
    // Overview fordítások
    overview_title: "Account Overview",
    overview_client_info: "Client Information",
    overview_hosting_info: "Hosting Information",
    overview_domain: "Domain",
    overview_package: "Package",
    overview_period: "Billing Period",
    overview_status: "Status",
    overview_active_since: "Active Since",
    overview_next_renewal: "Next Renewal",
    // Számla fordítások
    invoices_title: "Invoices",
    invoices_no_invoices: "No invoices found",
    invoices_number: "Invoice Number",
    invoices_date: "Date",
    invoices_due_date: "Due Date",
    invoices_amount: "Amount",
    invoices_status: "Status",
    invoices_status_paid: "Paid",
    invoices_status_pending: "Pending",
    invoices_status_cancelled: "Cancelled",
    invoices_view: "View",
    // Domain fordítások
    domains_title: "Your Domains",
    domains_no_domains: "No domains found",
    domains_name: "Domain Name",
    domains_registration_date: "Registration Date",
    domains_expiry_date: "Expiry Date",
    domains_auto_renew: "Auto Renew",
    domains_status: "Status",
    domains_yes: "Yes",
    domains_no: "No",
    // Webhosting fordítások
    webhosting_title: "Webhosting Settings",
    webhosting_under_development: "This feature is under development",
    // Általános
    developed_by: "Developed by NB-Studio",
    footer_contact: "Contact Us",
    success_message: "Operation completed successfully",
  },
  de: {
    overview: "Übersicht",
    invoices: "Rechnungen",
    domains: "Domains",
    webhosting: "Webhosting",
    logout: "Abmelden",
    client: "Kunde",
    lastUpdate: "Letzte Aktualisierung",
    close: "Schließen",
    changeLanguage: "Sprache ändern",
    languageChanged: "Sprache erfolgreich geändert",
    status: {
      active: "Aktiv",
      suspended: "Ausgesetzt",
      cancelled: "Storniert"
    },
    // Overview fordítások
    overview_title: "Kontoübersicht",
    overview_client_info: "Kundeninformationen",
    overview_hosting_info: "Hosting-Informationen",
    overview_domain: "Domain",
    overview_package: "Paket",
    overview_period: "Abrechnungszeitraum",
    overview_status: "Status",
    overview_active_since: "Aktiv seit",
    overview_next_renewal: "Nächste Verlängerung",
    // Számla fordítások
    invoices_title: "Rechnungen",
    invoices_no_invoices: "Keine Rechnungen gefunden",
    invoices_number: "Rechnungsnummer",
    invoices_date: "Datum",
    invoices_due_date: "Fälligkeitsdatum",
    invoices_amount: "Betrag",
    invoices_status: "Status",
    invoices_status_paid: "Bezahlt",
    invoices_status_pending: "Ausstehend",
    invoices_status_cancelled: "Storniert",
    invoices_view: "Ansehen",
    // Domain fordítások
    domains_title: "Ihre Domains",
    domains_no_domains: "Keine Domains gefunden",
    domains_name: "Domainname",
    domains_registration_date: "Registrierungsdatum",
    domains_expiry_date: "Ablaufdatum",
    domains_auto_renew: "Automatische Verlängerung",
    domains_status: "Status",
    domains_yes: "Ja",
    domains_no: "Nein",
    // Webhosting fordítások
    webhosting_title: "Webhosting-Einstellungen",
    webhosting_under_development: "Diese Funktion befindet sich in der Entwicklung",
    // Általános
    developed_by: "Entwickelt von NB-Studio",
    footer_contact: "Kontaktieren Sie uns",
    success_message: "Vorgang erfolgreich abgeschlossen",
  },
  hu: {
    overview: "Áttekintés",
    invoices: "Számlák",
    domains: "Domainek",
    webhosting: "Tárhely",
    logout: "Kilépés",
    client: "Ügyfél",
    lastUpdate: "Utolsó frissítés",
    close: "Bezárás",
    changeLanguage: "Nyelv váltása",
    languageChanged: "Nyelv sikeresen megváltoztatva",
    status: {
      active: "Aktív",
      suspended: "Felfüggesztve",
      cancelled: "Törölve"
    },
    // Overview fordítások
    overview_title: "Fiók áttekintése",
    overview_client_info: "Ügyfél adatok",
    overview_hosting_info: "Tárhely információk",
    overview_domain: "Domain",
    overview_package: "Csomag",
    overview_period: "Számlázási időszak",
    overview_status: "Állapot",
    overview_active_since: "Aktív mióta",
    overview_next_renewal: "Következő megújítás",
    // Számla fordítások
    invoices_title: "Számlák",
    invoices_no_invoices: "Nincsenek számlák",
    invoices_number: "Számlaszám",
    invoices_date: "Dátum",
    invoices_due_date: "Fizetési határidő",
    invoices_amount: "Összeg",
    invoices_status: "Állapot",
    invoices_status_paid: "Fizetve",
    invoices_status_pending: "Függőben",
    invoices_status_cancelled: "Törölve",
    invoices_view: "Megtekintés",
    // Domain fordítások
    domains_title: "Domainjei",
    domains_no_domains: "Nincsenek domainek",
    domains_name: "Domain név",
    domains_registration_date: "Regisztráció dátuma",
    domains_expiry_date: "Lejárat dátuma",
    domains_auto_renew: "Automatikus megújítás",
    domains_status: "Állapot",
    domains_yes: "Igen",
    domains_no: "Nem",
    // Webhosting fordítások
    webhosting_title: "Tárhely beállítások",
    webhosting_under_development: "Ez a funkció fejlesztés alatt áll",
    // Általános
    developed_by: "Fejlesztette az NB-Studio",
    footer_contact: "Kapcsolat",
    success_message: "A művelet sikeresen végrehajtva",
  }
};

const SharedWebhostingDashboard = ({
  webhosting,
  language = 'hu',
  onUpdate,
  onLogout,
  onLanguageChange
}) => {
  // Fordítások lekérése az aktuális nyelvhez
  const t = translations[language];

  // Állapotkezelés
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Siker üzenet megjelenítése
  const showSuccessMessage = (message) => {
    debugLog('showSuccessMessage', message);
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Hiba üzenet megjelenítése
  const showErrorMessage = (message) => {
    debugLog('showErrorMessage', message);
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  };

  // Nyelv váltás kezelése
  const handleLocalLanguageChange = (lang) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
      showSuccessMessage(t.languageChanged);
    }
    setShowLanguageDropdown(false);
  };

  // Dátum formázás
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(
      language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  // Állapot szöveg formázása 
  const getStatusText = (status) => {
    return t.status[status] || status;
  };

  // Állapot színek
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Állapot formázása
  const getStatusFormatted = (status) => {
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
        {getStatusText(status)}
      </span>
    );
  };

  // Időszak formázása
  const formatPeriod = (period) => {
    if (period === 'monthly') {
      return language === 'hu' ? 'Havi' : language === 'de' ? 'Monatlich' : 'Monthly';
    } else {
      return language === 'hu' ? 'Éves' : language === 'de' ? 'Jährlich' : 'Annual';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Fejléc */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            {webhosting.hosting.domainName}
          </h1>
          
          <div className="flex items-center space-x-4">
            {/* Nyelv választó */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
              >
                <Globe className="h-4 w-4 mr-2" />
                {language === 'en' ? 'English' : language === 'de' ? 'Deutsch' : 'Magyar'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              
              {showLanguageDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="py-1">
                    <button
                      onClick={() => handleLocalLanguageChange('hu')}
                      className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Magyar
                      {language === 'hu' && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                    <button
                      onClick={() => handleLocalLanguageChange('de')}
                      className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Deutsch
                      {language === 'de' && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                    <button
                      onClick={() => handleLocalLanguageChange('en')}
                      className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      English
                      {language === 'en' && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Kijelentkezés gomb */}
            <button
              onClick={onLogout}
              className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Fő tartalom */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Sikeres művelet vagy hiba üzenet */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {errorMessage}
            </div>
          )}
          
          {/* Navigációs fülek */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } font-medium text-sm flex items-center`}
              >
                <LayoutDashboard className="h-5 w-5 mr-2" />
                {t.overview}
              </button>
              
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-4 px-1 ${
                  activeTab === 'invoices'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } font-medium text-sm flex items-center`}
              >
                <InvoiceIcon className="h-5 w-5 mr-2" />
                {t.invoices}
              </button>
              
              <button
                onClick={() => setActiveTab('domains')}
                className={`py-4 px-1 ${
                  activeTab === 'domains'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } font-medium text-sm flex items-center`}
              >
                <DomainIcon className="h-5 w-5 mr-2" />
                {t.domains}
              </button>
              
              <button
                onClick={() => setActiveTab('webhosting')}
                className={`py-4 px-1 ${
                  activeTab === 'webhosting'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } font-medium text-sm flex items-center`}
              >
                <Server className="h-5 w-5 mr-2" />
                {t.webhosting}
              </button>
            </nav>
          </div>
          
          {/* Fül tartalom */}
          {activeTab === 'overview' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{t.overview_title}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {webhosting.hosting.domainName}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(webhosting.status)}`}>
                  {getStatusText(webhosting.status)}
                </span>
              </div>
              
              <div className="border-t border-gray-200">
                <dl>
                  {/* Ügyfél információk */}
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 col-span-3">
                      {t.overview_client_info}
                    </dt>
                  </div>
                  
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">{t.client}</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {webhosting.client.name}
                    </dd>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {webhosting.client.email}
                    </dd>
                  </div>
                  
                  {webhosting.client.phone && (
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {webhosting.client.phone}
                      </dd>
                    </div>
                  )}
                  
                  {/* Tárhely információk */}
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 col-span-3">
                      {t.overview_hosting_info}
                    </dt>
                  </div>
                  
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">{t.overview_domain}</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {webhosting.hosting.domainName}
                    </dd>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">{t.overview_package}</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {webhosting.hosting.packageName}
                    </dd>
                  </div>
                  
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">{t.overview_period}</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatPeriod(webhosting.hosting.billing)}
                    </dd>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">{t.overview_status}</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {getStatusFormatted(webhosting.status)}
                    </dd>
                  </div>
                  
                  {webhosting.hosting.startDate && (
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">{t.overview_active_since}</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {formatDate(webhosting.hosting.startDate)}
                      </dd>
                    </div>
                  )}
                  
                  {webhosting.hosting.endDate && (
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">{t.overview_next_renewal}</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {formatDate(webhosting.hosting.endDate)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
          
          {/* Számlák fül */}
          {activeTab === 'invoices' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{t.invoices_title}</h3>
              </div>
              
              {(!webhosting.invoices || webhosting.invoices.length === 0) ? (
                <div className="px-4 py-5 text-center text-gray-500">
                  {t.invoices_no_invoices}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_number}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_date}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_due_date}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_amount}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_status}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.invoices_view}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {webhosting.invoices.map((invoice, index) => (
                        <tr key={invoice._id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Intl.NumberFormat(
                              language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US',
                              { style: 'currency', currency: 'EUR' }
                            ).format(invoice.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {invoice.status === 'paid' ? t.invoices_status_paid :
                               invoice.status === 'pending' ? t.invoices_status_pending : 
                               t.invoices_status_cancelled}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => console.log('View invoice', invoice._id)}
                            >
                              {t.invoices_view}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Domainek fül */}
          {activeTab === 'domains' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{t.domains_title}</h3>
              </div>
              
              {(!webhosting.domains || webhosting.domains.length === 0) ? (
                <div className="px-4 py-5 text-center text-gray-500">
                  {t.domains_no_domains}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.domains_name}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.domains_registration_date}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.domains_expiry_date}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.domains_auto_renew}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.domains_status}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {webhosting.domains.map((domain, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {domain.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(domain.registrationDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(domain.expiryDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {domain.autoRenew ? t.domains_yes : t.domains_no}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              domain.status === 'active' ? 'bg-green-100 text-green-800' :
                              domain.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              domain.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {domain.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Webhosting beállítások fül - Fejlesztés alatt */}
          {activeTab === 'webhosting' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{t.webhosting_title}</h3>
              </div>
              
              <div className="px-4 py-12 flex items-center justify-center">
                <div className="text-center">
                  <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t.webhosting_under_development}</h3>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Lábléc */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-2 sm:mb-0">
            &copy; {new Date().getFullYear()} NB-Studio. {t.developed_by}.
          </div>
          <div>
            <a href="mailto:info@nb-studio.net" className="text-sm text-indigo-600 hover:text-indigo-500">
              {t.footer_contact}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedWebhostingDashboard; 