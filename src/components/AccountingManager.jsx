import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Filter, PlusCircle } from 'lucide-react';
import TransactionList from './TransactionList';
import TransactionModal from './TransactionModal';
import AccountingStats from './AccountingStats';
import TaxReport from './TaxReport';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const AccountingManager = () => {
  // Állapotok
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Adatok betöltése
  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, statsRes, taxRes, projectsRes] = await Promise.all([
        api.get(`${API_URL}/accounting/transactions?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`${API_URL}/accounting/statistics?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`${API_URL}/accounting/tax-report?year=${selectedYear}`),
        api.get(`${API_URL}/projects`)
      ]);

      const [transactionsData, statsData, taxData, projectsData] = await Promise.all([
        transactionsRes.json(),
        statsRes.json(),
        taxRes.json(),
        projectsRes.json()
      ]);

      setTransactions(transactionsData);
      setStatistics(statsData);
      setTaxData(taxData);
      setProjects(projectsData);

      // Számlák kinyerése a projektekből
      const allInvoices = projectsData.flatMap(project => 
        (project.invoices || []).map(invoice => ({
          ...invoice,
          projectId: project._id,
          projectName: project.name
        }))
      );

      // Statisztikák számítása
      calculateStatistics(allInvoices);
      // Adójelentés generálása
      generateTaxReport(allInvoices);

      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  // Tranzakció mentése/módosítása
  const handleSaveTransaction = async (data) => {
    try {
      if (selectedTransaction) {
        await api.put(`${API_URL}/accounting/transactions/${selectedTransaction._id}`, data);
        setSuccess('Tranzakció sikeresen módosítva');
      } else {
        await api.post(`${API_URL}/accounting/transactions`, data);
        setSuccess('Új tranzakció sikeresen hozzáadva');
      }
      await fetchData();
      setShowTransactionModal(false);
      setSelectedTransaction(null);
    } catch (error) {
      setError('Hiba történt a mentés során');
    }
  };

  // Tranzakció törlése
  const handleDeleteTransaction = async (id) => {
    try {
      await api.delete(`${API_URL}/accounting/transactions/${id}`);
      setSuccess('Tranzakció sikeresen törölve');
      await fetchData();
    } catch (error) {
      setError('Hiba történt a törlés során');
    }
  };

  // Számla státusz módosítása
  const handleUpdateStatus = async (projectId, invoiceId, status) => {
    try {
      await api.put(`${API_URL}/projects/${projectId}/invoices/${invoiceId}`, { status });
      await fetchData(); // Adatok újratöltése
      setSuccess('Számla státusz sikeresen frissítve');
    } catch (error) {
      setError('Hiba történt a státusz módosítása során');
    }
  };

  // Számla törlése
  const handleDeleteInvoice = async (projectId, invoiceId) => {
    if (!window.confirm('Biztosan törli ezt a számlát?')) return;
    
    try {
      await api.delete(`${API_URL}/projects/${projectId}/invoices/${invoiceId}`);
      await fetchData(); // Adatok újratöltése
      setSuccess('Számla sikeresen törölve');
    } catch (error) {
      setError('Hiba történt a számla törlése során');
    }
  };

  // Statisztikák számítása
  const calculateStatistics = (invoices) => {
    const stats = {
      totalIncome: 0,
      paidAmount: 0,
      overdueAmount: 0,
      averagePaymentTime: 0
    };

    invoices.forEach(invoice => {
      stats.totalIncome += invoice.totalAmount || 0;
      stats.paidAmount += invoice.status === 'fizetett' ? invoice.totalAmount : 0;
      
      if (new Date(invoice.dueDate) < new Date() && invoice.status !== 'fizetett') {
        stats.overdueAmount += invoice.totalAmount;
      }
    });

    setStatistics(stats);
  };

  // Adójelentés generálása
  const generateTaxReport = (invoices) => {
    // Itt lehet implementálni az adójelentés generálását
    // Például:
    const taxReportData = invoices.filter(invoice => invoice.status === 'fizetett');
    setTaxData(taxReportData);
  };

  // Adatok szinkronizálása
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