import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/auth';

const API_URL = 'https://admin.nb-studio.net:5001/api';


const SharedProjectView = () => {
    const { token } = useParams();
    const [project, setProject] = useState(null);
    const [pin, setPin] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
  
    const verifyPin = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      console.log('PIN ellenőrzés kezdődik...');
      console.log('Token:', token);
      console.log('PIN:', pin);
      
      try {
        const response = await fetch(`${API_URL}/public/projects/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, pin })
        });
        
        console.log('API válasz státusz:', response.status);
        
        const data = await response.json();
        console.log('API válasz data:', data);
  
        if (response.ok) {
          console.log('Sikeres PIN ellenőrzés');
          setProject(data.project);
          setIsVerified(true);
          setError(null);
        } else {
          console.error('Sikertelen PIN ellenőrzés:', data.message);
          setError(data.message || 'Érvénytelen PIN kód');
        }
      } catch (error) {
        console.error('Hiba történt:', error);
        setError('Hiba történt az ellenőrzés során: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
  
    // Loading indikátor
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
  
    if (!isVerified) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Projekt megtekintése
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Kérjük, adja meg a PIN kódot a hozzáféréshez
              </p>
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <form className="mt-8 space-y-6" onSubmit={verifyPin}>
              <div className="rounded-md shadow-sm -space-y-px">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="PIN kód (6 számjegy)"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 6) {
                      setPin(value);
                    }
                  }}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading || pin.length !== 6}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Ellenőrzés...' : 'Belépés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
  
    // Projekt megjelenítése
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {project?.name}
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Státusz</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {project?.status}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Leírás</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {project?.description}
                </dd>
              </div>
              
              {project?.invoices && project.invoices.length > 0 && (
                <div className="bg-gray-50 px-4 py-5 sm:px-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Számlák</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Számla szám
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dátum
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Összeg
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Állapot
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {project.invoices.map((invoice, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoice.number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(invoice.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoice.totalAmount} {project.financial?.currency || 'EUR'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                invoice.status === 'fizetett' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'késedelmes' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    );
  };
  
  export default SharedProjectView;