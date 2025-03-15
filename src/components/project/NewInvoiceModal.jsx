import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const NewInvoiceModal = ({ 
  projects, 
  onClose, 
  onCreateInvoice, 
  initialProjectId 
}) => {
  const [selectedProject, setSelectedProject] = useState(
    initialProjectId ? projects.find(p => p._id === initialProjectId) : null
  );
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    notes: ''
  });

  // Új tétel hozzáadása
  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  // Form mező frissítése
  const handleUpdateInvoice = (updatedInvoice) => {
    setNewInvoice(updatedInvoice);
  };

  // Projekt kiválasztása
  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    const project = projects.find(p => p._id === projectId);
    setSelectedProject(project);
  };

  // Számla létrehozása
  const handleSave = () => {
    if (!selectedProject) {
      alert('Kérjük válasszon projektet!');
      return;
    }
    onCreateInvoice(selectedProject, newInvoice);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Új Számla Létrehozása</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Projekt kiválasztása */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Projekt kiválasztása
          </label>
          <select
            value={selectedProject?._id || ''}
            onChange={handleProjectChange}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
          >
            <option value="">Válasszon projektet...</option>
            {projects.map(project => (
              <option key={project._id} value={project._id}>
                {project.name} - {project.client?.name || 'Nincs ügyfél'}
              </option>
            ))}
          </select>
        </div>
        
        {/* Számla tételek */}
        <div className="space-y-4 mb-6">
          <h3 className="text-md font-medium">Számla tételek</h3>
          
          {newInvoice.items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tétel leírása</label>
                <input
                  type="text"
                  placeholder="Tétel leírása"
                  value={item.description}
                  onChange={(e) => {
                    const updatedItems = [...newInvoice.items];
                    updatedItems[index].description = e.target.value;
                    handleUpdateInvoice({ ...newInvoice, items: updatedItems });
                  }}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mennyiség</label>
                <input
                  type="number"
                  placeholder="Mennyiség"
                  value={item.quantity}
                  min="1"
                  onChange={(e) => {
                    const updatedItems = [...newInvoice.items];
                    updatedItems[index].quantity = parseFloat(e.target.value);
                    handleUpdateInvoice({ ...newInvoice, items: updatedItems });
                  }}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Egységár ({selectedProject?.financial?.currency || 'EUR'})</label>
                <input
                  type="number"
                  placeholder="Egységár"
                  value={item.unitPrice}
                  min="0"
                  step="0.01"
                  onChange={(e) => {
                    const updatedItems = [...newInvoice.items];
                    updatedItems[index].unitPrice = parseFloat(e.target.value);
                    handleUpdateInvoice({ ...newInvoice, items: updatedItems });
                  }}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleAddItem}
            className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új tétel hozzáadása
          </button>
        </div>
        
        {/* Megjegyzések */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Megjegyzések (opcionális)
          </label>
          <textarea
            value={newInvoice.notes}
            onChange={(e) => handleUpdateInvoice({ ...newInvoice, notes: e.target.value })}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
            rows="3"
            placeholder="Megjegyzések a számlához..."
          ></textarea>
        </div>

        {/* Végösszeg előnézet */}
        {newInvoice.items.length > 0 && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <h3 className="text-md font-medium mb-2">Végösszeg előnézet</h3>
            <table className="w-full">
              <thead className="text-sm text-gray-700">
                <tr>
                  <th className="text-left">Tétel</th>
                  <th className="text-right">Mennyiség</th>
                  <th className="text-right">Egységár</th>
                  <th className="text-right">Összesen</th>
                </tr>
              </thead>
              <tbody>
                {newInvoice.items.map((item, index) => {
                  const total = item.quantity * item.unitPrice;
                  return (
                    <tr key={index} className="text-sm">
                      <td className="py-1">{item.description || '(Nincs leírás)'}</td>
                      <td className="py-1 text-right">{item.quantity}</td>
                      <td className="py-1 text-right">{item.unitPrice} {selectedProject?.financial?.currency || 'EUR'}</td>
                      <td className="py-1 text-right">{total} {selectedProject?.financial?.currency || 'EUR'}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td colSpan="3" className="pt-2 text-right">Végösszeg:</td>
                  <td className="pt-2 text-right">
                    {newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)} {selectedProject?.financial?.currency || 'EUR'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            disabled={!selectedProject}
          >
            Számla létrehozása
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceModal;