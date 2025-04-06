import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  FileText, Archive, Clock, AlertCircle, MessageCircle,
  Calendar, Users, FileCheck, Tag, ArrowUp, Plus
} from 'lucide-react';
import { formatShortDate, formatDate, debugLog } from './utils';

// API configuration
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

// Translation data for all UI elements
const translations = {
  en: {
    statistics: {
      totalInvoices: "Total invoices",
      paid: "Paid",
      pendingAmount: "Pending amount",
      totalAmount: "Total amount"
    },
    chart: {
      invoiceStatus: "Invoice Status",
      paid: "Paid",
      pending: "Pending",
      quantity: "Quantity"
    },
    changelog: {
      title: "Development Log",
      noChangelog: "No changelog entries yet.",
      date: "Date",
      type: "Type",
      feature: "New feature",
      bugfix: "Bug fix",
      improvement: "Improvement",
      other: "Other",
      refresh: "Refresh",
      refreshing: "Refreshing..."
    },
    projectInfo: {
      projectInformation: "Project Information",
      projectData: "Project Data",
      projectName: "Project name:",
      status: "Status:",
      priority: "Priority:",
      normal: "Normal",
      startDate: "Start date:",
      expectedEndDate: "Expected end date:",
      clientData: "Client Data",
      name: "Name:",
      email: "Email:",
      phone: "Phone:",
      company: "Company:",
      projectDescription: "Project Description"
    }
  },
  de: {
    statistics: {
      totalInvoices: "Gesamtrechnungen",
      paid: "Bezahlt",
      pendingAmount: "Ausstehender Betrag",
      totalAmount: "Gesamtbetrag"
    },
    chart: {
      invoiceStatus: "Rechnungsstatus",
      paid: "Bezahlt",
      pending: "Ausstehend",
      quantity: "Menge"
    },
    changelog: {
      title: "Änderungsprotokoll",
      noChangelog: "Noch keine Änderungsprotokolleinträge.",
      date: "Datum",
      type: "Typ",
      feature: "Neue Funktion",
      bugfix: "Fehlerbehebung",
      improvement: "Verbesserung",
      other: "Andere",
      refresh: "Aktualisieren",
      refreshing: "Aktualisierung..."
    },
    projectInfo: {
      projectInformation: "Projektinformationen",
      projectData: "Projektdaten",
      projectName: "Projektname:",
      status: "Status:",
      priority: "Priorität:",
      normal: "Normal",
      startDate: "Startdatum:",
      expectedEndDate: "Voraussichtliches Enddatum:",
      clientData: "Kundendaten",
      name: "Name:",
      email: "E-Mail:",
      phone: "Telefon:",
      company: "Unternehmen:",
      projectDescription: "Projektbeschreibung"
    }
  },
  hu: {
    statistics: {
      totalInvoices: "Összes számla",
      paid: "Fizetve",
      pendingAmount: "Függő összeg",
      totalAmount: "Teljes összeg"
    },
    chart: {
      invoiceStatus: "Számlák Állapota",
      paid: "Fizetve",
      pending: "Függőben",
      quantity: "Mennyiség"
    },
    changelog: {
      title: "Fejlesztési napló",
      noChangelog: "Nincs még fejlesztési napló bejegyzés.",
      date: "Dátum",
      type: "Típus",
      feature: "Új funkció",
      bugfix: "Hibajavítás",
      improvement: "Fejlesztés",
      other: "Egyéb",
      refresh: "Frissítés",
      refreshing: "Frissítés..."
    },
    projectInfo: {
      projectInformation: "Projekt információk",
      projectData: "Projekt adatok",
      projectName: "Projekt neve:",
      status: "Státusz:",
      priority: "Prioritás:",
      normal: "Normál",
      startDate: "Kezdés dátuma:",
      expectedEndDate: "Várható befejezés:",
      clientData: "Ügyfél adatok",
      name: "Név:",
      email: "Email:",
      phone: "Telefon:",
      company: "Cég:",
      projectDescription: "Projekt leírás"
    }
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

const ProjectOverview = ({ project, files = [], comments = [], setActiveTab, language = 'hu' }) => {
  const [changelog, setChangelog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  debugLog('ProjectOverview', 'Rendering project overview', {
    projectId: project?._id,
    filesCount: files?.length || 0,
    commentsCount: comments?.length || 0,
    language: language
  });

  // Get translations for current language
  const t = translations[language] || translations.hu;

  // Project-specific files and comments
  const projectFiles = files.filter(file => file.projectId === project._id);
  const projectComments = comments.filter(comment => comment.projectId === project._id);

  // Calculate statistics
  const stats = {
    totalInvoices: project.invoices?.length || 0,
    paidInvoices: project.invoices?.filter(inv => inv.status === 'fizetett' || inv.status === 'paid' || inv.status === 'bezahlt').length || 0,
    pendingAmount: project.invoices?.reduce((sum, inv) =>
      (inv.status !== 'fizetett' && inv.status !== 'paid' && inv.status !== 'bezahlt') ? sum + (inv.totalAmount || 0) : sum, 0
    ) || 0,
    totalAmount: project.invoices?.reduce((sum, inv) =>
      sum + (inv.totalAmount || 0), 0
    ) || 0,
    totalFiles: projectFiles.length,
    totalComments: projectComments.length
  };

  const pieChartData = [
    { name: t.chart.paid, value: stats.paidInvoices },
    { name: t.chart.pending, value: stats.totalInvoices - stats.paidInvoices }
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  // Format date
  const formatChangelogDate = (dateString) => {
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
  };

  // Fetch changelog on component mount
  useEffect(() => {
    fetchChangelog();
  }, [project._id, project.sharing?.token]);

  return (
    <div className="space-y-6">
      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{t.statistics.totalInvoices}</p>
              <p className="text-2xl font-bold">{stats.totalInvoices} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{t.statistics.paid}</p>
              <p className="text-2xl font-bold">{stats.paidInvoices} db</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{t.statistics.pendingAmount}</p>
              <p className="text-2xl font-bold">{stats.pendingAmount} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{t.statistics.totalAmount}</p>
              <p className="text-2xl font-bold">{stats.totalAmount} €</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Archive className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projekt Tevékenység & Státusz */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafikon */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">{t.chart.invoiceStatus}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} db`, t.chart.quantity]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fejlesztési napló */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{t.changelog.title}</h3>
            <button
              onClick={refreshChangelog}
              disabled={isRefreshing}
              className={`text-sm px-3 py-1 rounded ${isRefreshing
                ? 'bg-gray-200 text-gray-500'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
            >
              {isRefreshing ? t.changelog.refreshing : t.changelog.refresh}
            </button>
          </div>

          {isLoading && !isRefreshing ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              <p>{error}</p>
            </div>
          ) : changelog && changelog.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {changelog.slice(0, 3).map((entry, index) => (
                <div key={entry._id || index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[entry.type] || typeBadgeColors.other}`}>
                        {typeIcons[entry.type] || typeIcons.other}
                        <span className="ml-1">{t.changelog[entry.type] || t.changelog.other}</span>
                      </span>
                      <span className="ml-3 text-sm text-gray-500 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatChangelogDate(entry.date)}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{entry.title}</h3>
                  {entry.description && (
                    <p className="text-gray-600 whitespace-pre-line">{entry.description}</p>
                  )}
                </div>
              ))}
              {changelog.length > 3 && (
                <div className="text-center mt-2">
                  <button
                    onClick={() => setActiveTab('changelog')}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    {/* Több bejegyzés megtekintése */}
                    {language === 'hu' ? 'Összes bejegyzés megtekintése' :
                     language === 'de' ? 'Alle Einträge anzeigen' : 'View all entries'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t.changelog.noChangelog}</p>
            </div>
          )}
        </div>
      </div>

      {/* Projekt információk */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">{t.projectInfo.projectInformation}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">{t.projectInfo.projectData}</h4>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">{t.projectInfo.projectName}</span>
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">{t.projectInfo.status}</span>
                <span className="font-medium">{project.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">{t.projectInfo.priority}</span>
                <span className="font-medium">{project.priority || t.projectInfo.normal}</span>
              </div>
              {project.startDate && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{t.projectInfo.startDate}</span>
                  <span className="font-medium">{formatShortDate(project.startDate)}</span>
                </div>
              )}
              {project.expectedEndDate && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{t.projectInfo.expectedEndDate}</span>
                  <span className="font-medium">{formatShortDate(project.expectedEndDate)}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">{t.projectInfo.clientData}</h4>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">{t.projectInfo.name}</span>
                <span className="font-medium">{project.client?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">{t.projectInfo.email}</span>
                <span className="font-medium">{project.client?.email || 'N/A'}</span>
              </div>
              {project.client?.phone && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{t.projectInfo.phone}</span>
                  <span className="font-medium">{project.client.phone}</span>
                </div>
              )}
              {project.client?.companyName && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">{t.projectInfo.company}</span>
                  <span className="font-medium">{project.client.companyName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {project.description && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">{t.projectInfo.projectDescription}</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOverview;