import React, { useState } from 'react';
import { Card } from './Card';
import { Link } from 'react-router-dom';
import { helpTranslations } from '../locales/help';

const Help = () => {
  const [language, setLanguage] = useState('hu');
  const t = helpTranslations[language];

  const renderList = (items) => (
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

  const renderLinks = (items) => (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((item, index) => (
        item.external ? (
          <a
            key={index}
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {item.text} →
          </a>
        ) : (
          <Link
            key={index}
            to={item.path}
            className="text-blue-500 hover:underline"
          >
            {item.text} →
          </Link>
        )
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setLanguage('hu')}
            className={`px-3 py-1 rounded ${language === 'hu' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            HU
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded ${language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('de')}
            className={`px-3 py-1 rounded ${language === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            DE
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.welcome.title}</h2>
          <p className="text-gray-600 mb-4">{t.welcome.description}</p>
          <p className="text-gray-600">{t.welcome.purpose}</p>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.system.title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.system.auth.title}</h3>
              {renderList(t.system.auth.items)}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.system.notifications.title}</h3>
              {renderList(t.system.notifications.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.projectManagement.title}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.projectManagement.projectHandling.title}</h3>
              <p className="text-gray-600 mb-4">{t.projectManagement.projectHandling.description}</p>
              {renderList(t.projectManagement.projectHandling.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.projectManagement.documentManagement.title}</h3>
              <p className="text-gray-600 mb-4">{t.projectManagement.documentManagement.description}</p>
              {renderList(t.projectManagement.documentManagement.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.financial.title}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.financial.accounting.title}</h3>
              <p className="text-gray-600 mb-4">{t.financial.accounting.description}</p>
              {renderList(t.financial.accounting.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.financial.licensing.title}</h3>
              <p className="text-gray-600 mb-4">{t.financial.licensing.description}</p>
              {renderList(t.financial.licensing.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.infrastructure.title}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.infrastructure.domainHosting.title}</h3>
              <p className="text-gray-600 mb-4">{t.infrastructure.domainHosting.description}</p>
              {renderList(t.infrastructure.domainHosting.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.infrastructure.monitoring.title}</h3>
              <p className="text-gray-600 mb-4">{t.infrastructure.monitoring.description}</p>
              {renderList(t.infrastructure.monitoring.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.communication.title}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.communication.aiChat.title}</h3>
              <p className="text-gray-600 mb-4">{t.communication.aiChat.description}</p>
              {renderList(t.communication.aiChat.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.communication.support.title}</h3>
              <p className="text-gray-600 mb-4">{t.communication.support.description}</p>
              {renderList(t.communication.support.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.communication.email.title}</h3>
              <p className="text-gray-600 mb-4">{t.communication.email.description}</p>
              {renderList(t.communication.email.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.other.title}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.other.blog.title}</h3>
              <p className="text-gray-600 mb-4">{t.other.blog.description}</p>
              {renderList(t.other.blog.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.other.translation.title}</h3>
              <p className="text-gray-600 mb-4">{t.other.translation.description}</p>
              {renderList(t.other.translation.items)}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">{t.other.contacts.title}</h3>
              <p className="text-gray-600 mb-4">{t.other.contacts.description}</p>
              {renderList(t.other.contacts.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.support.title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.support.help.title}</h3>
              <p className="text-gray-600 mb-4">{t.support.help.description}</p>
              {renderList(t.support.help.items)}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">{t.support.contact.title}</h3>
              <p className="text-gray-600 mb-4">{t.support.contact.description}</p>
              {renderList(t.support.contact.items)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">{t.links.title}</h2>
          {renderLinks(t.links.items)}
        </Card>
      </div>
    </div>
  );
};

export default Help; 