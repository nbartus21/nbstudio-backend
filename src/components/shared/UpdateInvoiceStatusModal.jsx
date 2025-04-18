import React, { useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Calendar, FileText,
  DollarSign, X, Loader
} from 'lucide-react';
import { formatShortDate, debugLog } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    updateInvoiceStatus: "Update Invoice Status",
    currentStatus: "Current Status",
    selectNewStatus: "Select New Status",
    invoiceNumber: "Invoice Number",
    amount: "Amount",
    issued: "Issued",
    dueDate: "Due Date",
    paymentDetails: "Payment Details",
    paidAmount: "Paid Amount",
    paymentDate: "Payment Date",
    notes: "Notes (optional)",
    notesPlaceholder: "Notes regarding the status change...",
    warning: "Warning! The paid amount is less than the total invoice amount.",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    statusDescriptions: {
      issued: "The invoice has been issued but not paid yet",
      paid: "The invoice has been fully paid",
      overdue: "The payment deadline has passed, the invoice is not paid",
      canceled: "The invoice has been invalidated"
    },
    statusNames: {
      issued: "Issued",
      paid: "Paid",
      overdue: "Overdue",
      canceled: "Canceled"
    }
  },
  de: {
    updateInvoiceStatus: "Rechnungsstatus aktualisieren",
    currentStatus: "Aktueller Status",
    selectNewStatus: "Neuen Status auswählen",
    invoiceNumber: "Rechnungsnummer",
    amount: "Betrag",
    issued: "Ausgestellt",
    dueDate: "Fälligkeitsdatum",
    paymentDetails: "Zahlungsdetails",
    paidAmount: "Bezahlter Betrag",
    paymentDate: "Zahlungsdatum",
    notes: "Notizen (optional)",
    notesPlaceholder: "Notizen zur Statusänderung...",
    warning: "Achtung! Der bezahlte Betrag ist geringer als der Gesamtrechnungsbetrag.",
    cancel: "Abbrechen",
    save: "Speichern",
    saving: "Speichern...",
    statusDescriptions: {
      issued: "Die Rechnung wurde ausgestellt, aber noch nicht bezahlt",
      paid: "Die Rechnung wurde vollständig bezahlt",
      overdue: "Die Zahlungsfrist ist abgelaufen, die Rechnung ist nicht bezahlt",
      canceled: "Die Rechnung wurde ungültig gemacht"
    },
    statusNames: {
      issued: "Ausgestellt",
      paid: "Bezahlt",
      overdue: "Überfällig",
      canceled: "Storniert"
    }
  },
  hu: {
    updateInvoiceStatus: "Számla Státusz Módosítása",
    currentStatus: "Jelenlegi státusz",
    selectNewStatus: "Új státusz kiválasztása",
    invoiceNumber: "Számlaszám",
    amount: "Összeg",
    issued: "Kiállítva",
    dueDate: "Fizetési határidő",
    paymentDetails: "Fizetés részletei",
    paidAmount: "Fizetett összeg",
    paymentDate: "Fizetés dátuma",
    notes: "Megjegyzések (opcionális)",
    notesPlaceholder: "Megjegyzések a státuszváltozással kapcsolatban...",
    warning: "Figyelem! A fizetett összeg kevesebb, mint a számla teljes összege.",
    cancel: "Mégse",
    save: "Mentés",
    saving: "Mentés...",
    statusDescriptions: {
      issued: "A számla ki lett állítva, de még nem fizették ki",
      paid: "A számla teljes összege ki lett fizetve",
      overdue: "A fizetési határidő lejárt, a számla nincs kifizetve",
      canceled: "A számla érvénytelenítve lett"
    },
    statusNames: {
      issued: "Kiállított",
      paid: "Fizetett",
      overdue: "Késedelmes",
      canceled: "Törölt"
    }
  }
};

// Status mapping between languages
const statusMapping = {
  hu: {
    issued: "kiállított",
    paid: "fizetett",
    overdue: "késedelmes",
    canceled: "törölt"
  },
  en: {
    issued: "issued",
    paid: "paid",
    overdue: "overdue",
    canceled: "canceled"
  },
  de: {
    issued: "ausgestellt",
    paid: "bezahlt",
    overdue: "überfällig",
    canceled: "storniert"
  }
};

const UpdateInvoiceStatusModal = ({ invoice, onClose, onUpdateStatus, language = 'hu' }) => {
  debugLog('UpdateInvoiceStatusModal', 'Rendering invoice status update modal', {
    invoiceNumber: invoice?.number,
    invoiceStatus: invoice?.status,
    language: language
  });

  // Get translations for the current language
  const t = translations[language] || translations.hu;
  const statusMap = statusMapping[language] || statusMapping.hu;

  // Get the reverse mapping for statuses (from UI language to backend)
  const reverseStatusMapping = {};
  Object.keys(statusMap).forEach(key => {
    reverseStatusMapping[statusMap[key]] = key;
  });

  // Get the current status key (needed for setting initial selected status)
  const getCurrentStatusKey = () => {
    if (!invoice || !invoice.status) return 'issued';

    // Find the key for the current status value
    for (const [key, value] of Object.entries(statusMap)) {
      if (value === invoice.status) {
        return key;
      }
    }
    return 'issued'; // Default
  };

  const [selectedStatusKey, setSelectedStatusKey] = useState(getCurrentStatusKey());
  const [paidAmount, setPaidAmount] = useState(invoice?.totalAmount || 0);
  const [paidDate, setPaidDate] = useState(
    invoice?.paidDate
      ? new Date(invoice.paidDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Státuszok és azok tulajdonságai
  const statuses = [
    {
      id: 'issued',
      name: t.statusNames.issued,
      icon: FileText,
      color: 'blue',
      description: t.statusDescriptions.issued
    },
    {
      id: 'paid',
      name: t.statusNames.paid,
      icon: CheckCircle,
      color: 'green',
      description: t.statusDescriptions.paid
    },
    {
      id: 'overdue',
      name: t.statusNames.overdue,
      icon: AlertCircle,
      color: 'red',
      description: t.statusDescriptions.overdue
    },
    {
      id: 'canceled',
      name: t.statusNames.canceled,
      icon: XCircle,
      color: 'gray',
      description: t.statusDescriptions.canceled
    }
  ];

  // Megtaláljuk a kiválasztott státusz adatait
  const selectedStatusInfo = statuses.find(s => s.id === selectedStatusKey);

  // Mentés kezelése
  const handleSave = async () => {
    // Betöltési állapot beállítása
    setIsSaving(true);

    // Convert from UI status key to backend status value
    const backendStatus = statusMap[selectedStatusKey];

    const updateData = { status: backendStatus };

    // Ha fizetett státuszra állítjuk, akkor beállítjuk a fizetett összeget és dátumot
    if (selectedStatusKey === 'paid') {
      updateData.paidAmount = parseFloat(paidAmount);
      updateData.paidDate = paidDate;
    }

    // Ha van megjegyzés, azt is hozzáadjuk
    if (notes) {
      updateData.notes = notes;
    }

    // Mentés előtt naplózzuk az adatokat
    console.log('Számla frissítési adatok:', {
      invoiceId: invoice._id,
      newStatus: backendStatus,
      updateData: updateData
    });

    try {
      // Meghívjuk a frissítési függvényt
      await onUpdateStatus(invoice, backendStatus, updateData);

      // Sikeres mentés esetén bezárjuk a modalt
      // A betöltési állapotot nem állítjuk vissza, mert a modal bezáródik
    } catch (error) {
      console.error('Hiba a számla státuszának frissítésekor:', error);
      // Hiba esetén visszaállítjuk a betöltési állapotot
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{t.updateInvoiceStatus}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Számla alapadatok */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">{t.invoiceNumber}</p>
                <p className="font-medium">{invoice.number}</p>
              </div>
              <div>
                <p className="text-gray-500">{t.amount}</p>
                <p className="font-medium">{invoice.totalAmount} {invoice.currency || 'EUR'}</p>
              </div>
              <div>
                <p className="text-gray-500">{t.issued}</p>
                <p className="font-medium">{formatShortDate(invoice.date)}</p>
              </div>
              <div>
                <p className="text-gray-500">{t.dueDate}</p>
                <p className="font-medium">{formatShortDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Jelenlegi státusz */}
          <div>
            <p className="text-sm text-gray-500 mb-1">{t.currentStatus}</p>
            <div className={`p-2 rounded-md bg-${invoice.status === statusMap.paid ? 'green' : invoice.status === statusMap.overdue ? 'red' : invoice.status === statusMap.issued ? 'blue' : 'gray'}-100 border border-${invoice.status === statusMap.paid ? 'green' : invoice.status === statusMap.overdue ? 'red' : invoice.status === statusMap.issued ? 'blue' : 'gray'}-300 flex items-center`}>
              {invoice.status === statusMap.paid && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
              {invoice.status === statusMap.overdue && <AlertCircle className="h-5 w-5 text-red-600 mr-2" />}
              {invoice.status === statusMap.issued && <FileText className="h-5 w-5 text-blue-600 mr-2" />}
              {invoice.status === statusMap.canceled && <XCircle className="h-5 w-5 text-gray-600 mr-2" />}
              <span className="font-medium">{invoice.status}</span>
            </div>
          </div>

          {/* Új státusz kiválasztása */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.selectNewStatus}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map(status => {
                const Icon = status.icon;
                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => setSelectedStatusKey(status.id)}
                    className={`p-3 rounded-md border flex flex-col items-center text-center ${
                      selectedStatusKey === status.id
                        ? `bg-${status.color}-100 border-${status.color}-300 text-${status.color}-700`
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-6 w-6 text-${status.color}-600 mb-1`} />
                    <span className="font-medium">{status.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Kiválasztott státusz leírása */}
            {selectedStatusInfo && (
              <p className="mt-2 text-sm text-gray-500">
                {selectedStatusInfo.description}
              </p>
            )}
          </div>

          {/* Kiegészítő mezők a fizetett státuszhoz */}
          {selectedStatusKey === 'paid' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t.paymentDetails}</h4>

              <div className="space-y-3">
                <div>
                  <label htmlFor="paidAmount" className="block text-sm text-gray-700 mb-1">
                    {t.paidAmount}
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="paidAmount"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      step="0.01"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{invoice.currency || 'EUR'}</span>
                    </div>
                  </div>
                  {parseFloat(paidAmount) < invoice.totalAmount && (
                    <p className="mt-1 text-sm text-yellow-600">
                      {t.warning}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="paidDate" className="block text-sm text-gray-700 mb-1">
                    {t.paymentDate}
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="paidDate"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="pl-10 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Megjegyzések */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              {t.notes}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              rows="2"
              placeholder={t.notesPlaceholder}
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isSaving && <Loader className="animate-spin h-4 w-4" />}
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateInvoiceStatusModal;