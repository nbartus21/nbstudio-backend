import React, { useState, useEffect } from 'react';
import { generateResponseSuggestion, generateSummary } from '../services/deepseekService';
import ProjectFilters from './ProjectFilters';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const ProjectManager = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [sharePin, setSharePin] = useState('');
  const [activeShares, setActiveShares] = useState({});
  const [showShareModal, setShowShareModal] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }]
  });

  // Új state változók a nézet típusának és összecsukható projektek kezeléséhez
  const [viewType, setViewType] = useState('grid'); // 'grid', 'list' vagy 'accordion'
  const [expandedProjects, setExpandedProjects] = useState({});

  // Kezelőfüggvény a projektek összecsukásához/kinyitásához
  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleProjectUpdate = async (updatedProject) => {
    try {
      const response = await api.put(`${API_URL}/projects/${updatedProject._id}`, updatedProject);
      if (response.ok) {
        setProject(updatedProject);
      }
    } catch (error) {
      console.error('Hiba a projekt frissítésekor:', error);
    }
  };

  const truncateDescription = (description, maxLength = 140) => {
    if (!description) return '';
    return description.length > maxLength 
      ? `${description.substring(0, maxLength)}...` 
      : description;
  };

  const generateShareLink = async (projectId) => {
    try {
      const defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
      
      const response = await api.post(`${API_URL}/projects/${projectId}/share`, {
        expiresAt: expiryDate
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a link generálása során');
      }
  
      const data = await response.json();
      setShareLink(data.shareLink);
      setSharePin(data.pin);
      
      setActiveShares(prev => ({
        ...prev,
        [projectId]: {
          hasActiveShare: true,
          shareLink: data.shareLink,
          pin: data.pin,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt
        }
      }));
      
      setError(null);
    } catch (error) {
      console.error('Hiba a megosztási link generálásakor:', error);
      setError('Nem sikerült létrehozni a megosztási linket');
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/projects`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShareInfo = async (projectId) => {
    try {
      const response = await api.get(`${API_URL}/projects/${projectId}/share`);
      const data = await response.json();
      
      setActiveShares(prev => ({
        ...prev,
        [projectId]: data
      }));
      
      return data;
    } catch (error) {
      console.error('Hiba a megosztási adatok lekérésekor:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchAllShareInfo = async () => {
      if (projects.length > 0) {
        const shares = {};
        for (const project of projects) {
          try {
            const response = await api.get(`${API_URL}/projects/${project._id}/share`);
            const data = await response.json();
            if (data) {
              shares[project._id] = data;
            }
          } catch (error) {
            console.error(`Hiba a ${project._id} projekt megosztási adatainak lekérésekor:`, error);
          }
        }
        setActiveShares(shares);
      }
    };
    
    fetchAllShareInfo();
  }, [projects]);

  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  const applyFilters = (filters) => {
    const filtered = projects.filter(project => {
      if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !project.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      if (filters.status && project.status !== filters.status) {
        return false;
      }

      if (filters.priority && project.priority !== filters.priority) {
        return false;
      }

      if (filters.dateRange !== 'all') {
        const projectDate = new Date(project.createdAt);
        const now = new Date();
        const daysDiff = (now - projectDate) / (1000 * 60 * 60 * 24);

        if (filters.dateRange === 'today' && daysDiff > 1) return false;
        if (filters.dateRange === 'week' && daysDiff > 7) return false;
        if (filters.dateRange === 'month' && daysDiff > 30) return false;
        if (filters.dateRange === 'quarter' && daysDiff > 90) return false;
        if (filters.dateRange === 'year' && daysDiff > 365) return false;
      }

      if (filters.client && project.client?.name !== filters.client) {
        return false;
      }

      if (filters.minBudget && project.financial?.budget?.min < Number(filters.minBudget)) {
        return false;
      }
      if (filters.maxBudget && project.financial?.budget?.max > Number(filters.maxBudget)) {
        return false;
      }

      if (filters.hasInvoices && (!project.invoices || project.invoices.length === 0)) {
        return false;
      }

      return true;
    });

    setFilteredProjects(filtered);
  };

  const handleSaveProject = async () => {
    try {
      if (!selectedProject.name) {
        setError('A projekt neve kötelező!');
        return;
      }
  
      if (!selectedProject.client?.name || !selectedProject.client?.email) {
        setError('Az ügyfél neve és email címe kötelező!');
        return;
      }
  
      const projectData = {
        ...selectedProject,
        status: selectedProject.status || 'aktív',
        priority: selectedProject.priority || 'közepes',
        client: {
          name: selectedProject.client.name,
          email: selectedProject.client.email,
          phone: selectedProject.client?.phone || '',
          companyName: selectedProject.client?.companyName || '',
          taxNumber: selectedProject.client?.taxNumber || '',
          euVatNumber: selectedProject.client?.euVatNumber || '',
          registrationNumber: selectedProject.client?.registrationNumber || '',
          address: {
            street: selectedProject.client?.address?.street || '',
            city: selectedProject.client?.address?.city || '',
            postalCode: selectedProject.client?.address?.postalCode || '',
            country: selectedProject.client?.address?.country || ''
          }
        },
        financial: {
          budget: {
            min: selectedProject.financial?.budget?.min || 0,
            max: selectedProject.financial?.budget?.max || 0
          },
          currency: selectedProject.financial?.currency || 'EUR'
        }
      };
  
      let response;
      if (selectedProject._id) {
        response = await api.put(`${API_URL}/projects/${selectedProject._id}`, projectData);
      } else {
        response = await api.post(`${API_URL}/projects`, projectData);
      }
  
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('A projekt nem található');
        }
        throw new Error(data.message || 'Nem sikerült menteni a projektet');
      }
  
      setSelectedProject(null);
      await fetchProjects();
    } catch (error) {
      console.error('Hiba a projekt mentésekor:', error);
      setError(`Hiba történt: ${error.message}`);
    }
  };

  const handleCreateInvoice = async () => {
    console.log('Számla létrehozás kezdődik...');
    console.log('selectedProject:', selectedProject);
    console.log('newInvoice állapot:', newInvoice);
  
    if (!selectedProject) {
      console.error('Nincs kiválasztott projekt!');
      return;
    }
  
    try {
      console.log('Számla tételek feldolgozása...');
      const itemsWithTotal = newInvoice.items.map(item => {
        const total = item.quantity * item.unitPrice;
        console.log('Tétel számítás:', { 
          description: item.description, 
          quantity: item.quantity, 
          unitPrice: item.unitPrice, 
          total 
        });
        return {
          ...item,
          total
        };
      });
  
      const totalAmount = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
      console.log('Teljes összeg:', totalAmount);
  
      const invoiceNumber = `INV-${Date.now()}`;
      console.log('Generált számla szám:', invoiceNumber);
  
      const invoiceData = {
        number: invoiceNumber,
        date: new Date(),
        items: itemsWithTotal,
        totalAmount,
        paidAmount: 0,
        status: 'kiállított',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };
  
      console.log('Elkészített számla adat:', invoiceData);
      console.log('API URL:', `${API_URL}/projects/${selectedProject._id}/invoices`);
  
      const response = await api.post(
        `${API_URL}/projects/${selectedProject._id}/invoices`,
        invoiceData
      );
  
      console.log('API válasz status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API hiba válasz:', errorData);
        throw new Error(errorData.message || 'Nem sikerült létrehozni a számlát');
      }
  
      const updatedProject = await response.json();
      console.log('Frissített projekt adatok:', updatedProject);
  
      setSelectedProject(updatedProject);
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p._id === updatedProject._id ? updatedProject : p
        )
      );
  
      setShowNewInvoiceForm(false);
      setNewInvoice({ items: [{ description: '', quantity: 1, unitPrice: 0 }] });
      setError(null);
      console.log('Számla létrehozás sikeres!');
  
    } catch (error) {
      console.error('Részletes hiba a számla létrehozásakor:', error);
      console.error('Hiba stack:', error.stack);
      setError(`Hiba történt a számla létrehozásakor: ${error.message}`);
    }
  };
  
  const handleAddInvoiceItem = () => {
    console.log('Új számla tétel hozzáadása...');
    console.log('Jelenlegi tételek:', newInvoice.items);
    
    setNewInvoice(prev => {
      const updated = {
        ...prev,
        items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
      };
      console.log('Frissített számla állapot:', updated);
      return updated;
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törli ezt a projektet?')) return;
    
    try {
      const response = await api.delete(`${API_URL}/projects/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a törlés során');
      }
  
      setProjects(prevProjects => prevProjects.filter(project => project._id !== id));
      setError(null);
    } catch (error) {
      console.error('Hiba:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {shareLink && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex flex-col space-y-2">
            <p className="font-semibold">Megosztási adatok:</p>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Link:</span>
              <div className="flex-1 flex items-center">
                <input 
                  type="text" 
                  value={shareLink} 
                  readOnly 
                  className="flex-1 p-1 border rounded-l bg-white"
                />
                <a 
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 border-t border-r border-b rounded-r bg-white hover:bg-gray-50"
                  title="Megnyitás új ablakban"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-gray-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">PIN kód:</span>
              <input 
                type="text" 
                value={sharePin} 
                readOnly 
                className="w-24 p-1 border rounded bg-white"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projekt Kezelő</h1>
        <button
          onClick={() => setSelectedProject({
            name: '',
            status: 'aktív',
            priority: 'közepes',
            description: '',
            client: {
              name: '',
              email: '',
              taxNumber: ''
            },
            financial: {
              budget: {
                min: 0,
                max: 0
              },
              currency: 'EUR'
            }
          })}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Új Projekt
        </button>
      </div>

      <ProjectFilters 
        projects={projects}
        onFilterChange={applyFilters}
      />

      {/* Nézetváltó gombok */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          {filteredProjects.length} projekt megjelenítve
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewType('grid')}
            className={`p-2 rounded ${
              viewType === 'grid' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title="Grid nézet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`p-2 rounded ${
              viewType === 'list' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title="Lista nézet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setViewType('accordion')}
            className={`p-2 rounded ${
              viewType === 'accordion' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title="Összecsukható nézet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Projektek megjelenítése a nézet típusa alapján */}
      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div
              key={project._id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
              <p className="text-gray-600 mb-4 h-20 overflow-hidden">
                {truncateDescription(project.description)}
              </p>
              
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 rounded-full text-sm ${
                  project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                  project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              {activeShares[project._id]?.hasActiveShare && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Aktív megosztás</h4>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center text-blue-800">
                      <span className="w-20">Link:</span>
                      <a 
                        href={activeShares[project._id].shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {activeShares[project._id].shareLink}
                      </a>
                    </p>
                    <p className="flex items-center text-blue-800">
                      <span className="w-20">PIN kód:</span>
                      <span>{activeShares[project._id].pin}</span>
                    </p>
                    <p className="flex items-center text-blue-800">
                      <span className="w-20">Lejárat:</span>
                      <span>
                        {new Date(activeShares[project._id].expiresAt).toLocaleDateString()}
                      </span>
                    </p>
                    {activeShares[project._id].isExpired && (
                      <p className="text-red-600 font-medium">Lejárt megosztás</p>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => setShowShareModal(project._id)}
                  className={`w-full px-4 py-2 rounded ${
                    activeShares[project._id]?.hasActiveShare
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {activeShares[project._id]?.hasActiveShare ? 'Új megosztási link' : 'Megosztási link generálása'}
                </button>
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setShowNewInvoiceForm(true);
                  }}
                  className="w-full bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-50"
                >
                  Új Számla
                </button>
                <button
                  onClick={() => setSelectedProject(project)}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Részletek
                </button>
                <button
                  onClick={() => handleDelete(project._id)}
                  className="w-full bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100"
                >
                  Törlés
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewType === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredProjects.map((project, index) => (
            <div 
              key={project._id}
              className={`border-b last:border-b-0 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                        project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {truncateDescription(project.description, 100)}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>Ügyfél: {project.client?.name || '-'}</span>
                      <span className="mx-2">•</span>
                      <span>Létrehozva: {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {activeShares[project._id]?.hasActiveShare && (
                    <div className="flex items-center text-sm text-blue-600 mr-4">
                      <span className="mr-1">Megosztva</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowShareModal(project._id)}
                      className={`px-3 py-1 rounded text-sm ${
                        activeShares[project._id]?.hasActiveShare
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {activeShares[project._id]?.hasActiveShare ? 'Új link' : 'Megosztás'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowNewInvoiceForm(true);
                      }}
                      className="px-3 py-1 text-sm bg-white border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
                    >
                      Új számla
                    </button>
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Részletek
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Nincs megjeleníthető projekt a kiválasztott szűrők alapján.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredProjects.map((project) => (
            <div key={project._id} className="border-b last:border-b-0">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(project._id)}
              >
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold">{project.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                    project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform ${expandedProjects[project._id] ? 'transform rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              {expandedProjects[project._id] && (
                <div className="p-4 bg-gray-50 border-t">
                  <p className="text-gray-600 mb-4">
                    {project.description || 'Nincs leírás'}
                  </p>
                  
                  {activeShares[project._id]?.hasActiveShare && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Aktív megosztás</h4>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center text-blue-800">
                          <span className="w-20">Link:</span>
                          <a 
                            href={activeShares[project._id].shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {activeShares[project._id].shareLink}
                          </a>
                        </p>
                        <p className="flex items-center text-blue-800">
                          <span className="w-20">PIN kód:</span>
                          <span>{activeShares[project._id].pin}</span>
                        </p>
                        <p className="flex items-center text-blue-800">
                          <span className="w-20">Lejárat:</span>
                          <span>
                            {new Date(activeShares[project._id].expiresAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShareModal(project._id);
                      }}
                      className={`px-4 py-2 rounded ${
                        activeShares[project._id]?.hasActiveShare
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {activeShares[project._id]?.hasActiveShare ? 'Új megosztási link' : 'Megosztási link generálása'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                        setShowNewInvoiceForm(true);
                      }}
                      className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
                    >
                      Új Számla
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Részletek
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project._id);
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Nincs megjeleníthető projekt a kiválasztott szűrők alapján.
            </div>
          )}
        </div>
      )}

      {/* Új számla form */}
      {showNewInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Új Számla Létrehozása</h2>
            
            <div className="space-y-4">
              {newInvoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Tétel leírása"
                    value={item.description}
                    onChange={(e) => {
                      const updatedItems = [...newInvoice.items];
                      updatedItems[index].description = e.target.value;
                      setNewInvoice({ ...newInvoice, items: updatedItems });
                    }}
                    className="border rounded p-2"
                  />
                  <input
                    type="number"
                    placeholder="Mennyiség"
                    value={item.quantity}
                    onChange={(e) => {
                      const updatedItems = [...newInvoice.items];
                      updatedItems[index].quantity = parseFloat(e.target.value);
                      setNewInvoice({ ...newInvoice, items: updatedItems });
                    }}
                    className="border rounded p-2"
                  />
                  <input
                    type="number"
                    placeholder="Egységár"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const updatedItems = [...newInvoice.items];
                      updatedItems[index].unitPrice = parseFloat(e.target.value);
                      setNewInvoice({ ...newInvoice, items: updatedItems });
                    }}
                    className="border rounded p-2"
                  />
                </div>
              ))}

              <button
                onClick={handleAddInvoiceItem}
                className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200"
              >
                + Új tétel
              </button>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowNewInvoiceForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Mégse
                </button>
                <button
                  onClick={handleCreateInvoice}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Számla létrehozása
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projekt részletek modal */}
      {selectedProject && !showNewInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {selectedProject._id ? 'Projekt Részletek' : 'Új Projekt Létrehozása'}
              </h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Projekt alapadatok */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Projekt neve</label>
                  <input
                    type="text"
                    value={selectedProject.name || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      name: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Állapot</label>
                  <select
                    value={selectedProject.status || 'aktív'}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      status: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="aktív">Aktív</option>
                    <option value="befejezett">Befejezett</option>
                    <option value="felfüggesztett">Felfüggesztett</option>
                    <option value="törölt">Törölt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioritás</label>
                  <select
                    value={selectedProject.priority || 'közepes'}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      priority: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="alacsony">Alacsony</option>
                    <option value="közepes">Közepes</option>
                    <option value="magas">Magas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Leírás</label>
                  <textarea
                    value={selectedProject.description || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      description: e.target.value
                    })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Ügyfél adatok */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Ügyfél Adatok</h3>
                
                {/* Alapadatok */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Név</label>
                  <input
                    type="text"
                    value={selectedProject.client?.name || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      client: {
                        ...selectedProject.client,
                        name: e.target.value
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={selectedProject.client?.email || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      client: {
                        ...selectedProject.client,
                        email: e.target.value
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefonszám</label>
                  <input
                    type="tel"
                    value={selectedProject.client?.phone || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      client: {
                        ...selectedProject.client,
                        phone: e.target.value
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Cím adatok */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Utca, házszám</label>
                  <input
                    type="text"
                    value={selectedProject.client?.address?.street || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      client: {
                        ...selectedProject.client,
                        address: {
                          ...selectedProject.client?.address,
                          street: e.target.value
                        }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Város</label>
                    <input
                      type="text"
                      value={selectedProject.client?.address?.city || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          address: {
                            ...selectedProject.client?.address,
                            city: e.target.value
                          }
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Irányítószám</label>
                    <input
                      type="text"
                      value={selectedProject.client?.address?.postalCode || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          address: {
                            ...selectedProject.client?.address,
                            postalCode: e.target.value
                          }
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Ország</label>
                  <input
                    type="text"
                    value={selectedProject.client?.address?.country || ''}
                    onChange={(e) => setSelectedProject({
                      ...selectedProject,
                      client: {
                        ...selectedProject.client,
                        address: {
                          ...selectedProject.client?.address,
                          country: e.target.value
                        }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Céges adatok */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Céges Adatok</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cégnév</label>
                    <input
                      type="text"
                      value={selectedProject.client?.companyName || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          companyName: e.target.value
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Adószám</label>
                    <input
                      type="text"
                      value={selectedProject.client?.taxNumber || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          taxNumber: e.target.value
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">EU Adószám</label>
                    <input
                      type="text"
                      value={selectedProject.client?.euVatNumber || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          euVatNumber: e.target.value
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cégjegyzékszám</label>
                    <input
                      type="text"
                      value={selectedProject.client?.registrationNumber || ''}
                      onChange={(e) => setSelectedProject({
                        ...selectedProject,
                        client: {
                          ...selectedProject.client,
                          registrationNumber: e.target.value
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Számlák listája */}
            {selectedProject._id && (
              <div className="mt-8">
                <h3 className="font-medium text-lg mb-4">Számlák</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Számla szám
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dátum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Összeg
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fizetve
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Állapot
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedProject.invoices?.map((invoice, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.totalAmount?.toLocaleString()} {selectedProject.financial?.currency || 'EUR'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.paidAmount?.toLocaleString()} {selectedProject.financial?.currency || 'EUR'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mentés/Mégse gombok */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Mégse
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {selectedProject._id ? 'Mentés' : 'Létrehozás'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Megosztási modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium mb-4">Megosztási link létrehozása</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lejárati dátum
              </label>
              <input
                type="date"
                value={expiryDate?.split('T')[0] || ''}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border rounded-md p-2"
              />
              <p className="text-sm text-gray-500 mt-1">Ha nem választasz dátumot, a link 30 napig lesz érvényes.</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowShareModal(null);
                  setExpiryDate('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Mégse
              </button>
              <button
                onClick={() => {
                  generateShareLink(showShareModal);
                  setShowShareModal(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Link generálása
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;