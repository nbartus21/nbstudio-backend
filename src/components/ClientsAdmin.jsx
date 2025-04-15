import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ClientsAdmin = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const navigate = useNavigate();

  // Új felhasználó űrlap
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    role: 'client',
    language: 'hu',
    companyName: '',
    phone: '',
    projects: []
  });

  // Szűrő
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Ellenőrizzük, hogy az admin be van-e jelentkezve
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Adatok lekérése
    fetchClients();
    fetchProjects();
  }, [navigate]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a klienseket');
      }

      const data = await response.json();
      setClients(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a projekteket');
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Hiba a projektek lekérésekor:', err);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClient)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült létrehozni a felhasználót');
      }

      // Siker esetén az űrlap visszaállítása
      setNewClient({
        name: '',
        email: '',
        role: 'client',
        language: 'hu',
        companyName: '',
        phone: '',
        projects: []
      });

      // Kliensek frissítése
      fetchClients();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  const handleProjectsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setNewClient(prev => ({ ...prev, projects: selectedOptions }));
  };

  const handleClientSelect = async (clientId) => {
    if (selectedClient && selectedClient._id === clientId) {
      setSelectedClient(null);
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült lekérni a felhasználó adatait');
      }

      const data = await response.json();
      setSelectedClient(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a felhasználót?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült törölni a felhasználót');
      }

      // Ha a kiválasztott felhasználót töröltük, töröljük a kiválasztást
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient(null);
      }

      // Kliensek frissítése
      fetchClients();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleActivateClient = async (clientId, active) => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active })
      });

      if (!response.ok) {
        throw new Error('Nem sikerült módosítani a felhasználó állapotát');
      }

      // Kliensek frissítése
      fetchClients();

      // Kiválasztott felhasználó frissítése
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient(prev => ({ ...prev, active }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddProject = async (clientId, projectId) => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        throw new Error('Nem sikerült hozzáadni a projektet a felhasználóhoz');
      }

      // Kiválasztott felhasználó frissítése
      if (selectedClient && selectedClient._id === clientId) {
        handleClientSelect(clientId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveProject = async (clientId, projectId) => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült eltávolítani a projektet a felhasználótól');
      }

      // Kiválasztott felhasználó frissítése
      if (selectedClient && selectedClient._id === clientId) {
        handleClientSelect(clientId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (clientId) => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/users/${clientId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült visszaállítani a jelszót');
      }

      alert('A jelszó visszaállítása megtörtént. Az új jelszó emailben elküldve az ügyfélnek.');
    } catch (err) {
      setError(err.message);
    }
  };

  // Szűrt kliensek
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(filter.toLowerCase()) || 
    client.email.toLowerCase().includes(filter.toLowerCase()) ||
    (client.companyName ? client.companyName.toLowerCase().includes(filter.toLowerCase()) : false)
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Ügyfelek kezelése</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Ügyfelek kezelése</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Hiba!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Szűrő */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Keresés név, email vagy cégnév alapján..."
          className="w-full p-2 border border-gray-300 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Új felhasználó form */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Új ügyfél hozzáadása</h2>
            <form onSubmit={handleCreateClient}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Név
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="name"
                  type="text"
                  name="name"
                  value={newClient.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email cím
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="email"
                  type="email"
                  name="email"
                  value={newClient.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
                  Cégnév
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="companyName"
                  type="text"
                  name="companyName"
                  value={newClient.companyName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                  Telefonszám
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="phone"
                  type="text"
                  name="phone"
                  value={newClient.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="language">
                  Alapértelmezett nyelv
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="language"
                  name="language"
                  value={newClient.language}
                  onChange={handleInputChange}
                >
                  <option value="hu">Magyar</option>
                  <option value="en">Angol</option>
                  <option value="de">Német</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="projects">
                  Projektek (több is választható)
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="projects"
                  name="projects"
                  multiple
                  size="5"
                  value={newClient.projects}
                  onChange={handleProjectsChange}
                >
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Létrehozás
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Ügyfelek listája */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Ügyfelek</h2>
            {filteredClients.length === 0 ? (
              <p className="text-gray-500">Nincsenek ügyfelek, vagy nincs a keresési feltételnek megfelelő ügyfél.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredClients.filter(client => client.role === 'client').map(client => (
                  <div 
                    key={client._id} 
                    className={`py-3 cursor-pointer ${selectedClient && selectedClient._id === client._id ? 'bg-indigo-50' : ''}`}
                    onClick={() => handleClientSelect(client._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{client.name}</h3>
                        <p className="text-sm text-gray-500">{client.email}</p>
                        {client.companyName && <p className="text-sm text-gray-500">{client.companyName}</p>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {client.active ? 'Aktív' : 'Inaktív'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kiválasztott ügyfél részletei */}
        <div className="col-span-1">
          {selectedClient ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Ügyfél adatai</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleActivateClient(selectedClient._id, !selectedClient.active)}
                    className={`px-3 py-1 text-xs font-medium rounded ${selectedClient.active ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    {selectedClient.active ? 'Inaktiválás' : 'Aktiválás'}
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedClient._id)}
                    className="px-3 py-1 text-xs font-medium rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Jelszó visszaállítása
                  </button>
                  <button
                    onClick={() => handleDeleteClient(selectedClient._id)}
                    className="px-3 py-1 text-xs font-medium rounded bg-red-500 hover:bg-red-600 text-white"
                  >
                    Törlés
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Név</p>
                    <p className="font-medium">{selectedClient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedClient.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nyelv</p>
                    <p className="font-medium">
                      {selectedClient.language === 'hu' ? 'Magyar' : 
                       selectedClient.language === 'en' ? 'Angol' : 
                       selectedClient.language === 'de' ? 'Német' : selectedClient.language}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefon</p>
                    <p className="font-medium">{selectedClient.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cégnév</p>
                    <p className="font-medium">{selectedClient.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Regisztráció ideje</p>
                    <p className="font-medium">{new Date(selectedClient.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Projektek */}
              <div className="mt-6">
                <h3 className="font-medium mb-2">Hozzárendelt projektek</h3>
                {selectedClient.projects && selectedClient.projects.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClient.projects.map(project => (
                      <div key={project._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{project.name}</span>
                        <button
                          onClick={() => handleRemoveProject(selectedClient._id, project._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nincs hozzárendelt projekt</p>
                )}

                {/* Projekt hozzáadása */}
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <select
                      className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-700"
                      id="addProject"
                      name="addProject"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddProject(selectedClient._id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Projekt hozzáadása...</option>
                      {projects.filter(project => 
                        !selectedClient.projects.some(p => p._id === project._id)
                      ).map(project => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-500 text-center">Nincs kiválasztva ügyfél. Kattintson egy ügyfélre a részletek megtekintéséhez.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientsAdmin; 