import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import Card, { CardHeader, CardTitle, CardContent } from './Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import InvoiceList from './InvoiceList';

const API_URL = 'https://admin.nb-studio.net:5001';

const StatIcon = ({ children }) => (
  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
    {children}
  </div>
);

const InvoiceManager = () => {
  const [activeView, setActiveView] = useState('invoices');
  const [yearlyStats, setYearlyStats] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    totalServers: 0,
    totalLicenses: 0,
    totalAssets: 0
  });

  const fetchYearlyStats = async () => {
    try {
      const [invoices, servers, licenses] = await Promise.all([
        api.get(`${API_URL}/projects`),
        api.get(`${API_URL}/servers`),
        api.get(`${API_URL}/licenses`)
      ]);

      const invoicesData = await invoices.json();
      const serversData = await servers.json();
      const licensesData = await licenses.json();

      const allInvoices = invoicesData.flatMap(project => project.invoices || []);
      const totalPaid = allInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalAmount = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      const serverCosts = serversData.reduce((sum, server) => sum + (server.costs?.monthly || 0) * 12, 0);
      const licenseCosts = licensesData.reduce((sum, license) => sum + (license.renewal?.cost || 0), 0);

      setYearlyStats({
        totalInvoices: allInvoices.length,
        totalPaid: totalPaid,
        totalUnpaid: totalAmount - totalPaid,
        totalServers: serverCosts,
        totalLicenses: licenseCosts,
        totalAssets: serverCosts + licenseCosts
      });
    } catch (error) {
      console.error('Hiba a statisztikák lekérésekor:', error);
    }
  };

  useEffect(() => {
    fetchYearlyStats();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pénzügyi Kezelő</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('invoices')}
            className={`px-4 py-2 rounded-lg ${activeView === 'invoices' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Számlák
          </button>
          <button
            onClick={() => setActiveView('accounting')}
            className={`px-4 py-2 rounded-lg ${activeView === 'accounting' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Könyvelés
          </button>
          <button
            onClick={() => setActiveView('assets')}
            className={`px-4 py-2 rounded-lg ${activeView === 'assets' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Eszközök
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Számla</p>
                <p className="text-2xl font-bold">{yearlyStats.totalInvoices} db</p>
              </div>
              <StatIcon>📄</StatIcon>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Befolyt Összeg</p>
                <p className="text-2xl font-bold">{yearlyStats.totalPaid.toLocaleString()} €</p>
              </div>
              <StatIcon>💰</StatIcon>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Kintlévőség</p>
                <p className="text-2xl font-bold">{yearlyStats.totalUnpaid.toLocaleString()} €</p>
              </div>
              <StatIcon>⚠️</StatIcon>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Szerver Költségek</p>
                <p className="text-2xl font-bold">{yearlyStats.totalServers.toLocaleString()} €</p>
              </div>
              <StatIcon>🖥️</StatIcon>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Licensz Költségek</p>
                <p className="text-2xl font-bold">{yearlyStats.totalLicenses.toLocaleString()} €</p>
              </div>
              <StatIcon>🔑</StatIcon>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Eszköz Költség</p>
                <p className="text-2xl font-bold">{yearlyStats.totalAssets.toLocaleString()} €</p>
              </div>
              <StatIcon>📊</StatIcon>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeView === 'invoices' && <InvoiceList />}
    </div>
  );
};

export default InvoiceManager;