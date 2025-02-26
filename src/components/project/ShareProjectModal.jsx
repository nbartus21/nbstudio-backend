import React from 'react';

const ShareProjectModal = ({ expiryDate, onUpdateExpiryDate, onClose, onGenerate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-medium mb-4">Megosztási link létrehozása</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lejárati dátum
          </label>
          <input
            type="date"
            value={expiryDate?.split('T')[0] || ''}
            onChange={(e) => onUpdateExpiryDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border rounded-md p-2"
          />
          <p className="text-sm text-gray-500 mt-1">Ha nem választasz dátumot, a link 30 napig lesz érvényes.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Mégse
          </button>
          <button
            onClick={onGenerate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Link generálása
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareProjectModal;