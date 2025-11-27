// Firefox Browser API Helper
// Firefox has native browser.* support
// Type definitions provided by @types/firefox-webext-browser

// Helper to check if we're running in Firefox
export const isFirefox = (): boolean => {
  return navigator.userAgent.toLowerCase().includes('firefox');
};

// Helper to check extension context
export const getExtensionContext = (): 'background' | 'content' | 'popup' | 'unknown' => {
  if (typeof window === 'undefined') {
    return 'background';
  }

  if (window.location.protocol === 'moz-extension:') {
    // Check if it's the popup
    if (window.location.pathname.includes('popup.html')) {
      return 'popup';
    }
    return 'background';
  }

  if (window.location.protocol.startsWith('http')) {
    return 'content';
  }

  return 'unknown';
};

// Note: browser is globally available in Firefox via @types/firefox-webext-browser
// No need to re-export it - use the global browser object directly