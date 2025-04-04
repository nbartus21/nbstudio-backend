import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Clock, AlertCircle, CheckCircle, ArrowUp, Plus } from 'lucide-react';

// Translations
const translations = {
  hu: {
    changelog: 'Fejlesztési napló',
    noChangelog: 'Nincs még fejlesztési napló bejegyzés.',
    date: 'Dátum',
    type: 'Típus',
    title: 'Cím',
    description: 'Leírás',
    feature: 'Új funkció',
    bugfix: 'Hibajavítás',
    improvement: 'Fejlesztés',
    other: 'Egyéb',
    lastUpdate: 'Utolsó frissítés',
    refresh: 'Frissítés',
    refreshing: 'Frissítés...'
  },
  en: {
    changelog: 'Changelog',
    noChangelog: 'No changelog entries yet.',
    date: 'Date',
    type: 'Type',
    title: 'Title',
    description: 'Description',
    feature: 'New feature',
    bugfix: 'Bug fix',
    improvement: 'Improvement',
    other: 'Other',
    lastUpdate: 'Last update',
    refresh: 'Refresh',
    refreshing: 'Refreshing...'
  },
  de: {
    changelog: 'Änderungsprotokoll',
    noChangelog: 'Noch keine Änderungsprotokolleinträge.',
    date: 'Datum',
    type: 'Typ',
    title: 'Titel',
    description: 'Beschreibung',
    feature: 'Neue Funktion',
    bugfix: 'Fehlerbehebung',
    improvement: 'Verbesserung',
    other: 'Andere',
    lastUpdate: 'Letzte Aktualisierung',
    refresh: 'Aktualisieren',
    refreshing: 'Aktualisierung...'
  }
};

// Type badge colors
const typeBadgeColors = {
  feature: 'bg-green-100 text-green-800',
  bugfix: 'bg-red-100 text-red-800',
  improvement: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800'
};

// Type icons
const typeIcons = {
  feature: <Plus className="h-4 w-4" />,
  bugfix: <AlertCircle className="h-4 w-4" />,
  improvement: <ArrowUp className="h-4 w-4" />,
  other: <Tag className="h-4 w-4" />
};

const ProjectChangelog = ({ project, language = 'hu', onRefresh }) => {
  const [changelog, setChangelog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get translations for current language
  const t = translations[language] || translations.hu;
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'hu' ? 'hu-HU' : language === 'de' ? 'de-DE' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Fetch changelog data
  const fetchChangelog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If we have a token, use the public endpoint
      const endpoint = project.sharing?.token
        ? `/api/public/projects/${project.sharing.token}/changelog`
        : `/api/projects/${project._id}/changelog`;
      
      const response = await fetch(endpoint, {
        headers: {
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });
      
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
  
  // Refresh changelog data
  const refreshChangelog = async () => {
    setIsRefreshing(true);
    await fetchChangelog();
    setIsRefreshing(false);
    
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Fetch changelog on component mount
  useEffect(() => {
    fetchChangelog();
  }, [project._id, project.sharing?.token]);
  
  // If loading, show loading state
  if (isLoading && !isRefreshing) {
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
  
  // If error, show error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t.changelog}</h2>
          <button
            onClick={refreshChangelog}
            className="text-sm px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          >
            {t.refresh}
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t.changelog}</h2>
        <button
          onClick={refreshChangelog}
          disabled={isRefreshing}
          className={`text-sm px-3 py-1 rounded ${isRefreshing
            ? 'bg-gray-200 text-gray-500'
            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
        >
          {isRefreshing ? t.refreshing : t.refresh}
        </button>
      </div>
      
      {changelog && changelog.length > 0 ? (
        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <div key={entry._id || index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[entry.type] || typeBadgeColors.other}`}>
                    {typeIcons[entry.type] || typeIcons.other}
                    <span className="ml-1">{t[entry.type] || t.other}</span>
                  </span>
                  <span className="ml-3 text-sm text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(entry.date)}
                  </span>
                </div>
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
          <p>{t.noChangelog}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectChangelog;
