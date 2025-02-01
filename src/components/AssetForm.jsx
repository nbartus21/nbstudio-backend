import React, { useState } from 'react';

const AssetForm = ({ asset, onSave, onCancel }) => {
  const [formData, setFormData] = useState(asset || {
    name: '',
    category: 'hardware',
    purchaseDate: '',
    purchasePrice: '',
    depreciation: '3',
    vendor: '',
    invoiceNumber: '',
    status: 'active',
    description: '',
    warrantyExpiration: '',
    location: 'office'
  });

  const locations = [
    { id: 'office', name: 'Iroda' },
    { id: 'home', name: 'Otthoni iroda' },
    { id: 'mobile', name: 'Mobil' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {asset ? 'Eszköz Szerkesztése' : 'Új Eszköz Hozzáadása'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Megnevezés*
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategória*
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            {assetCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beszerzés dátuma*
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beszerzési ár (€)*
          </label>
          <input
            type="number"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beszállító
          </label>
          <input
            type="text"
            value={formData.vendor}
            onChange={(e) => setFormData({...formData, vendor: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Számla szám
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Garancia lejárata
          </label>
          <input
            type="date"
            value={formData.warrantyExpiration}
            onChange={(e) => setFormData({...formData, warrantyExpiration: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Helyszín
          </label>
          <select
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leírás
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Mégse
        </button>
        <button
          type="button"
          onClick={() => onSave(formData)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
        >
          {asset ? 'Mentés' : 'Hozzáadás'}
        </button>
      </div>
    </div>
  );
};

export default AssetForm;