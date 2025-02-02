import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TransactionModal = ({ isOpen, onClose, onSave, transaction = null }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    category: 'other',
    amount: '',
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    description: '',
    invoiceNumber: '',
    paymentStatus: 'pending',
    dueDate: '',
    isRecurring: false,
    recurringInterval: 'monthly',
    taxDeductible: false,
    taxCategory: '',
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        ...transaction,
        date: new Date(transaction.date).toISOString().split('T')[0],
        dueDate: transaction.dueDate ? new Date(transaction.dueDate).toISOString().split('T')[0] : ''
      });
    }
  }, [transaction]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {transaction ? 'Tétel szerkesztése' : 'Új tétel hozzáadása'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alap adatok */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Típus</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="income">Bevétel</option>
                <option value="expense">Kiadás</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kategória</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="project_invoice">Projekt számla</option>
                <option value="server_cost">Szerver költség</option>
                <option value="license_cost">Licensz költség</option>
                <option value="education">Oktatás</option>
                <option value="software">Szoftver</option>
                <option value="service">Szolgáltatás</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Összeg</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="flex-1 rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  step="0.01"
                  required
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                  EUR
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Dátum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Számla adatok */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Leírás</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Számlaszám</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fizetési státusz</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="pending">Függőben</option>
                <option value="paid">Fizetve</option>
                <option value="overdue">Késedelmes</option>
                <option value="cancelled">Törölve</option>
              </select>
            </div>

            {/* Ismétlődés */}
            <div className="col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  Ismétlődő tétel
                </label>
              </div>

              {formData.isRecurring && (
                <div className="mt-2">
                  <select
                    value={formData.recurringInterval}
                    onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="monthly">Havonta</option>
                      <option value="quarterly">Negyedévente</option>
                      <option value="yearly">Évente</option>
                    </select>
                  </div>
                )}
              </div>
  
              {/* Adózási információk */}
              <div className="col-span-2 border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="taxDeductible"
                    checked={formData.taxDeductible}
                    onChange={(e) => setFormData({ ...formData, taxDeductible: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="taxDeductible" className="ml-2 block text-sm text-gray-900">
                    Adóból leírható tétel
                  </label>
                </div>
  
                {formData.taxDeductible && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Adó kategória</label>
                    <select
                      value={formData.taxCategory}
                      onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Válassz kategóriát...</option>
                      <option value="infrastructure">Infrastruktúra</option>
                      <option value="software">Szoftver</option>
                      <option value="education">Oktatás</option>
                      <option value="office">Iroda</option>
                      <option value="travel">Utazás</option>
                      <option value="other">Egyéb</option>
                    </select>
                  </div>
                )}
              </div>
  
              {/* Jegyzetek */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Jegyzetek</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
  
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Mégsem
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                {transaction ? 'Mentés' : 'Hozzáadás'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  export default TransactionModal;