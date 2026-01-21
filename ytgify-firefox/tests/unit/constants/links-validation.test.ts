import { describe, it, expect, jest } from '@jest/globals';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { LINKS } from '@/constants/links';
import { EXTERNAL_SURVEY_URL } from '@/constants/features';

// Skip link validation tests when SKIP_LINK_VALIDATION env var is set
// Useful for CI environments where network access may be restricted
const describeOrSkip = process.env.SKIP_LINK_VALIDATION
  ? describe.skip
  : describe;

/**
 * Check if a URL is reachable using Node's native https module
 * Returns the final status code after following redirects (up to 5)
 */
function checkUrl(url: string, maxRedirects = 5): Promise<number> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string, redirectCount: number) => {
      const req = https.get(
        currentUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; YTgify-LinkChecker/1.0; +https://github.com/neonwatty/ytgify)',
          },
        },
        (res) => {
          // Consume the response to prevent open handles
          res.resume();

          // Follow redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            if (redirectCount >= maxRedirects) {
              resolve(res.statusCode);
              return;
            }
            // Handle relative redirects
            const redirectUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, currentUrl).toString();
            makeRequest(redirectUrl, redirectCount + 1);
            return;
          }
          resolve(res.statusCode || 0);
        }
      );
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    };
    makeRequest(url, 0);
  });
}

describeOrSkip('External Links Validation', () => {
  // 60 second timeout for network requests (Google Forms can be slow)
  jest.setTimeout(60000);

  it.each([
    ['ADDON_LISTING', LINKS.ADDON_LISTING],
    ['ADDON_REVIEWS', LINKS.ADDON_REVIEWS],
    ['GITHUB_REPO', LINKS.GITHUB_REPO],
    ['GITHUB_STARS', LINKS.GITHUB_STARS],
    ['GITHUB_ISSUES', LINKS.GITHUB_ISSUES],
    ['TWITTER_PROFILE', LINKS.TWITTER_PROFILE],
    ['DISCORD_INVITE', LINKS.DISCORD_INVITE],
    ['DOCS_USER_GUIDE', LINKS.DOCS_USER_GUIDE],
    ['EXTERNAL_SURVEY_URL', EXTERNAL_SURVEY_URL],
  ])('%s is reachable', async (_name, url) => {
    const statusCode = await checkUrl(url);
    // Accept 2xx and 3xx status codes
    expect(statusCode).toBeGreaterThanOrEqual(200);
    expect(statusCode).toBeLessThan(400);
  });
});

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      getSourceFiles(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('No Hardcoded External URLs', () => {
  // Patterns for external URLs that should use LINKS constants
  const externalUrlPatterns = [
    /['"`]https?:\/\/discord\.gg\/[^'"`]+['"`]/g,
    /['"`]https?:\/\/addons\.mozilla\.org\/[^'"`]+['"`]/g,
  ];

  // Files that are allowed to have hardcoded URLs (the constants file itself)
  const allowedFiles = [
    'src/constants/links.ts',
    'src/constants/features.ts',
  ];

  it('should not have hardcoded Discord or Mozilla Add-ons URLs outside of constants', () => {
    const srcDir = path.resolve(__dirname, '../../../src');
    const sourceFiles = getSourceFiles(srcDir);
    const violations: { file: string; line: number; url: string }[] = [];

    for (const filePath of sourceFiles) {
      const relativePath = path.relative(path.resolve(__dirname, '../../..'), filePath);

      // Skip allowed files
      if (allowedFiles.some(allowed => relativePath.replace(/\\/g, '/').endsWith(allowed))) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const pattern of externalUrlPatterns) {
          const matches = lines[i].match(pattern);
          if (matches) {
            for (const match of matches) {
              violations.push({
                file: relativePath,
                line: i + 1,
                url: match,
              });
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      const message = violations
        .map(v => `  ${v.file}:${v.line} - ${v.url}`)
        .join('\n');
      throw new Error(
        `Found hardcoded external URLs. Use LINKS constants instead:\n${message}`
      );
    }
  });
});
