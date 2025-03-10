import React, { useState, useEffect } from 'react';
import { api } from '../services/auth';
import { 
  Check, AlertCircle, Clock, Calendar, Trash2, 
  Plus, Bell, Edit, ChevronDown, ChevronUp, Filter, 
  X, RefreshCw, List, Grid, CalendarDays, LayoutList,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock as ClockIcon
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
  
  // Nézet típus beállítása (lista vagy naptár)
  const [viewType, setViewType] = useState('list');
  
  // Naptár hónap
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      
      // Valós API hívás
      const response = await api.get(`/api/tasks?${queryParams.toString()}`);
      
      // Ellenőrizzük, hogy a válasz tartalmaz-e adatokat
      if (response && response.data) {
        setTasks(response.data);
      } else {
        // Ha nincs adat, akkor üres tömböt állítunk be
        setTasks([]);
        console.warn('A szerver nem adott vissza feladat adatokat');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba a feladatok betöltésekor:', error);
      setError('Nem sikerült betölteni a feladatokat');
      // Hiba esetén is tisztítsuk ki a tasks tömböt
      setTasks([]);
      setLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Create task
  const createTask = async () => {
    try {
      if (!newTask.title) {
        setError('A feladat címe kötelező!');
        return;
      }
      
      setLoading(true);
      
      // Valós API hívás
      const response = await api.post('/api/tasks', newTask);
      
      // Ellenőrizzük, hogy a válasz tartalmaz-e adatokat
      if (response && response.data) {
        setTasks(prev => [response.data, ...prev]);
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
      } else {
        setError('Hiányzó válasz adatok a szervertől');
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
      
      setLoading(false);
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
      
      // Valós API hívás
      const response = await api.put(`/api/tasks/${taskId}/complete`);
      
      // Ellenőrizzük, hogy a válasz tartalmaz-e adatokat
      if (response && response.data) {
        setTasks(prev => 
          prev.map(task => 
            task._id === response.data._id ? response.data : task
          )
        );
        
        setSuccessMessage('Feladat sikeresen teljesítve!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setError('Hiányzó válasz adatok a szervertől');
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
      
      setLoading(false);
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
      
      // Valós API hívás
      await api.delete(`/api/tasks/${taskId}`);
      
      setTasks(prev => prev.filter(task => task._id !== taskId));
      
      setSuccessMessage('Feladat sikeresen törölve!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setLoading(false);
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
  
  // Naptár generálása
  const generateCalendar = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Hónap első napja
    const firstDay = new Date(year, month, 1);
    // Hónap utolsó napja
    const lastDay = new Date(year, month + 1, 0);
    
    // A hónap első napjának a napja (0 vasárnap, 1 hétfő, stb.)
    const firstDayOfWeek = firstDay.getDay() || 7; // 0 = vasárnap, 1-6 = hétfő-szombat, 7 = vasárnap Európai módon
    
    // A naptárban az első nap (előző hónap utolsó napjai is)
    const startDate = new Date(year, month, 2 - firstDayOfWeek);
    
    // Cellák száma (6 sor, soronként 7 nap)
    const numCells = 42;
    
    // Naptár cellák generálása
    const cells = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < numCells; i++) {
      // Ellenőrizzük, hogy a tasks tömb létezik-e
      const tasksForDay = tasks && Array.isArray(tasks) 
        ? tasks.filter(task => task && task.dueDate && isSameDay(new Date(task.dueDate), currentDate))
        : [];
        
      cells.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isSameDay(currentDate, new Date()),
        tasksForDay
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return cells;
  };
  
  // Két dátum összehasonlítása (csak nap, hónap, év)
  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };
  
  // A hónap nevének lekérése
  const getMonthName = (date) => {
    return date.toLocaleString('hu-HU', { month: 'long', year: 'numeric' });
  };
  
  // Előző hónap
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const date = new Date(prev);
      date.setMonth(date.getMonth() - 1);
      return date;
    });
  };
  
  // Következő hónap
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const date = new Date(prev);
      date.setMonth(date.getMonth() + 1);
      return date;
    });
  };
  
  // Mai napra ugrás
  const goToToday = () => {
    setCurrentMonth(new Date());
  };
  
  // Feladatok rendezése határidő szerint az idővonalas nézethez
  const getTasksByDueDate = () => {
    // Ellenőrizzük, hogy a tasks tömb létezik-e és valóban tömb-e
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return {};
    }
    
    const groupedTasks = {};
    
    // Mai nap
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Holnap
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Ezen a héten (7 nap)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Ezen a hónapban
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Később
    const later = new Date(nextMonth);
    
    // Rendezés kategóriákba
    tasks.forEach(task => {
      // Ellenőrizzük, hogy a task objektum és a dueDate létezik-e
      if (!task || !task.dueDate) return;
      
      const dueDate = new Date(task.dueDate);
      
      if (isSameDay(dueDate, today)) {
        if (!groupedTasks['today']) groupedTasks['today'] = [];
        groupedTasks['today'].push(task);
      } else if (isSameDay(dueDate, tomorrow)) {
        if (!groupedTasks['tomorrow']) groupedTasks['tomorrow'] = [];
        groupedTasks['tomorrow'].push(task);
      } else if (dueDate > today && dueDate < nextWeek) {
        if (!groupedTasks['thisWeek']) groupedTasks['thisWeek'] = [];
        groupedTasks['thisWeek'].push(task);
      } else if (dueDate >= nextWeek && dueDate < nextMonth) {
        if (!groupedTasks['thisMonth']) groupedTasks['thisMonth'] = [];
        groupedTasks['thisMonth'].push(task);
      } else if (dueDate >= nextMonth) {
        if (!groupedTasks['later']) groupedTasks['later'] = [];
        groupedTasks['later'].push(task);
      } else if (dueDate < today) {
        if (!groupedTasks['overdue']) groupedTasks['overdue'] = [];
        groupedTasks['overdue'].push(task);
      }
    });
    
    return groupedTasks;
  };
  
  // Naptár cellák
  const calendarCells = generateCalendar(currentMonth);
  
  // Idővonalas nézet feladatai
  const timelineTaskGroups = getTasksByDueDate();

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
          {/* Nézet váltása */}
          <div className="border border-gray-300 rounded-md flex overflow-hidden mr-2">
            <button
              onClick={() => setViewType('list')}
              className={`p-2 ${
                viewType === 'list' 
                  ? 'bg-indigo-100 text-indigo-600 border-r border-gray-300' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-r border-gray-300'
              }`}
              title="Lista nézet"
            >
              <LayoutList className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewType('calendar')}
              className={`p-2 ${
                viewType === 'calendar' 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title="Naptár nézet"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>
          
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

      {/* Main content with sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - Timeline view */}
        <div className="lg:w-1/4 bg-white rounded-lg border border-gray-200 p-4 h-fit">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
            <ClockIcon className="h-5 w-5 mr-2 text-indigo-600" />
            Idővonalas áttekintés
          </h3>
          
          <div className="space-y-6">
            {/* Lejárt feladatok */}
            {timelineTaskGroups.overdue && timelineTaskGroups.overdue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Lejárt ({timelineTaskGroups.overdue.length})
                </h4>
                <div className="space-y-2">
                  {timelineTaskGroups.overdue.map(task => (
                    <div 
                      key={task._id} 
                      className="p-2 border border-red-200 rounded bg-red-50 text-sm hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-red-800 truncate">{task.title}</p>
                          <div className="flex items-center mt-1">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mai feladatok */}
            {timelineTaskGroups.today && timelineTaskGroups.today.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-indigo-700 flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Ma ({timelineTaskGroups.today.length})
                </h4>
                <div className="space-y-2">
                  {timelineTaskGroups.today.map(task => (
                    <div 
                      key={task._id} 
                      className={`p-2 border rounded text-sm transition-colors ${
                        task.status === 'completed'
                          ? 'border-gray-200 bg-gray-50 text-gray-500'
                          : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}>{task.title}</p>
                          <div className="flex items-center mt-1">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Holnapi feladatok */}
            {timelineTaskGroups.tomorrow && timelineTaskGroups.tomorrow.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-700 flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Holnap ({timelineTaskGroups.tomorrow.length})
                </h4>
                <div className="space-y-2">
                  {timelineTaskGroups.tomorrow.map(task => (
                    <div 
                      key={task._id} 
                      className="p-2 border border-blue-200 rounded bg-blue-50 text-sm hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{task.title}</p>
                          <div className="flex items-center mt-1">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ezen a héten */}
            {timelineTaskGroups.thisWeek && timelineTaskGroups.thisWeek.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-purple-700 flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Ezen a héten ({timelineTaskGroups.thisWeek.length})
                </h4>
                <div className="space-y-2">
                  {timelineTaskGroups.thisWeek.map(task => (
                    <div 
                      key={task._id} 
                      className="p-2 border border-purple-200 rounded bg-purple-50 text-sm hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{task.title}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 mr-2">{formatDate(task.dueDate)}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ezen a hónapban és később */}
            {((timelineTaskGroups.thisMonth && timelineTaskGroups.thisMonth.length > 0) || 
              (timelineTaskGroups.later && timelineTaskGroups.later.length > 0)) && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Későbbi ({
                    (timelineTaskGroups.thisMonth?.length || 0) + 
                    (timelineTaskGroups.later?.length || 0)
                  })
                </h4>
                <div className="space-y-2">
                  {[...(timelineTaskGroups.thisMonth || []), ...(timelineTaskGroups.later || [])]
                    .slice(0, 5) // Csak az első 5-öt mutatjuk
                    .map(task => (
                    <div 
                      key={task._id} 
                      className="p-2 border border-gray-200 rounded bg-gray-50 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{task.title}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 mr-2">{formatDate(task.dueDate)}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Ha több mint 5 van, akkor "Több..." link */}
                  {((timelineTaskGroups.thisMonth?.length || 0) + 
                    (timelineTaskGroups.later?.length || 0)) > 5 && (
                    <button 
                      className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 py-1"
                      onClick={() => setViewType('calendar')}
                    >
                      Mutass többet...
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Ha nincs feladat */}
            {Object.keys(timelineTaskGroups).length === 0 && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Nincsenek feladatok</p>
                <button
                  onClick={() => setShowNewTaskForm(true)}
                  className="mt-2 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  + Új feladat
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <div className="lg:w-3/4">
          {/* Naptár nézet */}
          {viewType === 'calendar' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Naptár fejléc */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">{getMonthName(currentMonth)}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Ma
                  </button>
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Naptár grid */}
              <div className="grid grid-cols-7 text-center text-xs text-gray-700 border-b border-gray-200">
                <div className="py-2 font-medium">H</div>
                <div className="py-2 font-medium">K</div>
                <div className="py-2 font-medium">Sze</div>
                <div className="py-2 font-medium">Cs</div>
                <div className="py-2 font-medium">P</div>
                <div className="py-2 font-medium">Szo</div>
                <div className="py-2 font-medium">V</div>
              </div>
              
              <div className="grid grid-cols-7 border-b border-gray-200">
                {calendarCells.map((cell, i) => (
                  <div 
                    key={i} 
                    className={`h-32 border-r border-b p-1 ${
                      !cell.isCurrentMonth ? 'bg-gray-50' : ''
                    } ${
                      cell.isToday ? 'bg-blue-50' : ''
                    } ${
                      i % 7 === 6 ? 'border-r-0' : '' // remove right border on last column
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className={`text-sm inline-flex items-center justify-center h-6 w-6 rounded-full ${
                        cell.isToday
                          ? 'bg-blue-600 text-white font-medium'
                          : cell.isCurrentMonth
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                      {cell.tasksForDay.length > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full">
                          {cell.tasksForDay.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] hide-scrollbar">
                      {cell.tasksForDay.map(task => (
                        <div 
                          key={task._id}
                          className={`text-xs p-1 rounded ${
                            task.status === 'completed'
                              ? 'bg-gray-100 text-gray-500 line-through'
                              : task.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'medium'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <div className="truncate">{task.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Lista nézet */}
          {viewType === 'list' && (
            <>
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
            </>
          )}
        </div>
      </div>

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

      {/* Style a görgetősáv elrejtéséhez */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </div>
  );
};

export default TaskManager;