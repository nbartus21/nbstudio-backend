import React, { useState } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Edit, Trash2, FileText, Check, X } from 'lucide-react';
import TransactionDetailModal from './TransactionDetailModal';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';
const ACCOUNTING_API_URL = `${API_URL}/accounting`;

const TransactionList = ({ 
  transactions, 
  onEdit, 
  onDelete,
  onViewDetails,
  selectedYear,
  selectedMonth,
  fetchTransactions
}) => {
  // States
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [error, setError] = useState(null);

  // Helper function for status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Category name translations
  const categoryNames = {
    project_invoice: 'Projekt számla',
    server_cost: 'Szerver költség',
    license_cost: 'Licensz költség',
    education: 'Oktatás',
    software: 'Szoftver',
    service: 'Szolgáltatás',
    other: 'Egyéb'
  };

  // Format amount with sign
  const formatAmount = (amount, type) => {
    const formattedAmount = Math.abs(amount).toLocaleString('hu-HU', {
      style: 'currency',
      currency: 'EUR'
    });
    return type === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  // Format date with error handling
  const formatDate = (date) => {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        throw new Error('Invalid date');
      }
      return format(parsedDate, 'yyyy.MM.dd.', { locale: hu });
    } catch (error) {
      console.error('Invalid date format:', date, error);
      return 'Érvénytelen dátum';
    }
  };

  // Handle status update
  const handleUpdateStatus = async (transactionId) => {
    try {
      const transaction = transactions.find(t => t._id === transactionId);
      if (!transaction) {
        throw new Error('Tranzakció nem található');
      }

      const response = await api.put(`${ACCOUNTING_API_URL}/transactions/${transactionId}`, {
        paymentStatus: 'paid',
        paidAmount: transaction.amount,
        paidDate: new Date().toISOString()
      });
      
      if (!response.ok) {
        throw new Error('Nem sikerült frissíteni a tranzakció státuszát');
      }

      if (fetchTransactions) {
        await fetchTransactions();
      }

      setError(null);
    } catch (error) {
      console.error('Hiba a státusz frissítésekor:', error);
      setError('Nem sikerült frissíteni a tranzakció státuszát');
    }
  };

  // Javított handleSaveDetails funkció a FormData helyes kezelésével
  const handleSaveDetails = async (formData) => {
    try {
      console.log('FormData tartalom:', Object.fromEntries(formData.entries())); // Debug log

      // Az api.put nem kezeli megfelelően a FormData-t, ezért natív fetch-et használunk
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(
        `${ACCOUNTING_API_URL}/transactions/${selectedTransaction._id}/details`, 
        {
          method: 'PUT',
          body: formData,
          // Ne állítsunk be Content-Type fejlécet, hogy a boundary helyesen kerüljön beállításra
          headers: {
            // Az autentikációs tokent közvetlenül a sessionStorage-ból vesszük
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Ismeretlen hiba' }));
        throw new Error(errorData.message || 'Nem sikerült menteni a részleteket');
      }

      if (fetchTransactions) {
        await fetchTransactions();
      }
      setShowDetailModal(false);
      setError(null);
    } catch (error) {
      console.error('Hiba:', error);
      setError('Nem sikerült menteni a részleteket: ' + error.message);
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
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dátum
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategória
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leírás
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Összeg
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Státusz
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {categoryNames[transaction.category]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="truncate max-w-md">{transaction.description}</span>
                    {transaction.invoiceNumber && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {transaction.invoiceNumber}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.paymentStatus)}`}>
                    {transaction.paymentStatus === 'paid' ? 'Fizetve' :
                     transaction.paymentStatus === 'pending' ? 'Függőben' :
                     transaction.paymentStatus === 'overdue' ? 'Késedelmes' : 'Törölt'}
                    
                    {/* Ha Stripe fizetésről van szó, jelezzük külön ikonnal */}
                    {transaction.paymentStatus === 'paid' && 
                     (transaction.paymentMethod === 'card' || 
                      (transaction.notes && 
                       (transaction.notes.includes('Stripe') || 
                        transaction.notes.includes('bankkártyás fizetés')))) && (
                      <span className="ml-1 inline-flex items-center">
                        <svg 
                          className="h-3 w-3" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                      </span>
                    )}
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
                    onClick={() => handleUpdateStatus(transaction._id)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    disabled={transaction.paymentStatus === 'paid'}
                  >
                    <Check className="h-5 w-5 inline-block mr-1" />
                    Rendezve
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Biztosan törölni szeretnéd ezt a tételt?')) {
                        onDelete(transaction._id);
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

      {transactions.length === 0 && (
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
