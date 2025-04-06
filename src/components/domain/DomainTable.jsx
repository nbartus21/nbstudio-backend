import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Link, Link2Off } from 'lucide-react';
import { api } from '../../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001';

const DomainTable = ({ domains, onEdit, onDelete, formatCurrency, onDomainUpdated }) => {
  const [projects, setProjects] = useState([]);
  const [showProjectSelector, setShowProjectSelector] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filter, setFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Projektek lekérése
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get(`${API_URL}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Hiba a projektek lekérésekor:', error);
      }
    };

    fetchProjects();
  }, []);

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
      (domain.name.toLowerCase().includes(filter.toLowerCase()) ||
       domain.registrar.toLowerCase().includes(filter.toLowerCase())) &&
      (projectFilter === '' || (domain.projectName && domain.projectName.toLowerCase().includes(projectFilter.toLowerCase())))
    )
    .sort((a, b) => {
      if (sortBy === 'expiryDate') {
        return sortDirection === 'asc'
          ? new Date(a.expiryDate) - new Date(b.expiryDate)
          : new Date(b.expiryDate) - new Date(a.expiryDate);
      }
      if (sortBy === 'registrationDate') {
        // Ha nincs regisztrációs dátum, akkor a létrehozás dátumát használjuk
        const aDate = a.registrationDate ? new Date(a.registrationDate) : new Date(a.createdAt);
        const bDate = b.registrationDate ? new Date(b.registrationDate) : new Date(b.createdAt);
        return sortDirection === 'asc'
          ? aDate - bDate
          : bDate - aDate;
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

  // Domain gyors hozzárendelése projekthez
  const handleQuickAssign = async (domainId) => {
    if (!selectedProjectId) {
      setShowProjectSelector(null);
      return;
    }

    setIsUpdating(true);

    try {
      // Megkeressük a domaint és a projektet
      const domain = domains.find(d => d._id === domainId);
      const project = projects.find(p => p._id === selectedProjectId);

      if (!domain || !project) {
        console.error('Nem található a domain vagy a projekt');
        return;
      }

      // Frissítjük a domaint
      const updatedDomain = {
        ...domain,
        projectId: selectedProjectId,
        projectName: project.name
      };

      const response = await api.put(`${API_URL}/api/domains/${domainId}`, updatedDomain);

      if (response.ok) {
        // Értesítjük a szülő komponenst a frissítésről
        if (onDomainUpdated) {
          onDomainUpdated();
        }
      } else {
        console.error('Hiba a domain frissítésekor');
      }
    } catch (error) {
      console.error('Hiba a domain projekt hozzárendelésekor:', error);
    } finally {
      setIsUpdating(false);
      setShowProjectSelector(null);
      setSelectedProjectId('');
    }
  };

  // Domain eltávolítása projektből
  const handleRemoveFromProject = async (domainId) => {
    setIsUpdating(true);

    try {
      // Megkeressük a domaint
      const domain = domains.find(d => d._id === domainId);

      if (!domain) {
        console.error('Nem található a domain');
        return;
      }

      // Frissítjük a domaint
      const updatedDomain = {
        ...domain,
        projectId: null,
        projectName: ''
      };

      const response = await api.put(`${API_URL}/api/domains/${domainId}`, updatedDomain);

      if (response.ok) {
        // Értesítjük a szülő komponenst a frissítésről
        if (onDomainUpdated) {
          onDomainUpdated();
        }
      } else {
        console.error('Hiba a domain frissítésekor');
      }
    } catch (error) {
      console.error('Hiba a domain projekt eltávolításakor:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 space-y-3">
        <input
          type="text"
          placeholder="Keresés domain név vagy regisztrátor szerint..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />

        <div className="flex items-center">
          <label className="mr-2 text-sm font-medium text-gray-700">Projekt szűrés:</label>
          <input
            type="text"
            placeholder="Szűrés projekt név szerint..."
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Projekt szűrés törlése gomb */}
        {projectFilter && (
          <div className="flex justify-end">
            <button
              onClick={() => setProjectFilter('')}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Projekt szűrés törlése
            </button>
          </div>
        )}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Projekt
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                onClick={() => handleSort('registrationDate')}
              >
                Regisztráció
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {domain.projectName ? (
                        <>
                          <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-200 shadow-sm hover:bg-indigo-200 transition-colors">
                            {domain.projectName}
                          </span>
                          <button
                            onClick={() => handleRemoveFromProject(domain._id)}
                            disabled={isUpdating}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Eltávolítás a projektből"
                          >
                            <Link2Off className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {showProjectSelector === domain._id ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={isUpdating}
                              >
                                <option value="">Válassz projektet...</option>
                                {projects.map(project => (
                                  <option key={project._id} value={project._id}>
                                    {project.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleQuickAssign(domain._id)}
                                disabled={isUpdating || !selectedProjectId}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-300"
                              >
                                Hozzáadás
                              </button>
                              <button
                                onClick={() => {
                                  setShowProjectSelector(null);
                                  setSelectedProjectId('');
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                Mégsem
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 italic">Nincs projekt</span>
                              <button
                                onClick={() => setShowProjectSelector(domain._id)}
                                className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                title="Projekt hozzárendelés"
                              >
                                <Link className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {domain.registrationDate ? new Date(domain.registrationDate).toLocaleDateString() : 'Nincs megadva'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(domain.expiryDate).toLocaleDateString()}
                    <span className="text-xs ml-2">
                      ({daysUntil} nap)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {formatCurrency(domain.cost)}
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