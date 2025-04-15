import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const ClientProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('hu');
  const [user, setUser] = useState(null);

  // Többnyelvű feliratok
  const translations = {
    projectDetails: {
      hu: 'Projekt részletek',
      en: 'Project Details',
      de: 'Projektdetails'
    },
    back: {
      hu: 'Vissza a projektekhez',
      en: 'Back to projects',
      de: 'Zurück zu Projekten'
    },
    tabs: {
      details: {
        hu: 'Részletek',
        en: 'Details',
        de: 'Details'
      },
      files: {
        hu: 'Fájlok',
        en: 'Files',
        de: 'Dateien'
      },
      comments: {
        hu: 'Hozzászólások',
        en: 'Comments',
        de: 'Kommentare'
      },
      changelog: {
        hu: 'Változások',
        en: 'Changelog',
        de: 'Änderungsprotokoll'
      }
    },
    detailsLabels: {
      name: {
        hu: 'Projekt neve',
        en: 'Project Name',
        de: 'Projektname'
      },
      status: {
        hu: 'Státusz',
        en: 'Status',
        de: 'Status'
      },
      description: {
        hu: 'Leírás',
        en: 'Description',
        de: 'Beschreibung'
      },
      startDate: {
        hu: 'Kezdés dátuma',
        en: 'Start Date',
        de: 'Startdatum'
      },
      expectedEndDate: {
        hu: 'Várható befejezés',
        en: 'Expected End Date',
        de: 'Voraussichtliches Enddatum'
      },
      actualEndDate: {
        hu: 'Tényleges befejezés',
        en: 'Actual End Date',
        de: 'Tatsächliches Enddatum'
      }
    },
    statusLabels: {
      aktív: {
        hu: 'Aktív',
        en: 'Active',
        de: 'Aktiv'
      },
      befejezett: {
        hu: 'Befejezett',
        en: 'Completed',
        de: 'Abgeschlossen'
      },
      felfüggesztett: {
        hu: 'Felfüggesztett',
        en: 'Suspended',
        de: 'Ausgesetzt'
      },
      törölt: {
        hu: 'Törölt',
        en: 'Deleted',
        de: 'Gelöscht'
      }
    },
    noDescription: {
      hu: 'Nincs megadva leírás',
      en: 'No description provided',
      de: 'Keine Beschreibung vorhanden'
    },
    fileLabels: {
      name: {
        hu: 'Fájlnév',
        en: 'Filename',
        de: 'Dateiname'
      },
      type: {
        hu: 'Típus',
        en: 'Type',
        de: 'Typ'
      },
      size: {
        hu: 'Méret',
        en: 'Size',
        de: 'Größe'
      },
      uploadedAt: {
        hu: 'Feltöltve',
        en: 'Uploaded',
        de: 'Hochgeladen'
      },
      uploadedBy: {
        hu: 'Feltöltő',
        en: 'Uploaded by',
        de: 'Hochgeladen von'
      },
      actions: {
        hu: 'Műveletek',
        en: 'Actions',
        de: 'Aktionen'
      },
      download: {
        hu: 'Letöltés',
        en: 'Download',
        de: 'Herunterladen'
      },
      noFiles: {
        hu: 'Nincsenek feltöltött fájlok',
        en: 'No files uploaded',
        de: 'Keine Dateien hochgeladen'
      }
    },
    commentLabels: {
      comment: {
        hu: 'Hozzászólás',
        en: 'Comment',
        de: 'Kommentar'
      },
      addComment: {
        hu: 'Hozzászólás hozzáadása',
        en: 'Add comment',
        de: 'Kommentar hinzufügen'
      },
      send: {
        hu: 'Küldés',
        en: 'Send',
        de: 'Senden'
      },
      noComments: {
        hu: 'Nincsenek hozzászólások',
        en: 'No comments',
        de: 'Keine Kommentare'
      },
      enterComment: {
        hu: 'Írja be a hozzászólását...',
        en: 'Enter your comment...',
        de: 'Geben Sie Ihren Kommentar ein...'
      }
    },
    changelogLabels: {
      title: {
        hu: 'Fejlesztési napló',
        en: 'Development Changelog',
        de: 'Entwicklungsprotokoll'
      },
      date: {
        hu: 'Dátum',
        en: 'Date',
        de: 'Datum'
      },
      changes: {
        hu: 'Változások',
        en: 'Changes',
        de: 'Änderungen'
      },
      type: {
        hu: 'Típus',
        en: 'Type',
        de: 'Typ'
      },
      noChanges: {
        hu: 'Nincs változásnapló bejegyzés',
        en: 'No changelog entries',
        de: 'Keine Änderungsprotokolleinträge'
      },
      types: {
        feature: {
          hu: 'Új funkció',
          en: 'New feature',
          de: 'Neue Funktion'
        },
        bugfix: {
          hu: 'Hibajavítás',
          en: 'Bug fix',
          de: 'Fehlerbehebung'
        },
        improvement: {
          hu: 'Fejlesztés',
          en: 'Improvement',
          de: 'Verbesserung'
        },
        other: {
          hu: 'Egyéb',
          en: 'Other',
          de: 'Sonstiges'
        }
      }
    }
  };

  // Státusz osztályok
  const statusClasses = {
    aktív: 'bg-green-100 text-green-800',
    befejezett: 'bg-blue-100 text-blue-800',
    felfüggesztett: 'bg-yellow-100 text-yellow-800',
    törölt: 'bg-red-100 text-red-800'
  };

  // Változáslog típus osztályok
  const changelogTypeClasses = {
    feature: 'bg-indigo-100 text-indigo-800',
    bugfix: 'bg-red-100 text-red-800',
    improvement: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800'
  };

  useEffect(() => {
    // Kliens bejelentkezés ellenőrzése
    const isAuthenticated = sessionStorage.getItem('clientAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/client/login');
      return;
    }

    // Nyelv beállítása
    const clientLanguage = sessionStorage.getItem('clientLanguage');
    if (clientLanguage && ['hu', 'en', 'de'].includes(clientLanguage)) {
      setLanguage(clientLanguage);
    }

    // Felhasználói adatok beállítása
    const userStr = sessionStorage.getItem('clientUser');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }

    // Projekt adatok lekérése
    fetchProjectDetails();
  }, [id, navigate]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('clientToken');
      
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token lejárt vagy érvénytelen
          sessionStorage.removeItem('clientAuthenticated');
          sessionStorage.removeItem('clientToken');
          sessionStorage.removeItem('clientUser');
          navigate('/client/login');
          return;
        }
        if (response.status === 404) {
          throw new Error('A projekt nem található');
        }
        throw new Error('Nem sikerült betölteni a projekt adatait');
      }

      const data = await response.json();
      
      // Ellenőrizzük, hogy a projekt hozzá van-e rendelve a felhasználóhoz
      const userProjects = (user && user.projects) || [];
      if (!userProjects.includes(data._id)) {
        throw new Error('Nincs jogosultsága ehhez a projekthez');
      }
      
      setProject(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Hozzászólás kezelése
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentLoading(true);
      const token = sessionStorage.getItem('clientToken');
      
      const response = await fetch(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newComment })
      });

      if (!response.ok) {
        throw new Error('Nem sikerült elküldeni a hozzászólást');
      }

      // Frissítsük a projektet az új hozzászólással
      fetchProjectDetails();
      setNewComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  // Fájlméret formázása
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Hiba történt</h2>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <Link 
                to="/client/projects" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {translations.back[language]}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fejléc */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link 
                to="/client/projects" 
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <svg className="mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                {translations.back[language]}
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                {project.name}
              </h1>
            </div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses[project.status]}`}>
                {translations.statusLabels[project.status][language]}
              </span>
            </div>
          </div>

          {/* Tabok */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['details', 'files', 'comments', 'changelog'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {translations.tabs[tab][language]}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Fő tartalom */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Részletek fül */}
        {activeTab === 'details' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {translations.projectDetails[language]}
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    {translations.detailsLabels.name[language]}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {project.name}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    {translations.detailsLabels.description[language]}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {project.description || translations.noDescription[language]}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    {translations.detailsLabels.startDate[language]}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(project.startDate).toLocaleDateString()}
                  </dd>
                </div>
                {project.expectedEndDate && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      {translations.detailsLabels.expectedEndDate[language]}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(project.expectedEndDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {project.actualEndDate && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      {translations.detailsLabels.actualEndDate[language]}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(project.actualEndDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Fájlok fül */}
        {activeTab === 'files' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {translations.tabs.files[language]}
              </h3>
            </div>
            <div className="border-t border-gray-200">
              {project.files && project.files.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.name[language]}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.type[language]}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.size[language]}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.uploadedAt[language]}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.uploadedBy[language]}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {translations.fileLabels.actions[language]}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {project.files.filter(file => !file.isDeleted).map(file => (
                        <tr key={file.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {file.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.uploadedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a 
                              href={file.s3url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {translations.fileLabels.download[language]}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-5 text-center text-sm text-gray-500">
                  {translations.fileLabels.noFiles[language]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hozzászólások fül */}
        {activeTab === 'comments' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {translations.tabs.comments[language]}
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {/* Hozzászólások listája */}
              <div className="space-y-6">
                {project.comments && project.comments.length > 0 ? (
                  project.comments.map((comment, index) => (
                    <div key={index} className={`flex ${comment.isAdminComment ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-lg rounded-lg px-4 py-2 ${comment.isAdminComment ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                        <div className="flex items-center mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.author}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    {translations.commentLabels.noComments[language]}
                  </p>
                )}
              </div>

              {/* Új hozzászólás form */}
              <form onSubmit={handleAddComment} className="mt-6">
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    {translations.commentLabels.addComment[language]}
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="comment"
                      name="comment"
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder={translations.commentLabels.enterComment[language]}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button
                    type="submit"
                    disabled={commentLoading || !newComment.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {commentLoading ? '...' : translations.commentLabels.send[language]}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Változásnapló fül */}
        {activeTab === 'changelog' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {translations.changelogLabels.title[language]}
              </h3>
            </div>
            <div className="border-t border-gray-200">
              {project.changelog && project.changelog.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {project.changelog.map((entry, index) => (
                    <div key={index} className="px-4 py-5 sm:px-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">{entry.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${changelogTypeClasses[entry.type]}`}>
                          {translations.changelogLabels.types[entry.type][language]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      <div className="mt-2 text-sm text-gray-700">
                        {entry.description}
                      </div>

                      {/* Hozzászólások a változásnapló bejegyzéshez */}
                      {entry.comments && entry.comments.length > 0 && (
                        <div className="mt-4 pl-4 border-l-4 border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            {translations.commentLabels.comment[language]}
                          </h5>
                          <div className="space-y-3">
                            {entry.comments.map((comment, cIndex) => (
                              <div key={cIndex} className={`p-2 rounded-lg ${comment.isAdminComment ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                                <div className="flex items-center mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {comment.author}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    {new Date(comment.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  {comment.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-center text-sm text-gray-500">
                  {translations.changelogLabels.noChanges[language]}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientProjectDetails; 