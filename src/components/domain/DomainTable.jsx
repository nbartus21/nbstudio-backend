import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';

const DomainTable = ({ domains, onEdit, onDelete }) => {
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filter, setFilter] = useState('');

  const calculateDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (daysUntil) => {
    if (daysUntil < 0) return 'bg-red-100 text-red-800';
    if (daysUntil <= 30) return 'bg-yellow-100 text-yellow-800';
    if (daysUntil <= 90) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const sortedDomains = [...domains]
    .filter(domain => 
      domain.name.toLowerCase().includes(filter.toLowerCase()) ||
      domain.registrar.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'expiryDate') {
        return sortDirection === 'asc' 
          ? new Date(a.expiryDate) - new Date(b.expiryDate)
          : new Date(b.expiryDate) - new Date(a.expiryDate);
      }
      if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortBy === 'cost') {
        return sortDirection === 'asc'
          ? a.cost - b.cost
          : b.cost - a.cost;
      }
      return 0;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <input
          type="text"
          placeholder="Keresés domain név vagy regisztrátor szerint..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Domain Név
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Regisztrátor
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                onClick={() => handleSort('expiryDate')}
              >
                Lejárat
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                onClick={() => handleSort('cost')}
              >
                Éves Költség
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Státusz
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedDomains.map((domain) => {
              const daysUntil = calculateDaysUntilExpiry(domain.expiryDate);
              const statusColor = getStatusColor(daysUntil);

              return (
                <tr key={domain._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {domain.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {domain.registrar}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(domain.expiryDate).toLocaleDateString()}
                    <span className="text-xs ml-2">
                      ({daysUntil} nap)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {domain.cost.toLocaleString()} Ft
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
                      {daysUntil < 0 ? 'Lejárt' :
                       daysUntil <= 30 ? 'Sürgős' :
                       daysUntil <= 90 ? 'Közelgő' : 'Rendben'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(domain)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onDelete(domain._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DomainTable;