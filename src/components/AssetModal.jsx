import React, { useState, useEffect } from 'react';

const AssetModal = ({ isOpen, onClose, onSave, asset = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'hardware',
    purchaseDate: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    depreciationYears: 3,
    residualValue: 0,
    location: 'office',
    status: 'active',
    warrantyUntil: '',
    invoiceNumber: '',
    supplier: '',
    notes: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        ...asset,
        purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
        warrantyUntil: asset.warrantyUntil ? new Date(asset.warrantyUntil).toISOString().split('T')[0] : ''
      });
    }
  }, [asset]);

  const assetTypes = {
    hardware: 'Számítógép/Hardware',
    software: 'Szoftver',
    office: 'Irodai Eszköz',
    furniture: 'Bútor',
    vehicle: 'Jármű',
    other: 'Egyéb'
  };

  const locations = {
    office: 'Iroda',
    home: 'Otthoni Iroda',
    mobile: 'Mobil/Hordozható',
    storage: 'Raktár'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {asset ? 'Eszköz Szerkesztése' : 'Új Eszköz Hozzáadása'}
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
            {/* Alapadatok */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eszköz Neve
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
                Eszköz Típusa
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                {Object.entries(assetTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beszerzési Ár
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
                Beszerzés Dátuma
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Értékcsökkenési Évek
              </label>
              <input
                type="number"
                value={formData.depreciationYears}
                onChange={(e) => setFormData({...formData, depreciationYears: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maradványérték
              </label>
              <input
                type="number"
                value={formData.residualValue}
                onChange={(e) => setFormData({...formData, residualValue: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Helyszín
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                {Object.entries(locations).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Garancia Lejárata
              </label>
              <input
                type="date"
                value={formData.warrantyUntil}
                onChange={(e) => setFormData({...formData, warrantyUntil: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beszállító
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

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
              {asset ? 'Mentés' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;