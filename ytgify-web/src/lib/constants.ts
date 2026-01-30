export const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje';
export const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/';
export const DEMO_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/hBBr8SluoQ8';

export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xnjqpkbv';

export const MOBILE_REMINDER = {
  title: 'Install YTgify on Desktop',
  text: 'Reminder: Install YTgify - the free YouTube to GIF converter. No watermark, works inside YouTube.',
  url: 'https://ytgify.com',
};

export const MOBILE_REMINDER_EMAIL = {
  subject: encodeURIComponent('Reminder: Install YTgify on Desktop'),
  body: encodeURIComponent(
    `Hey future me!\n\n` +
    `Remember to install YTgify - the free YouTube to GIF converter.\n\n` +
    `Website: https://ytgify.com\n` +
    `Chrome: ${CHROME_EXTENSION_URL}\n` +
    `Firefox: ${FIREFOX_ADDON_URL}\n\n` +
    `Features:\n` +
    `- No watermark\n` +
    `- Works right inside YouTube\n` +
    `- Custom text overlays\n` +
    `- Takes 30 seconds to create your first GIF`
  ),
};

export const SITE_URL = 'https://ytgify.com';
export const SITE_NAME = 'YTgify';
export const SITE_TITLE = 'YTgify - Free YouTube to GIF Converter | No Watermark';
export const SITE_DESCRIPTION = 'Free YouTube to GIF converter Chrome extension. Create animated GIFs from any YouTube video in seconds - no watermark, no uploads. Convert video to GIF with custom text, FPS control, and multiple resolutions. Perfect for memes and social sharing.';

export const GITHUB_URL = 'https://github.com/neonwatty';
export const TWITTER_URL = 'https://x.com/neonwatty';
