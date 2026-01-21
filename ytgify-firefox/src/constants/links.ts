// External Links Constants

export const LINKS = {
  // Firefox Add-ons
  ADDON_LISTING: 'https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/',
  ADDON_REVIEWS: 'https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/reviews/',

  // GitHub
  GITHUB_REPO: 'https://github.com/neonwatty/ytgify',
  GITHUB_STARS: 'https://github.com/neonwatty/ytgify/stargazers',
  GITHUB_ISSUES: 'https://github.com/neonwatty/ytgify/issues',

  // Social
  TWITTER_PROFILE: 'https://x.com/neonwatty',
  DISCORD_INVITE: 'https://discord.gg/ufrycqwb4R',

  // Documentation
  DOCS_USER_GUIDE: 'https://github.com/neonwatty/ytgify#user-guide'
} as const;

// Helper to open external link in new tab
export function openExternalLink(url: string): void {
  // Check if we're in a context that can use browser.tabs (popup/background)
  // or content script context (use window.open)
  if (typeof browser !== 'undefined' && browser.tabs) {
    browser.tabs.create({ url }).catch(() => {
      // Fallback to window.open if browser.tabs.create fails (content script context)
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Helper to get review link
export function getReviewLink(): string {
  return LINKS.ADDON_REVIEWS;
}

// Helper to get GitHub star link
export function getGitHubStarLink(): string {
  return LINKS.GITHUB_REPO;
}

// Helper to get Discord invite link
export function getDiscordLink(): string {
  return LINKS.DISCORD_INVITE;
}

// Helper to get waitlist link with UTM tracking
export function getWaitlistLink(): string {
  return 'https://ytgify.com/share?utm_source=extension&utm_medium=success_screen&utm_campaign=waitlist';
}
