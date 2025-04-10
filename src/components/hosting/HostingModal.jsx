import React, { useState, useEffect } from 'react';
import { api } from '../../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001';

const HostingModal = ({ isOpen, onClose, onSave, hosting = null }) => {
  const [formData, setFormData] = useState({
    client: {
      name: '',
      email: '',
      phone: '',
      company: ''
    },
    plan: {
      type: 'regular',
      name: '',
      billing: 'monthly',
      price: '',
      storage: '',
      bandwidth: '',
      domains: '',
      databases: ''
    },
    service: {
      status: 'pending',
      startDate: '',
      endDate: '',
      domainName: '',
      serverIp: '',
      cpanelUsername: ''
    },
    status: 'new',
    notes: [],
    projectId: '',
    projectName: ''
  });
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Projektek lekérése
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get(`${API_URL}/api/projects`);
        
        if (!response.ok) {
          throw new Error('Nem sikerült lekérni a projekteket');
        }
        
        const data = await response.json();
        setProjects(data);
        setLoading(false);
      } catch (error) {
        console.error('Hiba a projektek lekérésekor:', error);
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  // Hosting adatok betöltése szerkesztés esetén
  useEffect(() => {
    if (hosting) {
      setFormData({
        ...hosting,
        service: {
          ...hosting.service,
          startDate: hosting.service.startDate ? new Date(hosting.service.startDate).toISOString().split('T')[0] : '',
          endDate: hosting.service.endDate ? new Date(hosting.service.endDate).toISOString().split('T')[0] : ''
        },
        projectId: hosting.projectId || '',
        projectName: hosting.projectName || ''
      });
    } else {
      // Új webtárhely esetén alapértelmezett értékek
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      setFormData({
        client: {
          name: '',
          email: '',
          phone: '',
          company: ''
        },
        plan: {
          type: 'regular',
          name: '',
          billing: 'monthly',
          price: '',
          storage: '',
          bandwidth: '',
          domains: '',
          databases: ''
        },
        service: {
          status: 'pending',
          startDate: today.toISOString().split('T')[0],
          endDate: nextMonth.toISOString().split('T')[0],
          domainName: '',
          serverIp: '',
          cpanelUsername: ''
        },
        status: 'new',
        notes: [],
        projectId: '',
        projectName: ''
      });
    }
  }, [hosting]);

  if (!isOpen) return null;

  // Form mezők frissítése
  const handleChange = (e, section, field) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: e.target.value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: e.target.value
      });
    }
  };

  // Projekt kiválasztása
  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    const selectedProject = projects.find(p => p._id === projectId);
    
    setFormData({
      ...formData,
      projectId: projectId,
      projectName: selectedProject ? selectedProject.name : ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validáció
    if (!formData.client.name || !formData.client.email || !formData.plan.name || !formData.service.domainName) {
      alert('Kérjük, töltse ki a kötelező mezőket (Ügyfél név, Email, Csomag név, Domain név)');
      return;
    }
    
    // Adatok előkészítése mentésre
    const dataToSave = {
      ...formData,
      plan: {
        ...formData.plan,
        price: parseFloat(formData.plan.price) || 0,
        storage: parseInt(formData.plan.storage) || 0,
        bandwidth: parseInt(formData.plan.bandwidth) || 0,
        domains: parseInt(formData.plan.domains) || 0,
        databases: parseInt(formData.plan.databases) || 0
      }
    };
    
    // Ha a projectId üres string, akkor null értékre állítjuk
    if (dataToSave.projectId === '') {
      dataToSave.projectId = null;
      dataToSave.projectName = '';
    }
    
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">
          {hosting ? 'Webtárhely Szerkesztése' : 'Új Webtárhely Hozzáadása'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ügyfél adatok */}
          <div className="border-b pb-4">
            <h3 className="text-md font-medium mb-3">Ügyfél Adatok</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ügyfél Név*
                </label>
                <input
                  type="text"
                  value={formData.client.name}
                  onChange={(e) => handleChange(e, 'client', 'name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email*
                </label>
                <input
                  type="email"
                  value={formData.client.email}
                  onChange={(e) => handleChange(e, 'client', 'email')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefonszám
                </label>
                <input
                  type="text"
                  value={formData.client.phone}
                  onChange={(e) => handleChange(e, 'client', 'phone')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cég
                </label>
                <input
                  type="text"
                  value={formData.client.company}
                  onChange={(e) => handleChange(e, 'client', 'company')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Csomag adatok */}
          <div className="border-b pb-4">
            <h3 className="text-md font-medium mb-3">Csomag Adatok</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Csomag Név*
                </label>
                <input
                  type="text"
                  value={formData.plan.name}
                  onChange={(e) => handleChange(e, 'plan', 'name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Csomag Típus
                </label>
                <select
                  value={formData.plan.type}
                  onChange={(e) => handleChange(e, 'plan', 'type')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="regular">Normál</option>
                  <option value="reseller">Viszonteladói</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Számlázási Időszak
                </label>
                <select
                  value={formData.plan.billing}
                  onChange={(e) => handleChange(e, 'plan', 'billing')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="monthly">Havi</option>
                  <option value="annual">Éves</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ár (€)
                </label>
                <input
                  type="number"
                  value={formData.plan.price}
                  onChange={(e) => handleChange(e, 'plan', 'price')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tárhely (MB)
                </label>
                <input
                  type="number"
                  value={formData.plan.storage}
                  onChange={(e) => handleChange(e, 'plan', 'storage')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sávszélesség (GB)
                </label>
                <input
                  type="number"
                  value={formData.plan.bandwidth}
                  onChange={(e) => handleChange(e, 'plan', 'bandwidth')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Szolgáltatás adatok */}
          <div className="border-b pb-4">
            <h3 className="text-md font-medium mb-3">Szolgáltatás Adatok</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Domain Név*
                </label>
                <input
                  type="text"
                  value={formData.service.domainName}
                  onChange={(e) => handleChange(e, 'service', 'domainName')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Státusz
                </label>
                <select
                  value={formData.service.status}
                  onChange={(e) => handleChange(e, 'service', 'status')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="pending">Függőben</option>
                  <option value="active">Aktív</option>
                  <option value="suspended">Felfüggesztett</option>
                  <option value="cancelled">Törölt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kezdő Dátum
                </label>
                <input
                  type="date"
                  value={formData.service.startDate}
                  onChange={(e) => handleChange(e, 'service', 'startDate')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lejárati Dátum
                </label>
                <input
                  type="date"
                  value={formData.service.endDate}
                  onChange={(e) => handleChange(e, 'service', 'endDate')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Szerver IP
                </label>
                <input
                  type="text"
                  value={formData.service.serverIp}
                  onChange={(e) => handleChange(e, 'service', 'serverIp')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  cPanel Felhasználónév
                </label>
                <input
                  type="text"
                  value={formData.service.cpanelUsername}
                  onChange={(e) => handleChange(e, 'service', 'cpanelUsername')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Projekt kapcsolat */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kapcsolódó Projekt
            </label>
            <select
              value={formData.projectId || ''}
              onChange={handleProjectChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Nincs kapcsolódó projekt --</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {hosting ? 'Mentés' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostingModal;
