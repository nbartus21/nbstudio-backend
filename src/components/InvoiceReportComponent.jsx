import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { FileText, Download, Eye, DollarSign, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const InvoiceReportComponent = ({ 
  transactions, 
  projects, 
  selectedYear, 
  selectedMonth, 
  onGeneratePDF, 
  onUpdateStatus 
}) => {
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    // Számlák szűrése a kapott tranzakciók alapján
    const invoiceTransactions = transactions.filter(t => 
      t.category === 'project_invoice' || t.invoiceNumber
    );
    
    // Szűrések alkalmazása
    let filtered = [...invoiceTransactions];
    
    // Dátum szűrő
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    filtered = filtered.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });
    
    // Keresés
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower) ||
        invoice.projectName?.toLowerCase().includes(searchLower) ||
        invoice.clientName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Státusz szűrő
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => {
        if (statusFilter === 'paid') return invoice.paymentStatus === 'paid';
        if (statusFilter === 'pending') return invoice.paymentStatus === 'pending';
        if (statusFilter === 'overdue') {
          return invoice.paymentStatus === 'pending' && new Date(invoice.dueDate) < new Date();
        }
        return true;
      });
    }
    
    // Rendezés
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'due-desc':
          return new Date(b.dueDate || b.date) - new Date(a.dueDate || a.date);
        case 'due-asc':
          return new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date);
        case 'number':
          return a.invoiceNumber?.localeCompare(b.invoiceNumber || '');
        case 'amount-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount-asc':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });
    
    setFilteredInvoices(filtered);
  }, [transactions, searchTerm, statusFilter, sortBy, selectedYear, selectedMonth]);

  // Statisztikák számolása
  const statistics = {
    totalInvoices: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    paidAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.paymentStatus === 'paid' ? (inv.amount || 0) : 0), 0),
    pendingAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.paymentStatus !== 'paid' ? (inv.amount || 0) : 0), 0),
    overdue: filteredInvoices.filter(inv => 
      inv.paymentStatus !== 'paid' && 
      inv.dueDate && 
      new Date(inv.dueDate) < new Date()
    ).length
  };

  // Státusz alapján formázás
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Státusz fordítása
  const translateStatus = (status) => {
    switch (status) {
      case 'paid':
        return 'fizetett';
      case 'pending':
        return 'kiállított';
      case 'overdue':
        return 'késedelmes';
      case 'cancelled':
        return 'törölt';
      default:
        return status;
    }
  };

  // Fizetési határidő formázása
  const getDueDateClass = (dueDate, status) => {
    if (status === 'paid' || status === 'cancelled') return 'text-gray-600';
    
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) return 'text-red-600 font-medium';
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    if (due <= threeDaysFromNow) return 'text-orange-600';
    
    return 'text-gray-600';
  };

  // Számla státusz frissítése
  const handleUpdateStatus = (transaction, newStatus) => {
    if (window.confirm(`Biztosan módosítja a(z) ${transaction.invoiceNumber} számú számla státuszát erre: ${translateStatus(newStatus)}?`)) {
      onUpdateStatus(transaction, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Számla jelentés</h2>
      
      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes számla</p>
              <p className="text-2xl font-bold">{statistics.totalInvoices} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Teljes összeg</p>
              <p className="text-2xl font-bold">{statistics.totalAmount.toLocaleString()} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Fizetésre vár</p>
              <p className="text-2xl font-bold">{statistics.pendingAmount.toLocaleString()} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Lejárt határidő</p>
              <p className="text-2xl font-bold">{statistics.overdue} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Szűrők */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-grow max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés számla vagy ügyfél alapján..."
              className="pl-3 pr-3 py-2 w-full border rounded-md"
            />
          </div>
          
          <div className="flex-grow-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="all">Összes státusz</option>
              <option value="pending">Kiállított</option>
              <option value="paid">Fizetett</option>
              <option value="overdue">Késedelmes</option>
            </select>
          </div>
          
          <div className="flex-grow-0 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-3 pr-8 py-2 border rounded-md"
            >
              <option value="date-desc">Legújabb elöl</option>
              <option value="date-asc">Legrégebbi elöl</option>
              <option value="due-desc">Határidő (csökkenő)</option>
              <option value="due-asc">Határidő (növekvő)</option>
              <option value="number">Számlaszám szerint</option>
              <option value="amount-desc">Összeg (csökkenő)</option>
              <option value="amount-asc">Összeg (növekvő)</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-500">
            {filteredInvoices.length} számla megjelenítve
          </span>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSortBy('date-desc');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Szűrők törlése
          </button>
        </div>
      </div>

      {/* Számla táblázat */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Számlaszám
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projekt / Ügyfél
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dátum
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fizetési határidő
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Összeg
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Státusz
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.paymentStatus !== 'paid';
                  
                  return (
                    <tr key={invoice._id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.projectName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{invoice.clientName || invoice.description || 'Ismeretlen'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {format(new Date(invoice.date), 'yyyy-MM-dd')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${getDueDateClass(invoice.dueDate, invoice.paymentStatus)}`}>
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : 'N/A'}
                          {isOverdue && (
                            <span className="ml-2 text-xs font-medium text-red-600">
                              (Lejárt)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.amount?.toLocaleString()} €
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(invoice.paymentStatus)}`}>
                          {translateStatus(invoice.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {invoice.projectId && invoice.invoiceNumber && (
                            <button
                              onClick={() => onGeneratePDF(invoice.invoiceNumber, invoice.projectId)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="PDF letöltése"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                          )}
                          
                          {invoice.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(invoice, 'paid')}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Fizetettre állítás"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          )}
                          
                          {invoice.paymentStatus === 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(invoice, 'pending')}
                              className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                              title="Függőbenre állítás"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    <div>
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-lg font-medium">Nincs a szűrésnek megfelelő számla</p>
                      <p className="mt-1">Próbálja meg módosítani a szűrési feltételeket</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportComponent;