import React, { useState, useEffect } from 'react';

const ExpenseModal = ({ isOpen, onClose, onSave, expense = null }) => {
  const [formData, setFormData] = useState({
    type: 'subscription',
    name: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    interval: 'monthly',
    taxDeductible: true,
    taxCategory: '',
    invoiceNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        ...expense,
        date: new Date(expense.date).toISOString().split('T')[0]
      });
    }
  }, [expense]);

  const expenseTypes = {
    subscription: 'Előfizetés',
    education: 'Oktatás',
    software: 'Szoftver',
    rent: 'Bérleti díj',
    advertising: 'Reklám',
    office: 'Iroda költség',
    travel: 'Utazás',
    other: 'Egyéb'
  };

  const taxCategories = {
    'office-supplies': 'Irodaszerek',
    'software-licenses': 'Szoftver licenszek',
    'professional-education': 'Szakmai képzés',
    'advertising': 'Reklám és marketing',
    'rent': 'Bérleti díj',
    'travel': 'Üzleti utazás',
    'other': 'Egyéb'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {expense ? 'Költség Szerkesztése' : 'Új Költség Hozzáadása'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Költség Típusa
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                {Object.entries(expenseTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Megnevezés
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Összeg
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dátum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            {/* Ismétlődés beállításai */}
            <div className="col-span-2">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({...formData, recurring: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                  Ismétlődő költség
                </label>
              </div>
              
              {formData.recurring && (
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({...formData, interval: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="monthly">Havi</option>
                  <option value="quarterly">Negyedéves</option>
                  <option value="yearly">Éves</option>
                </select>
              )}
            </div>

            {/* Adózási információk */}
            <div className="col-span-2 border-t pt-4 mt-4">
              <h3 className="font-medium mb-4">Adózási Információk</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="taxDeductible"
                    checked={formData.taxDeductible}
                    onChange={(e) => setFormData({...formData, taxDeductible: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="taxDeductible" className="ml-2 block text-sm text-gray-900">
                    Adóból leírható
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adó Kategória
                  </label>
                  <select
                    value={formData.taxCategory}
                    onChange={(e) => setFormData({...formData, taxCategory: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Válassz kategóriát...</option>
                    {Object.entries(taxCategories).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Számlaszám
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            </div>

            {/* Leírás és jegyzetek */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leírás
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                rows="3"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jegyzetek
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                rows="3"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {expense ? 'Mentés' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;