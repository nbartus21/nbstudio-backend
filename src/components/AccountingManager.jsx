import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, PieChart, Download } from 'lucide-react';
import Card from './ui/Card';
import ExpenseModal from './ExpenseModal';
import AssetModal from './AssetModal';
import { api } from '../services/auth';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const AccountingManager = () => {
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  // Költség kategóriák
  const categories = {
    servers: 'Szerverek',
    licenses: 'Licenszek',
    equipment: 'Eszközök',
    subscriptions: 'Előfizetések',
    education: 'Oktatás',
    software: 'Szoftverek',
    rent: 'Bérleti díjak',
    advertising: 'Reklám és Marketing',
    travel: 'Utazás',
    other: 'Egyéb'
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch from all related endpoints
      const [serverRes, licenseRes, assetsRes] = await Promise.all([
        api.get(`${API_URL}/servers`),
        api.get(`${API_URL}/licenses`),
        api.get(`${API_URL}/accounting/assets`)
      ]);

      const serverData = await serverRes.json();
      const licenseData = await licenseRes.json();
      const assetsData = await assetsRes.json();

      // Process server costs
      const serverExpenses = serverData.map(server => ({
        type: 'servers',
        name: server.name,
        amount: server.costs.monthly,
        date: new Date(),
        recurring: true,
        interval: 'monthly'
      }));

      // Process license costs
      const licenseExpenses = licenseData.map(license => ({
        type: 'licenses',
        name: license.name,
        amount: license.renewal?.cost || 0,
        date: new Date(license.renewal?.nextRenewalDate),
        recurring: true,
        interval: license.renewal?.type === 'subscription' ? 'monthly' : 'yearly'
      }));

      setExpenses([...serverExpenses, ...licenseExpenses]);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Hiba történt az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Szűrt adatok az aktív év alapján
  const filteredExpenses = expenses.filter(expense => 
    new Date(expense.date).getFullYear() === activeYear
  );
  
  const filteredAssets = assets.filter(asset => 
    new Date(asset.purchaseDate).getFullYear() === activeYear
  );

  // Havi költségek számítása
  const getMonthlyTotals = () => {
    const monthlyData = Array(12).fill(0);
    
    filteredExpenses.forEach(expense => {
      if (expense.recurring) {
        if (expense.interval === 'monthly') {
          monthlyData.forEach((_, index) => {
            monthlyData[index] += expense.amount;
          });
        } else if (expense.interval === 'yearly') {
          const expenseMonth = new Date(expense.date).getMonth();
          monthlyData[expenseMonth] += expense.amount;
        }
      } else {
        const expenseMonth = new Date(expense.date).getMonth();
        monthlyData[expenseMonth] += expense.amount;
      }
    });

    return monthlyData;
  };

  // Kategória szerinti összesítés
  const getCategoryTotals = () => {
    const categoryTotals = {};
    
    Object.keys(categories).forEach(category => {
      categoryTotals[category] = filteredExpenses
        .filter(expense => expense.type === category)
        .reduce((sum, expense) => {
          if (expense.recurring) {
            if (expense.interval === 'monthly') {
              return sum + (expense.amount * 12);
            }
            return sum + expense.amount;
          }
          return sum + expense.amount;
        }, 0);
    });

    return categoryTotals;
  };

  // Exportálás CSV-be
  const handleExport = () => {
    const csvContent = [
      ['Típus', 'Név', 'Összeg', 'Dátum', 'Kategória', 'Ismétlődő'],
      ...filteredExpenses.map(expense => [
        categories[expense.type],
        expense.name,
        expense.amount,
        new Date(expense.date).toLocaleDateString(),
        expense.recurring ? expense.interval : 'egyszeri'
      ]),
      ...filteredAssets.map(asset => [
        'Eszköz',
        asset.name,
        asset.amount,
        new Date(asset.purchaseDate).toLocaleDateString(),
        asset.type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `koltsegek_eszközök_${activeYear}.csv`;
    link.click();
  };

  const monthlyTotals = getMonthlyTotals();
  const categoryTotals = getCategoryTotals();
  const yearlyTotal = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Üzenetek */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Könyvelés</h1>
        <div className="flex gap-4">
          <select
            value={activeYear}
            onChange={(e) => setActiveYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedItem(null);
              setShowExpenseModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Új Költség
          </button>
          <button
            onClick={() => {
              setSelectedItem(null);
              setShowAssetModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Új Eszköz
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportálás
          </button>
        </div>
      </div>

      {/* Összesítő kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Éves Összes Költség</p>
              <p className="text-2xl font-bold">€{yearlyTotal.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Havi Átlag</p>
              <p className="text-2xl font-bold">
                €{(yearlyTotal / 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Eszközök Száma</p>
              <p className="text-2xl font-bold">{filteredAssets.length}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Aktív Előfizetések</p>
              <p className="text-2xl font-bold">
                {filteredExpenses.filter(e => e.recurring).length}
              </p>
            </div>
            <PieChart className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Havi költségek grafikon */}
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Havi Költségek</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTotals.map((amount, index) => ({
                month: new Date(2024, index).toLocaleString('hu-HU', { month: 'short' }),
                amount
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Kategória szerinti bontás */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Kategória Szerinti Bontás</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={Object.entries(categoryTotals)
                      .filter(([_, value]) => value > 0)
                      .map(([category, value]) => ({
                        name: categories[category],
                        value
                      }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {Object.entries(categoryTotals)
                      .filter(([_, value]) => value > 0)
                      .map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Eszközök lista */}
        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Eszközök</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredAssets.map((asset) => (
                <div key={asset._id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(asset.purchaseDate).toLocaleDateString()} - €{asset.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedItem(asset);
                        setShowAssetModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Szerkesztés
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Modálok */}
      {showExpenseModal && (
        <ExpenseModal
          isOpen={showExpenseModal}
          onClose={() => {
            setShowExpenseModal(false);
            setSelectedItem(null);
          }}
          onSave={async (data) => {
            try {
              if (selectedItem) {
                await api.put(`${API_URL}/accounting/expenses/${selectedItem._id}`, data);
                setSuccess('Költség sikeresen frissítve!');
              } else {
                await api.post(`${API_URL}/accounting/expenses`, data);
                setSuccess('Új költség sikeresen hozzáadva!');
              }
              await fetchData();
              setShowExpenseModal(false);
              setSelectedItem(null);
            } catch (error) {
              console.error('Hiba a költség mentésekor:', error);
              setError('Hiba történt a költség mentése során');
            }
          }}
          expense={selectedItem}
        />
      )}

      {showAssetModal && (
        <AssetModal
          isOpen={showAssetModal}
          onClose={() => {
            setShowAssetModal(false);
            setSelectedItem(null);
          }}
          onSave={async (data) => {
            try {
              if (selectedItem) {
                await api.put(`${API_URL}/accounting/assets/${selectedItem._id}`, data);
                setSuccess('Eszköz sikeresen frissítve!');
              } else {
                await api.post(`${API_URL}/accounting/assets`, data);
                setSuccess('Új eszköz sikeresen hozzáadva!');
              }
              await fetchData();
              setShowAssetModal(false);
              setSelectedItem(null);
            } catch (error) {
              console.error('Hiba az eszköz mentésekor:', error);
              setError('Hiba történt az eszköz mentése során');
            }
          }}
          asset={selectedItem}
        />
      )}
    </div>
  );
};

export default AccountingManager;