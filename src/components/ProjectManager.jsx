import React, { useState, useEffect } from 'react';
import { generateResponseSuggestion, generateSummary } from '../services/deepseekService';
import ProjectFilters from './ProjectFilters';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const ProjectManager = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [sharePin, setSharePin] = useState('');
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }]
  });

  const truncateDescription = (description, maxLength = 140) => {
    if (!description) return '';
    return description.length > maxLength 
      ? `${description.substring(0, maxLength)}...` 
      : description;
  };

  const generateShareLink = async (projectId) => {
    try {
      const response = await api.post(`${API_URL}/projects/${projectId}/share`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba történt a link generálása során');
      }
  
      const data = await response.json();
      setShareLink(data.shareLink);
      setSharePin(data.pin); // Itt mentjük el a PIN kódot
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

  useEffect(() => {
    fetchProjects();
  }, []);

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
          taxNumber: selectedProject.client.taxNumber || '',
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
        <input 
          type="text" 
          value={shareLink} 
          readOnly 
          className="flex-1 p-1 border rounded bg-white"
        />
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
      <div className="flex space-x-2 mt-2">
        <button 
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareLink);
              setError(null);
              // Opcionális: visszajelzés a felhasználónak
              const originalText = 'Link másolása';
              const button = document.querySelector('#copyLinkBtn');
              if (button) {
                button.textContent = 'Másolva!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 2000);
              }
            } catch (err) {
              setError('Nem sikerült másolni a linket');
            }
          }}
          id="copyLinkBtn"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
        >
          Link másolása
        </button>
        <button 
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(sharePin);
              setError(null);
              // Opcionális: visszajelzés a felhasználónak
              const originalText = 'PIN másolása';
              const button = document.querySelector('#copyPinBtn');
              if (button) {
                button.textContent = 'Másolva!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 2000);
              }
            } catch (err) {
              setError('Nem sikerült másolni a PIN kódot');
            }
          }}
          id="copyPinBtn"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
        >
          PIN másolása
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
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
        onFilterChange={(filters) => {
          const filteredProjects = projects.filter(project => {
            // Keresés szövegben
            if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase()) &&
                !project.description?.toLowerCase().includes(filters.search.toLowerCase())) {
              return false;
            }

            // Státusz szűrés
            if (filters.status && project.status !== filters.status) {
              return false;
            }

            // Prioritás szűrés
            if (filters.priority && project.priority !== filters.priority) {
              return false;
            }

            // Dátum szűrés
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

            // Ügyfél szűrés
            if (filters.client && project.client?.name !== filters.client) {
              return false;
            }

            // Költségvetés szűrés
            if (filters.minBudget && project.financial?.budget?.min < Number(filters.minBudget)) {
              return false;
            }
            if (filters.maxBudget && project.financial?.budget?.max > Number(filters.maxBudget)) {
              return false;
            }

            // Számla szűrés
            if (filters.hasInvoices && (!project.invoices || project.invoices.length === 0)) {
              return false;
            }

            return true;
          });

          setProjects(filteredProjects);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map(project => (
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

            <div className="space-y-2">
              <button
                onClick={() => generateShareLink(project._id)}
                className="w-full bg-white border border-green-600 text-green-600 px-4 py-2 rounded hover:bg-green-50"
              >
                Megosztási Link
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
    </div>
  );
};

export default ProjectManager;