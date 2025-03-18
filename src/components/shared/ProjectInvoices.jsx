import React from 'react';
import { Eye, Download, FileText, RefreshCw } from 'lucide-react';
import { formatShortDate, generateSepaQrData, debugLog } from './utils';
import QRCode from 'qrcode.react';

// Translation data for all UI elements
const translations = {
  en: {
    invoices: "Invoices",
    issuedOn: "Issued on",
    dueDate: "Due date",
    viewInvoice: "View Invoice",
    downloadPdf: "Download PDF",
    items: "Items",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    total: "Total",
    bankTransfer: "Bank Transfer",
    reference: "Reference",
    scanQrCode: "Scan QR code with your banking app",
    noInvoices: "No invoices for this project yet",
    noInvoicesDesc: "Invoices for this project will be issued by the administrator.",
    downloadInProgress: "Download feature is under development.",
    recurring: "Recurring"
  },
  de: {
    invoices: "Rechnungen",
    issuedOn: "Ausgestellt am",
    dueDate: "Fälligkeitsdatum",
    viewInvoice: "Rechnung anzeigen",
    downloadPdf: "PDF herunterladen",
    items: "Artikel",
    description: "Beschreibung",
    quantity: "Menge",
    unitPrice: "Stückpreis",
    total: "Gesamt",
    bankTransfer: "Banküberweisung",
    reference: "Verwendungszweck",
    scanQrCode: "QR-Code mit Ihrer Banking-App scannen",
    noInvoices: "Noch keine Rechnungen für dieses Projekt",
    noInvoicesDesc: "Rechnungen für dieses Projekt werden vom Administrator ausgestellt.",
    downloadInProgress: "Download-Funktion ist in Entwicklung.",
    recurring: "Wiederkehrend"
  },
  hu: {
    invoices: "Számlák",
    issuedOn: "Kiállítva",
    dueDate: "Fizetési határidő",
    viewInvoice: "Számla megtekintése",
    downloadPdf: "PDF letöltése",
    items: "Tételek",
    description: "Leírás",
    quantity: "Mennyiség",
    unitPrice: "Egységár",
    total: "Összesen",
    bankTransfer: "Banki átutalás",
    reference: "Közlemény",
    scanQrCode: "Szkennelje be a QR kódot a banki alkalmazással",
    noInvoices: "Nincsenek még számlák a projekthez",
    noInvoicesDesc: "A számlákat a projekthez kapcsolódóan a rendszergazda állítja ki.",
    downloadInProgress: "A letöltés funkció fejlesztés alatt áll.",
    recurring: "Ismétlődő"
  }
};

// Status translation mapping
const statusClasses = {
  "fizetett": "bg-green-100 text-green-800",
  "paid": "bg-green-100 text-green-800",
  "bezahlt": "bg-green-100 text-green-800",
  
  "kiállított": "bg-blue-100 text-blue-800",
  "issued": "bg-blue-100 text-blue-800",
  "ausgestellt": "bg-blue-100 text-blue-800",
  
  "késedelmes": "bg-red-100 text-red-800",
  "overdue": "bg-red-100 text-red-800",
  "überfällig": "bg-red-100 text-red-800",
  
  "törölt": "bg-gray-100 text-gray-800",
  "canceled": "bg-gray-100 text-gray-800",
  "storniert": "bg-gray-100 text-gray-800"
};

const ProjectInvoices = ({ project, onViewInvoice, language = 'hu' }) => {
  debugLog('ProjectInvoices', 'Rendering invoices view', {
    projectId: project?._id,
    invoicesCount: project?.invoices?.length || 0,
    language: language
  });
  
  // Debuggolási célból jelenítsük meg a konzolon a számlák adatait
  console.log('A projekthez tartozó számlák:', JSON.stringify(project?.invoices || [], null, 2));

  // Get translations for current language
  const t = translations[language] || translations.hu;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="divide-y divide-gray-200">
        {project.invoices?.length > 0 ? (
          project.invoices.map((invoice, index) => (
            <div key={invoice._id || invoice.number || `invoice-${index}`} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">{invoice.number}</h3>
                  <p className="text-sm text-gray-500">
                    {t.issuedOn}: {formatShortDate(invoice.date)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t.dueDate}: {formatShortDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{invoice.totalAmount} €</p>
                  <div className="flex justify-end items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusClasses[invoice.status] || "bg-gray-100 text-gray-800"
                    }`}>
                      {invoice.status}
                    </span>
                    {invoice.recurring?.isRecurring && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {t.recurring}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Buttons */}
              <div className="flex justify-end space-x-3 my-3">
                <button
                  onClick={() => {
                    debugLog('ProjectInvoices-viewInvoice', 'Viewing invoice', { invoiceNumber: invoice.number });
                    onViewInvoice(invoice);
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t.viewInvoice}
                </button>
                <button
                  onClick={() => {
                    debugLog('ProjectInvoices-downloadPDF', 'PDF download clicked');
                    window.alert(t.downloadInProgress);
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  {t.downloadPdf}
                </button>
              </div>

              {/* SEPA QR code and payment details */}
              {invoice.status !== 'fizetett' && invoice.status !== 'paid' && invoice.status !== 'bezahlt' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">{t.bankTransfer}</h4>
                      <p className="text-sm">IBAN: DE47 6634 0014 0743 4638 00</p>
                      <p className="text-sm">SWIFT/BIC: COBADEFFXXX</p>
                      <p className="text-sm">Bank: Commerzbank AG</p>
                      <p className="text-sm mt-2">{t.reference}: {invoice.number}</p>
                    </div>
                    <div className="flex justify-center">
                      <div>
                        <QRCode 
                          value={generateSepaQrData(invoice)}
                          size={150}
                          level="M"
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {t.scanQrCode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Items */}
              <div className="mt-4">
                <h4 className="font-medium mb-2">{t.items}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.description}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.quantity}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.unitPrice}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.total}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {invoice.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{item.description}</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap">{item.unitPrice} €</td>
                          <td className="px-3 py-2 text-sm text-right whitespace-nowrap font-medium">{item.total} €</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="px-3 py-2 text-right font-medium">{t.total}:</td>
                        <td className="px-3 py-2 text-right font-bold">{invoice.totalAmount} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">{t.noInvoices}</p>
            <p className="text-sm mt-1">{t.noInvoicesDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInvoices;
