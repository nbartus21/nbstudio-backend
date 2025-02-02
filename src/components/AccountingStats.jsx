import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';

const AccountingStats = ({ statistics, selectedYear, selectedMonth }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Havi adatok előkészítése
  const monthlyData = Array.from({ length: 12 }, (_, index) => ({
    name: new Date(2024, index).toLocaleString('hu-HU', { month: 'long' }),
    bevétel: statistics?.monthlyIncomes?.[index] || 0,
    kiadás: statistics?.monthlyExpenses?.[index] || 0
  }));

  // Kategória szerinti költségek előkészítése
  const categoryExpenses = Object.entries(statistics?.expensesByCategory || {})
    .map(([category, amount]) => ({
      name: category,
      value: amount
    }))
    .filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Összesítő kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Összes bevétel</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics?.totalIncome || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Összes kiadás</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(statistics?.totalExpenses || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Egyenleg</p>
              <p className={`text-2xl font-bold ${
                (statistics?.totalIncome || 0) - (statistics?.totalExpenses || 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency((statistics?.totalIncome || 0) - (statistics?.totalExpenses || 0))}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Havi bevételek és kiadások grafikon */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Havi bevételek és kiadások</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="bevétel" fill="#10B981" />
              <Bar dataKey="kiadás" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Kategória szerinti költségek és ismétlődő költségek */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Költségek kategóriánként</h3>
          <div className="space-y-3">
            {categoryExpenses.map((expense, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <p className="font-medium">{expense.name}</p>
                <p className="text-red-600 font-medium">{formatCurrency(expense.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Ismétlődő költségek</h3>
          <div className="space-y-3">
            {statistics?.recurringExpenses?.map((expense, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{expense.name}</p>
                  <p className="text-sm text-gray-500">{expense.interval}</p>
                </div>
                <p className="text-red-600 font-medium">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
            {(!statistics?.recurringExpenses || statistics.recurringExpenses.length === 0) && (
              <p className="text-gray-500 text-center">Nincsenek ismétlődő költségek</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingStats;