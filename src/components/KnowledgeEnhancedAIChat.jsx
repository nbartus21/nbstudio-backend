import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import { X, Send, Loader, BookOpen, Database } from 'lucide-react';
import { aiQueryWithKnowledge } from '../services/wikiService';

const MessageBubble = ({ message, type, sources = [] }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[80%] p-3 rounded-2xl ${
        type === 'user'
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
          : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10'
      }`}
    >
      {message}
      
      {/* Sources citation */}
      {sources && sources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
          <div className="flex items-center mb-1">
            <Database className="w-3 h-3 mr-1" />
            <span>Sources:</span>
          </div>
          <ul className="list-disc list-inside">
            {sources.map((source, idx) => (
              <li key={idx} className="truncate">{source.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </motion.div>
);

const KnowledgeEnhancedAIChat = () => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Handle scroll visibility
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsScrollVisible(true);
      } else {
        setIsScrollVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!inputText.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputText.trim()
    };

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setError(null);

      // Use knowledge base enhanced chat or regular chat based on toggle
      if (useKnowledgeBase) {
        // Call the knowledge base enhanced AI query
        const response = await aiQueryWithKnowledge(userMessage.content, intl.locale);
        
        if (response.success) {
          const aiMessage = {
            type: 'assistant',
            content: response.response,
            sources: response.hasKnowledge ? response.sources : []
          };
          
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error('Failed to get response from knowledge base');
        }
      } else {
        // Fallback to regular AI chat without knowledge base
        // Implementation depends on your existing chat API
        const simulatedResponse = {
          type: 'assistant',
          content: getSimulatedResponse(inputText.trim(), intl.locale)
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, simulatedResponse]);
        }, 1000);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(intl.formatMessage({ id: 'chat.error.api' }));
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Function to simulate responses based on keywords (just a fallback)
  const getSimulatedResponse = (question, language) => {
    const q = question.toLowerCase();
    
    const responses = {
      de: {
        services: "Wir bieten Webentwicklung, Hosting, Integration und Automatisierung an. Unsere Kernkompetenzen umfassen WordPress, Full-Stack-Entwicklung und Serveradministration.",
        contact: "Sie können uns per E-Mail unter kontakt@nb-studio.net oder telefonisch unter +49 157 7882 9477 erreichen. Unser Büro befindet sich in Bruchsal, Deutschland.",
        hours: "Unsere Öffnungszeiten sind: Montag bis Freitag 9:00-18:00 Uhr, Samstag 10:00-14:00 Uhr. Sonntags sind wir geschlossen.",
        default: "Wie kann ich Ihnen weiterhelfen? Sie können mich alles über unsere Dienstleistungen, Kontaktmöglichkeiten oder Öffnungszeiten fragen."
      },
      en: {
        services: "We offer web development, hosting, integration, and automation services. Our core competencies include WordPress, full-stack development, and server administration.",
        contact: "You can reach us via email at contact@nb-studio.net or phone at +49 157 7882 9477. Our office is located in Bruchsal, Germany.",
        hours: "Our business hours are: Monday to Friday 9:00 AM-6:00 PM, Saturday 10:00 AM-2:00 PM. We are closed on Sundays.",
        default: "How can I help you? Feel free to ask me about our services, contact information, or business hours."
      },
      hu: {
        services: "Webfejlesztést, tárhelyszolgáltatást, integrációt és automatizálást kínálunk. Fő kompetenciáink közé tartozik a WordPress, a full-stack fejlesztés és a szerveradminisztráció.",
        contact: "Elérhet minket e-mailben a kontakt@nb-studio.net címen vagy telefonon a +49 157 7882 9477 számon. Irodánk Bruchsalban, Németországban található.",
        hours: "Nyitvatartási időnk: Hétfőtől péntekig 9:00-18:00, szombaton 10:00-14:00. Vasárnap zárva vagyunk.",
        default: "Miben segíthetek? Kérdezzen bátran szolgáltatásainkról, elérhetőségeinkről vagy nyitvatartási időnkről."
      }
    };

    if (q.includes('szolgáltatás') || q.includes('service') || q.includes('dienst')) {
      return responses[language].services;
    } else if (q.includes('kapcsolat') || q.includes('contact') || q.includes('kontakt')) {
      return responses[language].contact;
    } else if (q.includes('nyitva') || q.includes('hour') || q.includes('zeit')) {
      return responses[language].hours;
    }
    
    return responses[language].default;
  };

  // Calculate dynamic position for the chat button
  const chatButtonPosition = isScrollVisible ? 'bottom-24' : 'bottom-8';

  return (
    <AnimatePresence>
      <div className={`fixed ${chatButtonPosition} right-8 z-40 transition-all duration-300`}>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/10 w-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'chat.title' })}
              </h3>
              <div className="flex items-center">
                <button
                  onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                  className={`p-2 mr-2 rounded-xl transition-colors ${useKnowledgeBase ? 'text-blue-400' : 'text-gray-400'}`}
                  title={intl.formatMessage({ id: useKnowledgeBase ? 'chat.knowledge.on' : 'chat.knowledge.off' })}
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-black/20"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="mb-1">{intl.formatMessage({ id: 'chat.welcome' })}</p>
                  <p className="text-sm">
                    {intl.formatMessage({ id: useKnowledgeBase ? 'chat.knowledge.enabled' : 'chat.knowledge.disabled' })}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble 
                    key={idx} 
                    message={msg.content} 
                    type={msg.type} 
                    sources={msg.sources} 
                  />
                ))
              )}
              {error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'chat.input.placeholder' })}
                  className="flex-1 bg-white/5 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center text-xs text-gray-400">
                <BookOpen className="w-3 h-3 mr-1" />
                <span>
                  {intl.formatMessage({ 
                    id: useKnowledgeBase ? 'chat.using.knowledge' : 'chat.not.using.knowledge' 
                  })}
                </span>
                <button
                  onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                  className="ml-2 underline"
                >
                  {intl.formatMessage({ 
                    id: useKnowledgeBase ? 'chat.disable' : 'chat.enable' 
                  })}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 group"
          >
            <motion.div
              className="relative"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <div className="absolute -top-12 right-0 bg-black px-3 py-1 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {intl.formatMessage({ id: 'chat.button.tooltip' })}
              </div>
            </motion.div>
          </motion.button>
        )}
      </div>
    </AnimatePresence>
  );
};

export default KnowledgeEnhancedAIChat;