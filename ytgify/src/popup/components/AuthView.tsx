/**
 * AuthView Component
 *
 * Login form for unauthenticated users
 * Phase 1: JWT Authentication
 * Phase 2: Google OAuth
 */

import React, { useState, useEffect } from 'react';
import { apiClient, APIError, AuthError } from '@/lib/api/api-client';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes from background
  useEffect(() => {
    const handleMessage = (message: { type: string; authenticated?: boolean }) => {
      if (message.type === 'AUTH_STATE_CHANGED' && message.authenticated) {
        setGoogleLoading(false);
        onLoginSuccess();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.login(email, password);

      // Login successful, notify parent
      onLoginSuccess();
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof AuthError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
      console.error('[AuthView] Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    // Open web app for full signup flow
    const signupUrl =
      process.env.API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    chrome.tabs.create({
      url: `${signupUrl}/users/sign_up?source=extension`,
    });
  };

  const handleForgotPassword = () => {
    const baseUrl =
      process.env.API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    chrome.tabs.create({
      url: `${baseUrl}/users/password/new`,
    });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Open web app's Google OAuth in a new tab
      const baseUrl = process.env.API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
      const extensionId = chrome.runtime.id;
      const oauthUrl = `${baseUrl}/users/auth/google_oauth2?source=extension&extension_id=${extensionId}`;

      chrome.tabs.create({ url: oauthUrl });

      // Start polling for auth state changes
      const pollInterval = setInterval(async () => {
        try {
          const response = await new Promise<{ authenticated: boolean }>((resolve) => {
            chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (result) => {
              resolve(result || { authenticated: false });
            });
          });

          if (response.authenticated) {
            clearInterval(pollInterval);
            setGoogleLoading(false);
            onLoginSuccess();
          }
        } catch (_) {
          // Ignore polling errors
        }
      }, 1000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (googleLoading) {
          setGoogleLoading(false);
          setError('Sign-in timed out. Please try again.');
        }
      }, 120000);

    } catch (err) {
      setGoogleLoading(false);
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof AuthError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google login failed. Please try again.');
      }
      console.error('[AuthView] Google login failed:', err);
    }
  };

  return (
    <div className="auth-view" data-testid="auth-view" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Sign In to YTGify
        </h2>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
          Upload your GIFs to the cloud and access social features
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} data-testid="login-form" style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
            }}
          >
            Email
          </label>
          <input
            id="email"
            data-testid="email-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
            }}
          >
            Password
          </label>
          <input
            id="password"
            data-testid="password-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            data-testid="error-message"
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          data-testid="login-submit-btn"
          disabled={loading || googleLoading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            backgroundColor: loading || googleLoading ? '#999' : '#6366f1',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? 'Signing in...' : googleLoading ? 'Google sign-in...' : 'Sign In'}
        </button>
      </form>

      {/* Forgot Password */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          onClick={handleForgotPassword}
          data-testid="forgot-password-link"
          disabled={loading || googleLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Forgot password?
        </button>
      </div>

      {/* Google Sign-In - only show if client ID is configured */}
      {process.env.GOOGLE_CLIENT_ID && (
        <>
          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: '#999',
              fontSize: '14px',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
            <span style={{ padding: '0 12px' }}>or continue with</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
          </div>

          {/* Google Sign-In Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
            data-testid="google-login-container"
          >
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              data-testid="google-login-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '280px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#444',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
                opacity: loading || googleLoading ? 0.6 : 1,
                transition: 'background-color 0.2s, border-color 0.2s',
              }}
            >
              {/* Google Logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>
        </>
      )}

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          color: '#999',
          fontSize: '14px',
        }}
      >
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
        <span style={{ padding: '0 12px' }}>{process.env.GOOGLE_CLIENT_ID ? 'or' : 'new user?'}</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
      </div>

      {/* Sign Up Prompt */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          Don&apos;t have an account?
        </p>
        <button
          onClick={handleSignupClick}
          data-testid="create-account-btn"
          disabled={loading || googleLoading}
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#6366f1',
            backgroundColor: '#fff',
            border: '1px solid #6366f1',
            borderRadius: '6px',
            cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Create Account
        </button>
      </div>

      {/* Benefits */}
      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          With a YTGify account:
        </p>
        <ul style={{ fontSize: '13px', color: '#6b7280', listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              ✓
            </span>
            Upload GIFs to the cloud
          </li>
          <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              ✓
            </span>
            Share GIFs with the community
          </li>
          <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              ✓
            </span>
            Like and comment on GIFs
          </li>
          <li style={{ paddingLeft: '20px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              ✓
            </span>
            Follow other creators
          </li>
        </ul>
      </div>
    </div>
  );
};
