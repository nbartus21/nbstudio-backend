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
  
  // A szerver beszélgetések lekérése az adatbázisból
  const fetchServerConversations = async () => {
    if (!isAuthenticated) {
      // Ha nincs bejelentkezve, a localStorage-ból töltjük be
      try {
        const savedConversations = localStorage.getItem('aiChatConversations');
        if (savedConversations) {
          const parsedConversations = JSON.parse(savedConversations);
          const formattedConversations = parsedConversations.map(conv => ({
            _id: conv.id,
            title: conv.title,
            messages: conv.messages,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt
          }));
          setServerConversations(formattedConversations);
        } else {
          setServerConversations([]);
        }
      } catch (error) {
        console.error('Hiba a lokális beszélgetések betöltése során:', error);
      }
      return;
    }
    
    // Ha be van jelentkezve, a szerverről kérjük le a beszélgetéseket
    try {
      const API_URL = 'https://admin.nb-studio.net:5001/api';
      const token = sessionStorage.getItem('token');
      
      // Mivel nincs külön végpont a beszélgetések listázására, használjuk a localStorage-ban lévő példányokat
      const savedConversations = localStorage.getItem('aiChatConversations');
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
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
      }
    } catch (error) {
      console.error('Hiba a beszélgetések lekérése során:', error);
      setSyncStatus('Hiba történt a szerverrel való kommunikáció során.');
    }
  };
  
  // Egy beszélgetés lekérése ID alapján
  const fetchConversationById = async (id) => {
    if (!isAuthenticated) {
      // Ha nincs bejelentkezve, a localStorage-ból töltjük be
      try {
        const savedConversations = localStorage.getItem('aiChatConversations');
        if (savedConversations) {
          const parsedConversations = JSON.parse(savedConversations);
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
      return;
    }
    
    // Használjuk a localStorage-t, amíg nincs meg a szerver oldali implementáció
    try {
      const savedConversations = localStorage.getItem('aiChatConversations');
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        const conversation = parsedConversations.find(conv => 
          conv.id === id || conv._id === id || 
          conv.id === id.toString() || conv._id === id.toString()
        );
        
        if (conversation) {
          setConversation(conversation.messages);
          setCurrentConversationId(conversation.id || conversation._id);
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
      
      // Nyilvános végpontot használjunk a szerverrel való kommunikációhoz
      // A szerveroldali chat API megfelelő végpontja: /api/public/chat
      // Az router.post('/') kezeli a kérést
      requestUrl = `${API_URL}/public/chat`;
      headers['X-API-Key'] = API_KEY;
      
      // Ha be van jelentkezve, Bearer tokent is küldünk, hogy a felhasználó azonosítható legyen
      if (isAuthenticated) {
        headers['Authorization'] = `Bearer ${sessionStorage.getItem('token')}`;
        // Hozzáadjuk a conversationId-t a kéréshez, ha van
        requestBody = { 
          messages,
          conversationId: currentConversationId
        };
      } else {
        requestBody = { messages };
      }

      console.log('Küldés - URL:', requestUrl);
      console.log('Küldés - Törzs:', JSON.stringify(requestBody));
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API hiba: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Hibás válasz formátum az API-tól');
      }
      
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
  
  // Delete a conversation
  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      // Ha nincs bejelentkezve, csak a localStorage-ból töröljük
      setConversations(prevConversations => 
        prevConversations.filter(c => c.id !== conversationId)
      );
      
      setServerConversations(prevConversations => 
        prevConversations.filter(c => c._id !== conversationId)
      );
      
      setSyncStatus('Beszélgetés sikeresen törölve.');
    } else {
      // Bejelentkezett felhasználóknál is egyelőre csak lokálisan töröljük
      // amíg nincs szerver oldali implementáció
      setConversations(prevConversations => 
        prevConversations.filter(c => c.id !== conversationId)
      );
      
      setServerConversations(prevConversations => 
        prevConversations.filter(c => c._id !== conversationId)
      );
      
      setSyncStatus('Beszélgetés sikeresen törölve.');
    }
    
    // Ha az aktuális beszélgetést töröltük, töröljük a tartalmát is
    if (currentConversationId === conversationId) {
      setConversation([]);
      setCurrentConversationId(null);
    }
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
    
    // A válasz tartalmát feldolgozzuk és formázzuk
    const formattedContent = msg.role === 'assistant' 
      ? msg.content.split('\n').map((line, i) => {
          // Ha a sor üres, akkor egy üres paragrafust adunk
          if (!line.trim()) return <p key={i} className="my-2"></p>;
          
          // Ha a sor egy címsor (###, ## vagy #), akkor formázzuk
          if (line.startsWith('### ')) {
            return <h3 key={i} className="text-base font-semibold mt-3 mb-2">{line.slice(4)}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
          }
          
          // Ha a sor egy lista elem (- vagy *), akkor formázzuk
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return <li key={i} className="ml-4">{line.trim().slice(2)}</li>;
          }
          
          // Ha a sor egy kódblokk (```), akkor formázzuk
          if (line.trim().startsWith('```')) {
            const language = line.trim().slice(3);
            const codeBlock = [];
            let j = i + 1;
            
            // Gyűjtjük a kódblokk tartalmát
            while (j < msg.content.split('\n').length && !msg.content.split('\n')[j].trim().startsWith('```')) {
              codeBlock.push(msg.content.split('\n')[j]);
              j++;
            }
            
            // Kódblokk megjelenítése
            return (
              <div key={i} className="my-2">
                <div className="bg-gray-800 text-gray-100 rounded-t-lg px-3 py-1 text-xs font-mono">
                  {language}
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                  <code className="font-mono text-sm">
                    {codeBlock.join('\n')}
                  </code>
                </pre>
              </div>
            );
          }
          
          // Ha a sor egy inline kód (`), akkor formázzuk
          if (line.includes('`')) {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {line.split('`').map((part, j) => 
                  j % 2 === 0 ? part : (
                    <code key={j} className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-sm">
                      {part}
                    </code>
                  )
                )}
              </p>
            );
          }
          
          // Ha a sor HTML kódot tartalmaz
          if (line.includes('<') && line.includes('>')) {
            return (
              <div key={i} className="my-2">
                <div className="bg-gray-800 text-gray-100 rounded-t-lg px-3 py-1 text-xs font-mono">
                  HTML
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                  <code className="font-mono text-sm">
                    {line}
                  </code>
                </pre>
              </div>
            );
          }
          
          // Ha a sor táblázatot tartalmaz
          if (line.includes('|')) {
            const cells = line.split('|').filter(cell => cell.trim());
            return (
              <div key={i} className="overflow-x-auto my-2">
                <table className="min-w-full border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      {cells.map((cell, j) => (
                        <td key={j} className="border border-gray-300 px-2 py-1">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }
          
          // Egyéb esetben normál szövegként jelenítjük meg
          return <p key={i} className="whitespace-pre-wrap">{line}</p>;
        })
      : msg.content;
    
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
          {formattedContent}
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