import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Clock, AlertCircle, CheckCircle, ArrowUp, Plus, MessageCircle, Send } from 'lucide-react';
import { api } from '../../services/auth';

// API configuration
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

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
    refreshing: 'Refreshing...',
    comments: 'Comments',
    noComments: 'No comments yet',
    addComment: 'Add a comment',
    yourComment: 'Your comment',
    submit: 'Submit',
    commentAdded: 'Comment added successfully',
    commentError: 'Error adding comment',
    showComments: 'Show comments',
    hideComments: 'Hide comments',
    client: 'Client'
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
    refreshing: 'Aktualisierung...',
    comments: 'Kommentare',
    noComments: 'Noch keine Kommentare',
    addComment: 'Kommentar hinzufügen',
    yourComment: 'Ihr Kommentar',
    submit: 'Absenden',
    commentAdded: 'Kommentar erfolgreich hinzugefügt',
    commentError: 'Fehler beim Hinzufügen des Kommentars',
    showComments: 'Kommentare anzeigen',
    hideComments: 'Kommentare ausblenden',
    client: 'Kunde'
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

const ProjectChangelog = ({ project, language = 'hu', onRefresh, showSuccessMessage, showErrorMessage }) => {
  const [changelog, setChangelog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [isSubmitting, setIsSubmitting] = useState({});

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

  // Toggle expanded state for comments
  const toggleComments = (entryId) => {
    setExpandedComments(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  // Handle comment text change
  const handleCommentChange = (entryId, text) => {
    setCommentText(prev => ({
      ...prev,
      [entryId]: text
    }));
  };

  // Submit a new comment
  const submitComment = async (entryId) => {
    if (!commentText[entryId] || !commentText[entryId].trim()) {
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [entryId]: true }));

    try {
      // A token többféle helyen lehet, ellenőrizzük mindegyiket
      let token;
      if (project.sharing?.token) {
        token = project.sharing.token;
      } else if (project.shareToken) {
        token = project.shareToken;
      } else if (project._id) {
        token = project._id;
      } else {
        throw new Error('Nem található projekt azonosító a hozzászólás küldéséhez');
      }

      const response = await fetch(`${API_URL}/public/projects/${token}/changelog/${entryId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          text: commentText[entryId],
          author: t.client,
          isAdminComment: false
        })
      });

      if (response.ok) {
        const updatedEntry = await response.json();

        // Update the entry in the state
        setChangelog(prev =>
          prev.map(entry =>
            entry._id === entryId ? updatedEntry : entry
          )
        );

        // Clear the comment text
        setCommentText(prev => ({ ...prev, [entryId]: '' }));

        // Show success message
        if (showSuccessMessage) {
          showSuccessMessage(t.commentAdded);
        }
      } else {
        const errorData = await response.json();
        console.error('Error adding comment:', errorData);
        if (showErrorMessage) {
          showErrorMessage(t.commentError);
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      if (showErrorMessage) {
        showErrorMessage(t.commentError);
      }
    } finally {
      setIsSubmitting(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Fetch changelog data
  const fetchChangelog = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Új logika a megosztott projekt token kezeléséhez
      let endpoint;

      // A token többféle helyen lehet, ellenőrizzük mindegyiket
      if (project.sharing?.token) {
        endpoint = `/public/projects/${project.sharing.token}/changelog`;
      } else if (project.shareToken) {
        endpoint = `/public/projects/${project.shareToken}/changelog`;
      } else if (project._id) {
        endpoint = `/projects/${project._id}/changelog`;
      } else {
        throw new Error('Nem található projekt azonosító a changelog lekéréséhez');
      }

      let response;

      // Használjuk az API kulcsot a lekéréshez
      response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      console.log('Changelog lekérés válasz:', response.status, endpoint);

      // Ha nincs OK válasz, próbáljuk meg a közvetlen projekt ID-val
      if (!response.ok && project._id) {
        console.log('Sikertelen lekérés, próbálkozás közvetlen projekt ID-val');
        const fallbackEndpoint = `/projects/${project._id}/changelog`;
        response = await fetch(`${API_URL}${fallbackEndpoint}`, {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY
          }
        });

        console.log('Fallback lekérés válasz:', response.status);
      }

      if (!response.ok) {
        throw new Error(`Hiba a changelog lekérésekor: ${response.status}`);
      }

      const data = await response.json();
      setChangelog(data);
    } catch (error) {
      console.error('Hiba a changelog lekérésekor:', error);
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

  // Debug log
  useEffect(() => {
    console.log('ProjectChangelog component mounted with project:', {
      projectId: project._id,
      sharingToken: project.sharing?.token,
      hasSharing: Boolean(project.sharing),
      changelog: project.changelog?.length || 0
    });
  }, []);

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

              {/* Comments section */}
              <div className="mt-4">
                <button
                  onClick={() => toggleComments(entry._id)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  <MessageCircle size={16} className="mr-1" />
                  {expandedComments[entry._id] ? t.hideComments : t.showComments}
                  {entry.comments && entry.comments.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {entry.comments.length}
                    </span>
                  )}
                </button>

                {expandedComments[entry._id] && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t.comments}</h4>

                    {/* Comments list */}
                    {entry.comments && entry.comments.length > 0 ? (
                      <div className="space-y-3">
                        {entry.comments.map(comment => (
                          <div key={comment.id} className={`p-3 rounded-lg ${comment.isAdminComment ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-sm">
                                {comment.author === 'Ügyfél' ? t.client : comment.author}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.timestamp)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">{t.noComments}</p>
                    )}

                    {/* Add comment form */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{t.addComment}</h4>
                      <div className="flex">
                        <textarea
                          value={commentText[entry._id] || ''}
                          onChange={(e) => handleCommentChange(entry._id, e.target.value)}
                          placeholder={t.yourComment}
                          className="flex-grow p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          rows="2"
                        />
                        <button
                          onClick={() => submitComment(entry._id)}
                          disabled={isSubmitting[entry._id] || !commentText[entry._id] || !commentText[entry._id].trim()}
                          className="px-3 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isSubmitting[entry._id] ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
