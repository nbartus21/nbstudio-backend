import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import ProjectCard from './ProjectCard';
import ProjectFilters from './ProjectFilters';
import ProjectGrid from './project/ProjectGrid';
import ProjectList from './project/ProjectList';
import ProjectAccordion from './project/ProjectAccordion';
import ProjectDetailsModal from './project/ProjectDetailsModal';
import NewInvoiceModal from './project/NewInvoiceModal';
import ShareProjectModal from './project/ShareProjectModal';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const ProjectManager = () => {
  const [projectFiles, setProjectFiles] = useState([]);
  const [projectComments, setProjectComments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
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

  // Nézet típusok: grid, list, accordion
  const [viewType, setViewType] = useState('grid');
  const [expandedProjects, setExpandedProjects] = useState({});

  // Sikeres művelet üzenet megjelenítése
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Toggle expanded projects in accordion view
  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/projects');
      const data = await response.json();
      setProjects(data);
      setLoading(false);
    } catch (error) {
      console.error('Hiba a projektek betöltésekor:', error);
      setError('Nem sikerült betölteni a projekteket');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Hozzászólás küldése
  const handleSendComment = async (projectId, comment) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/comments`, comment);
      
      if (response.ok) {
        const updatedProject = await response.json();
        
        // Frissítjük a projekteket
        setProjects(prevProjects => 
          prevProjects.map(p => p._id === projectId ? updatedProject : p)
        );

        showSuccessMessage('Hozzászólás sikeresen elküldve');
      } else {
        throw new Error('Hiba a hozzászólás küldésekor');
      }
    } catch (error) {
      console.error('Hiba a hozzászólás küldésekor:', error);
      setError('Nem sikerült elküldeni a hozzászólást');
    }
  };

  // Fájl feltöltése
  const handleFileUpload = async (projectId, file) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/files`, file);
      
      if (response.ok) {
        const updatedProject = await response.json();
        
        // Frissítjük a projekteket
        setProjects(prevProjects => 
          prevProjects.map(p => p._id === projectId ? updatedProject : p)
        );

        showSuccessMessage('Fájl sikeresen feltöltve');
      } else {
        throw new Error('Hiba a fájl feltöltésekor');
      }
    } catch (error) {
      console.error('Hiba a fájl feltöltésekor:', error);
      setError('Nem sikerült feltölteni a fájlt');
    }
  };
  
  // Aktivitások olvasottnak jelölése
  const handleMarkAsRead = async (projectId) => {
    try {
      // Két párhuzamos kérés indítása
      const [commentsResponse, filesResponse] = await Promise.all([
        api.put(`/api/projects/${projectId}/comments/reset-counters`),
        api.put(`/api/projects/${projectId}/files/reset-counters`)
      ]);
      
      if (commentsResponse.ok && filesResponse.ok) {
        // Az egyik válasz tartalmazza a frissített projektet
        const updatedData = await commentsResponse.json();
        const updatedProject = updatedData.project || updatedData;
        
        // Frissítjük a projekteket
        setProjects(prevProjects => 
          prevProjects.map(p => p._id === projectId ? updatedProject : p)
        );

        showSuccessMessage('Új aktivitások olvasottnak jelölve');
      } else {
        throw new Error('Hiba a számlálók visszaállításakor');
      }
    } catch (error) {
      console.error('Hiba a számlálók visszaállításakor:', error);
      setError('Nem sikerült olvasottnak jelölni az aktivitásokat');
    }
  };
  
  // Projekt aktivitások lekérése
  const fetchProjectActivity = async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/activity`);
      
      if (response.ok) {
        const activityData = await response.json();
        return activityData;
      } else {
        throw new Error('Hiba az aktivitások lekérésekor');
      }
    } catch (error) {
      console.error('Hiba az aktivitások lekérésekor:', error);
      setError('Nem sikerült lekérni az aktivitásokat');
      return null;
    }
  };

  // Generate share link
  const generateShareLink = async (projectId) => {
    try {
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
      showSuccessMessage('Megosztási link sikeresen létrehozva');
    } catch (error) {
      console.error('Hiba a megosztási link generálásakor:', error);
      setError('Nem sikerült létrehozni a megosztási linket');
    }
  };

  // Fetch sharing info
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

  // Save project
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
      showSuccessMessage('Projekt sikeresen mentve');
    } catch (error) {
      console.error('Hiba a projekt mentésekor:', error);
      setError(`Hiba történt: ${error.message}`);
    }
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!selectedProject) {
      console.error('Nincs kiválasztott projekt!');
      return;
    }
  
    try {
      const itemsWithTotal = newInvoice.items.map(item => {
        const total = item.quantity * item.unitPrice;
        return {
          ...item,
          total
        };
      });
  
      const totalAmount = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
      const invoiceNumber = `INV-${Date.now()}`;
  
      const invoiceData = {
        number: invoiceNumber,
        date: new Date(),
        items: itemsWithTotal,
        totalAmount,
        paidAmount: 0,
        status: 'kiállított',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };
  
      const response = await api.post(
        `${API_URL}/projects/${selectedProject._id}/invoices`,
        invoiceData
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült létrehozni a számlát');
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
      setError(null);
      showSuccessMessage('Számla sikeresen létrehozva');
    } catch (error) {
      console.error('Hiba a számla létrehozásakor:', error);
      setError(`Hiba történt a számla létrehozásakor: ${error.message}`);
    }
  };
  
  // Add invoice item
  const handleAddInvoiceItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  // Delete project
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
      showSuccessMessage('Projekt sikeresen törölve');
    } catch (error) {
      console.error('Hiba:', error);
      setError(error.message);
    }
  };

  // File kezelés
  const handleViewFile = (file) => {
    // Itt kezeljük a fájl megtekintést
    console.log('File megtekintése:', file);
  };

  // Apply filters to projects
  const applyFilters = (filters) => {
    const filtered = projects.filter(project => {
      if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !project.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Other filter conditions...
      if (filters.status && project.status !== filters.status) return false;
      if (filters.priority && project.priority !== filters.priority) return false;
      if (filters.client && project.client?.name !== filters.client) return false;

      // Date range filtering
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

      // Budget filtering
      if (filters.minBudget && project.financial?.budget?.min < Number(filters.minBudget)) return false;
      if (filters.maxBudget && project.financial?.budget?.max > Number(filters.maxBudget)) return false;

      // Invoice filtering
      if (filters.hasInvoices && (!project.invoices || project.invoices.length === 0)) return false;

      return true;
    });

    setFilteredProjects(filtered);
  };

  // Fetch share info for all projects
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

  // Update filtered projects when projects change
  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  // Itt rendereljük a projektjeket a ProjectCard komponenssel
  const renderProjects = () => {
    return filteredProjects.map(project => (
      <ProjectCard
        key={project._id}
        project={project}
        isAdmin={true}
        onShare={setShowShareModal}
        onNewInvoice={() => {
          setSelectedProject(project);
          setShowNewInvoiceForm(true);
        }}
        onViewDetails={() => setSelectedProject(project)}
        onDelete={handleDelete}
        onReplyToComment={handleSendComment}
        onUploadFile={handleFileUpload} // Itt adjuk át a fájl feltöltő függvényt
        onViewFile={handleViewFile}
        onMarkAsRead={handleMarkAsRead}
      />
    ));
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
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Share link success message */}
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

      {/* Header */}
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

      {/* Filters */}
      <ProjectFilters 
        projects={projects}
        onFilterChange={applyFilters}
      />

      {/* View switcher */}
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

      {/* Project cards - közvetlen megjelenítés, a nézetváltás helyett */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderProjects()}
      </div>

      {/* Modals */}
      {showNewInvoiceForm && (
        <NewInvoiceModal
          newInvoice={newInvoice}
          onUpdateInvoice={setNewInvoice}
          onClose={() => setShowNewInvoiceForm(false)}
          onSave={handleCreateInvoice}
          onAddItem={handleAddInvoiceItem}
        />
      )}

      {selectedProject && !showNewInvoiceForm && (
        <ProjectDetailsModal
          project={selectedProject}
          onUpdate={setSelectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={handleSaveProject}
        />
      )}

      {showShareModal && (
        <ShareProjectModal
          expiryDate={expiryDate}
          onUpdateExpiryDate={setExpiryDate}
          onClose={() => {
            setShowShareModal(null);
            setExpiryDate('');
          }}
          onGenerate={() => {
            generateShareLink(showShareModal);
            setShowShareModal(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectManager;