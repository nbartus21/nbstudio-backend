import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Search,
  Globe,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Card komponens
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
};

const SettingsManager = () => {
  // Állapotok
  const [settings, setSettings] = useState([]);
  const [filteredSettings, setFilteredSettings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    categories: {}
  });

  // Beállítások lekérése
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`${API_URL}/settings`);
      if (!response.ok) throw new Error('Nem sikerült lekérni a beállításokat');
      
      const data = await response.json();
      setSettings(data);
      
      // Statisztikák számítása
      const categories = {};
      data.forEach(setting => {
        if (!categories[setting.category]) {
          categories[setting.category] = 0;
        }
        categories[setting.category]++;
      });
      
      setStats({
        total: data.length,
        categories
      });
      
    } catch (err) {
      console.error('Hiba a beállítások lekérésekor:', err);
      setError('Nem sikerült lekérni a beállításokat. Kérjük, próbálja újra később.');
    } finally {
      setLoading(false);
    }
  };

  // Beállítások szűrése
  useEffect(() => {
    if (!settings.length) return;
    
    let filtered = [...settings];
    
    // Keresés
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(setting => 
        setting.key.toLowerCase().includes(term) || 
        (setting.description && setting.description.toLowerCase().includes(term))
      );
    }
    
    // Kategória szűrés
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(setting => setting.category === categoryFilter);
    }
    
    setFilteredSettings(filtered);
  }, [settings, searchTerm, categoryFilter]);

  // Kezdeti adatok betöltése
  useEffect(() => {
    fetchSettings();
  }, []);

  // Üzenet megjelenítése
  const showMessage = (setterFunction, message) => {
    setterFunction(message);
    setTimeout(() => setterFunction(null), 5000);
  };

  // Beállítás törlése
  const handleDeleteSetting = async (key) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a beállítást?')) return;
    
    try {
      const response = await api.delete(`${API_URL}/settings/${key}`);
      if (!response.ok) throw new Error('Nem sikerült törölni a beállítást');
      
      await fetchSettings();
      showMessage(setSuccessMessage, 'Beállítás sikeresen törölve');
    } catch (err) {
      console.error('Hiba a beállítás törlésekor:', err);
      setError('Nem sikerült törölni a beállítást. Kérjük, próbálja újra később.');
    }
  };

  // Beállítás mentése
  const handleSaveSetting = async (e) => {
    e.preventDefault();
    
    try {
      // Érték konvertálása a megfelelő típusra
      let parsedValue = selectedSetting.value;
      
      // Ha boolean érték, akkor konvertáljuk
      if (parsedValue === 'true') parsedValue = true;
      if (parsedValue === 'false') parsedValue = false;
      
      // Ha szám, akkor konvertáljuk
      if (!isNaN(parsedValue) && parsedValue !== '') {
        parsedValue = Number(parsedValue);
      }
      
      const settingData = {
        key: selectedSetting.key,
        value: parsedValue,
        description: selectedSetting.description,
        category: selectedSetting.category
      };
      
      const response = await api.post(`${API_URL}/settings`, settingData);
      if (!response.ok) throw new Error('Nem sikerült menteni a beállítást');
      
      await fetchSettings();
      setShowModal(false);
      setSelectedSetting(null);
      showMessage(setSuccessMessage, 'Beállítás sikeresen mentve');
    } catch (err) {
      console.error('Hiba a beállítás mentésekor:', err);
      setError('Nem sikerült menteni a beállítást. Kérjük, próbálja újra később.');
    }
  };

  // Beállítás típusának meghatározása
  const getSettingType = (value) => {
    if (value === true || value === false) return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'unknown';
  };

  // Beállítás értékének megjelenítése
  const renderSettingValue = (setting) => {
    const type = getSettingType(setting.value);
    
    switch (type) {
      case 'boolean':
        return (
          <span className="flex items-center">
            {setting.value ? 
              <ToggleRight className="h-5 w-5 text-green-500 mr-1" /> : 
              <ToggleLeft className="h-5 w-5 text-gray-400 mr-1" />
            }
            {setting.value ? 'Bekapcsolva' : 'Kikapcsolva'}
          </span>
        );
      case 'number':
        return <span>{setting.value}</span>;
      case 'string':
        return <span>{setting.value}</span>;
      case 'array':
        return <span>{JSON.stringify(setting.value)}</span>;
      case 'object':
        return <span>{JSON.stringify(setting.value)}</span>;
      default:
        return <span>{String(setting.value)}</span>;
    }
  };

  // Beállítás értékének szerkesztése
  const renderSettingValueEditor = () => {
    if (!selectedSetting) return null;
    
    const type = getSettingType(selectedSetting.value);
    
    switch (type) {
      case 'boolean':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Érték</label>
            <select
              value={String(selectedSetting.value)}
              onChange={(e) => setSelectedSetting({...selectedSetting, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="true">Bekapcsolva</option>
              <option value="false">Kikapcsolva</option>
            </select>
          </div>
        );
      case 'number':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Érték</label>
            <input
              type="number"
              value={selectedSetting.value}
              onChange={(e) => setSelectedSetting({...selectedSetting, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        );
      case 'string':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Érték</label>
            <input
              type="text"
              value={selectedSetting.value}
              onChange={(e) => setSelectedSetting({...selectedSetting, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        );
      case 'array':
      case 'object':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Érték (JSON)</label>
            <textarea
              value={JSON.stringify(selectedSetting.value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setSelectedSetting({...selectedSetting, value: parsed});
                } catch (err) {
                  // Ha nem valid JSON, akkor csak a szöveget tároljuk
                  setSelectedSetting({...selectedSetting, value: e.target.value});
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={5}
            />
          </div>
        );
      default:
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Érték</label>
            <input
              type="text"
              value={String(selectedSetting.value)}
              onChange={(e) => setSelectedSetting({...selectedSetting, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        );
    }
  };

  // Kategóriák listája
  const categories = ['all', ...Object.keys(stats.categories)].filter(c => c !== 'undefined');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Fejléc */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Beállítások</h1>
            <p className="text-gray-500 mt-1">Rendszerbeállítások kezelése</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={fetchSettings}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Frissítés
            </button>
            
            <button
              onClick={() => {
                setSelectedSetting({
                  key: '',
                  value: '',
                  description: '',
                  category: 'general'
                });
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Új beállítás
            </button>
          </div>
        </div>

        {/* Hibaüzenet */}
        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Sikeres művelet üzenet */}
        {successMessage && (
          <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Statisztika kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes beállítás</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Weboldal beállítások</p>
                <p className="text-2xl font-bold">{stats.categories.website || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Szűrők */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Keresés kulcs vagy leírás alapján..."
                className="pl-10 pr-3 py-2 w-full border rounded-md"
              />
            </div>

            <div className="flex-grow-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border rounded-md"
              >
                <option value="all">Összes kategória</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Szűrők törlése
            </button>
          </div>
        </div>

        {/* Beállítások lista */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
              <p className="text-gray-500">Beállítások betöltése...</p>
            </div>
          ) : (
            <>
              {filteredSettings.length === 0 ? (
                <div className="text-center p-8">
                  <div className="text-gray-400 mb-2">
                    <Settings className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nincs találat</h3>
                  <p className="text-gray-500">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Próbálja meg módosítani a szűrőket'
                      : 'Hozzon létre egy új beállítást'
                    }
                  </p>
                  {!searchTerm && categoryFilter === 'all' && (
                    <button
                      onClick={() => {
                        setSelectedSetting({
                          key: '',
                          value: '',
                          description: '',
                          category: 'general'
                        });
                        setShowModal(true);
                      }}
                      className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Új beállítás
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kulcs
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Érték
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leírás
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategória
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frissítve
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Műveletek
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSettings.map((setting) => (
                        <tr key={setting.key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{setting.key}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {renderSettingValue(setting)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{setting.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {setting.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(setting.updatedAt).toLocaleDateString('hu-HU', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedSetting(setting);
                                setShowModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              title="Szerkesztés"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSetting(setting.key)}
                              className="text-red-600 hover:text-red-900"
                              title="Törlés"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Beállítás szerkesztő/létrehozó modal */}
      {showModal && selectedSetting && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedSetting.key ? 'Beállítás szerkesztése' : 'Új beállítás létrehozása'}
            </h2>
            
            <form onSubmit={handleSaveSetting}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kulcs</label>
                <input
                  type="text"
                  value={selectedSetting.key}
                  onChange={(e) => setSelectedSetting({...selectedSetting, key: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              {renderSettingValueEditor()}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
                <textarea
                  value={selectedSetting.description || ''}
                  onChange={(e) => setSelectedSetting({...selectedSetting, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
                <select
                  value={selectedSetting.category}
                  onChange={(e) => setSelectedSetting({...selectedSetting, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="general">Általános</option>
                  <option value="website">Weboldal</option>
                  <option value="email">Email</option>
                  <option value="system">Rendszer</option>
                  <option value="security">Biztonság</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedSetting(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Mégsem
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
