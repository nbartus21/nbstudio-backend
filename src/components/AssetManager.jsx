import React, { useState, useEffect } from 'react';
import Card from './Card';

const API_URL = 'https://admin.nb-studio.net:5001';

const AssetManager = () => {
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'hardware',
    purchaseDate: '',
    purchasePrice: '',
    depreciation: '3',
    vendor: '',
    invoiceNumber: '',
    status: 'active'
  });

  const assetCategories = [
    { id: 'hardware', name: 'Hardver', depreciationYears: 3 },
    { id: 'software', name: 'Szoftver', depreciationYears: 3 },
    { id: 'office', name: 'Iroda Felszerelés', depreciationYears: 7 },
    { id: 'education', name: 'Oktatási Anyagok', depreciationYears: 2 },
    { id: 'licenses', name: 'Licenszek', depreciationYears: 1 }
  ];

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });
      const data = await response.json();
      setAssets(data);
    } catch (error) {
      console.error('Hiba az eszközök lekérésekor:', error);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const calculateDepreciation = (asset) => {
    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const yearsPassed = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
    const category = assetCategories.find(cat => cat.id === asset.category);
    const depreciationYears = category?.depreciationYears || 3;
    
    const currentValue = asset.purchasePrice * Math.max(0, 1 - (yearsPassed / depreciationYears));
    return Math.round(currentValue);
  };

  const filteredAssets = selectedCategory === 'all' 
    ? assets 
    : assets.filter(asset => asset.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">Minden kategória</option>
            {assetCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Új Eszköz Hozzáadása
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => {
          const currentValue = calculateDepreciation(asset);
          const depreciation = asset.purchasePrice - currentValue;
          
          return (
            <Card key={asset._id}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{asset.name}</h3>
                    <p className="text-sm text-gray-500">
                      {assetCategories.find(cat => cat.id === asset.category)?.name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    asset.status === 'active' ? 'bg-green-100 text-green-800' :
                    asset.status === 'deprecated' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {asset.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beszerzési ár:</span>
                    <span className="font-medium">{asset.purchasePrice.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Jelenlegi érték:</span>
                    <span className="font-medium">{currentValue.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Értékcsökkenés:</span>
                    <span className="font-medium text-red-600">
                      -{depreciation.toLocaleString()} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beszerzés dátuma:</span>
                    <span>{new Date(asset.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Számla szám:</span>
                    <span>{asset.invoiceNumber}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleEditAsset(asset)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Szerkesztés
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset._id)}
                    className="text-sm text-red-600 hover:text-red-900"
                  >
                    Törlés
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <AssetForm 
              asset={null}
              onSave={handleAddAsset}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManager;