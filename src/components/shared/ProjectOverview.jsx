import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  FileText, Archive, Clock, AlertCircle, MessageCircle, 
  Calendar, Users, FileCheck 
} from 'lucide-react';
import { formatShortDate, formatDate, debugLog } from './utils';

const ProjectOverview = ({ project, files = [], comments = [], setActiveTab }) => {
  debugLog('ProjectOverview', 'Rendering project overview', { 
    projectId: project?._id,
    filesCount: files?.length || 0,
    commentsCount: comments?.length || 0
  });

  // Project-specific files and comments
  const projectFiles = files.filter(file => file.projectId === project._id);
  const projectComments = comments.filter(comment => comment.projectId === project._id);

  // Calculate statistics
  const stats = {
    totalInvoices: project.invoices?.length || 0,
    paidInvoices: project.invoices?.filter(inv => inv.status === 'fizetett').length || 0,
    pendingAmount: project.invoices?.reduce((sum, inv) => 
      inv.status !== 'fizetett' ? sum + (inv.totalAmount || 0) : sum, 0
    ) || 0,
    totalAmount: project.invoices?.reduce((sum, inv) => 
      sum + (inv.totalAmount || 0), 0
    ) || 0,
    totalFiles: projectFiles.length,
    totalComments: projectComments.length
  };

  const pieChartData = [
    { name: 'Fizetve', value: stats.paidInvoices },
    { name: 'Függőben', value: stats.totalInvoices - stats.paidInvoices }
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  // Combine and sort recent activities
  const activities = [
    ...projectFiles.map(file => ({
      type: 'file',
      id: file.id,
      timestamp: file.uploadedAt,
      content: file
    })),
    ...projectComments.map(comment => ({
      type: 'comment',
      id: comment.id,
      timestamp: comment.timestamp,
      content: comment
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
   .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes számla</p>
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
              <p className="text-sm text-gray-500">Fizetve</p>
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
              <p className="text-sm text-gray-500">Függő összeg</p>
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
              <p className="text-sm text-gray-500">Teljes összeg</p>
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
          <h3 className="text-lg font-medium mb-4">Számlák Állapota</h3>
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
                <Tooltip formatter={(value) => [`${value} db`, 'Mennyiség']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legutóbbi tevékenységek */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Legutóbbi tevékenységek</h3>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={`${activity.type}_${activity.id}`} className="flex p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="mr-4">
                    {activity.type === 'file' ? (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {activity.type === 'file' 
                        ? `Új fájl feltöltve: ${activity.content.name}`
                        : `Új hozzászólás: ${activity.content.author}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.type === 'file'
                        ? `Méret: ${activity.content.size}`
                        : activity.content.text.substring(0, 50) + (activity.content.text.length > 50 ? '...' : '')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setActiveTab(activity.type === 'file' ? 'files' : 'comments')}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      Megtekintés
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="font-medium">Nincs még tevékenység</p>
                <p className="text-sm mt-1">Töltsön fel fájlokat vagy szóljon hozzá a projekthez!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Projekt információk */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Projekt információk</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Projekt adatok</h4>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Projekt neve:</span>
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Státusz:</span>
                <span className="font-medium">{project.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Prioritás:</span>
                <span className="font-medium">{project.priority || 'Normál'}</span>
              </div>
              {project.startDate && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Kezdés dátuma:</span>
                  <span className="font-medium">{formatShortDate(project.startDate)}</span>
                </div>
              )}
              {project.expectedEndDate && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Várható befejezés:</span>
                  <span className="font-medium">{formatShortDate(project.expectedEndDate)}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Ügyfél adatok</h4>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Név:</span>
                <span className="font-medium">{project.client?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{project.client?.email || 'N/A'}</span>
              </div>
              {project.client?.phone && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Telefon:</span>
                  <span className="font-medium">{project.client.phone}</span>
                </div>
              )}
              {project.client?.companyName && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Cég:</span>
                  <span className="font-medium">{project.client.companyName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {project.description && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">Projekt leírás</h4>
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