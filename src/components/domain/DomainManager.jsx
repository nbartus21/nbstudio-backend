import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import DomainTable from './DomainTable';
import DomainModal from './DomainModal';
import BudgetSummary from './BudgetSummary';
import { AlertTriangle, DollarSign, Clock } from 'lucide-react';

const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;
const API_URL = 'https://38.242.208.190:5001';


const DomainManager = () => {
  const [domains, setDomains] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await fetch(`${API_URL}/api/domains`);
      if (!response.ok) throw new Error('Hiba a domainek lekérésénél');
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Hiba:', error);
    } finally {
      setLoading(false);
    }
};

const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törli ezt a domaint?')) return;

    try {
      const response = await fetch(`${API_URL}/api/domains/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Hiba a domain törlésekor');
      fetchDomains();
    } catch (error) {
      console.error('Hiba:', error);
    }
};

const handleAddNew = () => {
    setSelectedDomain(null);
    setShowModal(true);
};

const handleEdit = (domain) => {
    setSelectedDomain(domain);
    setShowModal(true);
};

const handleSave = async (domainData) => {
    try {
      const url = domainData._id ? 
        `${API_URL}/api/domains/${domainData._id}` : 
        `${API_URL}/api/domains`;
      
      const response = await fetch(url, {
        method: domainData._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domainData)
      });

      if (!response.ok) throw new Error('Hiba a mentés során');
      
      fetchDomains();
      setShowModal(false);
    } catch (error) {
      console.error('Hiba:', error);
    }
};

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Domain Kezelő</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Új Domain
        </button>
      </div>

{/* Statisztikai kártyák */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <Card className="p-4">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">Lejáró Domainek</p>
        <p className="text-2xl font-bold">
          {domains.filter(d => {
            const daysUntil = Math.ceil(
              (new Date(d.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= 30 && daysUntil > 0;
          }).length}
        </p>
      </div>
      <AlertTriangle className="h-8 w-8 text-yellow-500" />
    </div>
  </Card>

  <Card className="p-4">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">Összes Költség / Év</p>
{/* Ezt a sort cseréld ki: */}
<p className="text-2xl font-bold">
        {formatCurrency(domains.reduce((sum, domain) => sum + (domain.cost || 0), 0))}
      </p>
    </div>
    <DollarSign className="h-8 w-8 text-green-500" />
  </div>
</Card>



        <Card className="p-4">
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
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      <DomainTable 
  domains={domains}
  onEdit={handleEdit}
  onDelete={handleDelete}
  formatCurrency={formatCurrency}  // Add hozzá ezt a sort
/>

<BudgetSummary 
  domains={domains} 
  formatCurrency={formatCurrency}  // Add hozzá ezt a sort
/>

      <DomainModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        domain={selectedDomain}
      />
    </div>
  );
};

export default DomainManager;