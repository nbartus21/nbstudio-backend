import React, { useState } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Edit, Trash2, FileText, Check, X, Trash } from 'lucide-react';
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
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        // Részletesebb hibakezelés
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Szerver hiba: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (fetchTransactions) {
        await fetchTransactions();
      }

      setError(null);
    } catch (error) {
      console.error('Hiba a státusz frissítésekor:', error);
      // Részletesebb hibajelzés a felhasználónak
      setError(`Nem sikerült frissíteni a tranzakció státuszát: ${error.message}`);
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

  // Tömeges törlés kezelése
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setError('Nincs kiválasztva tétel a törléshez');
      return;
    }

    if (!window.confirm(`Biztosan törölni szeretnéd a kiválasztott ${selectedItems.length} tételt?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`${ACCOUNTING_API_URL}/bulk-delete`, {
        transactions: selectedItems
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Hiba történt a tömeges törlés során');
      }

      const result = await response.json();
      console.log('Tömeges törlés eredménye:', result);

      // Frissítjük a listát
      if (fetchTransactions) {
        await fetchTransactions();
      }

      // Visszaállítjuk a kijelölést
      setSelectedItems([]);
      setIsSelectionMode(false);
      setError(null);
    } catch (error) {
      console.error('Hiba a tömeges törlés során:', error);
      setError(`Hiba a tömeges törlés során: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tétel kiválasztás kezelése
  const toggleItemSelection = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Összes tétel kiválasztása/kijelölés törlése
  const toggleSelectAll = () => {
    if (selectedItems.length === transactions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(transactions.map(t => t._id));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Műveleti sáv */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div>
          <button
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`px-4 py-2 rounded-md text-sm font-medium mr-2 ${isSelectionMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} hover:bg-blue-200`}
          >
            {isSelectionMode ? 'Kijelölés befejezése' : 'Tételek kijelölése'}
          </button>

          {isSelectionMode && (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 rounded-md text-sm font-medium mr-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {selectedItems.length === transactions.length ? 'Kijelölés törlése' : 'Összes kijelölése'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedItems.length === 0 || isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium ${selectedItems.length === 0 || isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              >
                <Trash className="h-4 w-4 inline-block mr-1" />
                {isLoading ? 'Törlés folyamatban...' : `Kijelölt tételek törlése (${selectedItems.length})`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isSelectionMode && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
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
              <tr key={transaction._id} className={`hover:bg-gray-50 ${selectedItems.includes(transaction._id) ? 'bg-blue-50' : ''}`}>
                {isSelectionMode && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(transaction._id)}
                      onChange={() => toggleItemSelection(transaction._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                )}
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
