import React, { useState, useEffect } from 'react';

const LicenseModal = ({ isOpen, onClose, onSave, license = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'wordpress-plugin',
    key: {
      value: '',
      issuedTo: ''
    },
    vendor: {
      name: '',
      website: '',
      supportEmail: ''
    },
    purchase: {
      date: '',
      cost: 0,
      currency: 'EUR'
    },
    renewal: {
      type: 'subscription',
      nextRenewalDate: '',
      cost: 0,
      autoRenewal: false
    },
    status: 'active'
  });

  useEffect(() => {
    if (license) {
      // Ha módosítunk, átmásoljuk az összes mezőt
      setFormData({ ...license });
    } else {
      // Ha új licenszet hozunk létre, alapértelmezett értékeket használunk
      setFormData({
        name: '',
        type: 'wordpress-plugin',
        key: {
          value: '',
          issuedTo: ''
        },
        vendor: {
          name: '',
          website: '',
          supportEmail: ''
        },
        purchase: {
          date: '',
          cost: 0,
          currency: 'EUR'
        },
        renewal: {
          type: 'subscription',
          nextRenewalDate: '',
          cost: 0,
          autoRenewal: false
        },
        status: 'active'
      });
    }
  }, [license]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {license ? 'Licensz Szerkesztése' : 'Új Licensz'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Név</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Típus</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="wordpress-plugin">WordPress Plugin</option>
              <option value="wordpress-theme">WordPress Téma</option>
              <option value="software">Szoftver</option>
              <option value="service">Szolgáltatás</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Licensz Kulcs</label>
            <input
              type="text"
              value={formData.key.value}
              onChange={(e) => setFormData({
                ...formData,
                key: {...formData.key, value: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kiállítva</label>
            <input
              type="text"
              value={formData.key.issuedTo}
              onChange={(e) => setFormData({
                ...formData,
                key: {...formData.key, issuedTo: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Szállító</label>
            <input
              type="text"
              value={formData.vendor.name}
              onChange={(e) => setFormData({
                ...formData,
                vendor: {...formData.vendor, name: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Beszerzés Dátuma</label>
            <input
              type="date"
              value={formData.purchase.date}
              onChange={(e) => setFormData({
                ...formData,
                purchase: {...formData.purchase, date: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Beszerzési Költség</label>
            <input
              type="number"
              value={formData.purchase.cost}
              onChange={(e) => setFormData({
                ...formData,
                purchase: {...formData.purchase, cost: parseFloat(e.target.value)}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Következő Megújítás</label>
            <input
              type="date"
              value={formData.renewal.nextRenewalDate}
              onChange={(e) => setFormData({
                ...formData,
                renewal: {...formData.renewal, nextRenewalDate: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Megújítási Költség</label>
            <input
              type="number"
              value={formData.renewal.cost}
              onChange={(e) => setFormData({
                ...formData,
                renewal: {...formData.renewal, cost: parseFloat(e.target.value)}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.renewal.autoRenewal}
                onChange={(e) => setFormData({
                  ...formData,
                  renewal: {...formData.renewal, autoRenewal: e.target.checked}
                })}
                className="mr-2"
              />
              <span className="text-sm">Automatikus megújítás</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Mégse
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default LicenseModal;