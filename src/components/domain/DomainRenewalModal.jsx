import React, { useState, useEffect } from 'react';
import { Calendar, Check, Clock, RotateCw, XCircle } from 'lucide-react';

const DomainRenewalModal = ({ isOpen, onClose, onSave, domain = null }) => {
  const [formData, setFormData] = useState({
    expiryDate: '',
    cost: '',
    renewalDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'paid',
    notes: ''
  });

  useEffect(() => {
    if (domain) {
      // Ha a domain lejárati dátuma után vagyunk, akkor automatikusan +1 év, egyébként +1 év a lejárati dátumtól
      const currentDate = new Date();
      const expiryDate = new Date(domain.expiryDate);
      let newExpiryDate;
      
      if (expiryDate < currentDate) {
        // Ha már lejárt, akkor a mai dátumtól +1 év
        newExpiryDate = new Date(currentDate);
        newExpiryDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        // Ha még nem járt le, akkor a lejárati dátumtól +1 év
        newExpiryDate = new Date(expiryDate);
        newExpiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      
      setFormData({
        expiryDate: newExpiryDate.toISOString().split('T')[0],
        cost: domain.cost || '',
        renewalDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'paid',
        notes: ''
      });
    }
  }, [domain]);

  if (!isOpen || !domain) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.expiryDate) {
      alert('Az új lejárati dátum megadása kötelező!');
      return;
    }

    // Létrehozzuk az előzmény objektumot a hosszabbításhoz
    const historyEntry = {
      action: 'hosszabbítás',
      date: new Date(formData.renewalDate).toISOString(),
      details: `Domain meghosszabbítva eddig: ${formData.expiryDate}. ${formData.notes}`
    };

    // Összeállítjuk a frissített domain objektumot
    const updatedDomain = {
      ...domain,
      expiryDate: new Date(formData.expiryDate).toISOString(),
      cost: parseFloat(formData.cost) || domain.cost,
      status: 'active',
      paymentStatus: formData.paymentStatus,
      // Az előzmények kezelése: ha már van előzmény, hozzáadjuk, ha nincs, létrehozzuk
      history: domain.history && Array.isArray(domain.history) 
        ? [...domain.history, historyEntry] 
        : [historyEntry]
    };

    onSave(updatedDomain);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <RotateCw className="h-5 w-5 mr-2 text-green-600" />
            Domain Hosszabbítás: {domain.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-2">
          <div className="flex items-center text-sm text-blue-800">
            <Clock className="h-4 w-4 mr-1" />
            <span>Jelenlegi lejárati dátum: </span>
            <span className="font-semibold ml-1">{new Date(domain.expiryDate).toLocaleDateString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Új Lejárati Dátum*
            </label>
            <div className="relative mt-1">
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hosszabbítás Költsége (EUR)*
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({...formData, cost: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="EUR"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hosszabbítás Dátuma*
            </label>
            <div className="relative mt-1">
              <input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({...formData, renewalDate: e.target.value})}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fizetési Státusz
            </label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="paid">Kifizetve</option>
              <option value="pending">Függőben</option>
              <option value="overdue">Késedelmes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Megjegyzések
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Pl.: Hosszabbítási referenciaszám, egyéb megjegyzések..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Mégsem
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              Hosszabbítás Megerősítése
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainRenewalModal;