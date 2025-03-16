import React, { useState } from 'react';
import { X, Save, Building2, User, Mail, Phone, MapPin, FileText, CreditCard, AlertTriangle, CheckCircle, Clock, Calendar, Plus } from 'lucide-react';

const ProjectDetailsModal = ({ project, onUpdate, onClose, onSave, onNewInvoice }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [showValidation, setShowValidation] = useState(false);

  // Validáció ellenőrzése
  const validateForm = () => {
    const requiredFields = {
      name: project.name,
      'client.name': project.client?.name,
      'client.email': project.client?.email
    };

    const isValid = Object.values(requiredFields).every(field => field && field.trim() !== '');
    setShowValidation(!isValid);
    return isValid;
  };

  // Mentés kezelése
  const handleSave = () => {
    if (validateForm()) {
      onSave();
    }
  };

  // Státusz színek
  const getStatusColor = (status) => {
    switch (status) {
      case 'aktív':
        return 'bg-green-100 text-green-800';
      case 'befejezett':
        return 'bg-blue-100 text-blue-800';
      case 'felfüggesztett':
        return 'bg-yellow-100 text-yellow-800';
      case 'törölt':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prioritás színek
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'magas':
        return 'bg-red-100 text-red-800';
      case 'közepes':
        return 'bg-yellow-100 text-yellow-800';
      case 'alacsony':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Fejléc */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {project._id ? 'Projekt Részletek' : 'Új Projekt Létrehozása'}
            </h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status || 'aktív')}`}>
              {project.status || 'aktív'}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(project.priority || 'közepes')}`}>
              {project.priority || 'közepes'} prioritás
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Fülek */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Projekt Adatok
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'client'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ügyfél Adatok
          </button>
          {project._id && (
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Számlák
            </button>
          )}
        </div>

        {/* Tartalom */}
        <div className="flex-1 overflow-y-auto p-6">
          {showValidation && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Kérjük töltse ki az összes kötelező mezőt (projekt neve, ügyfél neve és email címe)
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt neve <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={project.name || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    name: e.target.value
                  })}
                  className={`w-full rounded-lg border ${
                    showValidation && !project.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  } shadow-sm`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Állapot</label>
                  <select
                    value={project.status || 'aktív'}
                    onChange={(e) => onUpdate({
                      ...project,
                      status: e.target.value
                    })}
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="aktív">Aktív</option>
                    <option value="befejezett">Befejezett</option>
                    <option value="felfüggesztett">Felfüggesztett</option>
                    <option value="törölt">Törölt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritás</label>
                  <select
                    value={project.priority || 'közepes'}
                    onChange={(e) => onUpdate({
                      ...project,
                      priority: e.target.value
                    })}
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="alacsony">Alacsony</option>
                    <option value="közepes">Közepes</option>
                    <option value="magas">Magas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
                <textarea
                  value={project.description || ''}
                  onChange={(e) => onUpdate({
                    ...project,
                    description: e.target.value
                  })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Projekt részletes leírása..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Költségvetés</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={project.financial?.budget?.min || 0}
                      onChange={(e) => onUpdate({
                        ...project,
                        financial: {
                          ...project.financial,
                          budget: {
                            ...project.financial?.budget,
                            min: Number(e.target.value)
                          }
                        }
                      })}
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                    />
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Költségvetés</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={project.financial?.budget?.max || 0}
                      onChange={(e) => onUpdate({
                        ...project,
                        financial: {
                          ...project.financial,
                          budget: {
                            ...project.financial?.budget,
                            max: Number(e.target.value)
                          }
                        }
                      })}
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                    />
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'client' && (
            <div className="space-y-6">
              {/* Alapadatok */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Név <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
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
                      className={`w-full rounded-lg border pl-10 ${
                        showValidation && !project.client?.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      } shadow-sm`}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
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
                      className={`w-full rounded-lg border pl-10 ${
                        showValidation && !project.client?.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      } shadow-sm`}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefonszám</label>
                  <div className="relative">
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Cím adatok */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Cím Adatok
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utca, házszám</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Város</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Irányítószám</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ország</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Céges adatok */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Céges Adatok
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cégnév</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adószám</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EU Adószám</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cégjegyzékszám</label>
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
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && project._id && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Számlák</h3>
                <button
                  onClick={() => onNewInvoice(project)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Új Számla
                </button>
              </div>
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
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                            {invoice.number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {new Date(invoice.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                            {invoice.totalAmount?.toLocaleString()} {project.financial?.currency || 'EUR'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CheckCircle className={`h-4 w-4 mr-2 ${
                              invoice.paidAmount >= invoice.totalAmount
                                ? 'text-green-500'
                                : 'text-gray-400'
                            }`} />
                            {invoice.paidAmount?.toLocaleString()} {project.financial?.currency || 'EUR'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'fizetett'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'késedelmes'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!project.invoices || project.invoices.length === 0) && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center">
                            <FileText className="h-8 w-8 mb-2 text-gray-400" />
                            Nincsenek számlák ehhez a projekthez
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Lábléc */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Mégsem
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {project._id ? 'Mentés' : 'Létrehozás'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;