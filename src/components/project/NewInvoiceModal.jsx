import React, { useState } from 'react';
import { X, Plus, Trash2, Calculator, RefreshCw } from 'lucide-react';

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
    notes: '',
    recurring: {
      isRecurring: false,
      interval: 'havonta',
      nextDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Alapértelmezetten 30 nap múlva
      endDate: null,
      remainingOccurrences: null
    },
    // E-mail küldési beállítások
    sendEmail: true, // Alapértelmezetten küldünk e-mailt
    language: 'hu' // Alapértelmezett nyelv: magyar
  });

  // Új tétel hozzáadása
  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  // Tétel törlése
  const handleRemoveItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
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

    // Ellenőrizzük, hogy minden tételnek van-e leírása
    const hasEmptyDescriptions = newInvoice.items.some(item => !item.description.trim());
    if (hasEmptyDescriptions) {
      alert('Kérjük töltse ki minden tétel leírását!');
      return;
    }

    // Ellenőrizzük, hogy van-e ügyfél e-mail cím, ha e-mailt akarunk küldeni
    if (newInvoice.sendEmail && (!selectedProject.client || !selectedProject.client.email)) {
      // Figyelmeztetés, de engedjük tovább
      if (confirm('Az ügyfélnek nincs e-mail címe, ezért nem fog értesítést kapni. Folytatja?')) {
        onCreateInvoice(selectedProject, newInvoice);
      }
      return;
    }

    onCreateInvoice(selectedProject, newInvoice);
  };

  // Végösszeg számítása
  const calculateTotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
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

        {selectedProject && (
          <>
            {/* Ügyfél adatok megjelenítése */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Ügyfél adatok</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Név</p>
                  <p className="font-medium">{selectedProject.client?.name}</p>
                </div>
                {selectedProject.client?.companyName && (
                  <div>
                    <p className="text-sm text-gray-600">Cégnév</p>
                    <p className="font-medium">{selectedProject.client.companyName}</p>
                  </div>
                )}
                {selectedProject.client?.taxNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Adószám</p>
                    <p className="font-medium">{selectedProject.client.taxNumber}</p>
                  </div>
                )}
                {selectedProject.client?.address && (
                  <div>
                    <p className="text-sm text-gray-600">Cím</p>
                    <p className="font-medium">
                      {selectedProject.client.address.postalCode} {selectedProject.client.address.city}, {selectedProject.client.address.street}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Számla tételek */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Tételek</h3>
                <button
                  onClick={handleAddItem}
                  className="flex items-center text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Új tétel
                </button>
              </div>

              {newInvoice.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 border rounded-lg">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium">#{index + 1}. tétel</h4>
                    {index > 0 && (
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">Leírás</label>
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
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updatedItems = [...newInvoice.items];
                          updatedItems[index].quantity = parseInt(e.target.value) || 0;
                          handleUpdateInvoice({ ...newInvoice, items: updatedItems });
                        }}
                        className="w-full border rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Egységár ({selectedProject?.financial?.currency || 'EUR'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updatedItems = [...newInvoice.items];
                          updatedItems[index].unitPrice = parseFloat(e.target.value) || 0;
                          handleUpdateInvoice({ ...newInvoice, items: updatedItems });
                        }}
                        className="w-full border rounded p-2"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <p className="text-sm text-gray-600">
                      Részösszeg: {(item.quantity * item.unitPrice).toFixed(2)} {selectedProject?.financial?.currency || 'EUR'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Megjegyzések */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Megjegyzések
              </label>
              <textarea
                value={newInvoice.notes}
                onChange={(e) => handleUpdateInvoice({ ...newInvoice, notes: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                rows="3"
                placeholder="További megjegyzések a számlához..."
              />
            </div>

            {/* Ismétlődő számla beállítások */}
            <div className="mb-6 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2 text-indigo-600" />
                  Ismétlődő számla
                </h3>
                <div className="flex items-center">
                  <label className="inline-flex items-center mr-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newInvoice.recurring.isRecurring}
                      onChange={(e) => {
                        const isRecurring = e.target.checked;
                        handleUpdateInvoice({
                          ...newInvoice,
                          recurring: {
                            ...newInvoice.recurring,
                            isRecurring
                          }
                        });
                      }}
                      className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                    />
                    <span className="ml-2 text-gray-700">Ismétlődő számla létrehozása</span>
                  </label>
                </div>
              </div>

              {newInvoice.recurring.isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Ismétlődés gyakorisága</label>
                    <select
                      value={newInvoice.recurring.interval}
                      onChange={(e) => {
                        handleUpdateInvoice({
                          ...newInvoice,
                          recurring: {
                            ...newInvoice.recurring,
                            interval: e.target.value
                          }
                        });
                      }}
                      className="w-full border rounded p-2"
                    >
                      <option value="havonta">Havonta</option>
                      <option value="negyedévente">Negyedévente</option>
                      <option value="félévente">Félévente</option>
                      <option value="évente">Évente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Következő számlázási dátum</label>
                    <input
                      type="date"
                      value={newInvoice.recurring.nextDate ? new Date(newInvoice.recurring.nextDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        handleUpdateInvoice({
                          ...newInvoice,
                          recurring: {
                            ...newInvoice.recurring,
                            nextDate: new Date(e.target.value)
                          }
                        });
                      }}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Befejezés dátuma (opcionális)
                    </label>
                    <input
                      type="date"
                      value={newInvoice.recurring.endDate ? new Date(newInvoice.recurring.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        handleUpdateInvoice({
                          ...newInvoice,
                          recurring: {
                            ...newInvoice.recurring,
                            endDate: date
                          }
                        });
                      }}
                      className="w-full border rounded p-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ha üres, akkor nincs határidő</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Ismétlődések száma (opcionális)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newInvoice.recurring.remainingOccurrences || ''}
                      onChange={(e) => {
                        const count = e.target.value ? parseInt(e.target.value) : null;
                        handleUpdateInvoice({
                          ...newInvoice,
                          recurring: {
                            ...newInvoice.recurring,
                            remainingOccurrences: count
                          }
                        });
                      }}
                      className="w-full border rounded p-2"
                      placeholder="Korlátlan"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ha üres, akkor korlátlan számú ismétlődés</p>
                  </div>
                </div>
              )}

              {newInvoice.recurring.isRecurring && (
                <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                  <p className="font-medium">Ismétlődő számla létrehozása</p>
                  <p>Az ismétlődő számlák automatikusan létrehozzák az új számlákat a megadott időközönként. A számlák állapota "kiállított" lesz, amíg manuálisan fizetettnek nem jelöli őket.</p>
                </div>
              )}
            </div>

            {/* E-mail küldési opciók */}
            <div className="mb-6 border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">E-mail értesítés</h3>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={newInvoice.sendEmail}
                  onChange={(e) => {
                    handleUpdateInvoice({
                      ...newInvoice,
                      sendEmail: e.target.checked
                    });
                  }}
                  className="h-5 w-5 text-indigo-600 rounded"
                />
                <label htmlFor="sendEmail" className="ml-2 text-gray-700">
                  Értesítés küldése e-mailben az ügyfélnek
                </label>
              </div>

              {selectedProject?.client?.email && (
                <p className="text-sm text-gray-600 mb-4">
                  Ügyfél e-mail címe: {selectedProject.client.email}
                </p>
              )}

              {newInvoice.sendEmail && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail nyelve
                  </label>
                  <select
                    value={newInvoice.language}
                    onChange={(e) => {
                      handleUpdateInvoice({
                        ...newInvoice,
                        language: e.target.value
                      });
                    }}
                    className="w-full border rounded p-2"
                  >
                    <option value="hu">Magyar</option>
                    <option value="en">Angol</option>
                    <option value="de">Német</option>
                  </select>
                </div>
              )}
            </div>

            {/* Végösszeg */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium">Végösszeg</h3>
                </div>
                <p className="text-2xl font-bold">
                  {calculateTotal().toFixed(2)} {selectedProject?.financial?.currency || 'EUR'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Gombok */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Mégsem
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedProject || newInvoice.items.length === 0}
            className={`px-4 py-2 rounded-md text-white ${
              !selectedProject || newInvoice.items.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Számla létrehozása
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceModal;