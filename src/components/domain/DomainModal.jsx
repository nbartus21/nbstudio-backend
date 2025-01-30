import React, { useState, useEffect } from 'react';

const DomainModal = ({ isOpen, onClose, onSave, domain }) => {
  const [formData, setFormData] = useState({
    name: '',
    registrar: '',
    expiryDate: '',
    cost: '',
    autoRenewal: false,
    notes: ''
  });

  useEffect(() => {
    if (domain) {
      setFormData({
        ...domain,
        expiryDate: new Date(domain.expiryDate).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        name: '',
        registrar: '',
        expiryDate: '',
        cost: '',
        autoRenewal: false,
        notes: ''
      });
    }
  }, [domain]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) {
      alert('A domain név és a lejárati dátum kötelező!');
      return;
    }

    onSave({
      ...formData,
      cost: parseFloat(formData.cost) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg">
          <h2 className="text-lg font-semibold">
            {domain ? 'Domain Szerkesztése' : 'Új Domain Hozzáadása'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Domain Név*
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Regisztrátor*
              </label>
              <input
                type="text"
                value={formData.registrar}
                onChange={(e) => setFormData({...formData, registrar: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lejárati Dátum*
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
  <label className="block text-sm font-medium text-gray-700">
    Éves Költség (EUR)*
  </label>
  <input
    type="number"
    value={formData.cost}
    onChange={(e) => setFormData({...formData, cost: e.target.value})}
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    placeholder="EUR"
    required
  />
</div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRenewal"
                checked={formData.autoRenewal}
                onChange={(e) => setFormData({...formData, autoRenewal: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoRenewal" className="ml-2 block text-sm text-gray-700">
                Automatikus megújítás
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Jegyzetek
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
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
                {domain ? 'Mentés' : 'Hozzáadás'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default DomainModal;