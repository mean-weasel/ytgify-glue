/**
 * Chrome Extension OAuth Helper
 *
 * Uses chrome.identity.launchWebAuthFlow for Google OAuth
 * because @react-oauth/google cannot work in extension popups
 * (CSP blocks external Google scripts)
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

/**
 * Perform Google OAuth using chrome.identity.launchWebAuthFlow
 * Returns the Google ID token for backend authentication
 */
export async function performGoogleOAuth(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('Google Client ID not configured');
  }

  // Get the redirect URL for the extension
  const redirectUrl = chrome.identity.getRedirectURL();

  console.log('[ChromeOAuth] Starting OAuth flow');
  console.log('[ChromeOAuth] Redirect URL:', redirectUrl);

  // Build the OAuth URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUrl,
    response_type: 'token id_token',
    scope: 'openid email profile',
    nonce: generateNonce(),
    prompt: 'select_account',
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${authParams.toString()}`;

  try {
    // Launch the OAuth flow in a popup
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        (callbackUrl) => {
          if (chrome.runtime.lastError) {
            console.error('[ChromeOAuth] Auth flow error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message || 'OAuth flow failed'));
            return;
          }

          if (!callbackUrl) {
            reject(new Error('No callback URL received'));
            return;
          }

          resolve(callbackUrl);
        }
      );
    });

    console.log('[ChromeOAuth] Got response URL');

    // Parse the response URL to extract tokens
    // The tokens are in the URL fragment (after #)
    const hashParams = new URLSearchParams(responseUrl.split('#')[1] || '');
    const idToken = hashParams.get('id_token');
    const oauthError = hashParams.get('error');

    if (oauthError) {
      throw new Error(`OAuth error: ${oauthError}`);
    }

    if (!idToken) {
      // If no id_token, check for auth code (alternative flow)
      console.error('[ChromeOAuth] No ID token in response');
      throw new Error('No ID token received from Google');
    }

    console.log('[ChromeOAuth] Successfully obtained ID token');

    return idToken;
  } catch (error) {
    console.error('[ChromeOAuth] OAuth failed:', error);
    throw error;
  }
}

/**
 * Generate a random nonce for OAuth security
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
