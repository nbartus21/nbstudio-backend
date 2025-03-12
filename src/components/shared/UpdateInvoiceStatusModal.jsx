import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, AlertCircle, Calendar, FileText, 
  DollarSign, X 
} from 'lucide-react';
import { formatShortDate } from './utils';

const UpdateInvoiceStatusModal = ({ invoice, onClose, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(invoice?.status || 'kiállított');
  const [paidAmount, setPaidAmount] = useState(invoice?.totalAmount || 0);
  const [paidDate, setPaidDate] = useState(
    invoice?.paidDate 
      ? new Date(invoice.paidDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(invoice?.notes || '');

  // Státuszok és azok tulajdonságai
  const statuses = [
    { 
      id: 'kiállított', 
      name: 'Kiállított', 
      icon: FileText, 
      color: 'blue',
      description: 'A számla ki lett állítva, de még nem fizették ki'
    },
    { 
      id: 'fizetett', 
      name: 'Fizetett', 
      icon: CheckCircle, 
      color: 'green',
      description: 'A számla teljes összege ki lett fizetve'
    },
    { 
      id: 'késedelmes', 
      name: 'Késedelmes', 
      icon: AlertCircle, 
      color: 'red',
      description: 'A fizetési határidő lejárt, a számla nincs kifizetve'
    },
    { 
      id: 'törölt', 
      name: 'Törölt', 
      icon: XCircle, 
      color: 'gray',
      description: 'A számla érvénytelenítve lett'
    }
  ];

  // Megtaláljuk a kiválasztott státusz adatait
  const selectedStatusInfo = statuses.find(s => s.id === selectedStatus);

  // Mentés kezelése
  const handleSave = () => {
    const updateData = { status: selectedStatus };
    
    // Ha fizetett státuszra állítjuk, akkor beállítjuk a fizetett összeget és dátumot
    if (selectedStatus === 'fizetett') {
      updateData.paidAmount = parseFloat(paidAmount);
      updateData.paidDate = paidDate;
    }
    
    // Ha van megjegyzés, azt is hozzáadjuk
    if (notes) {
      updateData.notes = notes;
    }
    
    onUpdateStatus(invoice, selectedStatus, updateData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Számla Státusz Módosítása</h3>
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
                <p className="text-gray-500">Számlaszám</p>
                <p className="font-medium">{invoice.number}</p>
              </div>
              <div>
                <p className="text-gray-500">Összeg</p>
                <p className="font-medium">{invoice.totalAmount} {invoice.currency || 'EUR'}</p>
              </div>
              <div>
                <p className="text-gray-500">Kiállítva</p>
                <p className="font-medium">{formatShortDate(invoice.date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Fizetési határidő</p>
                <p className="font-medium">{formatShortDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>
          
          {/* Jelenlegi státusz */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Jelenlegi státusz</p>
            <div className={`p-2 rounded-md bg-${invoice.status === 'fizetett' ? 'green' : invoice.status === 'késedelmes' ? 'red' : invoice.status === 'kiállított' ? 'blue' : 'gray'}-100 border border-${invoice.status === 'fizetett' ? 'green' : invoice.status === 'késedelmes' ? 'red' : invoice.status === 'kiállított' ? 'blue' : 'gray'}-300 flex items-center`}>
              {invoice.status === 'fizetett' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
              {invoice.status === 'késedelmes' && <AlertCircle className="h-5 w-5 text-red-600 mr-2" />}
              {invoice.status === 'kiállított' && <FileText className="h-5 w-5 text-blue-600 mr-2" />}
              {invoice.status === 'törölt' && <XCircle className="h-5 w-5 text-gray-600 mr-2" />}
              <span className="font-medium">{invoice.status}</span>
            </div>
          </div>
          
          {/* Új státusz kiválasztása */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Új státusz kiválasztása
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map(status => {
                const Icon = status.icon;
                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => setSelectedStatus(status.id)}
                    className={`p-3 rounded-md border flex flex-col items-center text-center ${
                      selectedStatus === status.id
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
          {selectedStatus === 'fizetett' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Fizetés részletei</h4>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="paidAmount" className="block text-sm text-gray-700 mb-1">
                    Fizetett összeg
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
                      Figyelem! A fizetett összeg kevesebb, mint a számla teljes összege.
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="paidDate" className="block text-sm text-gray-700 mb-1">
                    Fizetés dátuma
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
              Megjegyzések (opcionális)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              rows="2"
              placeholder="Megjegyzések a státuszváltozással kapcsolatban..."
            ></textarea>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-indigo-600 hover:bg-indigo-700"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateInvoiceStatusModal;