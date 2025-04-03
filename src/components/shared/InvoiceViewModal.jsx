import React, { useState, useEffect } from 'react';
import {
  FileText, X, Download, Printer, Share2,
  CheckCircle, AlertCircle, Clock, Mail,
  CreditCard, RefreshCw
} from 'lucide-react';
import { formatShortDate, debugLog } from './utils';
import QRCode from 'qrcode.react';
import { downloadInvoicePDF } from '../../services/invoiceService';

const InvoiceViewModal = ({ invoice, project, onClose, onUpdateStatus, onGeneratePDF }) => {
  debugLog('InvoiceViewModal', 'Rendering invoice view', {
    invoiceNumber: invoice?.number,
    invoiceStatus: invoice?.status
  });

  const [showQRCode, setShowQRCode] = useState(false);

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
      'COBADEFF371',                           // BIC
      'Norbert Bartus',                        // Beneficiary name
      'DE47663400180473463800',               // IBAN
      `EUR${amount}`,                          // Amount in EUR
      '',                                      // Customer ID (empty)
      invoice.number || '',                    // Invoice number
      `RECHNUNG ${invoice.number}`             // Reference
    ].join('\n');
  };

  // Számla állapotának ellenőrzése a színezéshez
  const checkInvoiceStatus = () => {
    if (invoice.status === 'fizetett') {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600 mr-2" />,
        text: 'Fizetve',
        description: invoice.paidDate ? `Fizetve: ${formatShortDate(invoice.paidDate)}` : 'A számla ki van fizetve',
        color: 'bg-green-50 border-green-200'
      };
    }

    if (invoice.status === 'törölt') {
      return {
        icon: <X className="h-5 w-5 text-gray-600 mr-2" />,
        text: 'Törölt',
        description: 'Ez a számla érvénytelenítve lett',
        color: 'bg-gray-50 border-gray-200'
      };
    }

    const now = new Date();
    const dueDate = new Date(invoice.dueDate);

    if (dueDate < now) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600 mr-2" />,
        text: 'Lejárt',
        description: `Fizetési határidő lejárt: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-red-50 border-red-200'
      };
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    if (dueDate <= threeDaysFromNow) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-600 mr-2" />,
        text: 'Hamarosan esedékes',
        description: `Fizetési határidő: ${formatShortDate(invoice.dueDate)}`,
        color: 'bg-yellow-50 border-yellow-200'
      };
    }

    return {
      icon: <FileText className="h-5 w-5 text-blue-600 mr-2" />,
      text: 'Kiállítva',
      description: `Fizetési határidő: ${formatShortDate(invoice.dueDate)}`,
      color: 'bg-blue-50 border-blue-200'
    };
  };

  const invoiceStatus = checkInvoiceStatus();

  // Emlékeztető küldése - a backend később implementálhatja
  const handleSendReminder = () => {
    debugLog('InvoiceViewModal-sendReminder', 'Sending reminder for invoice', invoice.number);
    alert('Emlékeztető küldése funkcionalitás hamarosan elérhető lesz!');
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
            Számla: {invoice.number}
            {invoice.recurring?.isRecurring && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-200 flex items-center">
                <RefreshCw className="h-3 w-3 mr-1" />
                Ismétlődő
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
                <h2 className="text-2xl font-bold">SZÁMLA</h2>
                <p className="text-gray-600">Számlaszám: {invoice.number}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Kelt: {formatShortDate(invoice.date)}</p>
                <p className="text-gray-600">Fizetési határidő: {formatShortDate(invoice.dueDate)}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Company Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2 text-gray-700">Szolgáltató:</h3>
                <p className="font-medium">Norbert Bartus</p>
                <p>NB Studio</p>
                <p>Adószám: 12345678-1-42</p>
                <p>1234 Budapest, Példa utca 1.</p>
                <p>Email: info@nb-studio.net</p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-gray-700">Vevő:</h3>
                <p className="font-medium">{invoice.clientName || project?.client?.name || 'N/A'}</p>
                {project?.client?.companyName && <p>{project.client.companyName}</p>}
                {project?.client?.taxNumber && <p>Adószám: {project.client.taxNumber}</p>}
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
              <h3 className="font-bold mb-2 text-gray-700">Tételek:</h3>
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left border-b border-gray-200 text-gray-700">Leírás</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Mennyiség</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Egységár</th>
                    <th className="py-2 px-3 text-right border-b border-gray-200 text-gray-700">Összesen</th>
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
                    <td colSpan="3" className="py-2 px-3 text-right">Végösszeg:</td>
                    <td className="py-2 px-3 text-right">{invoice.totalAmount} {currency}</td>
                  </tr>
                  {invoice.status === 'fizetett' && invoice.paidAmount > 0 && (
                    <tr className="bg-green-50 text-green-800">
                      <td colSpan="3" className="py-2 px-3 text-right">Fizetve:</td>
                      <td className="py-2 px-3 text-right">{invoice.paidAmount} {currency}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Payment Information */}
            {invoice.status !== 'törölt' && invoice.status !== 'fizetett' && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">Fizetési információk:</h3>
                <div className="bg-gray-50 p-4 border border-gray-200 rounded">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <p className="mb-1 font-medium">Banki átutalás:</p>
                      <p>IBAN: DE47 6634 0014 0743 4638 00</p>
                      <p>SWIFT/BIC: COBADEFFXXX</p>
                      <p>Bank: Commerzbank AG</p>
                      <p className="mt-2">Közlemény: {invoice.number}</p>

                      {/* Bankkártyás fizetés - eltávolítva */}
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 italic">A bankkártyás fizetési lehetőség jelenleg nem elérhető.</p>
                      </div>
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
                            SEPA átutalás QR kód
                          </p>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center text-sm"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          QR kód mutatása
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fizetési tranzakció adatok - csak fizetett számláknál */}
            {invoice.status === 'fizetett' && invoice.transactions && invoice.transactions.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">Fizetési tranzakció részletei:</h3>
                <div className="bg-green-50 p-4 border border-green-200 rounded">
                  {invoice.transactions.map((transaction, idx) => (
                    <div key={transaction.transactionId || idx} className="mb-3 last:mb-0">
                      <div className="flex flex-wrap items-center justify-between mb-2">
                        <div className="font-medium text-green-700 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Sikeres fizetés
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
                          <p><span className="font-medium">Tranzakció azonosító:</span> {transaction.transactionId || 'N/A'}</p>
                          <p><span className="font-medium">Összeg:</span> {transaction.amount} {transaction.currency?.toUpperCase()}</p>
                          {transaction.paymentMethod?.brand && (
                            <p>
                              <span className="font-medium">Kártyatípus:</span> {transaction.paymentMethod.brand?.toUpperCase()}
                              {transaction.paymentMethod.last4 && ` (xxxx-xxxx-xxxx-${transaction.paymentMethod.last4})`}
                            </p>
                          )}
                          <p><span className="font-medium">Státusz:</span> {transaction.status}</p>
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
                                Letölthető bizonylat
                              </a>
                            )}
                            {transaction.metadata.receiptNumber && (
                              <p><span className="font-medium">Bizonylat száma:</span> {transaction.metadata.receiptNumber}</p>
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
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700 flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 text-purple-600" />
                  Ismétlődő számla információ:
                </h3>
                <div className="bg-purple-50 p-3 border border-purple-200 rounded">
                  <p>Ez egy ismétlődő számla, amely rendszeresen kiállításra kerül a megadott időközönként.</p>
                  {invoice.recurring.interval && (
                    <p className="mt-1">Ismétlődés gyakorisága: <span className="font-medium">{invoice.recurring.interval}</span></p>
                  )}
                  {invoice.recurring.nextDate && (
                    <p className="mt-1">Következő számla várható dátuma: <span className="font-medium">{formatShortDate(invoice.recurring.nextDate)}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="font-bold mb-2 text-gray-700">Megjegyzések:</h3>
                <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                  <p className="whitespace-pre-line">{invoice.notes}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-600 text-sm mt-12">
              <p>Köszönjük, hogy minket választott!</p>
              <p className="mt-1">Ez a számla elektronikusan készült és érvényes aláírás nélkül is.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          {/* Bal oldali gombok - csak nem fizetett és nem törölt számlánál */}
          {invoice.status !== 'fizetett' && invoice.status !== 'törölt' && (
            <div className="flex space-x-2">
              <button
                onClick={handleSendReminder}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center text-sm"
              >
                <Mail className="h-4 w-4 mr-1" />
                Emlékeztető küldése
              </button>
            </div>
          )}

          {/* Jobb oldali gombok */}
          <div className="flex space-x-3 ml-auto">
            <button
              onClick={() => {
                if (onGeneratePDF) {
                  onGeneratePDF(invoice);
                }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF letöltése
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-sm"
            >
              <Printer className="h-4 w-4 mr-1" />
              Nyomtatás
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;
