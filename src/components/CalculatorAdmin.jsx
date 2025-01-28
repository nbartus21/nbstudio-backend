import React, { useState, useEffect } from 'react';
import { categorizeMessage, generateResponseSuggestion } from '../services/deepseekService';

const API_URL = 'https://nbstudio-backend.onrender.com/api';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
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

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/calculators`);
      if (!response.ok) throw new Error('Failed to fetch calculator entries');
      const data = await response.json();
      setEntries(data);
    } catch (error) {
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
      console.error('AI analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/calculators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      await fetchEntries();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      const response = await fetch(`${API_URL}/calculators/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete entry');
      await fetchEntries();
    } catch (error) {
      setError(error.message);
    }
  };

  const formatCurrency = (amount) => `€${Math.round(amount).toLocaleString()}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cost Calculator Entries</h1>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
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
                      <option value="new">New</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsModalOpen(true);
                        handleAnalyze(entry);
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Details Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          {selectedEntry && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Project Details</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Client Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Email:</span> {selectedEntry.email}</p>
                    <p><span className="font-medium">Project Type:</span> {selectedEntry.projectType}</p>
                    <p><span className="font-medium">Complexity:</span> {selectedEntry.complexity}</p>
                    <p><span className="font-medium">Urgent Delivery:</span> {selectedEntry.urgentDelivery ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Maintenance:</span> {selectedEntry.maintenance ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Total Cost:</span> {formatCurrency(selectedEntry.estimatedCost.minCost)} - {formatCurrency(selectedEntry.estimatedCost.maxCost)}</p>
                    <p><span className="font-medium">Development Hours:</span> {selectedEntry.breakdown.development.hours}h</p>
                    <p><span className="font-medium">Feature Hours:</span> {selectedEntry.breakdown.features.hours}h</p>
                    <p><span className="font-medium">Total Hours:</span> {selectedEntry.estimatedCost.hours}h</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Project Description</h3>
                <p className="text-gray-700">{selectedEntry.projectDescription}</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Selected Features</h3>
                <div className="flex flex-wrap gap-2">{selectedEntry.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Analysis Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">AI Analysis</h3>
                  <button
                    onClick={() => handleAnalyze(selectedEntry)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={analyzing}
                  >
                    {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
                  </button>
                </div>

                {analyzing ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Priority Assessment</h4>
                      <p className={`mt-1 capitalize ${
                        aiAnalysis.priority === 'high' ? 'text-red-600' :
                        aiAnalysis.priority === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {aiAnalysis.priority}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Project Category</h4>
                      <p className="mt-1 capitalize">{aiAnalysis.category}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Sentiment Analysis</h4>
                      <p className={`mt-1 capitalize ${
                        aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                        aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {aiAnalysis.sentiment}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Suggested Response</h4>
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
                          title="Copy to clipboard"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Notes Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Notes</h3>
                <div className="space-y-4">
                  {selectedEntry.notes?.map((note, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-700">{note.content}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a note..."
                      className="flex-1 px-4 py-2 border rounded-lg"
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          try {
                            const response = await fetch(`${API_URL}/calculators/${selectedEntry._id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                notes: [
                                  ...(selectedEntry.notes || []),
                                  { content: e.target.value.trim(), createdAt: new Date() }
                                ]
                              })
                            });
                            if (!response.ok) throw new Error('Failed to add note');
                            await fetchEntries();
                            e.target.value = '';
                          } catch (error) {
                            setError(error.message);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => handleDelete(selectedEntry._id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Close
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