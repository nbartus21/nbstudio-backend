import React, { useState, useEffect } from 'react';
import { generateResponseSuggestion, generateSummary } from '../services/deepseekService';
import ProjectFilters from './ProjectFilters';

// Modal Component
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const ProjectManager = () => {
  // State declarations
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      console.log('Projektek lekérése...');
      const response = await fetch('https://nbstudio-backend.onrender.com/api/projects');
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a projekteket');
      }
      
      const data = await response.json();
      console.log('Lekért projektek:', data);
      setProjects(data);
      
      if (selectedProject) {
        const updatedProject = data.find(p => p._id === selectedProject._id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
    } catch (error) {
      console.error('Hiba a projektek betöltésekor:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle project modal open
  const handleOpenProject = (project) => {
    setSelectedProject(project || {});
    setShowProjectModal(true);
    console.log('Opening project:', project);
  };

  // Calculate invoice total
  const calculateInvoiceTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // Handle new invoice item
  const handleAddInvoiceItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  // Handle invoice view
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  // Handle invoice download
  const handleDownloadInvoice = async (invoice) => {
    try {
      // URL módosítása az új backend végpontnak megfelelően
      const response = await fetch(
        `https://nbstudio-backend.onrender.com/api/projects/${selectedProject._id}/invoices/${invoice._id}/pdf`,
        {
          method: 'GET',
        }
      );
  
      if (!response.ok) {
        throw new Error('Hiba a PDF letöltése során');
      }
  
      // Blob létrehozása a válaszból
      const blob = await response.blob();
      
      // Letöltés indítása
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `szamla-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  
    } catch (error) {
      console.error('Hiba:', error);
      alert('Nem sikerült letölteni a számlát: ' + error.message);
    }
  };
  

// Handle create invoice
const handleCreateInvoice = async () => {
    if (!selectedProject) return;
  
    try {
      // Ellenőrizzük a kötelező mezőket
      const hasEmptyFields = newInvoice.items.some(
        item => !item.description || item.quantity <= 0 || item.unitPrice <= 0
      );
  
      if (hasEmptyFields) {
        alert('Kérjük, töltse ki az összes kötelező mezőt a számlán!');
        return;
      }
  
      const itemsWithTotal = newInvoice.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }));
  
      const totalAmount = calculateInvoiceTotal(newInvoice.items);
      const invoiceNumber = `INV-${Date.now()}`;
  
      const invoiceData = {
        number: invoiceNumber,
        date: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        items: itemsWithTotal,
        totalAmount: totalAmount,
        paidAmount: 0,
        status: 'kiállított',
        notes: ''
      };
  
      const response = await fetch(
        `https://nbstudio-backend.onrender.com/api/projects/${selectedProject._id}/invoices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invoiceData)
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba a számla létrehozásakor');
      }
  
      const updatedProject = await response.json();
      setSelectedProject(updatedProject);
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p._id === updatedProject._id ? updatedProject : p
        )
      );
      
      setShowNewInvoiceForm(false);
      setNewInvoice({ items: [{ description: '', quantity: 1, unitPrice: 0 }] });
      
      alert('A számla sikeresen létrehozva!');
  
    } catch (error) {
      console.error('Hiba:', error);
      alert('Nem sikerült létrehozni a számlát: ' + error.message);
    }
  };

  // Handle project save
  const handleSaveProject = async () => {
    try {
      const url = selectedProject._id
        ? `https://nbstudio-backend.onrender.com/api/projects/${selectedProject._id}`
        : 'https://nbstudio-backend.onrender.com/api/projects';
      
      const response = await fetch(url, {
        method: selectedProject._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedProject)
      });

      if (!response.ok) throw new Error('Hiba a mentés során');
      
      setShowProjectModal(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Hiba:', error);
      alert('Nem sikerült menteni a projektet: ' + error.message);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projekt Kezelő</h1>
        <button
          onClick={() => handleOpenProject({})}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Új Projekt
        </button>
      </div>

      {/* Filters */}
      <ProjectFilters 
        projects={projects}
        onFilterChange={(filters) => {
          const filteredProjects = projects.filter(project => {
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
          setProjects(filteredProjects);
        }}
      />

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map(project => (
          <div
            key={project._id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
            <p className="text-gray-600 mb-4">{project.description}</p>
            
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
                onClick={() => {
                  setSelectedProject(project);
                  setShowNewInvoiceForm(true);
                }}
                className="w-full bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-50"
              >
                Új Számla
              </button>
              <button
                onClick={() => handleOpenProject(project)}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Részletek
              </button>
            </div>
          </div>
        ))}
      </div>

{/* Project Modal */}
<Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setSelectedProject(null);
        }}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {selectedProject?._id ? 'Projekt Részletek' : 'Új Projekt Létrehozása'}
            </h2>
            <button
              onClick={() => {
                setShowProjectModal(false);
                setSelectedProject(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Projekt neve</label>
                <input
                  type="text"
                  value={selectedProject?.name || ''}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Állapot</label>
                <select
                  value={selectedProject?.status || 'aktív'}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
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
                  value={selectedProject?.priority || 'közepes'}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    priority: e.target.value
                  }))}
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
                  value={selectedProject?.description || ''}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Client Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Ügyfél Adatok</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Név</label>
                <input
                  type="text"
                  value={selectedProject?.client?.name || ''}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      name: e.target.value
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={selectedProject?.client?.email || ''}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      email: e.target.value
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Adószám</label>
                <input
                  type="text"
                  value={selectedProject?.client?.taxNumber || ''}
                  onChange={(e) => setSelectedProject(prev => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      taxNumber: e.target.value
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>


          {selectedProject?._id && (
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Műveletek
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(selectedProject?.invoices || []).map((invoice, index) => (
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
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewInvoice(invoice)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Megtekintés"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDownloadInvoice(invoice)}
                    className="text-green-600 hover:text-green-900"
                    title="PDF letöltése"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowProjectModal(false);
                setSelectedProject(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Mégse
            </button>
            <button
              onClick={handleSaveProject}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {selectedProject?._id ? 'Mentés' : 'Létrehozás'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Invoice Modal */}
      <Modal
        isOpen={showNewInvoiceForm}
        onClose={() => setShowNewInvoiceForm(false)}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Új Számla Létrehozása</h2>
            <button
              onClick={() => setShowNewInvoiceForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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

          <div className="flex justify-end gap-4">
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
      </Modal>

      {/* Invoice View Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
        }}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Számla Részletek</h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-t pt-4">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Számla szám</dt>
                  <dd className="text-sm text-gray-900">{selectedInvoice.number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dátum</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(selectedInvoice.date).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Összeg</dt>
                  <dd className="text-sm text-gray-900">
                    {selectedInvoice.totalAmount?.toLocaleString()} EUR
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Státusz</dt>
                  <dd className="text-sm text-gray-900">{selectedInvoice.status}</dd>
                </div>
              </dl>
            </div>

            <button
              onClick={() => handleDownloadInvoice(selectedInvoice)}
              className="w-full mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              PDF Letöltése
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectManager;