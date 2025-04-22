import React, { useState, useEffect } from 'react';
import {
  FileText, X, Download, Printer, Share2,
  CheckCircle, AlertCircle, Clock, Mail,
  CreditCard, RefreshCw, Bell
} from 'lucide-react';
import { formatShortDate, debugLog } from './utils';
import { API_URL, API_KEY } from '../../config';
import QRCode from 'qrcode.react';
import { downloadInvoicePDF } from '../../services/invoiceService';

// Translation data for all UI elements
const translations = {
  en: {
    invoice: "INVOICE",
    invoiceNumber: "Invoice Number",
    date: "Date",
    dueDate: "Due Date",
    provider: "Provider",
    client: "Client",
    items: "Items",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    total: "Total",
    grandTotal: "Grand Total",
    paid: "Paid",
    paymentInfo: "Payment Information",
    bankTransfer: "Bank Transfer",
    reference: "Reference",
    showQrCode: "Show QR Code",
    sepaQrCode: "SEPA Transfer QR Code",
    paymentDetails: "Payment Transaction Details",
    successfulPayment: "Successful Payment",
    transactionId: "Transaction ID",
    amount: "Amount",
    cardType: "Card Type",
    status: "Status",
    downloadableReceipt: "Downloadable Receipt",
    receiptNumber: "Receipt Number",
    recurringInvoiceInfo: "Recurring Invoice Information",
    recurringInvoiceDesc: "This is a recurring invoice that is issued regularly at the specified interval.",
    frequency: "Frequency",
    nextInvoiceDate: "Next invoice expected date",
    notes: "Notes",
    thankYou: "Thank you for choosing us!",
    validWithoutSignature: "This invoice was created electronically and is valid without signature.",
    downloadPdf: "Download PDF",
    close: "Close",
    statusLabels: {
      paid: "Paid",
      paidOn: "Paid on",
      cancelled: "Cancelled",
      cancelledDesc: "This invoice has been invalidated",
      overdue: "Overdue",
      overdueDesc: "Payment deadline has passed",
      dueSoon: "Due Soon",
      issued: "Issued",
      paymentDeadline: "Payment deadline"
    },
    vatExempt: "VAT exempt according to § 19 Abs. 1 UStG."
  },
  de: {
    invoice: "RECHNUNG",
    invoiceNumber: "Rechnungsnummer",
    date: "Datum",
    dueDate: "Fälligkeitsdatum",
    provider: "Anbieter",
    client: "Kunde",
    items: "Artikel",
    description: "Beschreibung",
    quantity: "Menge",
    unitPrice: "Stückpreis",
    total: "Gesamt",
    grandTotal: "Gesamtsumme",
    paid: "Bezahlt",
    paymentInfo: "Zahlungsinformationen",
    bankTransfer: "Banküberweisung",
    reference: "Verwendungszweck",
    showQrCode: "QR-Code anzeigen",
    sepaQrCode: "SEPA-Überweisung QR-Code",
    paymentDetails: "Zahlungstransaktionsdetails",
    successfulPayment: "Erfolgreiche Zahlung",
    transactionId: "Transaktions-ID",
    amount: "Betrag",
    cardType: "Kartentyp",
    status: "Status",
    downloadableReceipt: "Herunterladbarer Beleg",
    receiptNumber: "Belegnummer",
    recurringInvoiceInfo: "Informationen zur wiederkehrenden Rechnung",
    recurringInvoiceDesc: "Dies ist eine wiederkehrende Rechnung, die regelmäßig im angegebenen Intervall ausgestellt wird.",
    frequency: "Häufigkeit",
    nextInvoiceDate: "Voraussichtliches Datum der nächsten Rechnung",
    notes: "Anmerkungen",
    thankYou: "Vielen Dank, dass Sie sich für uns entschieden haben!",
    validWithoutSignature: "Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.",
    downloadPdf: "PDF herunterladen",
    close: "Schließen",
    statusLabels: {
      paid: "Bezahlt",
      paidOn: "Bezahlt am",
      cancelled: "Storniert",
      cancelledDesc: "Diese Rechnung wurde ungültig gemacht",
      overdue: "Überfällig",
      overdueDesc: "Zahlungsfrist ist abgelaufen",
      dueSoon: "Bald fällig",
      issued: "Ausgestellt",
      paymentDeadline: "Zahlungsfrist"
    },
    vatExempt: "Umsatzsteuerbefreit gemäß § 19 Abs. 1 UStG."
  },
  hu: {
    invoice: "SZÁMLA",
    invoiceNumber: "Számlaszám",
    date: "Kelt",
    dueDate: "Fizetési határidő",
    provider: "Szolgáltató",
    client: "Vevő",
    items: "Tételek",
    description: "Leírás",
    quantity: "Mennyiség",
    unitPrice: "Egységár",
    total: "Összesen",
    grandTotal: "Végösszeg",
    paid: "Fizetve",
    paymentInfo: "Fizetési információk",
    bankTransfer: "Banki átutalás",
    reference: "Közlemény",
    showQrCode: "QR kód mutatása",
    sepaQrCode: "SEPA átutalás QR kód",
    paymentDetails: "Fizetési tranzakció részletei",
    successfulPayment: "Sikeres fizetés",
    transactionId: "Tranzakció azonosító",
    amount: "Összeg",
    cardType: "Kártyatípus",
    status: "Státusz",
    downloadableReceipt: "Letölthető bizonylat",
    receiptNumber: "Bizonylat száma",
    recurringInvoiceInfo: "Ismétlődő számla információ",
    recurringInvoiceDesc: "Ez egy ismétlődő számla, amely rendszeresen kiállításra kerül a megadott időközönként.",
    frequency: "Ismétlődés gyakorisága",
    nextInvoiceDate: "Következő számla várható dátuma",
    notes: "Megjegyzések",
    thankYou: "Köszönjük, hogy minket választott!",
    validWithoutSignature: "Ez a számla elektronikusan készült és érvényes aláírás nélkül is.",
    downloadPdf: "PDF letöltése",
    close: "Bezárás",
    statusLabels: {
      paid: "Fizetve",
      paidOn: "Fizetve",
      cancelled: "Törölt",
      cancelledDesc: "Ez a számla érvénytelenítve lett",
      overdue: "Lejárt",
      overdueDesc: "Fizetési határidő lejárt",
      dueSoon: "Hamarosan esedékes",
      issued: "Kiállítva",
      paymentDeadline: "Fizetési határidő"
    },
    vatExempt: "Alanyi adómentes a § 19 Abs. 1 UStG. szerint."
  }
};

const InvoiceViewModal = ({ invoice, project, onClose, onUpdateStatus, onGeneratePDF, onGenerateRecurring, language = 'hu' }) => {
  debugLog('InvoiceViewModal', 'Rendering invoice view', {
    invoiceNumber: invoice?.number,
    invoiceStatus: invoice?.status,
    language: language
  });

  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get translations for current language
  const t = translations[language] || translations.hu;

  if (!invoice) {
    debugLog('InvoiceViewModal', 'No invoice provided');
    return null;
  }

  // Nincs szükség a fizetési URL paraméterek ellenőrzésére, mivel a Stripe fizetés el lett távolítva

  const currency = invoice?.currency || project?.financial?.currency || 'EUR';

  // Státusz badge színek
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'fizetett':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'kiállított':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'késedelmes':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'törölt':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // SEPA QR kód adat generálás
  const generateSepaQrData = () => {
    const amount = typeof invoice.totalAmount === 'number'
      ? invoice.totalAmount.toFixed(2)
      : '0.00';

    return [
      'BCD',                                    // Service Tag
      '002',                                    // Version
      '1',                                      // Encoding
      'SCT',                                    // SEPA Credit Transfer
      'COBADEFFXXX',                           // BIC
      'Norbert Bartus',                        // Beneficiary name
      'DE47663400180473463800',               // IBAN
      `EUR${amount}`,                          // Amount in EUR
      '',                                      // Customer ID (empty)
      invoice.number || '',                    // Invoice number
      language === 'de' ? `RECHNUNG ${invoice.number}` : (language === 'en' ? `INVOICE ${invoice.number}` : `SZÁMLA ${invoice.number}`)             // Reference
    ].join('\n');
  };

  // Számla állapotának ellenőrzése a színezéshez
  const checkInvoiceStatus = () => {
    if (invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600 mr-2" />,
        text: t.statusLabels.paid,
        description: invoice.paidDate ? `${t.statusLabels.paidOn}: ${formatShortDate(invoice.paidDate)}` : t.statusLabels.paid,
        color: 'bg-green-50 border-green-200'
      };
    }

    if (invoice.status === 'törölt' || invoice.status === 'canceled' || invoice.status === 'storniert') {
      return {
        icon: <X className="h-5 w-5 text-gray-600 mr-2" />,
        text: t.statusLabels.cancelled,
        description: t.statusLabels.cancelledDesc,
        color: 'bg-gray-50 border-gray-200'
      };
    }

    const now = new Date();
    const dueDate = new Date(invoice.dueDate);

    if (dueDate < now) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600 mr-2" />,
        text: t.statusLabels.overdue,
        description: `${t.statusLabels.overdueDesc}: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-red-50 border-red-200'
      };
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    if (dueDate <= threeDaysFromNow) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-600 mr-2" />,
        text: t.statusLabels.dueSoon,
        description: `${t.statusLabels.paymentDeadline}: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-yellow-50 border-yellow-200'
      };
    }

    return {
      icon: <FileText className="h-5 w-5 text-blue-600 mr-2" />,
      text: t.statusLabels.issued,
      description: `${t.statusLabels.paymentDeadline}: ${formatShortDate(invoice.dueDate)}`,
      color: 'bg-blue-50 border-blue-200'
    };
  };

  const invoiceStatus = checkInvoiceStatus();

  // Emlékeztető küldése
  const handleSendReminder = async () => {
    debugLog('InvoiceViewModal-sendReminder', 'Sending reminder for invoice', invoice.number);
    setLoading(true);

    try {
      // Megerősítés kérése
      if (!confirm(language === 'hu' ? 'Biztos, hogy emlékeztetőt szeretne küldeni erről a számláról?' :
                  (language === 'de' ? 'Sind Sie sicher, dass Sie eine Erinnerung für diese Rechnung senden möchten?' :
                                      'Are you sure you want to send a reminder for this invoice?'))) {
        setLoading(false);
        return;
      }

      if (!project || !project._id) {
        throw new Error(language === 'hu' ? 'Projekt azonosító hiányzik' : 
                       (language === 'de' ? 'Projekt-ID fehlt' : 'Project ID is missing'));
      }

      // API hívás az emlékeztető küldéséhez
      const response = await fetch(`${API_URL}/projects/${project._id}/invoices/${invoice._id}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ language })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Hiba történt az emlékeztető küldése közben');
      }

      // Sikeres küldés esetén értesítés
      alert(language === 'hu' ? 'Emlékeztető sikeresen elküldve!' :
            (language === 'de' ? 'Erinnerung erfolgreich gesendet!' :
                                'Reminder successfully sent!'));
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert(language === 'hu' ? `Hiba történt: ${error.message}` :
            (language === 'de' ? `Ein Fehler ist aufgetreten: ${error.message}` :
                                `An error occurred: ${error.message}`));
    } finally {
      setLoading(false);
    }
  };

  // Bankkártyás fizetés - eltávolítva
  const handleCardPayment = () => {
    alert('A bankkártyás fizetési lehetőség jelenleg nem elérhető. Kérjük, használja a banki átutalást.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            {t.invoice}: {invoice.number}
            {invoice.recurring?.isRecurring && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-200 flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                {language === 'en' ? 'Recurring' : (language === 'de' ? 'Wiederkehrend' : 'Ismétlődő')}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {/* Státusz jelző */}
          <div className={`mb-6 p-4 rounded-lg flex items-center ${invoiceStatus.color}`}>
            {invoiceStatus.icon}
            <div>
              <h4 className="font-medium">{invoiceStatus.text}</h4>
              <p className="text-sm">{invoiceStatus.description}</p>
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold">{t.invoice}</h2>
                <p className="text-gray-600">{t.invoiceNumber}: {invoice.number}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{t.date}: {formatShortDate(invoice.date)}</p>
                <p className="text-gray-600">{t.dueDate}: {formatShortDate(invoice.dueDate)}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Company Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2 text-gray-700">{t.provider}:</h3>
                <p className="font-medium">Norbert Bartus</p>
                <p>Salinenstraße 25</p>
                <p>76646 Bruchsal, Baden-Württemberg</p>
                <p>Deutschland</p>
                <p>St.-Nr.: 68194547329</p>
                <p>USt-IdNr.: DE346419031</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-gray-700">{t.client}:</h3>
                <p className="font-medium">{invoice.clientName || project?.client?.name || 'N/A'}</p>
                {project?.client?.companyName && <p>{project.client.companyName}</p>}
                {project?.client?.taxNumber && <p>{language === 'hu' ? 'Adószám' : (language === 'de' ? 'Steuernummer' : 'Tax ID')}: {project.client.taxNumber}</p>}
                <p>Email: {project?.client?.email || 'N/A'}</p>
                {project?.client?.address && (
                  <p>
                    {project.client.address.postalCode} {project.client.address.city}, {project.client.address.street}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="font-bold mb-2 text-gray-700">{t.items}:</h3>
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left border-b border-gray-200 text-gray-700">{t.description}</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">{t.quantity}</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">{t.unitPrice}</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-3 text-right">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{item.unitPrice} {currency}</td>
                      <td className="py-2 px-3 text-right">{item.total} {currency}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="3" className="py-2 px-3 text-right">{t.grandTotal}:</td>
                    <td className="py-2 px-3 text-right">{invoice.totalAmount} {currency}</td>
                  </tr>
                  {(invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') && invoice.paidAmount > 0 && (
                    <tr className="bg-green-50 text-green-800">
                      <td colSpan="3" className="py-2 px-3 text-right">{t.paid}:</td>
                      <td className="py-2 px-3 text-right">{invoice.paidAmount} {currency}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Payment Information */}
            {(invoice.status !== 'törölt' && invoice.status !== 'fizetett' && invoice.status !== 'paid' && invoice.status !== 'bezahlt' && invoice.status !== 'canceled' && invoice.status !== 'storniert') && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">{t.paymentInfo}:</h3>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <p className="mb-1 font-medium">{t.bankTransfer}:</p>
                      <p>IBAN: DE47 6634 0018 0473 4638 00</p>
                      <p>SWIFT/BIC: COBADEFFXXX</p>
                      <p>Bank: Commerzbank AG</p>
                      <p className="mt-2">{t.reference}: {invoice.number}</p>
                      <p className="mt-4 text-sm text-gray-600">{t.vatExempt}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      {showQRCode ? (
                        <>
                          <QRCode
                            value={generateSepaQrData()}
                            size={120}
                            level="M"
                            renderAs="svg"
                          />
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {t.sepaQrCode}
                          </p>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center text-sm"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          {t.showQrCode}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fizetési tranzakció adatok - csak fizetett számláknál */}
            {(invoice.status === 'fizetett' || invoice.status === 'paid' || invoice.status === 'bezahlt') && invoice.transactions && invoice.transactions.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">{t.paymentDetails}:</h3>
                <div className="bg-green-50 p-4 border border-green-200 rounded">
                  {invoice.transactions.map((transaction, idx) => (
                    <div key={transaction.transactionId || idx} className="mb-3 last:mb-0">
                      <div className="flex flex-wrap items-center justify-between mb-2">
                        <div className="font-medium text-green-700 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t.successfulPayment}
                          <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                            {transaction.paymentMethod?.type || 'card'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {transaction.created ? new Date(transaction.created).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><span className="font-medium">{t.transactionId}:</span> {transaction.transactionId || 'N/A'}</p>
                          <p><span className="font-medium">{t.amount}:</span> {transaction.amount} {transaction.currency?.toUpperCase()}</p>
                          {transaction.paymentMethod?.brand && (
                            <p>
                              <span className="font-medium">{t.cardType}:</span> {transaction.paymentMethod.brand?.toUpperCase()}
                              {transaction.paymentMethod.last4 && ` (xxxx-xxxx-xxxx-${transaction.paymentMethod.last4})`}
                            </p>
                          )}
                          <p><span className="font-medium">{t.status}:</span> {transaction.status}</p>
                        </div>

                        {transaction.metadata && (
                          <div>
                            {transaction.metadata.receiptUrl && (
                              <a
                                href={transaction.metadata.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                {t.downloadableReceipt}
                              </a>
                            )}
                            {transaction.metadata.receiptNumber && (
                              <p><span className="font-medium">{t.receiptNumber}:</span> {transaction.metadata.receiptNumber}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Invoice Info */}
            {invoice.recurring?.isRecurring && (
              <div className={`p-4 mb-4 rounded-lg ${invoice.recurring && invoice.recurring.isRecurring ? "bg-blue-50 border border-blue-200" : ""}`}>
                {/* Ismétlődő számla figyelmeztetés */}
                {invoice.recurring && invoice.recurring.isRecurring && (
                  <div className="mb-3 p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
                    <div className="flex items-center">
                      <span className="text-blue-700 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="font-bold text-blue-700">{t.recurringInvoiceInfo}</span>
                    </div>
                    <p className="mt-1 text-blue-600">{t.recurringInvoiceDesc}</p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold">{language === 'hu' ? 'Ismétlődés:' : (language === 'de' ? 'Intervall:' : 'Interval:')}</span> 
                        <span className="ml-2">
                          {invoice.recurring.interval === 'havonta' ? (language === 'hu' ? 'Havonta' : (language === 'de' ? 'Monatlich' : 'Monthly')) : 
                           invoice.recurring.interval === 'negyedévente' ? (language === 'hu' ? 'Negyedévente' : (language === 'de' ? 'Vierteljährlich' : 'Quarterly')) : 
                           invoice.recurring.interval === 'félévente' ? (language === 'hu' ? 'Félévente' : (language === 'de' ? 'Halbjährlich' : 'Semiannually')) : 
                           invoice.recurring.interval === 'évente' ? (language === 'hu' ? 'Évente' : (language === 'de' ? 'Jährlich' : 'Annually')) : 
                           invoice.recurring.interval}
                        </span>
                      </div>
                      {invoice.recurring.nextDate && (
                        <div>
                          <span className="font-semibold">{language === 'hu' ? 'Következő generálás:' : (language === 'de' ? 'Nächste Generierung:' : 'Next generation:')}</span> 
                          <span className="ml-2">{new Date(invoice.recurring.nextDate).toLocaleDateString(
                             language === 'hu' ? 'hu-HU' : (language === 'de' ? 'de-DE' : 'en-US')
                          )}</span>
                        </div>
                      )}
                      {invoice.recurring.remainingOccurrences && (
                        <div>
                          <span className="font-semibold">{language === 'hu' ? 'Hátralévő ismétlődések:' : (language === 'de' ? 'Verbleibende Wiederholungen:' : 'Remaining occurrences:')}</span> 
                          <span className="ml-2">{invoice.recurring.remainingOccurrences}</span>
                        </div>
                      )}
                      {invoice.recurring.endDate && (
                        <div>
                          <span className="font-semibold">{language === 'hu' ? 'Befejezés dátuma:' : (language === 'de' ? 'Enddatum:' : 'End date:')}</span> 
                          <span className="ml-2">{new Date(invoice.recurring.endDate).toLocaleDateString(
                             language === 'hu' ? 'hu-HU' : (language === 'de' ? 'de-DE' : 'en-US')
                          )}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Számla fejléc */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">{t.invoice}</h2>
                    <p className="text-gray-600">{t.invoiceNumber}: {invoice.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{t.date}: {formatShortDate(invoice.date)}</p>
                    <p className="text-gray-600">{t.dueDate}: {formatShortDate(invoice.dueDate)}</p>
                    <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">{t.notes}:</h3>
                <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                  <p className="whitespace-pre-line">{invoice.notes}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-600 text-sm mt-12">
              <p>{t.thankYou}</p>
              <p className="mt-1">{t.validWithoutSignature}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t bg-gray-50">
          {/* Emlékeztető küldése */}
          {(invoice.status !== 'fizetett' && invoice.status !== 'paid' && invoice.status !== 'bezahlt' && 
            invoice.status !== 'törölt' && invoice.status !== 'canceled' && invoice.status !== 'storniert') && (
            <button
              onClick={handleSendReminder}
              disabled={loading}
              className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center text-sm"
            >
              <Bell className="h-4 w-4 mr-1" />
              {language === 'hu' 
                ? '📧 Fizetési emlékeztető küldése (nem új számla)' 
                : (language === 'de' 
                  ? '📧 Zahlungserinnerung senden (keine neue Rechnung)' 
                  : '📧 Send payment reminder (not a new invoice)')}
            </button>
          )}
          
          {/* Ismétlődő számla manuális generálása */}
          {invoice.recurring && invoice.recurring.isRecurring && (
            <button
              onClick={() => onGenerateRecurring && onGenerateRecurring(invoice)}
              disabled={loading}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {language === 'hu' 
                ? '🆕 Új számla generálása most' 
                : (language === 'de' 
                  ? '🆕 Neue Rechnung jetzt generieren' 
                  : '🆕 Generate new invoice now')}
            </button>
          )}
          
          {/* PDF generálás */}
          <button
            onClick={() => {
              if (onGeneratePDF) {
                onGeneratePDF(invoice);
              }
            }}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center text-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            {t.downloadPdf}
          </button>
          
          {/* Bezárás */}
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm ml-auto"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;
