import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import Card, { CardHeader, CardTitle, CardContent } from './Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// SVG ikonok komponensek
const PaidIcon = () => <span className="text-green-500">✓</span>;
const UnpaidIcon = () => <span className="text-red-500">✘</span>;
const OverdueIcon = () => <span className="text-yellow-500">⚠</span>;
const PartialIcon = () => <span className="text-orange-500">~</span>;

// Új Modal komponens
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-lg w-full m-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Új Asset Modal komponens
const AssetModal = ({ isOpen, onClose, onSave }) => {
  const [assetData, setAssetData] = useState({
    name: '',
    type: 'purchase',
    amount: '',
    purchaseDate: '',
    category: 'software',
    description: '',
    recurring: false,
    recurringPeriod: 'none',
    depreciationYears: 3,
    taxDeductible: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(assetData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Új eszköz hozzáadása</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Megnevezés</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={assetData.name}
            onChange={(e) => setAssetData({...assetData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Típus</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={assetData.type}
            onChange={(e) => setAssetData({...assetData, type: e.target.value})}
          >
            <option value="purchase">Vásárlás</option>
            <option value="rental">Bérlés</option>
            <option value="subscription">Előfizetés</option>
            <option value="license">Licensz</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Összeg (EUR)</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md"
            value={assetData.amount}
            onChange={(e) => setAssetData({...assetData, amount: e.target.value})}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Mentés
        </button>
      </form>
    </Modal>
  );
};

// Új Expense Modal komponens
const ExpenseModal = ({ isOpen, onClose, onSave }) => {
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    date: '',
    category: 'office',
    taxDeductible: true,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(expenseData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Új költség hozzáadása</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Leírás</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={expenseData.description}
            onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Összeg (EUR)</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md"
            value={expenseData.amount}
            onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kategória</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={expenseData.category}
            onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
          >
            <option value="office">Iroda</option>
            <option value="travel">Utazás</option>
            <option value="education">Oktatás</option>
            <option value="marketing">Marketing</option>
            <option value="utilities">Rezsi</option>
            <option value="other">Egyéb</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Mentés
        </button>
      </form>
    </Modal>
  );
};

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [assets, setAssets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accountingSummary, setAccountingSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    taxableIncome: 0,
    estimatedTax: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });

  // Számlák lekérése
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a projekteket');
      }
  
      const projects = await response.json();
      const allInvoices = projects.flatMap(project => 
        (project.invoices || []).map(invoice => ({
          ...invoice,
          projectName: project.name,
          projectId: project._id,
          client: project.client
        }))
      );
      setInvoices(allInvoices);
      calculateStatistics(allInvoices);
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült betölteni a számlákat');
    } finally {
      setLoading(false);
    }
  };

  // Könyvelési adatok lekérése
  const fetchAccountingData = async () => {
    try {
      const response = await api.get(`${API_URL}/accounting/${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a könyvelési adatokat');
      }

      const data = await response.json();
      setAssets(data.assets || []);
      setExpenses(data.expenses || []);
      setAccountingSummary(data.summary || {});
    } catch (error) {
      console.error('Hiba a könyvelési adatok betöltésekor:', error);
      setError('Nem sikerült betölteni a könyvelési adatokat');
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchAccountingData();
  }, [selectedYear]);

  // Számla törlése
  const deleteInvoice = async (projectId, invoiceId) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a számlát?')) return;
  
    try {
      const response = await api.delete(`${API_URL}/projects/${projectId}/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'x-api-key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });
  
      if (!response.ok) {
        throw new Error('Nem sikerült törölni a számlát');
      }
  
      await fetchInvoices();
      if (selectedInvoice?._id === invoiceId) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült törölni a számlát');
    }
  };

  // Számla státusz frissítése
  const updateInvoiceStatus = async (projectId, invoiceId, status) => {
    try {
      const response = await api.put(`${API_URL}/projects/${projectId}/invoices/${invoiceId}`, {
        status
      }, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'x-api-key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0',
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error('Nem sikerült frissíteni a számlát');
      }
  
      await fetchInvoices();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült frissíteni a számla státuszát');
    }
  };

  // Új eszköz hozzáadása
  const handleAddAsset = async (assetData) => {
    try {
      const response = await api.post(`${API_URL}/accounting/assets`, assetData, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült hozzáadni az eszközt');
      }

      await fetchAccountingData();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült hozzáadni az eszközt');
    }
  };

  // Új költség hozzáadása
  const handleAddExpense = async (expenseData) => {
    try {
      const response = await api.post(`${API_URL}/accounting/expenses`, expenseData, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült hozzáadni a költséget');
      }

      await fetchAccountingData();
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült hozzáadni a költséget');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Számla és Könyvelés Kezelő</h1>
        <div className="flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Könyvelési áttekintés */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Könyvelési Áttekintés - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bevételek */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bevételek</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Számlázott összeg:</span>
                  <span className="font-medium">{accountingSummary.totalIncome.toLocaleString()} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Befizetett összeg:</span>
                  <span className="font-medium text-green-600">
                    {accountingSummary.paidAmount?.toLocaleString()} €
                  </span>
                </div>
              </div>
            </div>

            {/* Költségek */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Költségek</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Eszközök és licenszek:</span>
                  <span className="font-medium text-red-600">
                    {assets.reduce((sum, asset) => sum + (asset.amount || 0), 0).toLocaleString()} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Egyéb költségek:</span>
                  <span className="font-medium text-red-600">
                    {expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toLocaleString()} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Éves összesítő */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Éves Összesítés</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Adóalap:</p>
                <p className="text-xl font-semibold">
                  {accountingSummary.taxableIncome.toLocaleString()} €
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Becsült adó (27%):</p>
                <p className="text-xl font-semibold text-orange-600">
                  {accountingSummary.estimatedTax.toLocaleString()} €
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eszközök és költségek */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Eszközök */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Eszközök és Licenszek</CardTitle>
              <button 
                onClick={() => setShowAssetModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                + Új eszköz
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {assets.map((asset) => (
                <div key={asset._id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{asset.name}</h4>
                      <p className="text-sm text-gray-500">
                        {asset.type === 'subscription' ? 'Előfizetés' : 
                         asset.type === 'license' ? 'Licensz' : 
                         asset.type === 'rental' ? 'Bérlés' : 'Eszköz'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{asset.amount.toLocaleString()} €</p>
                      <p className="text-sm text-gray-500">
                        {new Date(asset.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Költségek */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Egyéb Költségek</CardTitle>
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                + Új költség
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {expenses.map((expense) => (
                <div key={expense._id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{expense.description}</h4>
                      <p className="text-sm text-gray-500">{expense.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{expense.amount.toLocaleString()} €</p>
                      <p className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Számlák szekció */}
      <Card>
        <CardHeader>
          <CardTitle>Számlák</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Szűrők */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keresés</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="Projekt vagy ügyfél név..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Státusz</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">Összes</option>
                <option value="kiállított">Kiállított</option>
                <option value="fizetett">Fizetett</option>
                <option value="késedelmes">Késedelmes</option>
                <option value="részletfizetés">Részletfizetés</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Időszak</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              >
                <option value="all">Összes</option>
                <option value="week">Elmúlt 7 nap</option>
                <option value="month">Elmúlt 30 nap</option>
                <option value="quarter">Elmúlt 90 nap</option>
              </select>
            </div>
          </div>

          {/* Számlák táblázata */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Számla szám
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projekt / Ügyfél
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dátum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Összeg
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Státusz
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{invoice.projectName}</div>
                      <div className="text-sm text-gray-500">{invoice.client?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.totalAmount?.toLocaleString()} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowModal(true);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
                      >
                        Részletek
                      </button>
                      <button
                        onClick={() => deleteInvoice(invoice.projectId, invoice._id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        Törlés
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modálok */}
      <AssetModal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        onSave={handleAddAsset}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSave={handleAddExpense}
      />

      {/* Számla részletek modal */}
      {showModal && selectedInvoice && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Számla Részletek</h2>
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Projekt Adatok</h3>
                <p>Projekt: {selectedInvoice.projectName}</p>
                <p>Ügyfél: {selectedInvoice.client?.name}</p>
                <p>Számla szám: {selectedInvoice.number}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Fizetési Adatok</h3>
                <p>Összeg: {selectedInvoice.totalAmount?.toLocaleString()} €</p>
                <p>Státusz: {selectedInvoice.status}</p>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  deleteInvoice(selectedInvoice.projectId, selectedInvoice._id);
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Törlés
              </button>
              <button
                onClick={() => {
                  updateInvoiceStatus(selectedInvoice.projectId, selectedInvoice._id, 'fizetett');
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Fizetettnek jelölés
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InvoiceManager;