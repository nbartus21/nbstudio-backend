import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Info, AlertCircle, CheckCircle, X, Save, Loader } from 'lucide-react';
import { api } from '../../services/auth';
import { formatShortDate } from '../shared/utils';

const API_URL = 'https://admin.nb-studio.net:5001';

const CalendarView = () => {
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    priority: 'medium',
    status: 'active',
    progress: 0
  });

  // Hónap és év kiszámítása
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Hónapnevek magyarul
  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  // Napnevek magyarul
  const dayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

  // Feladatok lekérése
  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Feladatok lekérése az API-ról
      const response = await api.get(`${API_URL}/api/translation/tasks`);

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        if (response.status === 401) {
          setError('Nincs megfelelő jogosultsága a feladatok megtekintéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          // API endpoint might not exist yet, use sample tasks
          useDefaultTasks();
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Hiba történt a feladatok betöltése során: ' + error.message);
      useDefaultTasks();
    } finally {
      setLoading(false);
    }
  };

  // Alapértelmezett feladatok használata, ha az API nem elérhető
  const useDefaultTasks = () => {
    const defaultTasks = [
      {
        _id: '1',
        title: 'Weboldal fordítás befejezése',
        description: 'A kezdőoldal és a kapcsolat oldal fordítását befejezni német nyelvre.',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        status: 'active',
        progress: 50,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updates: [
          {
            _id: '1-1',
            content: 'Kezdőoldal fordítása kész.',
            progress: 50,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        _id: '2',
        title: 'Marketing anyagok előkészítése',
        description: 'Szórólap és közösségi média hirdetések szövegének elkészítése.',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        status: 'active',
        progress: 25,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '3',
        title: 'Dokumentáció frissítése',
        description: 'A felhasználói kézikönyv frissítése az új funkciókkal.',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'low',
        status: 'active',
        progress: 0,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '4',
        title: 'Ügyféltájékoztató email kiküldése',
        description: 'Tájékoztató email kiküldése az ügyfeleknek a szolgáltatás változásairól.',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    setTasks(defaultTasks);
  };

  // Komponens betöltésekor feladatok lekérése
  useEffect(() => {
    fetchTasks();
  }, []);

  // Új feladat mentése
  const saveTask = async () => {
    // Validáció
    if (!newTask.title.trim()) {
      setError('A feladat címe kötelező!');
      return;
    }

    if (!newTask.dueDate) {
      setError('A határidő megadása kötelező!');
      return;
    }

    try {
      setIsSaving(true);

      // Dátum és idő kombinálása
      const combinedDateTime = newTask.dueTime
        ? `${newTask.dueDate}T${newTask.dueTime}:00`
        : `${newTask.dueDate}T00:00:00`;

      // Feladat adatok előkészítése küldéshez
      const taskToSave = {
        ...newTask,
        dueDate: combinedDateTime,
        // Az idő mezőt nem küldjuk el, mert a szerver nem ismeri
        dueTime: undefined
      };

      // API hívás
      const response = await api.post(`${API_URL}/api/translation/tasks`, taskToSave);

      if (response.ok) {
        const savedTask = await response.json();
        setTasks([...tasks, savedTask]);
        setSuccess('Feladat sikeresen mentve!');
        setShowTaskModal(false);
      } else {
        if (response.status === 401) {
          setError('Nincs megfelelő jogosultsága a feladatok mentéséhez. Kérjük, jelentkezzen be újra.');
        } else {
          // Offline mentés, ha az API nem elérhető
          const newTaskWithId = {
            ...taskToSave,
            _id: Date.now().toString(),
            createdAt: new Date().toISOString()
          };

          setTasks([...tasks, newTaskWithId]);
          setSuccess('Feladat lokálisan mentve. (API kapcsolat nem elérhető)');
          setShowTaskModal(false);
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      setError('Hiba történt a feladat mentése során: ' + error.message);

      // Offline mentés hiba esetén
      const newTaskWithId = {
        ...taskToSave,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };

      setTasks([...tasks, newTaskWithId]);
      setSuccess('Feladat lokálisan mentve. (Hiba a szerverrel való kommunikációban)');
      setShowTaskModal(false);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Form mezők változásának kezelése
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({
      ...newTask,
      [name]: value
    });
  };

  // Előző hónapra lépés
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Következő hónapra lépés
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Aktuális hónapra lépés
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Naptár napjainak generálása
  const generateCalendarDays = () => {
    // Hónap első napja
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

    // Hónap utolsó napja
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Első nap a héten (0: vasárnap, 1: hétfő, ..., 6: szombat)
    // Átalakítjuk, hogy hétfővel kezdődjön (0: hétfő, 1: kedd, ..., 6: vasárnap)
    let firstDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6; // Vasárnap esetén

    // Naptár napjainak száma (előző hónap napjai + aktuális hónap napjai + következő hónap napjai)
    const daysInCalendar = [];

    // Előző hónap napjai
    const prevMonth = new Date(currentYear, currentMonth, 0);
    const daysInPrevMonth = prevMonth.getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      daysInCalendar.push({
        date: day,
        isCurrentMonth: false,
        isToday: isSameDay(day, new Date()),
        events: getEventsForDay(day)
      });
    }

    // Aktuális hónap napjai
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(currentYear, currentMonth, i);
      daysInCalendar.push({
        date: day,
        isCurrentMonth: true,
        isToday: isSameDay(day, new Date()),
        events: getEventsForDay(day)
      });
    }

    // Következő hónap napjai (a naptár kitöltéséhez)
    const remainingDays = 7 - (daysInCalendar.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const day = new Date(currentYear, currentMonth + 1, i);
        daysInCalendar.push({
          date: day,
          isCurrentMonth: false,
          isToday: isSameDay(day, new Date()),
          events: getEventsForDay(day)
        });
      }
    }

    return daysInCalendar;
  };

  // Két dátum összehasonlítása (csak nap, hónap, év)
  const isSameDay = (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Események lekérése egy adott napra
  const getEventsForDay = (date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, date);
    });
  };

  // Nap kiválasztása
  const handleDayClick = (day) => {
    setSelectedDay(day.date);
    setDayEvents(day.events);
  };

  // Prioritás színének meghatározása
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Prioritás szövegének meghatározása
  const getPriorityText = (priority) => {
    switch (priority) {
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

  // Státusz színének meghatározása
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Státusz szövegének meghatározása
  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktív';
      case 'completed':
        return 'Befejezett';
      default:
        return 'Ismeretlen';
    }
  };

  // Státusz ikonjának meghatározása
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Naptár napjainak generálása
  const calendarDays = generateCalendarDays();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Naptár</h1>
        <div className="flex space-x-2">
          <button
            onClick={goToCurrentMonth}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ma
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setNewTask({
                title: '',
                description: '',
                dueDate: now.toISOString().split('T')[0],
                dueTime: now.toTimeString().split(' ')[0].substring(0, 5),
                priority: 'medium',
                status: 'active',
                progress: 0
              });
              setShowTaskModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új feladat
          </button>
        </div>
      </div>

      {/* Hiba és sikeres üzenet megjelenítése */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Naptár fejléc */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-gray-50 border-b">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-gray-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-gray-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Naptár napok fejléc */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {dayNames.map((day, index) => (
            <div key={index} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Naptár napok */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`bg-white p-2 h-32 overflow-y-auto ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
              } ${day.isToday ? 'bg-blue-50' : ''} ${
                selectedDay && isSameDay(day.date, selectedDay) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                  {day.date.getDate()}
                </span>
                {day.events.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    {day.events.length}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {day.events.slice(0, 2).map((event) => (
                  <div
                    key={event._id}
                    className={`text-xs truncate p-1 rounded ${
                      event.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{day.events.length - 2} további
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kiválasztott nap eseményei */}
      {selectedDay && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">
            Események: {selectedDay.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          {dayEvents.length === 0 ? (
            <p className="text-gray-500">Nincsenek események ezen a napon.</p>
          ) : (
            <div className="space-y-4">
              {dayEvents.map((event) => (
                <div key={event._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <div className={`flex items-center ${getPriorityColor(event.priority)}`}>
                          <span className="text-xs">Prioritás: {getPriorityText(event.priority)}</span>
                        </div>
                        <div className={`flex items-center ${getStatusColor(event.status)}`}>
                          {getStatusIcon(event.status)}
                          <span className="text-xs ml-1">{getStatusText(event.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Határidő: {formatShortDate(event.dueDate)}
                    </div>
                  </div>

                  {/* Haladási sáv */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                      <span>Haladás</span>
                      <span>{event.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          event.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${event.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Új feladat modális ablak */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Új feladat létrehozása</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Cím <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newTask.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Leírás
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newTask.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Határidő dátuma <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Határidő időpontja
                </label>
                <input
                  type="time"
                  id="dueTime"
                  name="dueTime"
                  value={newTask.dueTime}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Prioritás
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={newTask.priority}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Alacsony</option>
                  <option value="medium">Közepes</option>
                  <option value="high">Magas</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Státusz
                </label>
                <select
                  id="status"
                  name="status"
                  value={newTask.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Aktív</option>
                  <option value="completed">Befejezett</option>
                </select>
              </div>

              <div>
                <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-1">
                  Haladás ({newTask.progress}%)
                </label>
                <input
                  type="range"
                  id="progress"
                  name="progress"
                  value={newTask.progress}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="5"
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Mégsem
              </button>
              <button
                onClick={saveTask}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Mentés
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
