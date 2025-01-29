import React, { useState, useEffect } from 'react';
import { generateResponseSuggestion, generateSummary } from '../services/deepseekService';
import ProjectFilters from './ProjectFilters';


const ProjectManager = () => {
const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('Projektek lekérése...'); // Debug log
      const response = await fetch('https://nbstudio-backend.onrender.com/api/projects');
      
      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a projekteket');
      }
      
      const data = await response.json();
      console.log('Lekért projektek:', data); // Debug log
      setProjects(data);
      
      // Ha van kiválasztott projekt, frissítsük azt is
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

  const handleCreateFromCalculator = async (calculatorEntry) => {
    try {
      const aiSummary = await generateSummary(calculatorEntry.projectDescription);
      const nextSteps = await generateResponseSuggestion(
        `Javasolj következő lépéseket ehhez a projekthez: ${calculatorEntry.projectDescription}`
      );

      const newProject = {
        name: `${calculatorEntry.projectType} Projekt - ${new Date().toLocaleDateString()}`,
        description: calculatorEntry.projectDescription,
        calculatorEntry: calculatorEntry._id,
        client: {
          email: calculatorEntry.email
        },
        financial: {
          budget: {
            min: calculatorEntry.estimatedCost.minCost,
            max: calculatorEntry.estimatedCost.maxCost
          }
        },
        aiAnalysis: {
          summary: aiSummary,
          nextSteps: nextSteps.split('\n'),
          lastUpdated: new Date()
        }
      };

      const response = await fetch('https://nbstudio-backend.onrender.com/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject)
      });

      if (!response.ok) throw new Error('Hiba a projekt létrehozásakor');
      
      fetchProjects();
    } catch (error) {
      console.error('Hiba:', error);
    }
  };

  const calculateInvoiceTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleAddInvoiceItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleCreateInvoice = async () => {
    if (!selectedProject) return;
  
    // Számítsuk ki az egyes tételek total értékét
    const itemsWithTotal = newInvoice.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));
  
    const totalAmount = calculateInvoiceTotal(newInvoice.items);
    const invoiceNumber = `INV-${Date.now()}`; // Generált számlaszám
  
    const invoiceData = {
      number: invoiceNumber,
      date: new Date(),
      amount: totalAmount,
      status: 'kiállított',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 napos fizetési határidő
      items: itemsWithTotal,
      totalAmount: totalAmount,
      paidAmount: 0,
      notes: ''
    };
  
    try {
      console.log('Számla létrehozása:', invoiceData); // Debug log
  
      const response = await fetch(`https://nbstudio-backend.onrender.com/api/projects/${selectedProject._id}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hiba a számla létrehozásakor');
      }
  
      // Frissítsük a projektet és az állapotot
      const updatedProject = await response.json();
      setSelectedProject(updatedProject);
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p._id === updatedProject._id ? updatedProject : p
        )
      );
      
      setShowNewInvoiceForm(false);
      setNewInvoice({ items: [{ description: '', quantity: 1, unitPrice: 0 }] });
  
    } catch (error) {
      console.error('Hiba:', error);
      alert('Nem sikerült létrehozni a számlát: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        
        <h1 className="text-2xl font-bold text-gray-900">Projekt Kezelő</h1>
        <button
          onClick={() => setSelectedProject({})}
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
                onClick={() => setSelectedProject(project)}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Részletek
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Műveletek
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
                {invoice.totalAmount?.toLocaleString()} EUR
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {invoice.paidAmount?.toLocaleString()} EUR
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
                <button
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setShowInvoiceDetails(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Részletek
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Számla részletek modal */}
{/* Számla részletek modal */}
{showInvoiceDetails && selectedInvoice && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Számla részletei</h2>
            <button
              onClick={() => {
                setShowInvoiceDetails(false);
                setSelectedInvoice(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Számla száma:</p>
                <p className="font-medium">{selectedInvoice.number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Kiállítás dátuma:</p>
                <p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Tételek:</p>
              <div className="mt-2 space-y-2">
                {selectedInvoice.items.map((item, index) => (
                  <div key={index} className="flex justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} x {item.unitPrice} EUR
                      </p>
                    </div>
                    <p className="font-medium">{(item.quantity * item.unitPrice).toFixed(2)} EUR</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <p className="font-semibold">Végösszeg:</p>
              <p className="font-semibold">{selectedInvoice.totalAmount.toFixed(2)} EUR</p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div>
                <p className="text-sm text-gray-600">Állapot:</p>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  selectedInvoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                  selectedInvoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>
              {selectedInvoice.status !== 'fizetett' && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('https://nbstudio-backend.onrender.com/api/create-payment-link', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          amount: selectedInvoice.totalAmount * 100, // Stripe cents-ben várja az összeget
                          currency: 'eur',
                          invoice_id: selectedInvoice._id,
                          email: selectedProject.client.email
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Fizetési link generálása sikertelen');
                      }

                      const data = await response.json();
                      
                      // Link másolása a vágólapra
                      await navigator.clipboard.writeText(data.url);
                      alert('Fizetési link másolva a vágólapra!');
                      
                      // Link megnyitása új ablakban
                      window.open(data.url, '_blank');
                    } catch (error) {
                      console.error('Hiba:', error);
                      alert('Hiba történt a fizetési link generálása során: ' + error.message);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Fizetés kezdeményezése
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
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
                onClick={async () => {
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
                    
                    setSelectedProject(null);
                    fetchProjects();
                  } catch (error) {
                    console.error('Hiba:', error);
                    alert('Nem sikerült menteni a projektet: ' + error.message);
                  }
                }}
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