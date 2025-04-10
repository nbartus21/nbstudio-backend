import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

const HostingTable = ({ hostings, onEdit, onDelete, loading }) => {
  // Lejáratig hátralévő napok számítása
  const calculateDaysUntilExpiry = (endDate) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Pénznem formázása
  const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Csomag
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ügyfél
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lejárat
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Státusz
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekt
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Betöltés...</span>
                  </div>
                </td>
              </tr>
            ) : hostings.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  Nincsenek webtárhelyek
                </td>
              </tr>
            ) : (
              hostings.map((hosting) => {
                const daysUntilExpiry = calculateDaysUntilExpiry(hosting.service.endDate);
                const isExpired = daysUntilExpiry < 0;
                const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                
                return (
                  <tr key={hosting._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{hosting.service.domainName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.plan.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(hosting.plan.price)}/{hosting.plan.billing === 'monthly' ? 'hó' : 'év'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.client.name}</div>
                      <div className="text-xs text-gray-500">{hosting.client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {new Date(hosting.service.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isExpired ? `${Math.abs(daysUntilExpiry)} napja lejárt` : `${daysUntilExpiry} nap múlva`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        hosting.service.status === 'active' ? 'bg-green-100 text-green-800' :
                        hosting.service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        hosting.service.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {hosting.service.status === 'active' ? 'Aktív' :
                         hosting.service.status === 'pending' ? 'Függőben' :
                         hosting.service.status === 'suspended' ? 'Felfüggesztett' :
                         hosting.service.status === 'cancelled' ? 'Törölt' : 'Ismeretlen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hosting.projectName || 'Nincs projekt'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => onEdit(hosting)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5 rounded"
                          title="Webtárhely Szerkesztése"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(hosting._id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded"
                          title="Webtárhely Törlése"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HostingTable;
