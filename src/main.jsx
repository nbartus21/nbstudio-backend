import React from 'react';
import ReactDOM from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import BlogAdmin from './components/BlogAdmin';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IntlProvider messages={{}} locale="en">
      <BlogAdmin />
    </IntlProvider>
  </React.StrictMode>
);
