import React, { useState, useEffect } from 'react';
import { api } from '../../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001';

const DomainModal = ({ isOpen, onClose, onSave, domain = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    registrar: '',
    registrationDate: '',
    expiryDate: '',
    cost: '',
    autoRenewal: false,
    paymentStatus: 'pending',  // Új mező
    notes: '',
    projectId: '',
    projectName: ''
  });

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Projektek lekérése
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await api.get(`${API_URL}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Hiba a projektek lekérésekor:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (domain) {
      setFormData({
        ...domain,
        registrationDate: domain.registrationDate ? new Date(domain.registrationDate).toISOString().split('T')[0] : '',
        expiryDate: new Date(domain.expiryDate).toISOString().split('T')[0],
        projectId: domain.projectId || '',
        projectName: domain.projectName || ''
      });
    } else {
      setFormData({
        name: '',
        registrar: '',
        registrationDate: '',
        expiryDate: '',
        cost: '',
        autoRenewal: false,
        paymentStatus: 'pending',  // Alapértelmezett érték
        notes: '',
        projectId: '',
        projectName: ''
      });
    }
  }, [domain]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) {
      alert('A domain név és a lejárati dátum kötelező!');
      return;
    }

    onSave({
      ...formData,
      cost: parseFloat(formData.cost) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 rounded-lg">
        <h2 className="text-lg font-semibold">
          {domain ? 'Domain Szerkesztése' : 'Új Domain Hozzáadása'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Domain Név*
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Regisztrátor*
            </label>
            <input
              type="text"
              value={formData.registrar}
              onChange={(e) => setFormData({...formData, registrar: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Regisztrációs Dátum
            </label>
            <input
              type="date"
              value={formData.registrationDate}
              onChange={(e) => setFormData({...formData, registrationDate: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Lejárati Dátum*
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Éves Költség (EUR)*
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({...formData, cost: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="EUR"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoRenewal"
              checked={formData.autoRenewal}
              onChange={(e) => setFormData({...formData, autoRenewal: e.target.checked})}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoRenewal" className="ml-2 block text-sm text-gray-700">
              Automatikus megújítás
            </label>
          </div>

          {/* Projekt kiválasztása */}
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <h3 className="text-lg font-medium text-indigo-800 mb-3">Projekt hozzárendelés</h3>
            <p className="text-sm text-indigo-600 mb-3">
              Válaszd ki, melyik projekthez tartozik ez a domain. Ez segít a könnyebb azonosításban.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kapcsolódó projekt
            </label>
            <select
              value={formData.projectId || ''}
              onChange={(e) => {
                const selectedProject = projects.find(p => p._id === e.target.value);
                setFormData({
                  ...formData,
                  projectId: e.target.value,
                  projectName: selectedProject ? selectedProject.name : ''
                });
              }}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="">Nincs kapcsolódó projekt</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            {formData.projectId && (
              <div className="mt-2 text-sm text-indigo-600">
                A domain a következő projekthez lesz rendelve: <strong>{formData.projectName}</strong>
              </div>
            )}
          </div>

          {/* Új fizetési státusz mező */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fizetési státusz
            </label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="pending">Függőben</option>
              <option value="paid">Kifizetve</option>
              <option value="overdue">Késedelmes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jegyzetek
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
              {domain ? 'Mentés' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainModal;
