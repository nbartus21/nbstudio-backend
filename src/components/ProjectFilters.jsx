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

  // Amikor változik egy szűrő, hívjuk meg a szülő komponens callback függvényét
  const onFilterChange = useCallback((filters) => {
    // filter logika
  }, []);

  // Unikális kliensek listájának létrehozása
  const uniqueClients = [...new Set(projects.map(p => p.client?.name))].filter(Boolean);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    const defaultFilters = {
      search: '',
      status: '',
      priority: '',
      dateRange: 'all',
      client: '',
      minBudget: '',
      maxBudget: '',
      hasInvoices: false
    };
    setFilters(defaultFilters);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kereső mező */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keresés
          </label>
          <input
            type="text"
            placeholder="Projekt név, leírás..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Státusz szűrő */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Státusz
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Összes státusz</option>
            <option value="aktív">Aktív</option>
            <option value="befejezett">Befejezett</option>
            <option value="felfüggesztett">Felfüggesztett</option>
            <option value="törölt">Törölt</option>
          </select>
        </div>

        {/* Prioritás szűrő */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioritás
          </label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Összes prioritás</option>
            <option value="alacsony">Alacsony</option>
            <option value="közepes">Közepes</option>
            <option value="magas">Magas</option>
          </select>
        </div>

        {/* Dátum szűrő */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Időszak
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">Összes</option>
            <option value="today">Mai</option>
            <option value="week">Elmúlt 7 nap</option>
            <option value="month">Elmúlt 30 nap</option>
            <option value="quarter">Elmúlt 3 hónap</option>
            <option value="year">Elmúlt 1 év</option>
          </select>
        </div>

        {/* Ügyfél szűrő */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ügyfél
          </label>
          <select
            value={filters.client}
            onChange={(e) => handleFilterChange('client', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Összes ügyfél</option>
            {uniqueClients.map((client, index) => (
              <option key={index} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>

        {/* Költségvetés szűrő */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min. költségvetés
            </label>
            <input
              type="number"
              value={filters.minBudget}
              onChange={(e) => handleFilterChange('minBudget', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Min €"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. költségvetés
            </label>
            <input
              type="number"
              value={filters.maxBudget}
              onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Max €"
            />
          </div>
        </div>

        {/* Számlával rendelkező projektek */}
        <div className="flex items-center pt-7">
          <input
            type="checkbox"
            id="hasInvoices"
            checked={filters.hasInvoices}
            onChange={(e) => handleFilterChange('hasInvoices', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="hasInvoices" className="ml-2 block text-sm text-gray-900">
            Csak számlával rendelkező projektek
          </label>
        </div>
      </div>

      {/* Szűrők törlése gomb */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Szűrők törlése
        </button>
      </div>
    </div>
  );
};

export default ProjectFilters;