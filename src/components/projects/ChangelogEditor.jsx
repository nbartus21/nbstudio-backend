import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2, AlertCircle, Tag, ArrowUp } from 'lucide-react';
import { api } from '../../services/auth';

const ChangelogEditor = ({ projectId, onUpdate }) => {
  const [changelog, setChangelog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    description: '',
    type: 'feature'
  });
  
  // Fetch changelog data
  const fetchChangelog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/api/projects/${projectId}/changelog`);
      
      if (!response.ok) {
        throw new Error(`Error fetching changelog: ${response.status}`);
      }
      
      const data = await response.json();
      setChangelog(data);
    } catch (error) {
      console.error('Error fetching changelog:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add new changelog entry
  const addChangelogEntry = async () => {
    try {
      if (!newEntry.title.trim()) {
        setError('A cím megadása kötelező');
        return;
      }
      
      const response = await api.post(`/api/projects/${projectId}/changelog`, newEntry);
      
      if (!response.ok) {
        throw new Error(`Error adding changelog entry: ${response.status}`);
      }
      
      // Reset form and refresh data
      setNewEntry({
        title: '',
        description: '',
        type: 'feature'
      });
      setIsAddingEntry(false);
      await fetchChangelog();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding changelog entry:', error);
      setError(error.message);
    }
  };
  
  // Delete changelog entry
  const deleteChangelogEntry = async (entryId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) {
      return;
    }
    
    try {
      const response = await api.delete(`/api/projects/${projectId}/changelog/${entryId}`);
      
      if (!response.ok) {
        throw new Error(`Error deleting changelog entry: ${response.status}`);
      }
      
      // Refresh data
      await fetchChangelog();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting changelog entry:', error);
      setError(error.message);
    }
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Type badge colors
  const typeBadgeColors = {
    feature: 'bg-green-100 text-green-800',
    bugfix: 'bg-red-100 text-red-800',
    improvement: 'bg-blue-100 text-blue-800',
    other: 'bg-gray-100 text-gray-800'
  };
  
  // Type labels
  const typeLabels = {
    feature: 'Új funkció',
    bugfix: 'Hibajavítás',
    improvement: 'Fejlesztés',
    other: 'Egyéb'
  };
  
  // Type icons
  const typeIcons = {
    feature: <Plus className="h-4 w-4" />,
    bugfix: <AlertCircle className="h-4 w-4" />,
    improvement: <ArrowUp className="h-4 w-4" />,
    other: <Tag className="h-4 w-4" />
  };
  
  // Fetch changelog on component mount
  useEffect(() => {
    fetchChangelog();
  }, [projectId]);
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Fejlesztési napló</h2>
        <button
          onClick={() => setIsAddingEntry(true)}
          className="flex items-center text-sm px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          Új bejegyzés
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {isAddingEntry && (
        <div className="mb-6 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Új bejegyzés hozzáadása</h3>
            <button
              onClick={() => setIsAddingEntry(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Cím <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={newEntry.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Pl. Új bejelentkezési funkció"
                required
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Típus
              </label>
              <select
                id="type"
                name="type"
                value={newEntry.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="feature">Új funkció</option>
                <option value="bugfix">Hibajavítás</option>
                <option value="improvement">Fejlesztés</option>
                <option value="other">Egyéb</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Leírás
              </label>
              <textarea
                id="description"
                name="description"
                value={newEntry.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Részletes leírás a változtatásról..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddingEntry(false)}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={addChangelogEntry}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Save className="h-4 w-4 inline-block mr-1" />
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
      
      {changelog && changelog.length > 0 ? (
        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <div key={entry._id || index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[entry.type] || typeBadgeColors.other}`}>
                    {typeIcons[entry.type] || typeIcons.other}
                    <span className="ml-1">{typeLabels[entry.type] || typeLabels.other}</span>
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <button
                  onClick={() => deleteChangelogEntry(entry._id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Bejegyzés törlése"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{entry.title}</h3>
              {entry.description && (
                <p className="text-gray-600 whitespace-pre-line">{entry.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Nincs még fejlesztési napló bejegyzés.</p>
          <p className="mt-2 text-sm">
            Kattints a "Új bejegyzés" gombra a fejlesztési napló létrehozásához.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChangelogEditor;
