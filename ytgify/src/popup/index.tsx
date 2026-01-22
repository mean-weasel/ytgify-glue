import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles.css';
import './styles-modern.css';
import { PopupWithAuth } from './components/PopupWithAuth';

// Google Client ID from environment variable
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PopupWithAuth />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
