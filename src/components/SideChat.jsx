import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Trash2, Save, ExternalLink, Maximize2, ChevronRight, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const SideChat = () => {
  // States
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [savedConversations, setSavedConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [quickSuggestions] = useState([
    "Hogyan tudok új projektet létrehozni?",
    "Mi a domain regisztráció folyamata?",
    "Hogyan számlázzak egy projektet?"
  ]);
  
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [codeCopiedId, setCodeCopiedId] = useState(null);

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
    // Load active conversation
    const savedMessages = localStorage.getItem('sideChatMessages');
    if (savedMessages) {
      try {
        setConversation(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading saved chat:', error);
      }
    }

    // Load saved conversations
    const savedConversationsList = localStorage.getItem('savedChatConversations');
    if (savedConversationsList) {
      try {
        setSavedConversations(JSON.parse(savedConversationsList));
      } catch (error) {
        console.error('Error loading saved conversations:', error);
      }
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('sideChatMessages', JSON.stringify(conversation));
    }
  }, [conversation]);

  // Save conversations list to localStorage
  useEffect(() => {
    if (savedConversations.length > 0) {
      localStorage.setItem('savedChatConversations', JSON.stringify(savedConversations));
    }
  }, [savedConversations]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Hide suggestions once user starts typing
    setShowSuggestions(false);
    
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
      
      // Add authentication token if available
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      };
      
      const token = sessionStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/public/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          messages, 
          conversationId: currentConversationId 
        }),
      });
      
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
      
      // Update conversation ID if provided by server
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
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

  // Clear conversation
  const clearConversation = () => {
    setConversation([]);
    setCurrentConversationId(null);
    localStorage.removeItem('sideChatMessages');
    setShowSuggestions(true);
  };
  
  // Save current conversation
  const saveConversation = () => {
    if (conversation.length < 2) {
      setNotification({
        type: 'error',
        message: 'A mentéshez legalább egy üzenetváltás szükséges'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Extract title from first message
    const title = conversation[0].content.length > 30 
      ? conversation[0].content.substring(0, 30) + '...' 
      : conversation[0].content;
    
    const timestamp = new Date().toISOString();
    const newConversation = {
      id: currentConversationId || Date.now().toString(),
      title,
      messages: conversation,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Check if conversation already exists
    const existingIndex = savedConversations.findIndex(c => c.id === newConversation.id);
    
    if (existingIndex !== -1) {
      // Update existing conversation
      const updatedConversations = [...savedConversations];
      updatedConversations[existingIndex] = {
        ...updatedConversations[existingIndex],
        messages: conversation,
        updatedAt: timestamp
      };
      setSavedConversations(updatedConversations);
    } else {
      // Add new conversation
      setSavedConversations([newConversation, ...savedConversations]);
    }
    
    setCurrentConversationId(newConversation.id);
    
    setNotification({
      type: 'success',
      message: 'Beszélgetés sikeresen elmentve'
    });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Load a saved conversation
  const loadConversation = (conversationId) => {
    const conversation = savedConversations.find(c => c.id === conversationId);
    if (conversation) {
      setConversation(conversation.messages);
      setCurrentConversationId(conversation.id);
      setShowSuggestions(false);
    }
  };
  
  // Delete a saved conversation
  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    setSavedConversations(savedConversations.filter(c => c.id !== conversationId));
    
    // If current conversation is deleted, clear it
    if (currentConversationId === conversationId) {
      clearConversation();
    }
  };
  
  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
    handleSendMessage();
  };
  
  // Copy conversation to clipboard
  const copyConversation = () => {
    if (conversation.length === 0) {
      setNotification({
        type: 'error',
        message: 'Nincs mit másolni'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    const formattedText = conversation.map(msg => {
      const role = msg.role === 'user' ? 'Kérdés' : 'Válasz';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(formattedText).then(() => {
      setNotification({
        type: 'success',
        message: 'Beszélgetés másolva a vágólapra'
      });
      setTimeout(() => setNotification(null), 3000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setNotification({
        type: 'error',
        message: 'Nem sikerült másolni a beszélgetést'
      });
      setTimeout(() => setNotification(null), 3000);
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Process message content to detect and format various markdown elements
  const formatMessageContent = (content, isUserMessage) => {
    if (!content) return '';
    
    // Process content in chunks to handle different formatting elements
    let processedChunks = [];
    
    // First, separate code blocks from regular text
    const parts = [];
    const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockPattern.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'bash',
        content: match[2]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }
    
    // If no parts found, just return the original content
    if (parts.length === 0) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
    
    // Process each part based on its type
    let keyCounter = 0;
    
    parts.forEach((part, partIndex) => {
      if (part.type === 'code') {
        // Render code block
        processedChunks.push(
          <div key={`code-${partIndex}`} className="my-2 rounded bg-gray-800 overflow-hidden">
            <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 flex justify-between">
              <span>{part.language || 'code'}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(part.content);
                  setCodeCopiedId(`code-${partIndex}`);
                  setTimeout(() => setCodeCopiedId(null), 2000);
                }}
                className="text-gray-400 hover:text-white flex items-center"
                title="Copy to clipboard"
              >
                {codeCopiedId === `code-${partIndex}` ? (
                  <>
                    <Check size={12} className="mr-1 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-2 text-xs text-gray-100 overflow-x-auto whitespace-pre">
              <code className="font-mono">{part.content}</code>
            </pre>
          </div>
        );
      } else if (part.type === 'text') {
        // Process text parts for headings, lists, etc.
        const textContent = part.content;
        
        // Split text by newlines while preserving empty lines
        const lines = textContent.split('\n');
        let currentList = null;
        let listItems = [];
        let inSection = false;
        
        lines.forEach((line, lineIndex) => {
          keyCounter++;
          
          // Check for h3 headers with ### prefix
          if (line.match(/^###\s+(.+)$/)) {
            const headerText = line.replace(/^###\s+/, '');
            processedChunks.push(
              <h3 key={`h3-${keyCounter}`} className="text-sm font-bold mt-4 mb-2">{headerText}</h3>
            );
            return;
          }
          
          // Check for h2 headers with ## prefix
          if (line.match(/^##\s+(.+)$/)) {
            const headerText = line.replace(/^##\s+/, '');
            processedChunks.push(
              <h2 key={`h2-${keyCounter}`} className="text-base font-bold mt-4 mb-2">{headerText}</h2>
            );
            return;
          }
          
          // Check for h1 headers with # prefix
          if (line.match(/^#\s+(.+)$/)) {
            const headerText = line.replace(/^#\s+/, '');
            processedChunks.push(
              <h1 key={`h1-${keyCounter}`} className="text-lg font-bold mt-4 mb-2">{headerText}</h1>
            );
            return;
          }
          
          // Check for horizontal rule with --- or ***
          if (line.match(/^(-{3,}|\*{3,})$/)) {
            processedChunks.push(
              <hr key={`hr-${keyCounter}`} className="my-3 border-gray-300" />
            );
            return;
          }
          
          // Check for unordered list items
          const listMatch = line.match(/^(\s*)-\s+(.+)$/);
          if (listMatch) {
            const listItem = listMatch[2];
            if (currentList !== 'ul') {
              // If we were building a different type of list, add it first
              if (currentList && listItems.length > 0) {
                processedChunks.push(
                  React.createElement(currentList, { key: `list-${keyCounter}`, className: "pl-4 ml-2 my-2 space-y-1" }, listItems)
                );
                listItems = [];
              }
              currentList = 'ul';
            }
            
            // Add to current list items
            listItems.push(
              <li key={`li-${keyCounter}`} className="flex items-start">
                <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0 ${
                  isUserMessage ? 'bg-white' : 'bg-indigo-500'
                }`}></span>
                <span>{listItem}</span>
              </li>
            );
            return;
          }
          
          // Check for numbered list items
          const numberedListMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (numberedListMatch) {
            const listItem = numberedListMatch[3];
            const number = numberedListMatch[2];
            
            if (currentList !== 'ol') {
              // If we were building a different type of list, add it first
              if (currentList && listItems.length > 0) {
                processedChunks.push(
                  React.createElement(currentList, { key: `list-${keyCounter}`, className: "pl-4 ml-2 my-2 space-y-1" }, listItems)
                );
                listItems = [];
              }
              currentList = 'ol';
            }
            
            // Add to current list items
            listItems.push(
              <li key={`li-${keyCounter}`} className="flex items-start">
                <span className={`inline-block mr-2 font-bold w-5 text-right flex-shrink-0 ${
                  isUserMessage ? 'text-white' : 'text-indigo-600'
                }`}>{number}.</span>
                <span>{listItem}</span>
              </li>
            );
            return;
          }
          
          // If this line is not a list item, but we have list items built up, add the list
          if ((currentList && listItems.length > 0) && 
              (!listMatch && !numberedListMatch)) {
            processedChunks.push(
              React.createElement(currentList, { key: `list-${keyCounter}`, className: "pl-4 ml-2 my-2 space-y-1" }, listItems)
            );
            listItems = [];
            currentList = null;
          }
          
          // Check for bold text
          let formattedLine = line;
          formattedLine = formattedLine.replace(/\*\*(.+?)\*\*/g, (_, text) => `<strong>${text}</strong>`);
          formattedLine = formattedLine.replace(/\_\_(.+?)\_\_/g, (_, text) => `<strong>${text}</strong>`);
          
          // Check for italic text
          formattedLine = formattedLine.replace(/\*(.+?)\*/g, (_, text) => `<em>${text}</em>`);
          formattedLine = formattedLine.replace(/\_(.+?)\_/g, (_, text) => `<em>${text}</em>`);
          
          // Check for inline code
          formattedLine = formattedLine.replace(/\`(.+?)\`/g, (_, text) => {
            const codeClass = isUserMessage 
              ? "px-1 py-0.5 rounded bg-indigo-700 text-gray-100 font-mono text-xs"
              : "px-1 py-0.5 rounded bg-gray-700 text-gray-100 font-mono text-xs";
            return `<code class="${codeClass}">${text}</code>`;
          });
          
          // If line contains HTML after our replacements, use dangerouslySetInnerHTML
          if (formattedLine !== line) {
            processedChunks.push(
              <p 
                key={`p-${keyCounter}`} 
                className={`${lineIndex > 0 ? 'mt-1' : ''} ${line.trim() === '' ? 'h-3' : ''}`}
                dangerouslySetInnerHTML={{ __html: formattedLine }}
              />
            );
          } else {
            // Regular text line (only if not empty)
            if (line.trim() !== '') {
              processedChunks.push(
                <p key={`p-${keyCounter}`} className={lineIndex > 0 ? 'mt-1' : ''}>
                  {line}
                </p>
              );
            } else {
              // Empty line creates spacing
              processedChunks.push(
                <div key={`space-${keyCounter}`} className="h-3"></div>
              );
            }
          }
        });
        
        // If we ended with a list, add it
        if (currentList && listItems.length > 0) {
          processedChunks.push(
            React.createElement(currentList, { key: `list-${keyCounter + 1}`, className: "pl-4 ml-2 my-2 space-y-1" }, listItems)
          );
        }
      }
    });
    
    return processedChunks.length > 0 ? processedChunks : <span>{content}</span>;
  };

  // Render chat message
  const renderMessage = (msg, index) => {
    return (
      <div 
        key={index}
        className={`mb-3 ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
      >
        <div
          className={`max-w-[85%] p-3 rounded-lg text-sm overflow-hidden ${
            msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {formatMessageContent(msg.content, msg.role === 'user')}
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
          {conversation.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {conversation.filter(msg => msg.role === 'assistant').length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded view (full screen)
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center rounded-t-lg">
            <h3 className="font-medium flex items-center">
              <MessageSquare size={18} className="mr-2" />
              AI Asszisztens
            </h3>
            <div className="flex">
              <button
                onClick={copyConversation}
                className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
                title="Beszélgetés másolása"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={saveConversation}
                className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
                title="Beszélgetés mentése"
              >
                <Save size={16} />
              </button>
              <button
                onClick={clearConversation}
                className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
                title="Beszélgetés törlése"
              >
                <Trash2 size={16} />
              </button>
              <Link 
                to="/ai-chat"
                className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
                title="Megnyitás teljes oldalon"
              >
                <ExternalLink size={16} />
              </Link>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white p-1 hover:bg-indigo-700 rounded"
                title="Kis méret"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Notification */}
          {notification && (
            <div className={`p-2 text-sm text-center ${
              notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}
          
          <div className="flex flex-1 overflow-hidden">
            {/* Saved conversations sidebar */}
            <div className="w-64 border-r border-gray-200 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 font-medium text-sm">
                Mentett beszélgetések
              </div>
              
              {savedConversations.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-xs">
                  Még nincsenek mentett beszélgetések
                </div>
              ) : (
                <ul>
                  {savedConversations.map(convo => (
                    <li 
                      key={convo.id}
                      onClick={() => loadConversation(convo.id)}
                      className={`p-2 border-b border-gray-200 hover:bg-indigo-50 cursor-pointer text-sm ${
                        currentConversationId === convo.id ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="truncate">{convo.title}</div>
                        <button
                          onClick={(e) => deleteConversation(convo.id, e)}
                          className="text-gray-400 hover:text-red-500"
                          title="Beszélgetés törlése"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(convo.updatedAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Main chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {conversation.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    <div className="text-center p-4">
                      <MessageSquare size={48} className="mx-auto mb-4 text-indigo-300" />
                      <p className="mb-3 text-lg">Miben segíthetek neked?</p>
                      <p className="text-sm text-gray-400 mb-6">Küldj egy üzenetet, vagy válassz az alábbi témák közül:</p>
                      
                      <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                        {quickSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                          >
                            <div className="flex items-center">
                              <span className="flex-1 text-gray-800">{suggestion}</span>
                              <ChevronRight size={16} className="text-indigo-400" />
                            </div>
                          </button>
                        ))}
                      </div>
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
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !message.trim()}
                    className={`h-full p-3 rounded-r-lg ${
                      isLoading || !message.trim()
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular open chat panel
  return (
    <div className="fixed bottom-4 right-4 w-80 h-[500px] bg-white rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
      <div className="p-3 bg-indigo-600 text-white flex justify-between items-center">
        <h3 className="font-medium flex items-center">
          <MessageSquare size={18} className="mr-2" />
          Gyors segítség
        </h3>
        <div className="flex">
          <button
            onClick={copyConversation}
            className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
            title="Beszélgetés másolása"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={saveConversation}
            className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
            title="Beszélgetés mentése"
          >
            <Save size={16} />
          </button>
          <button
            onClick={clearConversation}
            className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
            title="Beszélgetés törlése"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-white mr-2 p-1 hover:bg-indigo-700 rounded"
            title="Teljes képernyő"
          >
            <Maximize2 size={16} />
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
      
      {/* Notification */}
      {notification && (
        <div className={`p-2 text-xs text-center ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {conversation.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center p-4">
              <MessageSquare size={36} className="mx-auto mb-3 text-indigo-300" />
              <p className="mb-2">Miben segíthetek neked?</p>
              
              {showSuggestions && (
                <div className="mt-4 space-y-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-2 bg-white border border-gray-200 rounded hover:bg-indigo-50 text-xs hover:border-indigo-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            className={`h-full p-2 rounded-r-lg ${
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