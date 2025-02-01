import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'https://admin.nb-studio.net:5001/api';

// SVG ikonok komponensek
const PaidIcon = () => <span className="text-green-500">✓</span>;
const UnpaidIcon = () => <span className="text-red-500">✘</span>;
const OverdueIcon = () => <span className="text-yellow-500">⚠</span>;
const PartialIcon = () => <span className="text-orange-500">~</span>;

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
    averagePaymentTime: 0
  });

  // Számlák lekérése a projektekből
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/projects`);
      const projects = await response.json();
      const allInvoices = projects.flatMap(project =>
        (project.invoices || []).map(invoice => ({
          ...invoice,
          projectName: project.name,
          projectId: project._id,
          client: project.client
        }))
      );
      setInvoices(allInvoices);
      calculateStatistics(allInvoices);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Statisztikák számítása
  const calculateStatistics = (invoiceData) => {
    const stats = {
      totalAmount: 0,
      paidAmount: 0,
      overdueAmount: 0,
      paymentTimes: []
    };

    invoiceData.forEach(invoice => {
      stats.totalAmount += invoice.totalAmount || 0;
      stats.paidAmount += invoice.paidAmount || 0;

      const dueDate = new Date(invoice.dueDate);
      if (dueDate < new Date() && invoice.status !== 'fizetett') {
        stats.overdueAmount += (invoice.totalAmount - (invoice.paidAmount || 0));
      }

      if (invoice.status === 'fizetett') {
        const paymentTime = (new Date(invoice.paidDate) - new Date(invoice.date)) / (1000 * 60 * 60 * 24);
        stats.paymentTimes.push(paymentTime);
      }
    });

    const avgPaymentTime = stats.paymentTimes.length > 0
      ? Math.round(stats.paymentTimes.reduce((a, b) => a + b) / stats.paymentTimes.length)
      : 0;

    setStatistics({
      totalAmount: stats.totalAmount,
      paidAmount: stats.paidAmount,
      overdueAmount: stats.overdueAmount,
      averagePaymentTime: avgPaymentTime
    });
  };

  // Számla státusz frissítése
  const updateInvoiceStatus = async (projectId, invoiceId, status) => {
    try {
      const project = await api.get(`${API_URL}/projects/${projectId}`);
      const projectData = await project.json();
      const updatedInvoices = projectData.invoices.map(inv =>
        inv._id === invoiceId ? { ...inv, status } : inv
      );

      await api.put(`${API_URL}/projects/${projectId}`, {
        invoices: updatedInvoices
      });

      await fetchInvoices();
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fizetett': return 'bg-green-100 text-green-800';
      case 'késedelmes': return 'bg-red-100 text-red-800';
      case 'részletfizetés': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fizetett': return <PaidIcon />;
      case 'késedelmes': return <OverdueIcon />;
      case 'részletfizetés': return <PartialIcon />;
      default: return <UnpaidIcon />;
    }
  };

  // Szűrt számlák
  const filteredInvoices = invoices.filter(invoice => {
    if (filters.status !== 'all' && invoice.status !== filters.status) return false;
    if (filters.search && !invoice.projectName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateRange !== 'all') {
      const invoiceDate = new Date(invoice.date);
      const now = new Date();
      const daysDiff = (now - invoiceDate) / (1000 * 60 * 60 * 24);

      switch (filters.dateRange) {
        case 'week': return daysDiff <= 7;
        case 'month': return daysDiff <= 30;
        case 'quarter': return daysDiff <= 90;
        default: return true;
      }
    }
    return true;
  });

  if (loading) {
    return <div className="p-6 text-center">Betöltés...</div>;
  }

  return (
    <div className="p-6">
      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Összes Számla</CardTitle>
          </CardHeader>
          <CardContent>{invoices.length} db</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kifizetett Összeg</CardTitle>
          </CardHeader>
          <CardContent>{Math.round(statistics.paidAmount).toLocaleString()} €</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lejárt Tartozások</CardTitle>
          </CardHeader>
          <CardContent>{Math.round(statistics.overdueAmount).toLocaleString()} €</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Átlagos Fizetési Idő</CardTitle>
          </CardHeader>
          <CardContent>{statistics.averagePaymentTime} nap</CardContent>
        </Card>
      </div>

      {/* Szűrők */}
      <div className="mb-6">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Projekt név..."
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="mt-4 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">Összes</option>
          <option value="kiállított">Kiállított</option>
          <option value="fizetett">Fizetett</option>
          <option value="késedelmes">Késedelmes</option>
          <option value="részletfizetés">Részletfizetés</option>
        </select>
        <select
          value={filters.dateRange}
          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          className="mt-4 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">Összes</option>
          <option value="week">Elmúlt 7 nap</option>
          <option value="month">Elmúlt 30 nap</option>
          <option value="quarter">Elmúlt 90 nap</option>
        </select>
      </div>

      {/* Számlák táblázata */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Számla szám</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekt</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kiállítás dátuma</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fizetési határidő</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Összeg</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Státusz</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'fizetett';
              return (
                <tr key={invoice._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.projectName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(invoice.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.totalAmount?.toLocaleString()} €</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)} {invoice.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Részletek
                    </button>
                    <button
                      onClick={() => updateInvoiceStatus(invoice.projectId, invoice._id, 'fizetett')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Fizetettnek jelölés
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Számla részletek modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Számla Részletek</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Projekt Adatok:</h3>
                <p className="text-sm">Projekt: {selectedInvoice.projectName}</p>
                <p className="text-sm">Ügyfél: {selectedInvoice.client?.name}</p>
                <p className="text-sm">Számla szám: {selectedInvoice.number}</p>
                <p className="text-sm">Kiállítás dátuma: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                <p className="text-sm">Fizetési határidő: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Fizetési Adatok:</h3>
                <p className="text-sm">Teljes összeg: {selectedInvoice.totalAmount?.toLocaleString()} €</p>
                <p className="text-sm">Fizetett összeg: {selectedInvoice.paidAmount?.toLocaleString()} €</p>
                <p className="text-sm">Fennmaradó összeg: {(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()} €</p>
                <p className="text-sm">Státusz: {selectedInvoice.status}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Tételek:</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Megnevezés</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mennyiség</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Egységár</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Összesen</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{item.description}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm">{item.unitPrice?.toLocaleString()} €</td>
                      <td className="px-4 py-2 text-sm">{item.total?.toLocaleString()} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Bezárás
                </button>
                <button
                  onClick={() => {
                    updateInvoiceStatus(selectedInvoice.projectId, selectedInvoice._id, 'fizetett');
                    setShowModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Fizetettnek jelölés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fizetési trendek grafikon */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fizetési Trendek</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={invoices.map(invoice => ({
                date: new Date(invoice.date).toLocaleDateString(),
                amount: invoice.totalAmount,
                paid: invoice.paidAmount || 0
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" name="Teljes összeg" />
              <Line type="monotone" dataKey="paid" stroke="#22c55e" name="Fizetett összeg" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManager;