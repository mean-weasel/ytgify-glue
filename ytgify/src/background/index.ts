// Minimal background script with Google OAuth
console.log('[Background] Service worker starting...');

// API client for backend communication
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Initialize alarms listener (required since alarms permission is declared)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Background] Alarm triggered:', alarm.name);
  if (alarm.name === 'token-refresh') {
    // Token refresh logic could go here
    console.log('[Background] Token refresh alarm - checking token...');
  }
});

// Helper to decode JWT payload
function decodeJwtPayload(token: string): { sub: string; exp: number } {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));
  return payload;
}

async function googleLogin(idToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Decode JWT to get expiration and user ID
  const decoded = decodeJwtPayload(data.token);

  // Store in authState format that StorageAdapter expects
  const authState = {
    token: data.token,
    expiresAt: decoded.exp * 1000, // Convert to milliseconds
    userId: decoded.sub,
    userProfile: data.user,
  };

  await chrome.storage.local.set({
    authState: authState,
    userProfile: data.user, // Also store separately for legacy compatibility
  });

  console.log('[Background] Auth state saved to storage');

  return data;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type);

  if (message.type === 'PING') {
    console.log('[Background] PING received, sending PONG');
    sendResponse({ type: 'PONG', success: true });
    return false;
  }

  if (message.type === 'CHECK_AUTH') {
    (async () => {
      const result = await chrome.storage.local.get(['authState', 'userProfile']);
      const authState = result.authState;
      sendResponse({
        authenticated: !!authState?.token,
        userProfile: authState?.userProfile || result.userProfile || null,
      });
    })();
    return true;
  }

  if (message.type === 'LOGOUT') {
    (async () => {
      await chrome.storage.local.remove(['authState', 'userProfile']);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'GOOGLE_LOGIN') {
    console.log('[Background] GOOGLE_LOGIN received');
    (async () => {
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        console.log('[Background] Client ID available:', !!clientId);

        if (!clientId) {
          console.error('[Background] GOOGLE_CLIENT_ID not configured');
          sendResponse({
            success: false,
            error: 'Google Sign-In is not configured',
          });
          return;
        }

        // Use chrome.identity.launchWebAuthFlow for OAuth
        const redirectUri = chrome.identity.getRedirectURL();
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'id_token');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('nonce', Math.random().toString(36).substring(2));

        console.log('[Background] Starting Google OAuth flow...');
        console.log('[Background] Redirect URI:', redirectUri);

        const responseUrl = await new Promise<string>((resolve, reject) => {
          chrome.identity.launchWebAuthFlow(
            { url: authUrl.toString(), interactive: true },
            (callbackUrl) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (callbackUrl) {
                resolve(callbackUrl);
              } else {
                reject(new Error('No callback URL received'));
              }
            }
          );
        });

        console.log('[Background] OAuth flow completed, extracting token...');

        // Extract id_token from the callback URL
        const hashParams = new URLSearchParams(responseUrl.split('#')[1]);
        const idToken = hashParams.get('id_token');

        if (!idToken) {
          throw new Error('No ID token in response');
        }

        console.log('[Background] ID token extracted, authenticating with backend...');

        // Send token to backend
        const response = await googleLogin(idToken);

        console.log('[Background] Google login successful');
        sendResponse({ success: true, data: response });
      } catch (error) {
        console.error('[Background] Google login failed:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Google login failed',
        });
      }
    })();
    return true;
  }

  // Handle auth callback relay from content script (tab-based OAuth)
  if (message.type === 'EXTENSION_AUTH_CALLBACK_RELAY') {
    (async () => {
      try {
        const authData = message.data;
        const token = authData?.token as string;
        const user = authData?.user;

        if (!token) {
          console.error('[Background] No token in auth callback relay');
          sendResponse({ success: false, error: 'No token provided' });
          return;
        }

        // Decode token to get expiration
        const decoded = decodeJwtPayload(token);

        // Save auth state
        const authState = {
          token: token,
          expiresAt: decoded.exp * 1000,
          userId: decoded.sub,
          userProfile: user || null,
        };

        await chrome.storage.local.set({
          authState: authState,
          userProfile: user || null,
        });

        console.log('[Background] Auth state saved from callback relay');

        // Notify other parts of the extension
        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true }).catch(() => {});

        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Auth callback relay failed:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Auth failed' });
      }
    })();
    return true;
  }

  // Default: don't handle
  return false;
});

console.log('[Background] Service worker ready');
