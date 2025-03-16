import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Link } from 'react-router-dom';
import { helpTranslations } from '../locales/help';

// Animált megjelenés komponens
const FadeIn = ({ children, delay = 0 }) => {
  return (
    <div 
      className="animate-fadeIn" 
      style={{ 
        animationDelay: `${delay}ms`,
        opacity: 0,
        animation: 'fadeIn 0.5s ease forwards',
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

const LanguageSelector = ({ language, setLanguage }) => (
  <div className="flex space-x-2 bg-white shadow-sm rounded-full p-1">
    <button
      onClick={() => setLanguage('hu')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'hu' 
          ? 'bg-blue-500 text-white shadow-md transform scale-105' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      HU
    </button>
    <button
      onClick={() => setLanguage('en')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'en' 
          ? 'bg-blue-500 text-white shadow-md transform scale-105' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      EN
    </button>
    <button
      onClick={() => setLanguage('de')}
      className={`px-4 py-2 rounded-full transition-all duration-300 ${
        language === 'de' 
          ? 'bg-blue-500 text-white shadow-md transform scale-105' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      DE
    </button>
  </div>
);

const Section = ({ title, children, icon, delay = 0 }) => (
  <FadeIn delay={delay}>
    <Card className="border-l-4 border-blue-500 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center mb-4">
        {icon && <span className="text-blue-500 mr-3 text-xl">{icon}</span>}
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </Card>
  </FadeIn>
);

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
          <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
        </a>
      ) : (
        <Link
          key={index}
          to={item.path}
          className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
        >
          <span className="flex-grow">{item.text}</span>
          <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
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

const Help = () => {
  const [language, setLanguage] = useState('hu');
  const [isLoading, setIsLoading] = useState(true);
  const t = helpTranslations[language];

  useEffect(() => {
    // Szimuláljuk a betöltést
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [language]);

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
        <FadeIn>
          <h1 className="text-3xl font-bold text-gray-800 relative">
            {t.title}
            <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-blue-500 rounded"></span>
          </h1>
        </FadeIn>
        <FadeIn delay={200}>
          <LanguageSelector language={language} setLanguage={setLanguage} />
        </FadeIn>
      </div>
      
      <div className="space-y-6">
        <Section title={t.welcome.title} icon={icons.welcome} delay={300}>
          <div className="p-2 border-l-2 border-blue-100 pl-4 mb-4">
            <p className="text-gray-600 mb-4 leading-relaxed">{t.welcome.description}</p>
            <p className="text-gray-600 leading-relaxed">{t.welcome.purpose}</p>
          </div>
        </Section>

        <Section title={t.system.title} icon={icons.system} delay={400}>
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

        <Section title={t.projectManagement.title} icon={icons.projectManagement} delay={500}>
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

        <Section title={t.financial.title} icon={icons.financial} delay={600}>
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

        <Section title={t.infrastructure.title} icon={icons.infrastructure} delay={700}>
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

        <Section title={t.communication.title} icon={icons.communication} delay={800}>
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

        <Section title={t.other.title} icon={icons.other} delay={900}>
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

        <Section title={t.support.title} icon={icons.support} delay={1000}>
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

        <Section title={t.links.title} icon={icons.links} delay={1100}>
          <Links items={t.links.items} />
        </Section>
      </div>
      
      <FadeIn delay={1200}>
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} NB Studio - www.nb-studio.net</p>
        </div>
      </FadeIn>
    </div>
  );
};

export default Help; 