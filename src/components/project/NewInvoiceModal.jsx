import React, { useState, useEffect } from 'react';
import { 
  Plus, X, DollarSign, Trash2, CheckCircle, 
  Calendar, Users, Briefcase
} from 'lucide-react';

const NewInvoiceModal = ({ 
  projects, 
  onClose, 
  onCreateInvoice,
  initialProjectId = null,
  predefinedItems = []
}) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState(
    predefinedItems.length > 0 
      ? predefinedItems
      : [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
  );
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Alapértelmezett fizetési határidő (14 nap)
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    setDueDate(date.toISOString().split('T')[0]);
    
    // Egyedi számlaszám generálása
    const generateInvoiceNumber = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      return `INV-${year}${month}-${random}`;
    };
    
    setInvoiceNumber(generateInvoiceNumber());
    
    // Ha van kezdeti projekt ID, kiválasztjuk azt
    if (initialProjectId) {
      const project = projects.find(p => p._id === initialProjectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [initialProjectId, projects]);

  // Tétel hozzáadása
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  // Tétel törlése
  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // Tétel módosítása
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Automatikus összeg számítás
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  // Végösszeg számítása
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  // Számla létrehozása
  const handleCreateInvoice = () => {
    // Validáció
    const newErrors = {};
    
    if (!selectedProject) {
      newErrors.project = 'Válasszon ki egy projektet';
    }
    
    if (!dueDate) {
      newErrors.dueDate = 'Adja meg a fizetési határidőt';
    }
    
    let hasItemErrors = false;
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item-${index}-description`] = 'A tétel leírása kötelező';
        hasItemErrors = true;
      }
      
      if (item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'A mennyiség pozitív szám kell, hogy legyen';
        hasItemErrors = true;
      }
      
      if (item.unitPrice < 0) {
        newErrors[`item-${index}-unitPrice`] = 'Az egységár nem lehet negatív';
        hasItemErrors = true;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Számla adatok összeállítása
    const invoiceData = {
      number: invoiceNumber,
      date: new Date(),
      dueDate: new Date(dueDate),
      items: items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        total: parseFloat(item.quantity) * parseFloat(item.unitPrice)
      })),
      totalAmount: calculateTotal(),
      status: 'kiállított',
      notes: notes
    };
    
    onCreateInvoice(selectedProject, invoiceData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Új Számla Létrehozása</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Számla alapadatok */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projekt kiválasztása
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={selectedProject?._id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p._id === e.target.value);
                    setSelectedProject(project);
                    setErrors(prev => ({ ...prev, project: undefined }));
                  }}
                  className={`pl-10 block w-full rounded-md ${
                    errors.project 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                >
                  <option value="">Válasszon projektet...</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name} - {project.client?.name || 'Ismeretlen ügyfél'}
                    </option>
                  ))}
                </select>
              </div>
              {errors.project && (
                <p className="mt-1 text-sm text-red-600">{errors.project}</p>
              )}
              
              {selectedProject && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-md p-3">
                  <div className="flex items-start space-x-2">
                    <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedProject.client?.name}</p>
                      <p className="text-sm text-gray-600">{selectedProject.client?.email}</p>
                      {selectedProject.client?.companyName && (
                        <p className="text-sm text-gray-600">{selectedProject.client.companyName}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Számlaszám
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fizetési határidő
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setErrors(prev => ({ ...prev, dueDate: undefined }));
                      }}
                      className={`pl-10 block w-full rounded-md ${
                        errors.dueDate 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.dueDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Megjegyzések (opcionális)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  rows="2"
                  placeholder="Speciális feltételek vagy egyéb információk..."
                />
              </div>
            </div>
          </div>
          
          {/* Számla tételek */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Tételek</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Új tétel
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-700">
                <div className="col-span-6">Leírás</div>
                <div className="col-span-2">Mennyiség</div>
                <div className="col-span-2">Egységár</div>
                <div className="col-span-1">Összesen</div>
                <div className="col-span-1"></div>
              </div>
              
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 mb-3">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Tétel leírása"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className={`block w-full rounded-md ${
                        errors[`item-${index}-description`] 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                    {errors[`item-${index}-description`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`item-${index}-description`]}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Mennyiség"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className={`block w-full rounded-md ${
                        errors[`item-${index}-quantity`] 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      min="0"
                      step="1"
                    />
                    {errors[`item-${index}-quantity`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`item-${index}-quantity`]}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        placeholder="Ár"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        className={`pl-8 block w-full rounded-md ${
                          errors[`item-${index}-unitPrice`] 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {errors[`item-${index}-unitPrice`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`item-${index}-unitPrice`]}</p>
                    )}
                  </div>
                  
                  <div className="col-span-1 flex items-center">
                    <span className="font-medium">{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={items.length === 1}
                      title="Tétel törlése"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Összesítés */}
              <div className="mt-6 border-t border-gray-300 pt-4">
                <div className="flex justify-end">
                  <div className="w-1/3">
                    <div className="flex justify-between font-medium mb-2">
                      <span>Részösszeg:</span>
                      <span>{calculateTotal().toFixed(2)} EUR</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Végösszeg:</span>
                      <span>{calculateTotal().toFixed(2)} EUR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Gombok */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
              disabled={!selectedProject || items.some(item => !item.description || item.quantity <= 0)}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Számla létrehozása
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceModal;