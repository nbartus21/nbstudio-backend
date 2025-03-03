import React, { useState, useEffect } from 'react';
import { categorizeMessage, generateResponseSuggestion } from '../services/deepseekService';
import { api } from '../services/auth';
import { Card, CardHeader, CardTitle, CardContent } from './Card'; // Importáljuk a Card komponenseket

const API_URL = 'https://admin.nb-studio.net:5001/api';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Calculator kártya komponens
const CalculatorCard = ({ entry, onView, onCreateProject, onDelete, formatCurrency, onStatusUpdate }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{entry.projectType}</CardTitle>
            <p className="text-sm text-gray-600">{entry.email}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            entry.complexity === 'complex' ? 'bg-red-100 text-red-800' :
            entry.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {entry.complexity === 'complex' ? 'Komplex' : 
             entry.complexity === 'medium' ? 'Közepes' : 'Egyszerű'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="border-t border-b">
        <div className="py-2">
          <p className="text-sm text-gray-700 line-clamp-2">{entry.projectDescription}</p>
        </div>
        <div className="py-2 flex flex-wrap gap-2">
          {entry.features.slice(0, 3).map((feature, index) => (
            <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
              {feature}
            </span>
          ))}
          {entry.features.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
              +{entry.features.length - 3} további
            </span>
          )}
        </div>
      </CardContent>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">{formatCurrency(entry.estimatedCost.minCost)} - {formatCurrency(entry.estimatedCost.maxCost)}</p>
            <p className="text-xs text-gray-500">Kb. {entry.estimatedCost.hours} óra</p>
          </div>
          <div>
            <select
              value={entry.status}
              onChange={(e) => onStatusUpdate(entry._id, e.target.value)}
              className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="new">Új</option>
              <option value="in-progress">Folyamatban</option>
              <option value="completed">Befejezett</option>
              <option value="cancelled">Törölt</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center border-t pt-3">
          <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleDateString()}</p>
          <div className="flex space-x-2">
            <button
              onClick={() => onView(entry)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
              title="Részletek"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={() => onCreateProject(entry)}
              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
              title="Projekt létrehozása"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(entry._id)}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
              title="Törlés"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CalculatorAdmin = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'table' vagy 'cards' - most 'cards' az alapértelmezett
  const [filters, setFilters] = useState({
    status: '',
    complexity: '',
    search: ''
  });

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/calculators`);
      
      // Ellenőrizzük, hogy a válasz megfelelő formátumú-e
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni az adatokat');
      }
      
      const data = await response.json();
      console.log('API válasz:', response);
      console.log('Adatok:', data);
      
      // Ellenőrizzük, hogy data egy tömb-e
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        console.error('Az API nem tömb formátumban küldte az adatokat:', data);
        setEntries([]);
      }
    } catch (error) {
      console.error('Hiba a lekérésnél:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAnalyze = async (entry) => {
    setAnalyzing(true);
    try {
      const [categoryData, suggestedResponse] = await Promise.all([
        categorizeMessage(entry.projectDescription),
        generateResponseSuggestion(entry.projectDescription)
      ]);

      setAiAnalysis({
        ...categoryData,
        suggestedResponse
      });
    } catch (error) {
      console.error('AI elemzés sikertelen:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`${API_URL}/calculators/${id}`, { status });
      await fetchEntries();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCreateProject = async (entry) => {
    try {
      await api.post(`${API_URL}/projects`, {
        name: `${entry.projectType} Projekt`,
        description: entry.projectDescription,
        client: {
          name: "Kitöltendő",
          email: entry.email,
          taxNumber: ""
        },
        financial: {
          budget: {
            min: entry.estimatedCost.minCost,
            max: entry.estimatedCost.maxCost
          }
        },
        status: 'aktív',
        priority: entry.complexity === 'complex' ? 'magas' : 
                 entry.complexity === 'medium' ? 'közepes' : 'alacsony',
        calculatorEntry: entry._id,
        aiAnalysis: {
          riskLevel: entry.complexity === 'complex' ? 'magas' : 
                    entry.complexity === 'medium' ? 'közepes' : 'alacsony',
          nextSteps: [
            'Ügyfél kapcsolatfelvétel',
            'Részletes követelmények egyeztetése',
            'Szerződés előkészítése'
          ],
          lastUpdated: new Date()
        }
      });

      await handleStatusUpdate(entry._id, 'in-progress');
      alert('Projekt sikeresen létrehozva!');
    } catch (error) {
      console.error('Hiba:', error);
      alert('Nem sikerült létrehozni a projektet: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a bejegyzést?')) return;
    try {
      await api.delete(`${API_URL}/calculators/${id}`);
      await fetchEntries();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedEntry) return;
    
    try {
      await api.put(`${API_URL}/calculators/${selectedEntry._id}`, {
        notes: [
          ...(selectedEntry.notes || []),
          { content: newNote.trim(), createdAt: new Date() }
        ]
      });
      
      setNewNote('');
      await fetchEntries();
      
      // Frissítsük a kiválasztott bejegyzést is
      const updatedEntry = entries.find(e => e._id === selectedEntry._id);
      if (updatedEntry) {
        setSelectedEntry(updatedEntry);
      }
    } catch (error) {
      setError('Nem sikerült hozzáadni a megjegyzést: ' + error.message);
    }
  };

  const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;

  // Szűrők alkalmazása
  const filteredEntries = entries.filter(entry => {
    const statusMatch = !filters.status || entry.status === filters.status;
    const complexityMatch = !filters.complexity || entry.complexity === filters.complexity;
    const searchMatch = !filters.search || 
                        entry.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                        entry.projectDescription.toLowerCase().includes(filters.search.toLowerCase()) ||
                        entry.projectType.toLowerCase().includes(filters.search.toLowerCase());
    
    return statusMatch && complexityMatch && searchMatch;
  });

  // Statisztikák számítása
  const stats = {
    total: entries.length,
    new: entries.filter(e => e.status === 'new').length,
    inProgress: entries.filter(e => e.status === 'in-progress').length,
    completed: entries.filter(e => e.status === 'completed').length,
    avgCost: entries.length > 0 
      ? Math.round(entries.reduce((sum, e) => sum + ((e.estimatedCost.minCost + e.estimatedCost.maxCost) / 2), 0) / entries.length)
      : 0
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-red-50 border-red-200">
            <CardContent>
              <p className="text-red-700">Hiba: {error}</p>
              <button
                onClick={fetchEntries}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Újrapróbálkozás
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Költségkalkulátor Bejegyzések</h1>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchEntries}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Frissítés
            </button>
            
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Táblázat
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Kártyák
              </button>
            </div>
          </div>
        </div>

        {/* Statisztikák */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-blue-500">
            <CardContent>
              <div className="text-sm text-gray-500">Összes kalkuláció</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-green-500">
            <CardContent>
              <div className="text-sm text-gray-500">Új kalkulációk</div>
              <div className="text-2xl font-bold">{stats.new}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-yellow-500">
            <CardContent>
              <div className="text-sm text-gray-500">Folyamatban</div>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-green-700">
            <CardContent>
              <div className="text-sm text-gray-500">Befejezve</div>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-purple-500">
            <CardContent>
              <div className="text-sm text-gray-500">Átlag költség</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgCost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Szűrők */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Szűrők</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keresés</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Email, projekt típus vagy leírás..."
                  className="w-full px-4 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Állapot</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="">Minden állapot</option>
                  <option value="new">Új</option>
                  <option value="in-progress">Folyamatban</option>
                  <option value="completed">Befejezett</option>
                  <option value="cancelled">Törölt</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonyolultság</label>
                <select
                  value={filters.complexity}
                  onChange={(e) => setFilters({...filters, complexity: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="">Minden bonyolultság</option>
                  <option value="simple">Egyszerű</option>
                  <option value="medium">Közepes</option>
                  <option value="complex">Komplex</option>
                </select>
              </div>
            </div>
            
            {/* Reset gomb, ha aktív a szűrő */}
            {(filters.status || filters.complexity || filters.search) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setFilters({ status: '', complexity: '', search: '' })}
                  className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  Szűrők törlése
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {filteredEntries.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nincsenek kalkulációk</h3>
              <p className="mt-1 text-sm text-gray-500">
                {entries.length === 0 
                  ? 'Még nem érkeztek kalkulációk.' 
                  : 'Nincsenek a szűrési feltételeknek megfelelő kalkulációk.'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          // Táblázat nézet
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dátum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekt Típus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Becsült Költség</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Állapot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">{entry.projectType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(entry.estimatedCost.minCost)} - {formatCurrency(entry.estimatedCost.maxCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={entry.status}
                        onChange={(e) => handleStatusUpdate(entry._id, e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="new">Új</option>
                        <option value="in-progress">Folyamatban</option>
                        <option value="completed">Befejezett</option>
                        <option value="cancelled">Törölt</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsModalOpen(true);
                            handleAnalyze(entry);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Részletek"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleCreateProject(entry)}
                          className="text-green-600 hover:text-green-800"
                          title="Projekt létrehozása"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Törlés"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Kártya nézet
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <CalculatorCard
                key={entry._id}
                entry={entry}
                onView={(entry) => {
                  setSelectedEntry(entry);
                  setIsModalOpen(true);
                  handleAnalyze(entry);
                }}
                onCreateProject={handleCreateProject}
                onDelete={handleDelete}
                formatCurrency={formatCurrency}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}

        {/* Részletek Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          {selectedEntry && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Projekt Részletek</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ügyfél Információ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><span className="font-medium">Email:</span> {selectedEntry.email}</p>
                      <p><span className="font-medium">Projekt Típus:</span> {selectedEntry.projectType}</p>
                      <p><span className="font-medium">Bonyolultság:</span> {selectedEntry.complexity}</p>
                      <p><span className="font-medium">Sürgős Szállítás:</span> {selectedEntry.urgentDelivery ? 'Igen' : 'Nem'}</p>
                      <p><span className="font-medium">Karbantartás:</span> {selectedEntry.maintenance ? 'Igen' : 'Nem'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Költség Felbontás</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><span className="font-medium">Teljes Költség:</span> {formatCurrency(selectedEntry.estimatedCost.minCost)} - {formatCurrency(selectedEntry.estimatedCost.maxCost)}</p>
                      <p><span className="font-medium">Fejlesztési Órák:</span> {selectedEntry.breakdown.development.hours}h</p>
                      <p><span className="font-medium">Funkció Órák:</span> {selectedEntry.breakdown.features.hours}h</p>
                      <p><span className="font-medium">Összes Óra:</span> {selectedEntry.estimatedCost.hours}h</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Projekt Leírás</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedEntry.projectDescription}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kiválasztott Funkciók</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Elemzés Szakasz */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>AI Elemzés</CardTitle>
                    <button
                      onClick={() => handleAnalyze(selectedEntry)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      disabled={analyzing}
                    >
                      {analyzing ? 'Elemzés folyamatban...' : 'Elemzés Frissítése'}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Prioritás Értékelés</h4>
                          <p className={`mt-1 capitalize ${
                            aiAnalysis.priority === 'high' ? 'text-red-600' :
                            aiAnalysis.priority === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {aiAnalysis.priority}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Projekt Kategória</h4>
                          <p className="mt-1 capitalize">{aiAnalysis.category}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Hangulat Elemzés</h4>
                          <p className={`mt-1 capitalize ${
                            aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                            aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {aiAnalysis.sentiment}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Javasolt Válasz</h4>
                        <div className="mt-2 relative">
                          <textarea
                            readOnly
                            value={aiAnalysis.suggestedResponse}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg"
                            rows="4"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(aiAnalysis.suggestedResponse)}
                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700"
                            title="Másolás vágólapra"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>Kattints az "Elemzés Frissítése" gombra az AI elemzés elindításához.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Megjegyzések Szakasz */}
              <Card>
                <CardHeader>
                  <CardTitle>Megjegyzések</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedEntry.notes && selectedEntry.notes.length > 0 ? (
                      selectedEntry.notes.map((note, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <p className="text-gray-700">{note.content}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-gray-500">
                        <p>Nincsenek megjegyzések.</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Megjegyzés hozzáadása..."
                        className="flex-1 px-4 py-2 border rounded-lg"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newNote.trim()) {
                            handleAddNote();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        Hozzáadás
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Művelet Gombok */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => handleCreateProject(selectedEntry)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Projekt Létrehozása
                </button>
                <button
                  onClick={() => handleDelete(selectedEntry._id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Törlés
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Bezárás
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default CalculatorAdmin;