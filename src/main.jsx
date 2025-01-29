import React from 'react';
import ReactDOM from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import Login from './components/Login';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IntlProvider messages={{}} locale="hu">
      <Login />
    </IntlProvider>
  </React.StrictMode>
);