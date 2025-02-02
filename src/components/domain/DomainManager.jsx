import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import DomainTable from './DomainTable';
import DomainModal from './DomainModal';
import BudgetSummary from './BudgetSummary';
import { AlertTriangle, DollarSign, Clock, Bell } from 'lucide-react';
import { api } from '../services/auth'; // Új útvonal

const API_URL = 'https://admin.nb-studio.net:5001';

const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;

const DomainManager = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);

  const calculateDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (daysUntil) => {
    if (daysUntil < 0) return 'bg-red-100 text-red-800';
    if (daysUntil <= 30) return 'bg-yellow-100 text-yellow-800';
    if (daysUntil <= 90) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/api/domains`);
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Domain Kezelő</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Új Domain
        </button>
      </div>

      {/* Statisztikai kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Domain</p>
                <p className="text-2xl font-bold">{domains.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Lejáró Domainek</p>
                <p className="text-2xl font-bold">
                  {domains.filter(d => {
                    const daysUntil = calculateDaysUntilExpiry(d.expiryDate);
                    return daysUntil <= 30 && daysUntil > 0;
                  }).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Összes Költség / Év</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(domains.reduce((sum, domain) => sum + (domain.cost || 0), 0))}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Következő Lejárat</p>
                <p className="text-2xl font-bold">
                  {domains.length > 0 ? 
                    new Date(Math.min(...domains.map(d => new Date(d.expiryDate))))
                      .toLocaleDateString() : 
                    '-'
                  }
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain lista */}
      <DomainTable
        domains={domains}
        formatCurrency={formatCurrency}
        onEdit={(domain) => {
          setSelectedDomain(domain);
          setShowModal(true);
        }}
        onDelete={async (id) => {
          if (!window.confirm('Biztosan törli ezt a domaint?')) return;
          try {
            await api.delete(`${API_URL}/api/domains/${id}`);
            await fetchDomains();
          } catch (error) {
            console.error('Hiba:', error);
          }
        }}
      />

      <BudgetSummary 
        domains={domains} 
        formatCurrency={formatCurrency}
      />

      <DomainModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (domainData) => {
          try {
            if (domainData._id) {
              await api.put(`${API_URL}/api/domains/${domainData._id}`, domainData);
            } else {
              await api.post(`${API_URL}/api/domains`, domainData);
            }
            await fetchDomains();
            setShowModal(false);
          } catch (error) {
            console.error('Hiba:', error);
          }
        }}
        domain={selectedDomain}
      />
    </div>
  );
};

export default DomainManager;
