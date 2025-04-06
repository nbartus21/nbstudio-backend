import React, { useState } from 'react';

const ShareProjectModal = ({ expiryDate, onUpdateExpiryDate, onClose, onGenerate, project }) => {
  // Alapértelmezett értékek
  const [sendEmail, setSendEmail] = useState(true);
  const [language, setLanguage] = useState('hu');

  // E-mail küldési opciók
  const handleGenerateClick = () => {
    onGenerate({
      sendEmail,
      language
    });
  };

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

        {/* E-mail küldési opciók */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700">
              Értesítés küldése e-mailben az ügyfélnek
            </label>
          </div>

          {project?.client?.email && (
            <p className="text-sm text-gray-500 ml-6">
              E-mail cím: {project.client.email}
            </p>
          )}

          {sendEmail && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail nyelve
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="hu">Magyar</option>
                <option value="en">Angol</option>
                <option value="de">Német</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Mégse
          </button>
          <button
            onClick={handleGenerateClick}
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