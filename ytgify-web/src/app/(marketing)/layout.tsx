import Link from 'next/link'
import {
  CHROME_EXTENSION_URL,
  FIREFOX_ADDON_URL,
  GITHUB_URL,
  TWITTER_URL
} from '@/lib/constants'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {children}

      {/* Footer */}
      <footer className="max-w-[800px] mx-auto px-6 sm:px-12 py-16 border-t border-[#2a2a2a]">
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm text-[#a0a0a0]">
            &copy; {new Date().getFullYear()} YTgify. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            {/* Social links */}
            <div className="flex gap-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </a>
              <a
                href={TWITTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="X (Twitter)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l16 16m0-16L4 20" />
                </svg>
              </a>
              <Link
                href="/blog"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="Blog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </Link>
            </div>
            <Link href="/blog" className="text-[#a0a0a0] hover:text-white transition-colors">
              Blog
            </Link>
            <a
              href={CHROME_EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a0a0a0] hover:text-white transition-colors"
            >
              Install Chrome Extension
            </a>
            <a
              href={FIREFOX_ADDON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a0a0a0] hover:text-white transition-colors"
            >
              Install Firefox Add-on
            </a>
            <Link href="/privacy" className="text-[#a0a0a0] hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[#a0a0a0] hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
