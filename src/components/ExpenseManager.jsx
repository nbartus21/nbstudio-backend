import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Filter, PlusCircle, Search, Calendar, Clock, CreditCard, Tag, Check, X } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import Card from './ui/Card';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// Dummy adatok a kezdéshez, amíg a backend API elkészül
const DUMMY_EXPENSES = [
  {
    _id: 'exp1',
    name: 'Domain bérlés',
    type: 'subscription',
    amount: 20,
    date: new Date('2023-05-15'),
    recurring: true,
    interval: 'yearly',
    taxDeductible: true,
    taxCategory: 'office-supplies',
    description: 'Éves domain megújítás',
    invoiceNumber: 'INV-2023-001'
  },
  {
    _id: 'exp2',
    name: 'Hosting szolgáltatás',
    type: 'subscription',
    amount: 15,
    date: new Date('2023-06-01'),
    recurring: true,
    interval: 'monthly',
    taxDeductible: true,
    taxCategory: 'software-licenses',
    description: 'Havi szerverbérlés',
    invoiceNumber: 'INV-2023-002'
  },
  {
    _id: 'exp3',
    name: 'Szoftver licensz',
    type: 'software',
    amount: 299,
    date: new Date('2023-06-10'),
    recurring: false,
    taxDeductible: true,
    taxCategory: 'software-licenses',
    description: 'Adobe licensz',
    invoiceNumber: 'INV-2023-003'
  }
];

const ExpenseManager = () => {
  // Állapotok
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState({
    type: '',
    startDate: '',
    endDate: '',
    recurring: '',
    searchTerm: '',
  });
  const [stats, setStats] = useState({
    totalExpenses: 0,
    recurringExpenses: 0,
    monthlyTotal: 0,
    yearlyTotal: 0,
    byCategory: {}
  });

  // Adatok betöltése
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Kiadások lekérése
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      try {
        const response = await api.get(`${API_URL}/expenses`);
        if (response.ok) {
          const data = await response.json();
          setExpenses(data);
          calculateStats(data);
        } else {
          // Ha az API még nincs implementálva, használjunk dummy adatokat
          setExpenses(DUMMY_EXPENSES);
          calculateStats(DUMMY_EXPENSES);
        }
      } catch (error) {
        // A hibakezelést már az auth.js-ben kezeljük, csak a dummy adatokat állítjuk be
        setExpenses(DUMMY_EXPENSES);
        calculateStats(DUMMY_EXPENSES);
      }
      
      setError(null);
    } catch (error) {
      // Ez a ág csak súlyos hibák esetén fut le, amit nem lehet figyelmen kívül hagyni
      setError('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  // Statisztikák számítása
  const calculateStats = (expenseData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const byCategory = {};
    let totalExpenses = 0;
    let recurringExpenses = 0;
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    
    expenseData.forEach(expense => {
      const amount = parseFloat(expense.amount);
      totalExpenses += amount;
      
      // Kategóriák szerinti csoportosítás
      if (!byCategory[expense.type]) {
        byCategory[expense.type] = 0;
      }
      byCategory[expense.type] += amount;
      
      // Ismétlődő kiadások számolása
      if (expense.recurring) {
        recurringExpenses += amount;
      }
      
      // Havi és éves összegek
      const expenseDate = new Date(expense.date);
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
        monthlyTotal += amount;
      }
      
      if (expenseDate.getFullYear() === currentYear) {
        yearlyTotal += amount;
      }
    });
    
    setStats({
      totalExpenses,
      recurringExpenses,
      monthlyTotal,
      yearlyTotal,
      byCategory
    });
  };

  // Kiadás mentése
  const handleSaveExpense = async (expenseData) => {
    try {
      setLoading(true);
      
      try {
        // Ha van kiválasztott kiadás, akkor frissítjük
        if (selectedExpense) {
          const response = await api.put(`${API_URL}/expenses/${selectedExpense._id}`, expenseData);
          
          if (!response.ok) {
            // Ha az API még nincs implementálva, szimulálunk egy sikeres választ
            // Frissítjük a helyi adatokat
            const updatedExpenses = expenses.map(expense => 
              expense._id === selectedExpense._id ? { ...expenseData, _id: selectedExpense._id } : expense
            );
            
            setExpenses(updatedExpenses);
            calculateStats(updatedExpenses);
          } else {
            await fetchExpenses();
          }
          
          setSuccess('Kiadás sikeresen frissítve!');
        } else {
          // Új kiadás létrehozása
          const response = await api.post(`${API_URL}/expenses`, expenseData);
          
          if (!response.ok) {
            // Ha az API még nincs implementálva, szimulálunk egy sikeres választ
            // Hozzáadjuk az új adatot a helyi adatokhoz egy generált ID-val
            const newExpense = {
              ...expenseData,
              _id: 'exp' + (expenses.length + 1),
              date: expenseData.date ? new Date(expenseData.date) : new Date()
            };
            
            const updatedExpenses = [...expenses, newExpense];
            setExpenses(updatedExpenses);
            calculateStats(updatedExpenses);
          } else {
            await fetchExpenses();
          }
          
          setSuccess('Új kiadás sikeresen hozzáadva!');
        }
      } catch (error) {
        // Visszaesési terv API hiba esetén - helyileg kezeljük
        if (selectedExpense) {
          const updatedExpenses = expenses.map(expense => 
            expense._id === selectedExpense._id ? { ...expenseData, _id: selectedExpense._id } : expense
          );
          
          setExpenses(updatedExpenses);
          calculateStats(updatedExpenses);
          setSuccess('Kiadás sikeresen frissítve! (Offline mód)');
        } else {
          const newExpense = {
            ...expenseData,
            _id: 'exp' + (expenses.length + 1),
            date: expenseData.date ? new Date(expenseData.date) : new Date()
          };
          
          const updatedExpenses = [...expenses, newExpense];
          setExpenses(updatedExpenses);
          calculateStats(updatedExpenses);
          setSuccess('Új kiadás sikeresen hozzáadva! (Offline mód)');
        }
      }
      
      // Modal bezárása
      setShowExpenseModal(false);
      setSelectedExpense(null);
    } catch (error) {
      setError('Hiba történt a kiadás mentése során');
    } finally {
      setLoading(false);
    }
  };

  // Kiadás törlése
  const handleDeleteExpense = async (id) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a kiadást?')) {
      try {
        setLoading(true);
        
        try {
          const response = await api.delete(`${API_URL}/expenses/${id}`);
          
          if (!response.ok) {
            // Ha az API még nincs implementálva, szimulálunk egy sikeres választ
            // Töröljük a helyi adatokat
            const updatedExpenses = expenses.filter(expense => expense._id !== id);
            setExpenses(updatedExpenses);
            calculateStats(updatedExpenses);
          } else {
            await fetchExpenses();
          }
        } catch (error) {
          // Visszaesési terv API hiba esetén - helyileg kezeljük
          const updatedExpenses = expenses.filter(expense => expense._id !== id);
          setExpenses(updatedExpenses);
          calculateStats(updatedExpenses);
        }
        
        setSuccess('Kiadás sikeresen törölve!');
      } catch (error) {
        setError('Hiba történt a kiadás törlése során');
      } finally {
        setLoading(false);
      }
    }
  };

  // Kiadás szerkesztése
  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseModal(true);
  };

  // Kiadások exportálása
  const handleExport = () => {
    // CSV fájl előkészítése
    let csv = 'Név,Típus,Összeg,Dátum,Ismétlődő,Intervallum,Adózáshoz,Számlaszám\n';
    
    // Adatok hozzáadása
    expenses.forEach(expense => {
      const row = [
        expense.name || '',
        expense.type || '',
        expense.amount || 0,
        expense.date ? new Date(expense.date).toLocaleDateString('hu-HU') : '',
        expense.recurring ? 'Igen' : 'Nem',
        expense.interval || '',
        expense.taxDeductible ? 'Igen' : 'Nem',
        expense.invoiceNumber || ''
      ];
      
      csv += row.join(',') + '\n';
    });
    
    // Fájl letöltése
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kiadasok_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Szűrt kiadások
  const filteredExpenses = expenses.filter(expense => {
    // Szűrés típus szerint
    if (filter.type && expense.type !== filter.type) return false;
    
    // Szűrés dátum szerint
    if (filter.startDate && new Date(expense.date) < new Date(filter.startDate)) return false;
    if (filter.endDate && new Date(expense.date) > new Date(filter.endDate)) return false;
    
    // Szűrés ismétlődés szerint
    if (filter.recurring !== '' && Boolean(expense.recurring) !== (filter.recurring === 'true')) return false;
    
    // Szűrés keresési kifejezés szerint
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      return (
        (expense.name && expense.name.toLowerCase().includes(searchLower)) ||
        (expense.description && expense.description.toLowerCase().includes(searchLower)) ||
        (expense.invoiceNumber && expense.invoiceNumber.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Kiadás típusok
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

  // Formázási segédfüggvények
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'yyyy. MMMM d.', { locale: hu });
  };

  // Töltés közben
  if (loading && expenses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kiadás Kezelő</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
          >
            <Download size={18} />
            Exportálás
          </button>
          <button
            onClick={() => {
              setSelectedExpense(null);
              setShowExpenseModal(true);
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Új Kiadás
          </button>
        </div>
      </div>

      {/* Sikeres művelet vagy hiba üzenet */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}><X size={18} /></button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={18} /></button>
        </div>
      )}

      {/* Statisztikák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes Kiadás</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Havi Kiadások</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.monthlyTotal)}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Éves Kiadások</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.yearlyTotal)}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Ismétlődő Kiadások</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.recurringExpenses)}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Szűrők */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Filter size={18} />
          Szűrők
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Típus
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({...filter, type: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Összes típus</option>
              {Object.entries(expenseTypes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kezdő dátum
            </label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({...filter, startDate: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Záró dátum
            </label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({...filter, endDate: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ismétlődő
            </label>
            <select
              value={filter.recurring}
              onChange={(e) => setFilter({...filter, recurring: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Mindkettő</option>
              <option value="true">Csak ismétlődő</option>
              <option value="false">Nem ismétlődő</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keresés
            </label>
            <div className="relative">
              <input
                type="text"
                value={filter.searchTerm}
                onChange={(e) => setFilter({...filter, searchTerm: e.target.value})}
                placeholder="Név, leírás..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Kiadások lista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Név
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Típus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Összeg
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dátum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ismétlődő
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adózáshoz
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Nincsenek megjeleníthető kiadások
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      {expense.description && (
                        <div className="text-sm text-gray-500">{expense.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag size={12} className="mr-1" />
                        {expenseTypes[expense.type] || expense.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.recurring ? (
                        <div className="flex items-center text-sm text-green-600">
                          <Check size={16} className="mr-1" />
                          {expense.interval === 'monthly' && 'Havi'}
                          {expense.interval === 'quarterly' && 'Negyedéves'}
                          {expense.interval === 'yearly' && 'Éves'}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-500">
                          <X size={16} className="mr-1" />
                          Egyszeri
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.taxDeductible ? (
                        <div className="flex items-center text-sm text-green-600">
                          <Check size={16} className="mr-1" />
                          {expense.taxCategory || 'Igen'}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-500">
                          <X size={16} className="mr-1" />
                          Nem
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Szerkesztés
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Törlés
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kiadás Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setSelectedExpense(null);
        }}
        onSave={handleSaveExpense}
        expense={selectedExpense}
      />
    </div>
  );
};

export default ExpenseManager; 