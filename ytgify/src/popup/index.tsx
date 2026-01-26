import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './styles-modern.css';
import { PopupWithAuth } from './components/PopupWithAuth';

// Debug: log Google OAuth availability at startup
console.log('[YTGify] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'configured' : 'NOT SET');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PopupWithAuth />
  </React.StrictMode>
);
