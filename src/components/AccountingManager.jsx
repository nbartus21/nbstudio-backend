import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { api } from '../services/auth';

const AccountingManager = () => {
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('https://admin.nb-studio.net:5001/api/accounting/transactions');
      const data = await response.json();
      setTransactions(data);
      calculateStatistics(data);
    } catch (error) {
      setError('Nem sikerült betölteni a tranzakciókat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const calculateStatistics = (transactions) => {
    const stats = {
      totalIncome: 0,
      totalExpenses: 0,
      monthlyIncomes: Array(12).fill(0),
      monthlyExpenses: Array(12).fill(0),
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      const date = new Date(transaction.date);
      const month = date.getMonth();

      if (transaction.type === 'income') {
        stats.totalIncome += amount;
        stats.monthlyIncomes[month] += amount;
      } else {
        stats.totalExpenses += amount;
        stats.monthlyExpenses[month] += amount;
      }
    });

    setStatistics(stats);
  };

  // Havi statisztikák frissítése
  const updateMonthlyStats = async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = await api.get(
      `${API_URL}/accounting/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    ).then(res => res.json());

    const stats = calculateStatistics(transactions);

    return {
      ...stats,
      summary: {
        year: parseInt(year),
        month: parseInt(month)
      }
    };
  };

  // Adójelentés generálása
  const generateTaxReport = (invoices) => {
    const taxReportData = invoices.filter(invoice => invoice.status === 'fizetett');
    setTaxData(taxReportData);
  };

  // CSV exportálás
  const handleExport = () => {
    const csvContent = [
      ['Dátum', 'Típus', 'Kategória', 'Leírás', 'Összeg', 'Státusz', 'Számlaszám'],
      ...transactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd'),
        t.type === 'income' ? 'Bevétel' : 'Kiadás',
        t.category,
        t.description,
        t.amount,
        t.paymentStatus,
        t.invoiceNumber || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `konyveles_${selectedYear}_${selectedMonth}.csv`;
    link.click();
  };

  // Szinkronizálás
  const handleSync = async () => {
    try {
      setLoading(true);
      await api.post(`${API_URL}/accounting/sync`);
      await fetchData();
      setSuccess('Adatok sikeresen szinkronizálva');
    } catch (error) {
      setError('Hiba történt a szinkronizálás során');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Fejléc */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Könyvelés</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {format(new Date(2024, month - 1), 'LLLL', { locale: hu })}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Filter className="h-5 w-5 mr-2" />
              Szinkronizálás
            </button>
            <button
              onClick={() => {
                setSelectedTransaction(null);
                setShowTransactionModal(true);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Új tétel
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Download className="h-5 w-5 mr-2" />
              Exportálás
            </button>
          </div>
        </div>

        {/* Hibaüzenet és sikeres művelet visszajelzése */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Fülek */}
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              Tranzakciók
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'statistics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('statistics')}
            >
              Statisztikák
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'tax'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('tax')}
            >
              Adójelentés
            </button>
          </div>
        </div>

        {/* Tartalom */}
        <div className="space-y-6">
          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              onEdit={(transaction) => {
                setSelectedTransaction(transaction);
                setShowTransactionModal(true);
              }}
              onDelete={handleDeleteTransaction}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              fetchTransactions={fetchData}
            />
          )}

          {activeTab === 'statistics' && (
            <AccountingStats
              statistics={statistics}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />
          )}

          {activeTab === 'tax' && (
            <TaxReport
              taxData={taxData}
              onExport={handleExport}
              selectedYear={selectedYear}
            />
          )}
        </div>

        {/* Tranzakció Modal */}
        {showTransactionModal && (
          <TransactionModal
            isOpen={showTransactionModal}
            onClose={() => {
              setShowTransactionModal(false);
              setSelectedTransaction(null);
            }}
            onSave={handleSaveTransaction}
            transaction={selectedTransaction}
          />
        )}
      </div>
    </div>
  );
};

export default AccountingManager;
