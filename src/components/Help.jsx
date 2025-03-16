import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Link } from 'react-router-dom';
import { helpTranslations } from '../locales/help';
import { ChevronRight, Search, ExternalLink } from 'lucide-react';

// Nyelv választó komponens
const LanguageSelector = ({ language, setLanguage }) => (
  <div className="flex space-x-2 bg-white shadow-sm rounded-full p-1">
    <button
      onClick={() => setLanguage('hu')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'hu' 
          ? 'bg-blue-500 text-white shadow-md' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      HU
    </button>
    <button
      onClick={() => setLanguage('en')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'en' 
          ? 'bg-blue-500 text-white shadow-md' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      EN
    </button>
    <button
      onClick={() => setLanguage('de')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'de' 
          ? 'bg-blue-500 text-white shadow-md' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      DE
    </button>
  </div>
);

// Szekció komponens
const Section = ({ title, children, icon }) => (
  <div className="mb-8 opacity-0 animate-fadeIn">
    <Card className="border-l-4 border-blue-500 hover:shadow-lg transition-shadow duration-300">
      <CardContent>
        <div className="flex items-center mb-4">
          {icon && <span className="text-blue-500 mr-3 text-xl">{icon}</span>}
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  </div>
);

// Alszekció komponens
const SubSection = ({ title, description, items, renderContent, icon }) => (
  <div className="space-y-4 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-300">
    <div className="flex items-center">
      {icon && <span className="text-blue-400 mr-2">{icon}</span>}
      <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
    </div>
    {description && <p className="text-gray-600 leading-relaxed">{description}</p>}
    {items && renderContent && renderContent(items)}
  </div>
);

// Lista komponens
const List = ({ items }) => (
  <ul className="space-y-2 text-gray-600">
    {Array.isArray(items) && items.map((item, index) => (
      <li key={index} className="flex items-start">
        <span className="text-blue-500 mr-2 mt-1">•</span>
        <span className="leading-relaxed">{item}</span>
      </li>
    ))}
  </ul>
);

// Linkek komponens
const Links = ({ items }) => (
  <div className="grid md:grid-cols-2 gap-4">
    {Array.isArray(items) && items.map((item, index) => (
      item.external ? (
        <a
          key={index}
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
        >
          <span className="flex-grow">{item.text}</span>
          <ExternalLink size={16} className="ml-2" />
        </a>
      ) : (
        <Link
          key={index}
          to={item.path}
          className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
        >
          <span className="flex-grow">{item.text}</span>
          <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      )
    ))}
  </div>
);

// Ikonok a szekciókhoz
const icons = {
  welcome: "👋",
  system: "🔐",
  projectManagement: "📋",
  financial: "💰",
  infrastructure: "🏗️",
  communication: "💬",
  other: "🔍",
  support: "🛟",
  links: "🔗",
  
  // Alszekciók ikonjai
  auth: "🔑",
  notifications: "🔔",
  projectHandling: "📁",
  documentManagement: "📄",
  accounting: "💵",
  licensing: "📜",
  domainHosting: "🌐",
  monitoring: "📊",
  aiChat: "🤖",
  support: "🎫",
  email: "✉️",
  blog: "📝",
  translation: "🌍",
  contacts: "👥",
  help: "❓",
  contact: "📞"
};

// Keresés komponens
const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };
  
  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Keresés a súgóban..."
          className="w-full p-3 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
      </div>
    </form>
  );
};

// Fő Help komponens
const Help = () => {
  const [language, setLanguage] = useState('hu');
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const t = helpTranslations[language];

  useEffect(() => {
    // Szimuláljuk a betöltést
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [language]);

  // Keresés funkció
  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const results = [];
    
    // Összes szekció keresése
    const sections = [
      'welcome', 'system', 'projectManagement', 'financial', 
      'infrastructure', 'communication', 'other', 'support', 'links'
    ];
    
    sections.forEach(sectionKey => {
      const section = t[sectionKey];
      
      // Szekció címében keresés
      if (section.title.toLowerCase().includes(searchTermLower)) {
        results.push({
          type: 'section',
          title: section.title,
          key: sectionKey
        });
      }
      
      // Alszekciókban keresés
      Object.keys(section).forEach(subKey => {
        const subSection = section[subKey];
        
        if (typeof subSection === 'object' && subSection !== null) {
          // Alszekció címében keresés
          if (subSection.title && subSection.title.toLowerCase().includes(searchTermLower)) {
            results.push({
              type: 'subsection',
              title: subSection.title,
              sectionKey,
              sectionTitle: section.title,
              subKey
            });
          }
          
          // Listaelemekben keresés
          if (Array.isArray(subSection.items)) {
            subSection.items.forEach((item, idx) => {
              if (typeof item === 'string' && item.toLowerCase().includes(searchTermLower)) {
                results.push({
                  type: 'item',
                  content: item,
                  sectionKey,
                  sectionTitle: section.title,
                  subKey,
                  subTitle: subSection.title
                });
              } else if (typeof item === 'object' && item !== null && item.text && 
                        item.text.toLowerCase().includes(searchTermLower)) {
                results.push({
                  type: 'link',
                  text: item.text,
                  path: item.path,
                  external: item.external,
                  sectionKey
                });
              }
            });
          }
        }
      });
    });
    
    setSearchResults(results);
  };

  // Betöltő nézet
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-gray-200 rounded mb-8"></div>
          <div className="h-64 w-full max-w-3xl bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 relative">
          {t.title}
          <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-blue-500 rounded"></span>
        </h1>
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>
      
      <SearchBar onSearch={handleSearch} />
      
      {/* Keresési eredmények megjelenítése */}
      {searchResults && (
        <div className="mb-8">
          <Card className="border-l-4 border-amber-500">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">
                {searchResults.length === 0 
                  ? "Nincs találat" 
                  : `Találatok (${searchResults.length})`}
              </h2>
              
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                      {result.type === 'section' && (
                        <div className="flex items-center">
                          <span className="text-blue-500 mr-2">{icons[result.key]}</span>
                          <h3 className="font-medium">{result.title}</h3>
                        </div>
                      )}
                      
                      {result.type === 'subsection' && (
                        <div>
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">{icons[result.subKey]}</span>
                            <h3 className="font-medium">{result.title}</h3>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">{result.sectionTitle}</span> szekcióban
                          </p>
                        </div>
                      )}
                      
                      {result.type === 'item' && (
                        <div>
                          <p className="text-gray-700">{result.content}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">{result.sectionTitle} &gt; {result.subTitle}</span>
                          </p>
                        </div>
                      )}
                      
                      {result.type === 'link' && (
                        <div>
                          {result.external ? (
                            <a 
                              href={result.path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              {result.text}
                              <ExternalLink size={14} className="ml-1" />
                            </a>
                          ) : (
                            <Link 
                              to={result.path}
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              {result.text}
                              <ChevronRight size={14} className="ml-1" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="space-y-6" style={{ animationDelay: '100ms' }}>
        <Section title={t.welcome.title} icon={icons.welcome}>
          <div className="p-2 border-l-2 border-blue-100 pl-4 mb-4">
            <p className="text-gray-600 mb-4 leading-relaxed">{t.welcome.description}</p>
            <p className="text-gray-600 leading-relaxed">{t.welcome.purpose}</p>
          </div>
        </Section>

        <Section title={t.system.title} icon={icons.system}>
          <div className="grid md:grid-cols-2 gap-6">
            <SubSection
              title={t.system.auth.title}
              items={t.system.auth.items}
              renderContent={List}
              icon={icons.auth}
            />
            <SubSection
              title={t.system.notifications.title}
              items={t.system.notifications.items}
              renderContent={List}
              icon={icons.notifications}
            />
          </div>
        </Section>

        <Section title={t.projectManagement.title} icon={icons.projectManagement}>
          <div className="space-y-6">
            <SubSection
              title={t.projectManagement.projectHandling.title}
              description={t.projectManagement.projectHandling.description}
              items={t.projectManagement.projectHandling.items}
              renderContent={List}
              icon={icons.projectHandling}
            />
            <SubSection
              title={t.projectManagement.documentManagement.title}
              description={t.projectManagement.documentManagement.description}
              items={t.projectManagement.documentManagement.items}
              renderContent={List}
              icon={icons.documentManagement}
            />
          </div>
        </Section>

        <Section title={t.financial.title} icon={icons.financial}>
          <div className="space-y-6">
            <SubSection
              title={t.financial.accounting.title}
              description={t.financial.accounting.description}
              items={t.financial.accounting.items}
              renderContent={List}
              icon={icons.accounting}
            />
            <SubSection
              title={t.financial.licensing.title}
              description={t.financial.licensing.description}
              items={t.financial.licensing.items}
              renderContent={List}
              icon={icons.licensing}
            />
          </div>
        </Section>

        <Section title={t.infrastructure.title} icon={icons.infrastructure}>
          <div className="space-y-6">
            <SubSection
              title={t.infrastructure.domainHosting.title}
              description={t.infrastructure.domainHosting.description}
              items={t.infrastructure.domainHosting.items}
              renderContent={List}
              icon={icons.domainHosting}
            />
            <SubSection
              title={t.infrastructure.monitoring.title}
              description={t.infrastructure.monitoring.description}
              items={t.infrastructure.monitoring.items}
              renderContent={List}
              icon={icons.monitoring}
            />
          </div>
        </Section>

        <Section title={t.communication.title} icon={icons.communication}>
          <div className="space-y-6">
            <SubSection
              title={t.communication.aiChat.title}
              description={t.communication.aiChat.description}
              items={t.communication.aiChat.items}
              renderContent={List}
              icon={icons.aiChat}
            />
            <SubSection
              title={t.communication.support.title}
              description={t.communication.support.description}
              items={t.communication.support.items}
              renderContent={List}
              icon={icons.support}
            />
            <SubSection
              title={t.communication.email.title}
              description={t.communication.email.description}
              items={t.communication.email.items}
              renderContent={List}
              icon={icons.email}
            />
          </div>
        </Section>

        <Section title={t.other.title} icon={icons.other}>
          <div className="space-y-6">
            <SubSection
              title={t.other.blog.title}
              description={t.other.blog.description}
              items={t.other.blog.items}
              renderContent={List}
              icon={icons.blog}
            />
            <SubSection
              title={t.other.translation.title}
              description={t.other.translation.description}
              items={t.other.translation.items}
              renderContent={List}
              icon={icons.translation}
            />
            <SubSection
              title={t.other.contacts.title}
              description={t.other.contacts.description}
              items={t.other.contacts.items}
              renderContent={List}
              icon={icons.contacts}
            />
          </div>
        </Section>

        <Section title={t.support.title} icon={icons.support}>
          <div className="grid md:grid-cols-2 gap-6">
            <SubSection
              title={t.support.help.title}
              description={t.support.help.description}
              items={t.support.help.items}
              renderContent={List}
              icon={icons.help}
            />
            <SubSection
              title={t.support.contact.title}
              description={t.support.contact.description}
              items={t.support.contact.items}
              renderContent={List}
              icon={icons.contact}
            />
          </div>
        </Section>

        <Section title={t.links.title} icon={icons.links}>
          <Links items={t.links.items} />
        </Section>
      </div>
      
      <div className="mt-12 text-center text-gray-500 text-sm opacity-0 animate-fadeIn" style={{ animationDelay: '800ms' }}>
        <p>© {new Date().getFullYear()} NB Studio - <a href="https://www.nb-studio.net" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">www.nb-studio.net</a></p>
      </div>
    </div>
  );
};

export default Help;