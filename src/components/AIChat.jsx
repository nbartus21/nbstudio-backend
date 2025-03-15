import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Send, MessageSquare, Trash2, Save, RefreshCw, Download } from 'lucide-react';

const AIChat = () => {
  // States
  const [isOpen, setIsOpen] = useState(true); // Legyen alapból megnyitva a teljes képernyős oldalon
  const [isExpanded, setIsExpanded] = useState(true); // Legyen alapból teljes képernyő
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [serverConversations, setServerConversations] = useState([]);
  const [syncStatus, setSyncStatus] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isOpen]);

  // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(isLoggedIn);
    
    // Ha be van jelentkezve, lekérjük a szerverről a beszélgetéseket
    if (isLoggedIn) {
      fetchServerConversations();
    } else {
      // Ha nincs bejelentkezve, csak a helyi tárolóból töltjük be
      const savedConversations = localStorage.getItem('aiChatConversations');
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
    }
  }, []);
  
  // A szerver beszélgetések lekérése - egyszerűsített implementáció
  // Mivel a szerver oldalon nincs megfelelő végpont a beszélgetések lekéréséhez,
  // használjuk a localStorage-et átmenetileg a szerveroldali funkcionalitás szimulálására
  const fetchServerConversations = async () => {
    try {
      // Helyi beszélgetések betöltése localStorage-ból
      const savedConversations = localStorage.getItem('aiChatConversations');
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        
        // Átalakítjuk MongoDB-szerű formátumra a lokális beszélgetéseket
        const formattedConversations = parsedConversations.map(conv => ({
          _id: conv.id,
          title: conv.title,
          messages: conv.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }));
        
        setServerConversations(formattedConversations);
        setSyncStatus('Beszélgetések sikeresen betöltve.');
        
        // Ha van beszélgetés, és még nincs kiválasztva beszélgetés, akkor betöltjük a legfrissebbet
        if (formattedConversations.length > 0 && !currentConversationId) {
          setConversation(formattedConversations[0].messages);
          setCurrentConversationId(formattedConversations[0]._id);
        }
      } else {
        setServerConversations([]);
        setSyncStatus('Nincsenek mentett beszélgetések.');
      }
    } catch (error) {
      console.error('Hiba a beszélgetések betöltése során:', error);
      setSyncStatus('Hiba történt a beszélgetések betöltése során.');
    }
  };
  
  // Egy beszélgetés lekérése ID alapján - egyszerűsített implementáció localStorage használatával
  const fetchConversationById = async (id) => {
    try {
      // Helyi beszélgetések betöltése localStorage-ból
      const savedConversations = localStorage.getItem('aiChatConversations');
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        
        // Keressük meg a kért azonosítójú beszélgetést
        const conversation = parsedConversations.find(conv => conv.id === id || conv.id === id.toString());
        
        if (conversation) {
          setConversation(conversation.messages);
          setCurrentConversationId(conversation.id);
        } else {
          console.error('Beszélgetés nem található:', id);
          setSyncStatus('A kért beszélgetés nem található.');
        }
      }
    } catch (error) {
      console.error('Hiba a beszélgetés lekérése során:', error);
      setSyncStatus('Hiba történt a beszélgetés betöltése során.');
    }
  };
  
  // Helyi beszélgetések mentése localStorage-ba
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('aiChatConversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to conversation
    const updatedConversation = [
      ...conversation,
      { role: 'user', content: message }
    ];
    setConversation(updatedConversation);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Create messages array for API
      const messages = updatedConversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const API_URL = 'https://admin.nb-studio.net:5001/api';
      const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
      
      // Ha be van jelentkezve, használjuk az autentikált végpontot, egyébként a publikusat
      let requestUrl = '';
      let headers = {
        'Content-Type': 'application/json'
      };
      let requestBody = {};
      
      // Bejelentkezett és nem bejelentkezett felhasználók esetén is a nyilvános chat API-t használjuk
      // A szerveroldali implementáció miatt minden kérést a public chat API-n keresztül kell indítani
      requestUrl = `${API_URL}/api/public/chat`;
      headers['X-API-Key'] = API_KEY;
      
      // Beszélgetés azonosító hozzáadása, ha van
      if (isAuthenticated && currentConversationId) {
        requestBody = { 
          messages,
          conversationId: currentConversationId
        };
        // Token hozzáadása, hogy a szerver tudja azonosítani a felhasználót
        headers['Authorization'] = `Bearer ${sessionStorage.getItem('token')}`;
      } else {
        requestBody = { messages };
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      // Add AI response to conversation
      const aiResponse = data.choices[0].message.content;
      const finalConversation = [
        ...updatedConversation,
        { role: 'assistant', content: aiResponse }
      ];
      
      setConversation(finalConversation);
      
      if (isAuthenticated && data.conversationId) {
        // Ha autentikált és a szerver küldött vissza conversation ID-t, akkor frissítsük a helyi ID-t
        setCurrentConversationId(data.conversationId);
        // Frissítsük a beszélgetések listáját
        fetchServerConversations();
      } else {
        // Ha nincs bejelentkezve, vagy nincs visszaküldött ID, akkor helyi tárolás
        updateConversationStorage(finalConversation);
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      setConversation([
        ...updatedConversation,
        { role: 'assistant', content: 'Sajnálom, hiba történt. Kérlek, próbáld újra.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update conversation storage
  const updateConversationStorage = (convo) => {
    const title = convo[0]?.content.slice(0, 30) + (convo[0]?.content.length > 30 ? '...' : '');
    const timestamp = new Date().toISOString();
    
    if (currentConversationId) {
      // Update existing conversation
      setConversations(prevConversations => 
        prevConversations.map(c => 
          c.id === currentConversationId 
            ? { ...c, messages: convo, updatedAt: timestamp } 
            : c
        )
      );
    } else {
      // Create new conversation
      const newId = Date.now().toString();
      setCurrentConversationId(newId);
      setConversations(prevConversations => [
        {
          id: newId,
          title,
          messages: convo,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        ...prevConversations
      ]);
    }
  };
  
  // Start a new conversation
  const startNewConversation = () => {
    setConversation([]);
    setCurrentConversationId(null);
  };
  
  // Load a conversation
  const loadConversation = (conversationId) => {
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      setConversation(convo.messages);
      setCurrentConversationId(convo.id);
    }
  };
  
  // Delete a conversation - egyszerűsített implementáció localStorage használatával
  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    // Töröljük a beszélgetést a lokális tárolóból
    setConversations(prevConversations => 
      prevConversations.filter(c => c.id !== conversationId)
    );
    
    // Ha a szerver listából is töröljük (bár ez csak a memóriában történik meg)
    setServerConversations(prevConversations => 
      prevConversations.filter(c => c._id !== conversationId)
    );
    
    // Ha az aktuális beszélgetést töröltük, töröljük a tartalmát is
    if (currentConversationId === conversationId) {
      setConversation([]);
      setCurrentConversationId(null);
    }
    
    setSyncStatus('Beszélgetés sikeresen törölve.');
  };
  
  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render chat message
  const renderMessage = (msg, index) => {
    // Az URL alapján ellenőrizzük, hogy a dedicated AI Chat oldalon vagyunk-e
    const isAIChatPage = window.location.pathname === '/ai-chat';
    
    return (
      <div 
        key={index}
        className={`mb-3 ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
      >
        <div
          className={`${isAIChatPage ? 'max-w-md' : 'max-w-xs'} p-2 rounded-lg text-sm ${
            msg.role === 'user'
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {msg.content}
        </div>
      </div>
    );
  };

  // Chat bubble (minimized state) - csak a SideChat-ben használjuk
  if (!isOpen) {
    // Az URL alapján ellenőrizzük, hogy a dedicated AI Chat oldalon vagyunk-e
    const isAIChatPage = window.location.pathname === '/ai-chat';
    
    // Ha a dedicated oldalon vagyunk, akkor ne jelenítse meg a minimalizált állapotot
    if (isAIChatPage) {
      setIsOpen(true);
      setIsExpanded(true);
      return null;
    }
    
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  // Expanded full-screen chat
  if (isExpanded) {
    // Az URL alapján ellenőrizzük, hogy a dedicated AI Chat oldalon vagyunk-e
    const isAIChatPage = window.location.pathname === '/ai-chat';
    
    return (
      <div className="w-full h-full bg-white flex overflow-hidden rounded-lg">
        {/* Sidebar with conversation history */}
        <div className={`${isAIChatPage ? 'w-1/4' : 'w-64'} border-r border-gray-200 bg-gray-50 flex flex-col h-full`}>
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-medium text-base">Mentett Sablonok</h2>
            <div className="flex space-x-1">
              {isAuthenticated && (
                <button
                  onClick={fetchServerConversations}
                  className="text-gray-500 hover:text-blue-600"
                  title="Beszélgetések frissítése a szerverről"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              <button
                onClick={() => startNewConversation()}
                className="text-blue-500 hover:text-blue-600"
                title="Új beszélgetés"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Státusz információ */}
          {syncStatus && (
            <div className="px-3 py-1 bg-blue-50 text-xs text-blue-700 border-b border-blue-100">
              {syncStatus}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto h-full">
            {/* Ha be van jelentkezve, a szerverről lekért beszélgetéseket mutatjuk */}
            {isAuthenticated ? (
              <div>
                {serverConversations.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center text-sm h-full flex items-center justify-center">
                    <div>
                      <p>Még nincsenek mentett beszélgetések</p>
                      <p className="text-xs mt-2 text-gray-400">Küldj üzenetet, hogy elkezdd az első beszélgetést</p>
                    </div>
                  </div>
                ) : (
                  <ul className="h-full">
                    {serverConversations.map((convo) => (
                      <li 
                        key={convo._id}
                        onClick={() => fetchConversationById(convo._id)}
                        className={`p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer flex justify-between ${
                          currentConversationId === convo._id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="font-medium text-sm truncate">{convo.title || 'Névtelen'}</div>
                          <div className="text-xs text-gray-500">{formatTimestamp(convo.updatedAt)}</div>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(convo._id, e)}
                          className="text-gray-400 hover:text-red-500"
                          title="Beszélgetés törlése"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // Ha nincs bejelentkezve, a helyi tárolt beszélgetéseket mutatjuk
              <div>
                {conversations.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center text-sm h-full flex items-center justify-center">
                    <div>
                      <p>Még nincsenek mentett sablonok</p>
                      <p className="text-xs mt-2 text-gray-400">Küldj üzenetet, hogy elkezdd az első beszélgetést</p>
                      {/* Segítség a felhasználónak */}
                      <p className="text-xs mt-2 text-blue-500">
                        Jelentkezz be, hogy a beszélgetéseid minden eszközön elérhetőek legyenek!
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="h-full">
                    {conversations.map((convo) => (
                      <li 
                        key={convo.id}
                        onClick={() => loadConversation(convo.id)}
                        className={`p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer flex justify-between ${
                          currentConversationId === convo.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="font-medium text-sm truncate">{convo.title || 'Névtelen'}</div>
                          <div className="text-xs text-gray-500">{formatTimestamp(convo.updatedAt)}</div>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(convo.id, e)}
                          className="text-gray-400 hover:text-red-500"
                          title="Beszélgetés törlése"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col h-full">
          {!isAIChatPage && (
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-medium">AI Asszisztens</h2>
            </div>
          )}
          
          <div className="flex-1 p-3 overflow-y-auto">
            {conversation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Küldj egy üzenetet az AI-val való beszélgetés indításához.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {conversation.map((msg, index) => renderMessage(msg, index))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center">
              <textarea
                ref={chatInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Írd ide az üzeneted..."
                className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className={`p-2 rounded-r-lg ${
                  isLoading || !message.trim()
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Small chat window
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl z-50 flex flex-col overflow-hidden" style={{height: '400px'}}>
      <div className="p-3 bg-blue-500 text-white flex justify-between items-center">
        <h3 className="font-medium">AI Asszisztens</h3>
        <div className="flex">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-white mr-2"
            title="Teljes méret"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white"
            title="Bezárás"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        {conversation.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-2 text-gray-300" />
              <p>Küldj egy üzenetet a beszélgetés indításához.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.map((msg, index) => renderMessage(msg, index))}
            {isLoading && (
              <div className="text-center py-2">
                <div className="inline-block h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center">
          <textarea
            ref={chatInputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Írd ide az üzeneted..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            className={`p-2 rounded-r-lg ${
              isLoading || !message.trim()
                ? 'bg-gray-300 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;