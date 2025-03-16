import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Filter, PlusCircle } from 'lucide-react';
import TransactionList from './TransactionList';
import TransactionModal from './TransactionModal';
import AccountingStats from './AccountingStats';
import TaxReport from './TaxReport';
import InvoiceReportComponent from './InvoiceReportComponent';
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
  
  // API URL constants
  const ACCOUNTING_API_URL = `${API_URL}/accounting`;

  // Adatok betöltése
  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, projectsRes, statsRes, taxRes, domainsRes] = await Promise.all([
        api.get(`/api/accounting/transactions?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`${API_URL}/projects`),
        api.get(`${ACCOUNTING_API_URL}/statistics?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`${ACCOUNTING_API_URL}/tax-report?year=${selectedYear}`),
        api.get(`${API_URL}/domains`)
      ]);
  
      const [transactionsData, projectsData, statsData, taxData, domainsData] = await Promise.all([
        transactionsRes.json(),
        projectsRes.json(),
        statsRes.json(),
        taxRes.json(),
        domainsRes.json()
      ]);
  
      // Domain tranzakciók konvertálása
      const domainTransactions = domainsData.map(domain => ({
        _id: `domain_${domain._id}`,
        type: 'expense',
        category: 'domain_cost',
        amount: domain.cost,
        date: domain.expiryDate,
        description: `${domain.name} domain megújítás`,
        domainId: domain._id,
        paymentStatus: domain.paymentStatus || 'pending',
        dueDate: domain.expiryDate,
        recurring: true,
        recurringInterval: 'yearly'
      }));
  
      // Számlák kinyerése és szűrése a duplikációk elkerülésére
      const invoiceTransactions = transactionsData.filter(t => t.invoiceNumber);
      const invoiceNumbers = new Set(invoiceTransactions.map(t => t.invoiceNumber));
  
      // Projekt számlák konvertálása, csak azokat vesszük figyelembe, amik még nincsenek a tranzakciók között
      const projectInvoices = projectsData.flatMap(project => 
        (project.invoices || [])
          .filter(invoice => !invoiceNumbers.has(invoice.number)) // Kiszűrjük a már meglévő számlákat
          .map(invoice => ({
            projectId: project._id,
            projectName: project.name,
            clientName: project.client?.name,
            type: 'income',
            category: 'project_invoice',
            amount: invoice.totalAmount,
            date: invoice.date,
            description: `Számla: ${project.client?.name || 'Ismeretlen ügyfél'}`,
            invoiceNumber: invoice.number,
            paymentStatus: invoice.status === 'fizetett' ? 'paid' : 'pending',
            status: invoice.status
          }))
      );
  
      // Egyesített tranzakciók lista
      const combinedTransactions = [
        ...transactionsData,
        ...projectInvoices,
        ...domainTransactions
      ];
  
      setTransactions(combinedTransactions);
      setProjects(projectsData);
      
      // Statisztikák számítása
      const updatedStats = calculateUpdatedStatistics(combinedTransactions, projectsData, domainsData);
      setStatistics(updatedStats);
      setTaxData(taxData);
  
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };
  
  
  // Frissített calculateUpdatedStatistics függvény domain támogatással
  const calculateUpdatedStatistics = (transactions, invoices, domains) => {
    const stats = {
      totalIncome: 0,
      totalExpenses: 0,
      monthlyIncomes: Array(12).fill(0),
      monthlyExpenses: Array(12).fill(0),
      expensesByCategory: {},
      recurringExpenses: [],
      invoiceStats: {
        totalPaid: 0,
        totalPending: 0,
        averagePaymentTime: 0,
        totalCount: invoices.length,
        paidCount: invoices.filter(inv => inv.status === 'fizetett').length
      },
      domainStats: {
        totalDomains: domains.length,
        totalCost: domains.reduce((sum, domain) => sum + (domain.cost || 0), 0),
        pendingRenewals: domains.filter(domain => {
          const expiryDate = new Date(domain.expiryDate);
          const now = new Date();
          const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry <= 30;
        }).length
      }
    };
  
    // Tranzakciók feldolgozása
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
  
        if (!stats.expensesByCategory[transaction.category]) {
          stats.expensesByCategory[transaction.category] = 0;
        }
        stats.expensesByCategory[transaction.category] += amount;
      }
  
      if (transaction.recurring) {
        const existingRecurring = stats.recurringExpenses.find(
          item => item.name === transaction.description
        );
        
        if (!existingRecurring) {
          stats.recurringExpenses.push({
            name: transaction.description,
            amount: amount,
            interval: transaction.recurringInterval || 'monthly'
          });
        }
      }
    });
  
    // Számlák statisztikái
    const paidInvoices = invoices.filter(inv => inv.status === 'fizetett');
    stats.invoiceStats.totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.totalAmount || 0), 0);
    stats.invoiceStats.totalPending = invoices
      .filter(inv => inv.status !== 'fizetett')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        if (inv.paidDate && inv.date) {
          return sum + ((new Date(inv.paidDate) - new Date(inv.date)) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0);
      stats.invoiceStats.averagePaymentTime = Math.round(totalDays / paidInvoices.length);
    }

    return stats;
  };

  // Tranzakció mentése/módosítása
  const handleSaveTransaction = async (data) => {
    try {
      if (selectedTransaction) {
        await api.put(`${ACCOUNTING_API_URL}/transactions/${selectedTransaction._id}`, data);
        setSuccess('Tranzakció sikeresen módosítva');
      } else {
        await api.post(`${ACCOUNTING_API_URL}/transactions`, data);
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
      await api.delete(`${ACCOUNTING_API_URL}/transactions/${id}`);
      setSuccess('Tranzakció sikeresen törölve');
      await fetchData();
    } catch (error) {
      setError('Hiba történt a törlés során');
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

  // Szinkronizálás
  const handleSync = async () => {
    try {
      setLoading(true);
      await api.post(`${ACCOUNTING_API_URL}/sync`);
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
                  <option key={`year-${year}`} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={`month-${month}`} value={month}>
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
                activeTab === 'invoices'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('invoices')}
            >
              Számlák
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

          {activeTab === 'invoices' && (
            <InvoiceReportComponent
              transactions={transactions.filter(t => 
                t.category === 'project_invoice' || t.invoiceNumber
              )}
              projects={projects}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onGeneratePDF={(invoiceNumber, projectId) => {
                window.open(`/api/projects/${projectId}/invoices/${invoiceNumber}/pdf`, '_blank');
              }}
              onUpdateStatus={(transaction, newStatus) => {
                if (transaction.projectId && transaction.invoiceNumber) {
                  // Számla státusz frissítése
                  const projectId = transaction.projectId;
                  const invoiceId = transaction._id;
                  const updateData = { status: newStatus };
                  
                  if (newStatus === 'fizetett') {
                    updateData.paidAmount = transaction.amount;
                    updateData.paidDate = new Date();
                  }
                  
                  api.patch(
                    `/api/projects/${projectId}/invoices/${invoiceId}`,
                    updateData
                  ).then(() => {
                    fetchData();
                    setSuccess('Számla státusza frissítve');
                  }).catch(err => {
                    setError('Hiba a számla frissítésekor');
                  });
                }
              }}
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
