import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Trash2 } from 'lucide-react';

const SideChat = () => {
  // States
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Load conversation from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('sideChatMessages');
    if (savedMessages) {
      try {
        setConversation(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading saved chat:', error);
      }
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('sideChatMessages', JSON.stringify(conversation));
    }
  }, [conversation]);

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
      
      // Call DeepSeek API via our backend
      const API_URL = 'https://admin.nb-studio.net:5001/api';
      const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
      
      const response = await fetch(`${API_URL}/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ messages }),
      });
      
      const data = await response.json();
      
      // Add AI response to conversation
      const aiResponse = data.choices[0].message.content;
      const finalConversation = [
        ...updatedConversation,
        { role: 'assistant', content: aiResponse }
      ];
      
      setConversation(finalConversation);
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

  // Clear conversation
  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('sideChatMessages');
  };
  
  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render chat message
  const renderMessage = (msg, index) => {
    return (
      <div 
        key={index}
        className={`mb-3 ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
      >
        <div
          className={`max-w-[85%] p-2 rounded-lg text-sm ${
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

  // Chat bubble (minimized state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  // Open chat panel
  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-xl z-50 flex flex-col overflow-hidden">
      <div className="p-3 bg-indigo-600 text-white flex justify-between items-center">
        <h3 className="font-medium flex items-center">
          <MessageSquare size={18} className="mr-2" />
          Gyors segítség
        </h3>
        <div className="flex">
          <button
            onClick={clearConversation}
            className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
            title="Beszélgetés törlése"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white p-1 hover:bg-indigo-700 rounded"
            title="Bezárás"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {conversation.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center p-4">
              <MessageSquare size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="mb-2">Miben segíthetek neked?</p>
              <p className="text-xs text-gray-400">Küldj egy üzenetet a beszélgetés indításához.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.map((msg, index) => renderMessage(msg, index))}
            {isLoading && (
              <div className="text-center py-2">
                <div className="inline-block h-3 w-3 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center">
          <textarea
            ref={chatInputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Írd ide a kérdésed..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            className={`p-2 rounded-r-lg ${
              isLoading || !message.trim()
                ? 'bg-gray-300 text-gray-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideChat;