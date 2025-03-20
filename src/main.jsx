import React from 'react';
import ReactDOM from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { BrowserRouter } from 'react-router-dom';
import App from './components/App';
import './index.css';
import { wikiTranslations } from './locales/wiki';

// Merge all translation files
const getTranslations = (locale) => {
  return {
    ...wikiTranslations[locale] || {}
    // Add other translation imports as needed
  };
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <IntlProvider 
        messages={getTranslations('hu')} 
        locale="hu"
        defaultLocale="hu"
      >
        <App />
      </IntlProvider>
    </BrowserRouter>
  </React.StrictMode>
);