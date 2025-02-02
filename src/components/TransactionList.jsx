import React from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Edit, Trash2, FileText } from 'lucide-react';

const TransactionList = ({ 
  transactions, 
  onEdit, 
  onDelete,
  onViewDetails,
  selectedYear,
  selectedMonth 
}) => {
  // Státusz badge színek
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

  // Kategória nevek magyarítása
  const categoryNames = {
    project_invoice: 'Projekt számla',
    server_cost: 'Szerver költség',
    license_cost: 'Licensz költség',
    education: 'Oktatás',
    software: 'Szoftver',
    service: 'Szolgáltatás',
    other: 'Egyéb'
  };

  // Formázott összeg előjellel
  const formatAmount = (amount, type) => {
    const formattedAmount = Math.abs(amount).toLocaleString('hu-HU', {
      style: 'currency',
      currency: 'EUR'
    });
    return type === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  // Dátum formázása hibakezeléssel
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onViewDetails(transaction)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Részletek"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onEdit(transaction)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Szerkesztés"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Biztosan törölni szeretnéd ezt a tételt?')) {
                          onDelete(transaction._id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Törlés"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
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
    </div>
  );
};

export default TransactionList;