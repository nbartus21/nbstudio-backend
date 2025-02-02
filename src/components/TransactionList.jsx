import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Edit, Trash2, FileText, Check, X } from 'lucide-react';
import TransactionDetailModal from './TransactionDetailModal';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const TransactionList = ({ 
  transactions, 
  onEdit, 
  onDelete,
  selectedYear,
  selectedMonth,
  fetchTransactions 
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [error, setError] = useState(null);

  // Bővített kategória lista domain kategóriával
  const categoryNames = {
    project_invoice: 'Projekt számla',
    invoice_payment: 'Számla befizetés',
    domain_cost: 'Domain költség',
    server_cost: 'Szerver költség',
    license_cost: 'Licensz költség',
    education: 'Oktatás',
    software: 'Szoftver',
    service: 'Szolgáltatás',
    other: 'Egyéb'
  };

  // Szűrt tranzakciók a kiválasztott hónap alapján
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (!transaction.date) return false;
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getFullYear() === selectedYear &&
        transactionDate.getMonth() + 1 === selectedMonth
      );
    });
  }, [transactions, selectedYear, selectedMonth]);

  const handleUpdateStatus = async (transaction) => {
    try {
      // Domain tranzakció esetén a domain státuszát is frissítjük
      if (transaction.category === 'domain_cost' && transaction.domainId) {
        await api.put(`${API_URL}/domains/${transaction.domainId}`, {
          paymentStatus: 'paid'
        });
      }

      // Tranzakció státusz frissítése
      await api.put(`${API_URL}/accounting/transactions/${transaction._id}`, {
        paymentStatus: 'paid',
        paidAmount: transaction.amount,
        paidDate: new Date().toISOString()
      });

      if (fetchTransactions) {
        await fetchTransactions();
      }
      setError(null);
    } catch (error) {
      console.error('Hiba a státusz frissítésekor:', error);
      setError('Nem sikerült frissíteni a tranzakció státuszát');
    }
  };

  const handleDelete = async (transaction) => {
    try {
      // Ha domain tranzakció, először a domain státuszát állítjuk vissza
      if (transaction.category === 'domain_cost' && transaction.domainId) {
        await api.put(`${API_URL}/domains/${transaction.domainId}`, {
          paymentStatus: 'pending'
        });
      }
      await onDelete(transaction._id);
    } catch (error) {
      console.error('Hiba a törlés során:', error);
      setError('Nem sikerült törölni a tételt');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border-b border-red-200">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {/* ... table headers ... */}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(transaction.date), 'yyyy.MM.dd.', { locale: hu })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {categoryNames[transaction.category] || transaction.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="truncate max-w-md">{transaction.description}</span>
                    {transaction.invoiceNumber && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {transaction.invoiceNumber}
                      </span>
                    )}
                    {transaction.domainId && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Domain
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {transaction.amount?.toLocaleString()} €
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${transaction.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                      transaction.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {transaction.paymentStatus === 'paid' ? 'Fizetve' :
                     transaction.paymentStatus === 'pending' ? 'Függőben' : 'Késedelmes'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowDetailModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <FileText className="h-5 w-5 inline-block mr-1" />
                    Részletek
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(transaction)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    disabled={transaction.paymentStatus === 'paid'}
                  >
                    <Check className="h-5 w-5 inline-block mr-1" />
                    {transaction.category === 'domain_cost' ? 'Megújítva' : 'Rendezve'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Biztosan törölni szeretnéd ezt a tételt?')) {
                        handleDelete(transaction);
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <X className="h-5 w-5 inline-block mr-1" />
                    Törlés
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nincs megjeleníthető tranzakció a kiválasztott időszakban.
        </div>
      )}

      {showDetailModal && selectedTransaction && (
        <TransactionDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          transaction={selectedTransaction}
          onSave={handleSaveDetails}
        />
      )}
    </div>
  );
};

export default TransactionList;