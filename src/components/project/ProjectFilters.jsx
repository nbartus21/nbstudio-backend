import React, { useState, useEffect } from 'react';

const ProjectFilters = ({ projects, onFilterChange }) => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    dateRange: 'all',
    client: '',
    minBudget: '',
    maxBudget: '',
    hasInvoices: false
  });

  // Get unique client names for dropdown
  const uniqueClients = [...new Set(projects
    .filter(p => p.client?.name)
    .map(p => p.client.name))];

  // Apply filters when they change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      dateRange: 'all',
      client: '',
      minBudget: '',
      maxBudget: '',
      hasInvoices: false
    });
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-2">Szűrők</h2>
        <div className="flex flex-wrap gap-4">
          <div className="w-full">
            <input
              type="text"
              name="search"
              placeholder="Keresés név vagy leírás alapján..."
              value={filters.search}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Állapot
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Összes állapot</option>
              <option value="aktív">Aktív</option>
              <option value="befejezett">Befejezett</option>
              <option value="felfüggesztett">Felfüggesztett</option>
              <option value="törölt">Törölt</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioritás
            </label>
            <select
              name="priority"
              value={filters.priority}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Összes prioritás</option>
              <option value="alacsony">Alacsony</option>
              <option value="közepes">Közepes</option>
              <option value="magas">Magas</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Időszak
            </label>
            <select
              name="dateRange"
              value={filters.dateRange}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="all">Bármikor</option>
              <option value="today">Ma</option>
              <option value="week">Elmúlt hét</option>
              <option value="month">Elmúlt hónap</option>
              <option value="quarter">Elmúlt negyedév</option>
              <option value="year">Elmúlt év</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ügyfél
            </label>
            <select
              name="client"
              value={filters.client}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Összes ügyfél</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min. költségvetés
            </label>
            <input
              type="number"
              name="minBudget"
              placeholder="Minimum"
              value={filters.minBudget}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. költségvetés
            </label>
            <input
              type="number"
              name="maxBudget"
              placeholder="Maximum"
              value={filters.maxBudget}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasInvoices"
              name="hasInvoices"
              checked={filters.hasInvoices}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="hasInvoices" className="ml-2 text-sm text-gray-700">
              Csak számlázott projektek
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
        >
          Szűrők törlése
        </button>
      </div>
    </div>
  );
};

export default ProjectFilters;