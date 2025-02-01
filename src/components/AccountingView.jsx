import React, { useState, useEffect } from 'react';
import Card from './Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'https://admin.nb-studio.net:5001';

const AccountingView = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accountingData, setAccountingData] = useState({
    income: {
      invoices: 0,
      other: 0
    },
    expenses: {
      servers: [],
      licenses: [],
      equipment: [],
      education: [],
      software: []
    },
    monthly: []
  });

  const expenseCategories = [
    { id: 'servers', name: 'Szerverek', taxDeductible: true },
    { id: 'licenses', name: 'Licenszek', taxDeductible: true },
    { id: 'equipment', name: 'Eszközök', taxDeductible: true },
    { id: 'education', name: 'Képzések', taxDeductible: true },
    { id: 'software', name: 'Szoftverek', taxDeductible: true }
  ];

  const fetchAccountingData = async () => {
    try {
      const response = await fetch(`${API_URL}/accounting/${selectedYear}`, {
        headers: {
          'X-API-Key': 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0'
        }
      });
      const data = await response.json();
      setAccountingData(data);
    } catch (error) {
      console.error('Hiba a könyvelési adatok lekérésekor:', error);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [selectedYear]);

  const totalIncome = accountingData.income.invoices + accountingData.income.other;
  const totalExpenses = Object.values(accountingData.expenses)
    .flat()
    .reduce((sum, expense) => sum + expense.amount, 0);
  const profitBeforeTax = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <label className="mr-2">Év:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Nyomtatás
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Összes Bevétel</h3>
            <p className="text-2xl font-bold text-green-600">
              {totalIncome.toLocaleString()} €
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Összes Költség</h3>
            <p className="text-2xl font-bold text-red-600">
              {totalExpenses.toLocaleString()} €
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Eredmény</h3>
            <p className={`text-2xl font-bold ${profitBeforeTax >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitBeforeTax.toLocaleString()} €
            </p>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Költségek Részletezése</h3>
        <div className="space-y-4">
          {expenseCategories.map(category => {
            const expenses = accountingData.expenses[category.id] || [];
            const totalForCategory = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            return (
              <div key={category.id} className="border-b pb-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-gray-500">
                      {category.taxDeductible ? 'Adóból leírható' : 'Nem leírható'}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">{totalForCategory.toLocaleString()} €</p>
                </div>
                <div className="space-y-2">
                  {expenses.map((expense, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{expense.description}</span>
                      <span>{expense.amount.toLocaleString()} €</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Bevétel és Költség Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accountingData.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" name="Bevétel" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Költség" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AccountingView;