import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Send, MessageSquare, Trash2, Save } from 'lucide-react';
import { callDeepSeekAPI } from '../services/deepseekService';

const AIChat = () => {
  // States
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
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

  // Load conversations from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('aiChatConversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  }, []);

  // Save conversations to localStorage
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
      
      // Call DeepSeek API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      // Update or create conversation in storage
      updateConversationStorage(finalConversation);
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
  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    setConversations(prevConversations => 
      prevConversations.filter(c => c.id !== conversationId)
    );
    
    // If the deleted conversation was the current one, clear it
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
    return (
      <div 
        key={index}
        className={`mb-4 ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
      >
        <div
          className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${
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
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  // Expanded full-screen chat
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex overflow-hidden">
        {/* Sidebar with conversation history */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg">Beszélgetések</h2>
            <button
              onClick={() => startNewConversation()}
              className="text-blue-500 hover:text-blue-600"
              title="Új beszélgetés"
            >
              +
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                Még nincsenek beszélgetések
              </div>
            ) : (
              <ul>
                {conversations.map((convo) => (
                  <li 
                    key={convo.id}
                    onClick={() => loadConversation(convo.id)}
                    className={`p-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer flex justify-between ${
                      currentConversationId === convo.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="font-medium truncate">{convo.title || 'Névtelen'}</div>
                      <div className="text-xs text-gray-500">{formatTimestamp(convo.updatedAt)}</div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(convo.id, e)}
                      className="text-gray-400 hover:text-red-500"
                      title="Beszélgetés törlése"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg">AI Asszisztens</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
              title="Kis méret"
            >
              <Minimize2 size={20} />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {conversation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Küldj egy üzenetet az AI-val való beszélgetés indításához.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((msg, index) => renderMessage(msg, index))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <textarea
                ref={chatInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Írd ide az üzeneted..."
                className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                <Send size={20} />
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