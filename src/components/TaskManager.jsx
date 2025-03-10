import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  Check, AlertCircle, Clock, Calendar, Trash2, 
  Plus, Bell, Edit, ChevronDown, ChevronUp, Filter, 
  X, RefreshCw
} from 'lucide-react';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Új feladat form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    reminders: []
  });
  
  // Szűrők
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    dateRange: 'today'
  });
  
  // Szűrőpanel megjelenítése
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchTasks();
  }, [filters]);
  
  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.dateRange) queryParams.append('dateRange', filters.dateRange);
      
      // Mivel még nincs API, statikusan töltjük be a feladatokat demóhoz
      setTimeout(() => {
        const mockTasks = getMockTasks(filters);
        setTasks(mockTasks);
        setLoading(false);
      }, 500);
      
      /* Később implementálható API hívás:
      const response = await api.get(`/api/tasks?${queryParams.toString()}`);
      const data = await response.json();
      setTasks(data);
      setLoading(false);
      */
    } catch (error) {
      console.error('Hiba a feladatok betöltésekor:', error);
      setError('Nem sikerült betölteni a feladatokat');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Mock tasks a demóhoz
  const getMockTasks = (activeFilters) => {
    const allTasks = [
      {
        _id: '1',
        title: 'Megbeszélés az ügyféllel',
        description: 'A projekt követelményeinek átbeszélése',
        status: 'pending',
        priority: 'high',
        dueDate: new Date().toISOString().split('T')[0], // ma
        createdAt: new Date().toISOString(),
        reminders: [
          { time: '1 órával előtte', sent: false }
        ]
      },
      {
        _id: '2',
        title: 'Kód felülvizsgálat',
        description: 'A csapat által írt kód átnézése',
        status: 'completed',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0], // ma
        createdAt: new Date(Date.now() - 86400000).toISOString(), // tegnap
        completedAt: new Date().toISOString(),
        reminders: []
      },
      {
        _id: '3',
        title: 'Prezentáció készítése',
        description: 'Bemutató anyag készítése a holnapi megbeszélésre',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // holnap
        createdAt: new Date().toISOString(),
        reminders: [
          { time: '1 nappal előtte', sent: false }
        ]
      },
      {
        _id: '4',
        title: 'Adatbázis migráció',
        description: 'Adatok átköltöztetése az új rendszerbe',
        status: 'pending',
        priority: 'low',
        dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // holnapután
        createdAt: new Date().toISOString(),
        reminders: []
      },
      {
        _id: '5',
        title: 'Dokumentáció írása',
        description: 'Fejlesztői dokumentáció elkészítése',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0], // 3 nap múlva
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 nappal ezelőtt
        reminders: []
      }
    ];
    
    // Szűrés
    return allTasks.filter(task => {
      // Keresés
      if (
        activeFilters.search && 
        !task.title.toLowerCase().includes(activeFilters.search.toLowerCase()) &&
        !task.description.toLowerCase().includes(activeFilters.search.toLowerCase())
      ) {
        return false;
      }
      
      // Státusz
      if (activeFilters.status && task.status !== activeFilters.status) {
        return false;
      }
      
      // Prioritás
      if (activeFilters.priority && task.priority !== activeFilters.priority) {
        return false;
      }
      
      // Dátum szűrő
      if (activeFilters.dateRange) {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        if (activeFilters.dateRange === 'today' && taskDate.getTime() !== today.getTime()) {
          return false;
        } else if (activeFilters.dateRange === 'tomorrow' && taskDate.getTime() !== tomorrow.getTime()) {
          return false;
        } else if (activeFilters.dateRange === 'week') {
          if (taskDate < today || taskDate >= nextWeek) {
            return false;
          }
        }
      }
      
      return true;
    });
  };

  // Create task
  const createTask = async () => {
    try {
      if (!newTask.title) {
        setError('A feladat címe kötelező!');
        return;
      }
      
      setLoading(true);
      
      // Mivel még nincs API, csak szimulálunk
      setTimeout(() => {
        const taskWithId = {
          ...newTask,
          _id: Date.now().toString(),
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        setTasks(prev => [taskWithId, ...prev]);
        setShowNewTaskForm(false);
        setNewTask({
          title: '',
          description: '',
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          reminders: []
        });
        
        setSuccessMessage('Feladat sikeresen létrehozva!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        setLoading(false);
      }, 500);
      
      /* Később implementálható API hívás:
      const response = await api.post('/api/tasks', newTask);
      const data = await response.json();
      
      setTasks(prev => [data, ...prev]);
      setShowNewTaskForm(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        reminders: []
      });
      
      setSuccessMessage('Feladat sikeresen létrehozva!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
      */
    } catch (error) {
      console.error('Hiba a feladat létrehozásakor:', error);
      setError('Nem sikerült létrehozni a feladatot');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Mark task as complete
  const completeTask = async (taskId) => {
    try {
      setLoading(true);
      
      // Mivel még nincs API, csak szimulálunk
      setTimeout(() => {
        setTasks(prev => 
          prev.map(task => 
            task._id === taskId 
              ? { 
                  ...task, 
                  status: 'completed', 
                  completedAt: new Date().toISOString() 
                } 
              : task
          )
        );
        
        setSuccessMessage('Feladat sikeresen teljesítve!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        setLoading(false);
      }, 300);
      
      /* Később implementálható API hívás:
      const response = await api.put(`/api/tasks/${taskId}/complete`);
      const updatedTask = await response.json();
      
      setTasks(prev => 
        prev.map(task => 
          task._id === updatedTask._id ? updatedTask : task
        )
      );
      
      setSuccessMessage('Feladat sikeresen teljesítve!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
      */
    } catch (error) {
      console.error('Hiba a feladat teljesítésekor:', error);
      setError('Nem sikerült teljesíteni a feladatot');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Delete task
  const deleteTask = async (taskId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a feladatot?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Mivel még nincs API, csak szimulálunk
      setTimeout(() => {
        setTasks(prev => prev.filter(task => task._id !== taskId));
        
        setSuccessMessage('Feladat sikeresen törölve!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        setLoading(false);
      }, 300);
      
      /* Később implementálható API hívás:
      await api.delete(`/api/tasks/${taskId}`);
      
      setTasks(prev => prev.filter(task => task._id !== taskId));
      
      setSuccessMessage('Feladat sikeresen törölve!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
      */
    } catch (error) {
      console.error('Hiba a feladat törlésekor:', error);
      setError('Nem sikerült törölni a feladatot');
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Add reminder
  const addReminder = () => {
    setNewTask(prev => ({
      ...prev,
      reminders: [...prev.reminders, { time: '1 órával előtte', sent: false }]
    }));
  };
  
  // Remove reminder
  const removeReminder = (index) => {
    setNewTask(prev => ({
      ...prev,
      reminders: prev.reminders.filter((_, i) => i !== index)
    }));
  };
  
  // Update reminder
  const updateReminder = (index, value) => {
    setNewTask(prev => ({
      ...prev,
      reminders: prev.reminders.map((reminder, i) => 
        i === index ? { ...reminder, time: value } : reminder
      )
    }));
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      search: '',
      dateRange: 'today'
    });
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Ma';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Holnap';
    } else {
      return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get priority label
  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 'high':
        return 'Magas';
      case 'medium':
        return 'Közepes';
      case 'low':
        return 'Alacsony';
      default:
        return 'Ismeretlen';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <AlertCircle className="inline-block h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feladatkezelő</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md ${
              showFilters ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
            } hover:bg-indigo-100 hover:text-indigo-600 transition-colors`}
            title="Szűrők"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={fetchTasks}
            className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
            title="Frissítés"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Új feladat
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Szűrők</h2>
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 transition-colors text-sm"
            >
              Szűrők törlése
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Keresés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keresés
              </label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Keresés a feladatokban..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Státusz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Státusz
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Összes státusz</option>
                <option value="pending">Függőben</option>
                <option value="completed">Teljesítve</option>
              </select>
            </div>
            
            {/* Prioritás */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioritás
              </label>
              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Összes prioritás</option>
                <option value="high">Magas</option>
                <option value="medium">Közepes</option>
                <option value="low">Alacsony</option>
              </select>
            </div>
            
            {/* Dátum tartomány */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Határidő
              </label>
              <select
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="today">Mai feladatok</option>
                <option value="tomorrow">Holnapi feladatok</option>
                <option value="week">Ezen a héten</option>
                <option value="">Összes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <Check className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Nincsenek feladatok</h3>
          <p className="text-gray-500 mt-1">Nincs megjeleníthető feladat a kiválasztott szűrők alapján.</p>
          {Object.values(filters).some(f => f) && (
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div 
              key={task._id} 
              className={`p-4 border ${
                task.status === 'completed' 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              } rounded-lg shadow-sm transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {task.status === 'completed' ? (
                    <button
                      className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mt-1"
                      disabled
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </button>
                  ) : (
                    <button
                      onClick={() => completeTask(task._id)}
                      className="flex-shrink-0 h-6 w-6 rounded-full bg-white border border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center mt-1 transition-colors"
                      title="Feladat teljesítése"
                    >
                      <Check className="h-4 w-4 text-transparent hover:text-green-500" />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${
                      task.status === 'completed' 
                        ? 'text-gray-500 line-through' 
                        : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className={`mt-1 text-sm ${
                        task.status === 'completed' 
                          ? 'text-gray-400' 
                          : 'text-gray-600'
                      }`}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 border border-gray-200 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(task.dueDate)}
                      </span>
                      {task.reminders && task.reminders.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center">
                          <Bell className="h-3 w-3 mr-1" />
                          {task.reminders.length} emlékeztető
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Feladat törlése"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskForm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Új feladat létrehozása
                    </h3>
                    <div className="mt-4 space-y-4">
                      {/* Feladat címe */}
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          Feladat címe *
                        </label>
                        <input
                          type="text"
                          id="title"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Feladat címe"
                          required
                        />
                      </div>
                      
                      {/* Leírás */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Leírás
                        </label>
                        <textarea
                          id="description"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Feladat részletes leírása"
                          rows={3}
                        />
                      </div>
                      
                      {/* Prioritás és dátum */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Prioritás
                          </label>
                          <select
                            id="priority"
                            value={newTask.priority}
                            onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="high">Magas</option>
                            <option value="medium">Közepes</option>
                            <option value="low">Alacsony</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                            Határidő
                          </label>
                          <input
                            type="date"
                            id="dueDate"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      
                      {/* Emlékeztetők */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Emlékeztetők
                          </label>
                          <button
                            type="button"
                            onClick={addReminder}
                            className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Új emlékeztető
                          </button>
                        </div>
                        {newTask.reminders.length === 0 ? (
                          <p className="text-sm text-gray-500">Nincsenek emlékeztetők</p>
                        ) : (
                          <div className="space-y-2">
                            {newTask.reminders.map((reminder, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <select
                                  value={reminder.time}
                                  onChange={(e) => updateReminder(index, e.target.value)}
                                  className="flex-grow p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                  <option value="5 perccel előtte">5 perccel előtte</option>
                                  <option value="15 perccel előtte">15 perccel előtte</option>
                                  <option value="30 perccel előtte">30 perccel előtte</option>
                                  <option value="1 órával előtte">1 órával előtte</option>
                                  <option value="2 órával előtte">2 órával előtte</option>
                                  <option value="1 nappal előtte">1 nappal előtte</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeReminder(index)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={createTask}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Létrehozás
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTaskForm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Mégse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;