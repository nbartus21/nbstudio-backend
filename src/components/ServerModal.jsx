import React, { useState, useEffect } from 'react';

const ServerModal = ({ isOpen, onClose, onSave, server = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'primary',
    provider: {
      name: '',
      accountId: '',
      controlPanelUrl: ''
    },
    specifications: {
      cpu: '',
      ram: '',
      storage: {
        total: 0,
        used: 0,
        type: 'SSD'
      }
    },
    costs: {
      monthly: 0,
      currency: 'EUR',
      billingCycle: 'monthly'
    },
    status: 'active'
  });

  useEffect(() => {
    if (server) {
      setFormData(server);
    }
  }, [server]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {server ? 'Szerver Szerkesztése' : 'Új Szerver'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alapadatok */}
          <div>
            <label className="block text-sm font-medium mb-1">Név*</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Típus</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="primary">Elsődleges</option>
              <option value="secondary">Másodlagos</option>
              <option value="development">Fejlesztői</option>
              <option value="backup">Backup</option>
            </select>
          </div>

          {/* Szolgáltató adatok */}
          <div>
            <label className="block text-sm font-medium mb-1">Szolgáltató</label>
            <input
              type="text"
              value={formData.provider.name}
              onChange={(e) => setFormData({
                ...formData,
                provider: {...formData.provider, name: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fiók azonosító</label>
            <input
              type="text"
              value={formData.provider.accountId}
              onChange={(e) => setFormData({
                ...formData,
                provider: {...formData.provider, accountId: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vezérlőpult URL</label>
            <input
              type="text"
              value={formData.provider.controlPanelUrl}
              onChange={(e) => setFormData({
                ...formData,
                provider: {...formData.provider, controlPanelUrl: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Hardver specifikációk */}
          <div>
            <label className="block text-sm font-medium mb-1">CPU</label>
            <input
              type="text"
              value={formData.specifications.cpu}
              onChange={(e) => setFormData({
                ...formData,
                specifications: {...formData.specifications, cpu: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
              placeholder="pl.: 4 vCPU"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">RAM</label>
            <input
              type="text"
              value={formData.specifications.ram}
              onChange={(e) => setFormData({
                ...formData,
                specifications: {...formData.specifications, ram: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
              placeholder="pl.: 8 GB"
            />
          </div>

          {/* Tárhely adatok */}
          <div>
            <label className="block text-sm font-medium mb-1">Teljes tárhely (GB)</label>
            <input
              type="number"
              value={formData.specifications.storage.total}
              onChange={(e) => setFormData({
                ...formData,
                specifications: {
                  ...formData.specifications,
                  storage: {
                    ...formData.specifications.storage,
                    total: parseInt(e.target.value)
                  }
                }
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Használt tárhely (GB)</label>
            <input
              type="number"
              value={formData.specifications.storage.used}
              onChange={(e) => setFormData({
                ...formData,
                specifications: {
                  ...formData.specifications,
                  storage: {
                    ...formData.specifications.storage,
                    used: parseInt(e.target.value)
                  }
                }
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tárhely típus</label>
            <select
              value={formData.specifications.storage.type}
              onChange={(e) => setFormData({
                ...formData,
                specifications: {
                  ...formData.specifications,
                  storage: {
                    ...formData.specifications.storage,
                    type: e.target.value
                  }
                }
              })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="SSD">SSD</option>
              <option value="HDD">HDD</option>
              <option value="NVMe">NVMe</option>
            </select>
          </div>

          {/* Költségek */}
          <div>
            <label className="block text-sm font-medium mb-1">Havi költség</label>
            <input
              type="number"
              value={formData.costs.monthly}
              onChange={(e) => setFormData({
                ...formData,
                costs: {...formData.costs, monthly: parseFloat(e.target.value)}
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pénznem</label>
            <select
              value={formData.costs.currency}
              onChange={(e) => setFormData({
                ...formData,
                costs: {...formData.costs, currency: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="HUF">HUF</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Számlázási ciklus</label>
            <select
              value={formData.costs.billingCycle}
              onChange={(e) => setFormData({
                ...formData,
                costs: {...formData.costs, billingCycle: e.target.value}
              })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="monthly">Havi</option>
              <option value="quarterly">Negyedéves</option>
              <option value="yearly">Éves</option>
            </select>
          </div>

          {/* Állapot */}
          <div>
            <label className="block text-sm font-medium mb-1">Állapot</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="active">Aktív</option>
              <option value="maintenance">Karbantartás</option>
              <option value="offline">Offline</option>
              <option value="decommissioned">Leszerelt</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Mégse
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {server ? 'Mentés' : 'Létrehozás'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerModal;