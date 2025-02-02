import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, PieChart } from 'lucide-react';
import Card from './ui/Card';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';

const AccountingManager = () => {
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Expense categories
  const categories = {
    servers: 'Szerverek',
    licenses: 'Licenszek',
    equipment: 'Eszközök',
    subscriptions: 'Előfizetések',
    education: 'Oktatás',
    software: 'Szoftverek',
    rent: 'Bérleti díjak',
    other: 'Egyéb'
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Fetch from all related endpoints
      const [servers, licenses] = await Promise.all([
        api.get(`${API_URL}/servers`),
        api.get(`${API_URL}/licenses`)
      ]);

      const serverData = await servers.json();
      const licenseData = await licenses.json();

      // Process server costs
      const serverExpenses = serverData.map(server => ({
        type: 'servers',
        name: server.name,
        amount: server.costs.monthly,
        date: new Date(),
        recurring: true,
        interval: 'monthly'
      }));

      // Process license costs
      const licenseExpenses = licenseData.map(license => ({
        type: 'licenses',
        name: license.name,
        amount: license.renewal?.cost || 0,
        date: new Date(license.renewal?.nextRenewalDate),
        recurring: true,
        interval: license.renewal?.type === 'subscription' ? 'monthly' : 'yearly'
      }));

      setExpenses([...serverExpenses, ...licenseExpenses]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Calculate monthly totals
  const getMonthlyTotals = () => {
    const monthlyData = Array(12).fill(0);
    
    expenses.forEach(expense => {
      if (expense.recurring) {
        if (expense.interval === 'monthly') {
          // Add monthly cost to each month
          monthlyData.forEach((_, index) => {
            monthlyData[index] += expense.amount;
          });
        } else if (expense.interval === 'yearly') {
          // Add yearly cost to the month when it occurs
          const expenseMonth = new Date(expense.date).getMonth();
          monthlyData[expenseMonth] += expense.amount;
        }
      } else {
        // One-time expense
        const expenseMonth = new Date(expense.date).getMonth();
        monthlyData[expenseMonth] += expense.amount;
      }
    });

    return monthlyData;
  };

  // Calculate totals by category
  const getCategoryTotals = () => {
    const categoryTotals = {};
    
    Object.keys(categories).forEach(category => {
      categoryTotals[category] = expenses
        .filter(expense => expense.type === category)
        .reduce((sum, expense) => {
          if (expense.recurring) {
            if (expense.interval === 'monthly') {
              return sum + (expense.amount * 12);
            }
            return sum + expense.amount;
          }
          return sum + expense.amount;
        }, 0);
    });

    return categoryTotals;
  };

  const monthlyTotals = getMonthlyTotals();
  const categoryTotals = getCategoryTotals();
  const yearlyTotal = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Könyvelés</h1>
        <div className="flex gap-4">
          <select
            value={activeYear}
            onChange={(e) => setActiveYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Új Költség
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Éves Összes Költség</p>
              <p className="text-2xl font-bold">€{yearlyTotal.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Havi Átlag</p>
              <p className="text-2xl font-bold">
                €{(yearlyTotal / 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Legnagyobb Kategória</p>
              <p className="text-2xl font-bold">
                {Object.entries(categoryTotals)
                  .reduce((max, [cat, amount]) => 
                    amount > max.amount ? { category: cat, amount } : max,
                    { category: '', amount: 0 }
                  ).category}
              </p>
            </div>
            <PieChart className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Összes Tétel</p>
              <p className="text-2xl font-bold">{expenses.length}</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Monthly Overview */}
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Havi Áttekintés</h2>
          <div className="grid grid-cols-12 gap-2">
            {monthlyTotals.map((total, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full bg-blue-100 rounded-t px-2 py-1 text-center text-sm">
                  {new Date(2024, index).toLocaleString('hu-HU', { month: 'short' })}
                </div>
                <div className="w-full bg-white border border-t-0 rounded-b px-2 py-1 text-center">
                  €{total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Kategória Szerinti Bontás</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categoryTotals).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{categories[category]}</span>
                <span>€{total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccountingManager;