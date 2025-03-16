import React, { useState } from 'react';
import { Card } from './Card';
import { Link } from 'react-router-dom';
import { helpTranslations } from '../locales/help';

const LanguageSelector = ({ language, setLanguage }) => (
  <div className="flex space-x-2">
    <button
      onClick={() => setLanguage('hu')}
      className={`px-3 py-1 rounded transition-colors duration-200 ${
        language === 'hu' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      HU
    </button>
    <button
      onClick={() => setLanguage('en')}
      className={`px-3 py-1 rounded transition-colors duration-200 ${
        language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      EN
    </button>
    <button
      onClick={() => setLanguage('de')}
      className={`px-3 py-1 rounded transition-colors duration-200 ${
        language === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      DE
    </button>
  </div>
);

const Section = ({ title, children }) => (
  <Card>
    <h2 className="text-2xl font-semibold mb-4">{title}</h2>
    {children}
  </Card>
);

const SubSection = ({ title, description, items, renderContent }) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">{title}</h3>
    {description && <p className="text-gray-600">{description}</p>}
    {items && renderContent && renderContent(items)}
  </div>
);

const List = ({ items }) => (
  <ul className="list-disc list-inside space-y-2 text-gray-600">
    {Array.isArray(items) && items.map((item, index) => (
      <li key={index}>{item}</li>
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
          className="text-blue-500 hover:underline transition-colors duration-200"
        >
          {item.text} →
        </a>
      ) : (
        <Link
          key={index}
          to={item.path}
          className="text-blue-500 hover:underline transition-colors duration-200"
        >
          {item.text} →
        </Link>
      )
    ))}
  </div>
);

const Help = () => {
  const [language, setLanguage] = useState('hu');
  const t = helpTranslations[language];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>
      
      <div className="space-y-6">
        <Section title={t.welcome.title}>
          <p className="text-gray-600 mb-4">{t.welcome.description}</p>
          <p className="text-gray-600">{t.welcome.purpose}</p>
        </Section>

        <Section title={t.system.title}>
          <div className="grid md:grid-cols-2 gap-6">
            <SubSection
              title={t.system.auth.title}
              items={t.system.auth.items}
              renderContent={List}
            />
            <SubSection
              title={t.system.notifications.title}
              items={t.system.notifications.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.projectManagement.title}>
          <div className="space-y-6">
            <SubSection
              title={t.projectManagement.projectHandling.title}
              description={t.projectManagement.projectHandling.description}
              items={t.projectManagement.projectHandling.items}
              renderContent={List}
            />
            <SubSection
              title={t.projectManagement.documentManagement.title}
              description={t.projectManagement.documentManagement.description}
              items={t.projectManagement.documentManagement.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.financial.title}>
          <div className="space-y-6">
            <SubSection
              title={t.financial.accounting.title}
              description={t.financial.accounting.description}
              items={t.financial.accounting.items}
              renderContent={List}
            />
            <SubSection
              title={t.financial.licensing.title}
              description={t.financial.licensing.description}
              items={t.financial.licensing.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.infrastructure.title}>
          <div className="space-y-6">
            <SubSection
              title={t.infrastructure.domainHosting.title}
              description={t.infrastructure.domainHosting.description}
              items={t.infrastructure.domainHosting.items}
              renderContent={List}
            />
            <SubSection
              title={t.infrastructure.monitoring.title}
              description={t.infrastructure.monitoring.description}
              items={t.infrastructure.monitoring.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.communication.title}>
          <div className="space-y-6">
            <SubSection
              title={t.communication.aiChat.title}
              description={t.communication.aiChat.description}
              items={t.communication.aiChat.items}
              renderContent={List}
            />
            <SubSection
              title={t.communication.support.title}
              description={t.communication.support.description}
              items={t.communication.support.items}
              renderContent={List}
            />
            <SubSection
              title={t.communication.email.title}
              description={t.communication.email.description}
              items={t.communication.email.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.other.title}>
          <div className="space-y-6">
            <SubSection
              title={t.other.blog.title}
              description={t.other.blog.description}
              items={t.other.blog.items}
              renderContent={List}
            />
            <SubSection
              title={t.other.translation.title}
              description={t.other.translation.description}
              items={t.other.translation.items}
              renderContent={List}
            />
            <SubSection
              title={t.other.contacts.title}
              description={t.other.contacts.description}
              items={t.other.contacts.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.support.title}>
          <div className="grid md:grid-cols-2 gap-6">
            <SubSection
              title={t.support.help.title}
              description={t.support.help.description}
              items={t.support.help.items}
              renderContent={List}
            />
            <SubSection
              title={t.support.contact.title}
              description={t.support.contact.description}
              items={t.support.contact.items}
              renderContent={List}
            />
          </div>
        </Section>

        <Section title={t.links.title}>
          <Links items={t.links.items} />
        </Section>
      </div>
    </div>
  );
};

export default Help; 