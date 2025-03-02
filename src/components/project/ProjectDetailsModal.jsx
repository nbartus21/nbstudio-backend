import React from 'react';

const ProjectDetailsModal = ({ project, onUpdate, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {project._id ? 'Projekt Részletek' : 'Új Projekt Létrehozása'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Projekt alapadatok */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Projekt neve</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  name: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Állapot</label>
              <select
                value={project.status || 'aktív'}
                onChange={(e) => onUpdate({
                  ...project,
                  status: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="aktív">Aktív</option>
                <option value="befejezett">Befejezett</option>
                <option value="felfüggesztett">Felfüggesztett</option>
                <option value="törölt">Törölt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prioritás</label>
              <select
                value={project.priority || 'közepes'}
                onChange={(e) => onUpdate({
                  ...project,
                  priority: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="alacsony">Alacsony</option>
                <option value="közepes">Közepes</option>
                <option value="magas">Magas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Leírás</label>
              <textarea
                value={project.description || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  description: e.target.value
                })}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ügyfél adatok */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Ügyfél Adatok</h3>
            
            {/* Alapadatok */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Név</label>
              <input
                type="text"
                value={project.client?.name || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  client: {
                    ...project.client,
                    name: e.target.value
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={project.client?.email || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  client: {
                    ...project.client,
                    email: e.target.value
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefonszám</label>
              <input
                type="tel"
                value={project.client?.phone || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  client: {
                    ...project.client,
                    phone: e.target.value
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Cím adatok */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Utca, házszám</label>
              <input
                type="text"
                value={project.client?.address?.street || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  client: {
                    ...project.client,
                    address: {
                      ...project.client?.address,
                      street: e.target.value
                    }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Város</label>
                <input
                  type="text"
                  value={project.client?.address?.city || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      address: {
                        ...project.client?.address,
                        city: e.target.value
                      }
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Irányítószám</label>
                <input
                  type="text"
                  value={project.client?.address?.postalCode || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      address: {
                        ...project.client?.address,
                        postalCode: e.target.value
                      }
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ország</label>
              <input
                type="text"
                value={project.client?.address?.country || ''}
                onChange={(e) => onUpdate({
                  ...project,
                  client: {
                    ...project.client,
                    address: {
                      ...project.client?.address,
                      country: e.target.value
                    }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Céges adatok */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Céges Adatok</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cégnév</label>
                <input
                  type="text"
                  value={project.client?.companyName || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      companyName: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Adószám</label>
                <input
                  type="text"
                  value={project.client?.taxNumber || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      taxNumber: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">EU Adószám</label>
                <input
                  type="text"
                  value={project.client?.euVatNumber || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      euVatNumber: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cégjegyzékszám</label>
                <input
                  type="text"
                  value={project.client?.registrationNumber || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    client: {
                      ...project.client,
                      registrationNumber: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Számlák listája */}
        {project._id && (
          <div className="mt-8">
            <h3 className="font-medium text-lg mb-4">Számlák</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Számla szám
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dátum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Összeg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fizetve
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Állapot
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {project.invoices?.map((invoice, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.totalAmount?.toLocaleString()} {project.financial?.currency || 'EUR'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.paidAmount?.toLocaleString()} {project.financial?.currency || 'EUR'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!project.invoices || project.invoices.length === 0) && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        Nincsenek számlák ehhez a projekthez
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mentés/Mégse gombok */}
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
            {project._id ? 'Mentés' : 'Létrehozás'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;