import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Globe, 
  Server, 
  Database, 
  MoveUp, 
  MoveDown, 
  Save,
  X,
  Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://admin.nb-studio.net:5001/api';

// Modal component
const Modal = ({ isOpen, onClose, children, maxWidth = "max-w-2xl" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative bg-white rounded-lg w-full ${maxWidth} p-6 shadow-xl max-h-[90vh] overflow-y-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Package Form Component
const PackageForm = ({ 
  initialPackage = {
    name: '',
    type: 'regular',
    description: { en: '', de: '', hu: '' },
    features: { en: [''], de: [''], hu: [''] },
    pricing: { monthly: 0, annual: 0 },
    resources: {
      storage: 0,
      bandwidth: 0,
      domains: 0,
      databases: 0,
      accounts: 1
    },
    whmcsProductId: 0,
    isActive: true,
    displayOrder: 0
  }, 
  onSave, 
  onCancel
}) => {
  const [pkg, setPkg] = useState(initialPackage);
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Handle basic input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPkg(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle nested object changes
  const handleNestedChange = (e, parent, field) => {
    setPkg(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: e.target.value
      }
    }));
  };
  
  // Handle multilingual text changes
  const handleLangChange = (e, field) => {
    const { value } = e.target;
    setPkg(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [activeLanguage]: value
      }
    }));
  };
  
  // Handle feature list changes
  const handleFeatureChange = (index, value) => {
    const features = [...pkg.features[activeLanguage]];
    features[index] = value;
    
    setPkg(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [activeLanguage]: features
      }
    }));
  };
  
  // Add a new feature
  const addFeature = () => {
    setPkg(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [activeLanguage]: [...prev.features[activeLanguage], '']
      }
    }));
  };
  
  // Remove a feature
  const removeFeature = (index) => {
    if (pkg.features[activeLanguage].length <= 1) return;
    
    const features = [...pkg.features[activeLanguage]];
    features.splice(index, 1);
    
    setPkg(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [activeLanguage]: features
      }
    }));
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    if (!pkg.name.trim()) newErrors.name = 'Name is required';
    if (!pkg.whmcsProductId) newErrors.whmcsProductId = 'WHMCS Product ID is required';
    
    // Check all languages have content
    ['en', 'de', 'hu'].forEach(lang => {
      if (!pkg.description[lang].trim()) {
        newErrors[`description_${lang}`] = `Description in ${lang.toUpperCase()} is required`;
      }
      
      if (pkg.features[lang].some(f => !f.trim())) {
        newErrors[`features_${lang}`] = `All features in ${lang.toUpperCase()} must have content`;
      }
    });
    
    // Check resources
    if (pkg.resources.storage <= 0) newErrors.storage = 'Storage must be greater than 0';
    if (pkg.resources.bandwidth <= 0) newErrors.bandwidth = 'Bandwidth must be greater than 0';
    if (pkg.resources.domains <= 0) newErrors.domains = 'Domains must be greater than 0';
    if (pkg.resources.databases <= 0) newErrors.databases = 'Databases must be greater than 0';
    
    // Check pricing
    if (pkg.pricing.monthly <= 0) newErrors.monthly = 'Monthly price must be greater than 0';
    if (pkg.pricing.annual <= 0) newErrors.annual = 'Annual price must be greater than 0';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      await onSave(pkg);
    } catch (error) {
      console.error('Error saving package:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {initialPackage._id ? 'Edit Hosting Package' : 'Create New Hosting Package'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {/* Basic Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Package Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={pkg.name}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Package Type</label>
              <select
                id="type"
                name="type"
                value={pkg.type}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="regular">Regular</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="whmcsProductId" className="block text-sm font-medium text-gray-700">WHMCS Product ID</label>
              <input
                id="whmcsProductId"
                name="whmcsProductId"
                type="number"
                value={pkg.whmcsProductId}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.whmcsProductId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.whmcsProductId && <p className="mt-1 text-sm text-red-600">{errors.whmcsProductId}</p>}
            </div>
            
            <div className="flex items-center h-full pt-6">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={pkg.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-700">Active (visible to customers)</label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Language Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['en', 'de', 'hu'].map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLanguage(lang)}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeLanguage === lang
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Description and Features Section */}
      <Card>
        <CardHeader>
          <CardTitle>Content for {activeLanguage.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor={`description_${activeLanguage}`} className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id={`description_${activeLanguage}`}
              value={pkg.description[activeLanguage]}
              onChange={(e) => handleLangChange(e, 'description')}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${errors[`description_${activeLanguage}`] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors[`description_${activeLanguage}`] && (
              <p className="mt-1 text-sm text-red-600">{errors[`description_${activeLanguage}`]}</p>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Features</label>
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Add Feature
              </button>
            </div>
            
            {errors[`features_${activeLanguage}`] && (
              <p className="mb-2 text-sm text-red-600">{errors[`features_${activeLanguage}`]}</p>
            )}
            
            {pkg.features[activeLanguage].map((feature, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Feature ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="ml-2 inline-flex items-center p-2 border border-transparent rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={pkg.features[activeLanguage].length <= 1}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Resources Section */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="storage" className="block text-sm font-medium text-gray-700">Storage (GB)</label>
              <input
                id="storage"
                type="number"
                value={pkg.resources.storage}
                onChange={(e) => handleNestedChange(e, 'resources', 'storage')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.storage ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.storage && <p className="mt-1 text-sm text-red-600">{errors.storage}</p>}
            </div>
            
            <div>
              <label htmlFor="bandwidth" className="block text-sm font-medium text-gray-700">Bandwidth (GB)</label>
              <input
                id="bandwidth"
                type="number"
                value={pkg.resources.bandwidth}
                onChange={(e) => handleNestedChange(e, 'resources', 'bandwidth')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.bandwidth ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.bandwidth && <p className="mt-1 text-sm text-red-600">{errors.bandwidth}</p>}
            </div>
            
            <div>
              <label htmlFor="domains" className="block text-sm font-medium text-gray-700">Domains</label>
              <input
                id="domains"
                type="number"
                value={pkg.resources.domains}
                onChange={(e) => handleNestedChange(e, 'resources', 'domains')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.domains ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.domains && <p className="mt-1 text-sm text-red-600">{errors.domains}</p>}
            </div>
            
            <div>
              <label htmlFor="databases" className="block text-sm font-medium text-gray-700">Databases</label>
              <input
                id="databases"
                type="number"
                value={pkg.resources.databases}
                onChange={(e) => handleNestedChange(e, 'resources', 'databases')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.databases ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.databases && <p className="mt-1 text-sm text-red-600">{errors.databases}</p>}
            </div>
            
            <div>
              <label htmlFor="accounts" className="block text-sm font-medium text-gray-700">
                {pkg.type === 'reseller' ? 'Client Accounts' : 'Email Accounts'}
              </label>
              <input
                id="accounts"
                type="number"
                value={pkg.resources.accounts}
                onChange={(e) => handleNestedChange(e, 'resources', 'accounts')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="monthly" className="block text-sm font-medium text-gray-700">Monthly Price (EUR)</label>
              <input
                id="monthly"
                type="number"
                step="0.01"
                value={pkg.pricing.monthly}
                onChange={(e) => handleNestedChange(e, 'pricing', 'monthly')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.monthly ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.monthly && <p className="mt-1 text-sm text-red-600">{errors.monthly}</p>}
            </div>
            
            <div>
              <label htmlFor="annual" className="block text-sm font-medium text-gray-700">Annual Price (EUR)</label>
              <input
                id="annual"
                type="number"
                step="0.01"
                value={pkg.pricing.annual}
                onChange={(e) => handleNestedChange(e, 'pricing', 'annual')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.annual ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.annual && <p className="mt-1 text-sm text-red-600">{errors.annual}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Package
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Main Component
const HostingPackagesAdmin = () => {
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [filter, setFilter] = useState('all');
  const [reordering, setReordering] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  
  // Fetch data
  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`${API_URL}/hosting-packages`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPackages(data);
      filterPackages(data, filter);
      
    } catch (error) {
      console.error('Error fetching hosting packages:', error);
      setError('Failed to load hosting packages. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter packages
  const filterPackages = (packages, filterValue) => {
    switch (filterValue) {
      case 'regular':
        setFilteredPackages(packages.filter(pkg => pkg.type === 'regular'));
        break;
      case 'reseller':
        setFilteredPackages(packages.filter(pkg => pkg.type === 'reseller'));
        break;
      case 'active':
        setFilteredPackages(packages.filter(pkg => pkg.isActive));
        break;
      case 'inactive':
        setFilteredPackages(packages.filter(pkg => !pkg.isActive));
        break;
      default:
        setFilteredPackages(packages);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilter(value);
    filterPackages(packages, value);
  };
  
  // Save package
  const savePackage = async (packageData) => {
    try {
      let response;
      
      if (packageData._id) {
        // Update existing package
        response = await api.put(`${API_URL}/hosting-packages/${packageData._id}`, packageData);
      } else {
        // Create new package
        response = await api.post(`${API_URL}/hosting-packages`, packageData);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to save package: ${response.statusText}`);
      }
      
      await fetchPackages();
      setShowModal(false);
      
    } catch (error) {
      console.error('Error saving package:', error);
      throw error;
    }
  };
  
  // Delete package
  const deletePackage = async () => {
    if (!packageToDelete) return;
    
    try {
      const response = await api.delete(`${API_URL}/hosting-packages/${packageToDelete._id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to delete package: ${response.statusText}`);
      }
      
      await fetchPackages();
      setShowDeleteModal(false);
      setPackageToDelete(null);
      
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };
  
  // Move package up or down in order
  const movePackage = async (id, direction) => {
    const currentIndex = filteredPackages.findIndex(pkg => pkg._id === id);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === filteredPackages.length - 1)
    ) {
      return;
    }
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap display orders
    const updatedPackages = [...filteredPackages];
    const temp = updatedPackages[currentIndex].displayOrder;
    updatedPackages[currentIndex].displayOrder = updatedPackages[newIndex].displayOrder;
    updatedPackages[newIndex].displayOrder = temp;
    
    // Update orders in the API
    try {
      const packageOrders = [
        { id: updatedPackages[currentIndex]._id, order: updatedPackages[currentIndex].displayOrder },
        { id: updatedPackages[newIndex]._id, order: updatedPackages[newIndex].displayOrder }
      ];
      
      const response = await api.put(`${API_URL}/hosting-packages/reorder`, { packageOrders });
      
      if (!response.ok) {
        throw new Error('Failed to update package order');
      }
      
      await fetchPackages();
      
    } catch (error) {
      console.error('Error updating package order:', error);
    }
  };
  
  // Initialize
  useEffect(() => {
    fetchPackages();
  }, []);
  
  // Update filtered packages when filter changes
  useEffect(() => {
    if (packages.length > 0) {
      filterPackages(packages, filter);
    }
  }, [filter, packages]);
  
  if (loading && packages.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hosting Package Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setCurrentPackage(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Package
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">Filter Packages:</label>
            <select
              id="filter"
              value={filter}
              onChange={handleFilterChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Packages</option>
              <option value="regular">Regular Hosting</option>
              <option value="reseller">Reseller Hosting</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          
          <div className="flex-1"></div>
          
          <div className="flex items-center">
            <button
              onClick={() => setReordering(!reordering)}
              className={`px-4 py-2 rounded-md flex items-center ${
                reordering 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {reordering ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Done Reordering
                </>
              ) : (
                <>
                  <MoveUp className="mr-2 h-5 w-5" />
                  Reorder Packages
                </>
              )}
            </button>
          </div>
        </div>
        
        {filteredPackages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No packages found with the current filter.</p>
              <button
                onClick={() => {
                  setCurrentPackage(null);
                  setShowModal(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Add New Package
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map(pkg => (
              <Card key={pkg._id} className={`overflow-hidden ${!pkg.isActive ? 'opacity-70' : ''}`}>
                <div className={`h-2 ${pkg.type === 'reseller' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {pkg.type === 'reseller' ? (
                          <Server className="h-5 w-5 text-purple-500 mr-2" />
                        ) : (
                          <Globe className="h-5 w-5 text-blue-500 mr-2" />
                        )}
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {pkg.type === 'reseller' ? 'Reseller Hosting' : 'Regular Hosting'}
                        {!pkg.isActive && ' • Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {reordering ? (
                        <>
                          <button
                            onClick={() => movePackage(pkg._id, 'up')}
                            className="p-1 text-gray-500 hover:text-gray-700"
                            disabled={filteredPackages.indexOf(pkg) === 0}
                          >
                            <MoveUp className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => movePackage(pkg._id, 'down')}
                            className="p-1 text-gray-500 hover:text-gray-700"
                            disabled={filteredPackages.indexOf(pkg) === filteredPackages.length - 1}
                          >
                            <MoveDown className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setCurrentPackage(pkg);
                              setShowModal(true);
                            }}
                            className="p-1 text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setPackageToDelete(pkg);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="text-sm text-gray-700">
                  <p className="mb-3">{pkg.description.en.substring(0, 100)}...</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 border-t border-gray-100 pt-3">
                    <div>
                      <div className="text-gray-500 text-xs">Storage</div>
                      <div className="font-medium flex items-center">
                        <Database className="h-4 w-4 mr-1 text-gray-400" />
                        {pkg.resources.storage} GB
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Bandwidth</div>
                      <div className="font-medium">
                        {pkg.resources.bandwidth} GB
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Domains</div>
                      <div className="font-medium">
                        {pkg.resources.domains}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Databases</div>
                      <div className="font-medium">
                        {pkg.resources.databases}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">Monthly</div>
                      <div className="font-bold text-blue-600">€{pkg.pricing.monthly.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Annual</div>
                      <div className="font-bold text-blue-600">€{pkg.pricing.annual.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">WHMCS ID</div>
                      <div className="font-medium">{pkg.whmcsProductId}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Create/Edit Package Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth="max-w-4xl">
          <PackageForm 
            initialPackage={currentPackage || undefined} 
            onSave={savePackage}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Delete Package</h2>
            <p className="mb-4">
              Are you sure you want to delete the package "{packageToDelete?.name}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={deletePackage}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HostingPackagesAdmin;