import React, { useState } from 'react';
import { FileText, Plus, ChevronDown } from 'lucide-react';
import CreateQuoteForm from './quote/CreateQuoteForm'; // Ezt majd létrehozzuk
import QuoteStatusBadge from './quote/QuoteStatusBadge'; // Ezt majd létrehozzuk

const ProjectDetailsModal = ({ project, onUpdate, onClose, onSave, quotes = [] }) => {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Projekt árajánlatainak szűrése
  const projectQuotes = quotes.filter(quote => quote.projectId === project._id);
  
  // Árajánlat létrehozása sikeres
  const handleQuoteSuccess = (quote) => {
    setShowQuoteForm(false);
    // Itt lehetne frissíteni a quotes listát, ha globális state kezelőt használsz
  };
  
  // Szekció kinyitása/becsukása
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

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

        {/* Projekt adatok és Ügyfél adatok fül gombok */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => toggleSection('project')}
            className={`px-4 py-2 font-medium ${
              expandedSection === 'project' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
            }`}
          >
            Projekt adatok
          </button>
          <button
            onClick={() => toggleSection('client')}
            className={`px-4 py-2 font-medium ${
              expandedSection === 'client' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
            }`}
          >
            Ügyfél adatok
          </button>
          <button
            onClick={() => toggleSection('invoices')}
            className={`px-4 py-2 font-medium ${
              expandedSection === 'invoices' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
            }`}
          >
            Számlák
          </button>
          <button
            onClick={() => toggleSection('quotes')}
            className={`px-4 py-2 font-medium ${
              expandedSection === 'quotes' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
            }`}
          >
            Árajánlatok
          </button>
        </div>

        {/* Projekt adatok */}
        {(expandedSection === 'project' || expandedSection === null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            
            {/* Pénzügyi adatok */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Pénzügyi adatok</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min. költségvetés</label>
                  <input
                    type="number"
                    value={project.financial?.budget?.min || ''}
                    onChange={(e) => onUpdate({
                      ...project,
                      financial: {
                        ...project.financial,
                        budget: {
                          ...project.financial?.budget,
                          min: parseFloat(e.target.value) || 0
                        }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max. költségvetés</label>
                  <input
                    type="number"
                    value={project.financial?.budget?.max || ''}
                    onChange={(e) => onUpdate({
                      ...project,
                      financial: {
                        ...project.financial,
                        budget: {
                          ...project.financial?.budget,
                          max: parseFloat(e.target.value) || 0
                        }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Pénznem</label>
                <select
                  value={project.financial?.currency || 'EUR'}
                  onChange={(e) => onUpdate({
                    ...project,
                    financial: {
                      ...project.financial,
                      currency: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="EUR">EUR</option>
                  <option value="HUF">HUF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Ügyfél adatok */}
        {expandedSection === 'client' && (
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Ügyfél Adatok</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alapadatok */}
              <div className="space-y-4">
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
              </div>

              {/* Cím adatok */}
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Céges adatok */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Céges Adatok</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        )}

        {/* Számlák listája */}
        {expandedSection === 'invoices' && (
          <div>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Műveletek
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          Részletek
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!project.invoices || project.invoices.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        Nincsenek számlák ehhez a projekthez
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Árajánlatok kezelése - ÚJ SZEKCIÓ */}
        {expandedSection === 'quotes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Árajánlatok</h3>
              <button
                onClick={() => setShowQuoteForm(true)}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Új árajánlat létrehozása
              </button>
            </div>
            
            {projectQuotes.length > 0 ? (
              <div className="space-y-4">
                {projectQuotes.map((quote) => (
                  <div 
                    key={quote._id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center">
                          <h4 className="font-medium">{quote.quoteNumber}</h4>
                          <QuoteStatusBadge status={quote.status} className="ml-3" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Létrehozva: {new Date(quote.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {quote.totalAmount.toLocaleString('hu-HU')} {project.financial?.currency || 'Ft'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Érvényes: {new Date(quote.validUntil).toLocaleDateString()}-ig
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <button
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                        onClick={() => {
                          // Itt jeleníthetnéd meg a részletes árajánlatot
                          console.log('Részletek', quote);
                        }}
                      >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Részletek
                      </button>
                    </div>
                    
                    {quote.status === 'elfogadva' && !quote.invoiceId && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          onClick={() => {
                            // Itt generálhatnál számlát az árajánlatból
                            console.log('Számla generálása', quote);
                          }}
                        >
                          Számla generálása
                        </button>
                      </div>
                    )}
                    
                    {quote.status === 'elfogadva' && quote.invoiceId && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-green-600 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Számla generálva
                        </p>
                      </div>
                    )}
                    
                    {quote.status === 'elküldve' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center text-sm text-blue-600">
                          <a 
                            href={`${window.location.origin}/shared-quote/${quote.shareToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            Megtekintési link
                          </a>
                          <span className="mx-2">•</span>
                          <span>PIN: {quote.sharePin}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">Nincsenek még árajánlatok ehhez a projekthez</p>
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Árajánlat létrehozása
                </button>
              </div>
            )}
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
      
      {/* Árajánlat létrehozása modal */}
      {showQuoteForm && (
        <CreateQuoteForm
          client={project.client}
          project={project}
          onClose={() => setShowQuoteForm(false)}
          onSuccess={handleQuoteSuccess}
        />
      )}
    </div>
  );
};

export default ProjectDetailsModal;