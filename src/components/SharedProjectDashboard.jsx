import React, { useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Upload, FileText, Archive, Clock, AlertTriangle, Download, CreditCard } from 'lucide-react';
import QRCode from 'qrcode.react';

const SharedProjectDashboard = ({ project, onUpdate }) => {
  const [files, setFiles] = useState([]);
  const [logEntry, setLogEntry] = useState('');
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const newFile = {
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          content: content
        };
  
        // Lokális state frissítése
        setFiles(prev => [...prev, newFile]);
  
        // Projekt frissítése a szerveren
        const updatedProject = {
          ...project,
          files: [...(project.files || []), newFile]
        };
  
        // onUpdate meghívása a szülő komponens felé
        await onUpdate(updatedProject);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };
  
  // És amikor betöltődik a komponens, inicializáljuk a files state-et:
  useEffect(() => {
    if (project.files) {
      setFiles(project.files);
    }
  }, [project]);

  // SEPA átutalási QR kód generálása
  const generateSepaQrData = (invoice) => {
    const amount = typeof invoice.totalAmount === 'number' 
      ? invoice.totalAmount.toFixed(2) 
      : '0.00';
  
      return [
        'BCD',                                    // Service Tag (fix)
        '002',                                    // Verzió (fix)
        '1',                                      // Karakterkódolás (fix)
        'SCT',                                    // SEPA Credit Transfer (fix)
        'COBADEFF371',                           // Commerzbank Bruchsal BIC
        'Norbert Bartus',                        // Kedvezményezett neve
        'DE47663400180473463800',               // IBAN (nem változott)
        `EUR${amount}`,                          // Összeg EUR-ban
        '',                                      // Vevőazonosító (üres)
        invoice.number || '',                    // Számlaszám
        `RECHNUNG ${invoice.number}`             // Közlemény
      ].join('\n');
  };

  // Statisztikák számítása
  const stats = {
    totalInvoices: project.invoices?.length || 0,
    paidInvoices: project.invoices?.filter(inv => inv.status === 'fizetett').length || 0,
    pendingAmount: project.invoices?.reduce((sum, inv) => 
      inv.status !== 'fizetett' ? sum + (inv.totalAmount || 0) : sum, 0
    ) || 0,
    totalAmount: project.invoices?.reduce((sum, inv) => 
      sum + (inv.totalAmount || 0), 0
    ) || 0
  };

  const pieChartData = [
    { name: 'Fizetve', value: stats.paidInvoices },
    { name: 'Függőben', value: stats.totalInvoices - stats.paidInvoices }
  ];

  const COLORS = ['#10B981', '#F59E0B'];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Projekt fejléc */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-1 text-gray-500">{project.description}</p>
          </div>
        </div>

        {/* Navigációs fülek */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Áttekintés
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`${
                activeTab === 'invoices'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Számlák
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`${
                activeTab === 'files'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Fájlok
            </button>
          </nav>
        </div>

        {/* Áttekintés nézet */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statisztikai kártyák */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
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

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Fizetve</p>
                    <p className="text-2xl font-bold">{stats.paidInvoices} db</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
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

              <div className="bg-white p-6 rounded-lg shadow">
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
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Számlák nézet */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Számlák</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {project.invoices?.map((invoice) => (
                <div key={invoice._id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{invoice.number}</h3>
                      <p className="text-sm text-gray-500">
                        Kiállítva: {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Fizetési határidő: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{invoice.totalAmount} €</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'fizetett' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* SEPA QR kód és fizetési adatok */}
                  {invoice.status !== 'fizetett' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Banki átutalás</h4>
                          <p className="text-sm">IBAN: DE47 6634 0014 0743 4638 00</p>
                          <p className="text-sm">SWIFT/BIC: COBADEFFXXX</p>
                          <p className="text-sm">Bank: Commerzbank AG</p>
                          <p className="text-sm mt-2">Közlemény: {invoice.number}</p>
                        </div>
                        <div className="flex justify-center">
                          <div>
                            <QRCode 
                              value={generateSepaQrData(invoice)}
                              size={150}
                              level="M"
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Szkennelje be a QR kódot a banki alkalmazással
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Számla tételek */}
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Tételek</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leírás</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mennyiség</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Egységár</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Összesen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoice.items?.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.description}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.unitPrice} €</td>
                            <td className="px-3 py-2 text-sm text-right">{item.total} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fájlok nézet */}
        {activeTab === 'files' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Fájlok</h2>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Feltöltés
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {files.map((file, index) => (
                <div key={index} className="px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        const blob = new Blob([file.content], { type: 'application/octet-stream' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.name;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Download className="h-5 w-5" />
                      <span className="ml-1">Letöltés</span>
                    </button>
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Nincsenek feltöltött fájlok
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedProjectDashboard;