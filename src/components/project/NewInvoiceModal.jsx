import React from 'react';

const NewInvoiceModal = ({ 
  newInvoice, 
  onUpdateInvoice, 
  onClose, 
  onSave, 
  onAddItem 
}) => {
  return (
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
                  onUpdateInvoice({ ...newInvoice, items: updatedItems });
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
                  onUpdateInvoice({ ...newInvoice, items: updatedItems });
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
                  onUpdateInvoice({ ...newInvoice, items: updatedItems });
                }}
                className="border rounded p-2"
              />
            </div>
          ))}

          <button
            onClick={onAddItem}
            className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200"
          >
            + Új tétel
          </button>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Mégse
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Számla létrehozása
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceModal;