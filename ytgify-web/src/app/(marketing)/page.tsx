'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

// Extension URLs
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje'
const CHROME_REVIEWS_URL = 'https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje/reviews'
const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/'
const DEMO_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/hBBr8SluoQ8'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xnjqpkbv'

// Example GIF URLs
const EXAMPLE_GIFS = [
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/free-gratis.gif',
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/boom-baby.gif',
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/witness-me.gif',
]

function Logo() {
  return (
    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl flex items-center justify-center">
      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 18.5V5.5C5 4.67 5.67 4 6.5 4H17.5C18.33 4 19 4.67 19 5.5V18.5C19 19.33 18.33 20 17.5 20H6.5C5.67 20 5 19.33 5 18.5ZM10 15L15 12L10 9V15Z"/>
      </svg>
    </div>
  )
}

function ChromeStoreBadge() {
  return (
    <a
      href={CHROME_EXTENSION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
    >
      <svg className="w-6 h-6" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="#fff"/>
        <path fill="#4285F4" d="M24 12c6.627 0 12 5.373 12 12h-6c0-3.314-2.686-6-6-6s-6 2.686-6 6H6c0-6.627 5.373-12 12-12z"/>
        <path fill="#34A853" d="M24 36c-6.627 0-12-5.373-12-12h6c0 3.314 2.686 6 6 6s6-2.686 6-6h12c0 6.627-5.373 12-12 12z"/>
        <path fill="#FBBC05" d="M12 24c0-3.314 2.686-6 6-6V6C11.373 6 6 11.373 6 18v12h6z"/>
        <path fill="#EA4335" d="M36 24c0 3.314-2.686 6-6 6v12c6.627 0 12-5.373 12-12V18h-6z"/>
        <circle cx="24" cy="24" r="8" fill="#fff"/>
        <circle cx="24" cy="24" r="4" fill="#4285F4"/>
      </svg>
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">Available in the</div>
        <div className="text-sm font-semibold text-gray-900">Chrome Web Store</div>
      </div>
    </a>
  )
}

function FirefoxStoreBadge() {
  return (
    <a
      href={FIREFOX_ADDON_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-5 py-3 bg-[#20123A] rounded-xl hover:bg-[#2a1a4a] transition-colors shadow-lg"
    >
      <svg className="w-6 h-6" viewBox="0 0 77.42 79.97">
        <defs>
          <linearGradient id="firefox-a" x1="70.79" y1="12.39" x2="6.28" y2="74.47" gradientUnits="userSpaceOnUse">
            <stop offset="0.05" stopColor="#fff44f"/>
            <stop offset=".37" stopColor="#ff980e"/>
            <stop offset=".53" stopColor="#ff3647"/>
            <stop offset=".7" stopColor="#e31587"/>
          </linearGradient>
          <radialGradient id="firefox-b" cx="27.78" cy="52.27" r="45.15" gradientUnits="userSpaceOnUse">
            <stop offset="0.13" stopColor="#ffbd4f"/>
            <stop offset=".28" stopColor="#ff980e"/>
            <stop offset=".47" stopColor="#ff3750"/>
            <stop offset=".78" stopColor="#eb0878"/>
            <stop offset=".86" stopColor="#e50587"/>
          </radialGradient>
        </defs>
        <path fill="url(#firefox-a)" d="M74.62,26.83c-1.69-4.12-5.13-8.31-7.75-9.69a39.17,39.17,0,0,1,3.44,11.16l0,.07c-4-9.93-10.91-13.93-16.64-22.63-.29-.44-.58-.89-.86-1.37a7.09,7.09,0,0,1-.29-.57,4.23,4.23,0,0,1-.33-.85.06.06,0,0,0-.06,0,.09.09,0,0,0,0,.06h0c-9.55,5.59-12.79,15.94-13.09,21.14a18.41,18.41,0,0,0-10.11,4A10.63,10.63,0,0,0,28,28a18.74,18.74,0,0,0-9.07,12.89,26.69,26.69,0,0,1,7-2,20.39,20.39,0,0,0-7,4.42A16.6,16.6,0,0,0,8.77,44.72v0l0,.05c-.11.2,0,.39-.06.59A25.54,25.54,0,0,0,6.92,55c0,.22,0,.44,0,.66a32.56,32.56,0,0,0,.78,6.69,30.58,30.58,0,0,0,2.09,6.2A31.58,31.58,0,0,0,14,74.66,29.46,29.46,0,0,0,60.55,76a27.55,27.55,0,0,0,7.79-5.81,28.56,28.56,0,0,0,7.85-19.48l0-.17A32.76,32.76,0,0,0,74.62,26.83Z"/>
        <path fill="url(#firefox-b)" d="M74.62,26.83c-1.69-4.12-5.13-8.31-7.75-9.69a39.17,39.17,0,0,1,3.44,11.16c4.22,17.05-4.65,33.64-20.72,39.84A27.74,27.74,0,0,1,16,53.07a25.54,25.54,0,0,1,2.86-9.79c-.11.2,0,.39-.06.59A25.54,25.54,0,0,0,6.92,55c0,.22,0,.44,0,.66a32.56,32.56,0,0,0,.78,6.69,30.58,30.58,0,0,0,2.09,6.2A31.58,31.58,0,0,0,14,74.66,29.46,29.46,0,0,0,60.55,76a27.55,27.55,0,0,0,7.79-5.81,28.56,28.56,0,0,0,7.85-19.48l0-.17A32.76,32.76,0,0,0,74.62,26.83Z"/>
      </svg>
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-wider text-gray-400">Get the</div>
        <div className="text-sm font-semibold text-white">Firefox Add-on</div>
      </div>
    </a>
  )
}

function FeatureChecklist() {
  const features = [
    "Choose Your FPS",
    "Custom Text Overlay",
    "Multiple Resolutions",
    "In Player Controls"
  ]

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 justify-start">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-1.5 text-xs sm:text-sm lg:text-base text-white font-semibold">
          <svg width="20" height="20" className="text-[#E91E8C] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{feature}</span>
        </div>
      ))}
    </div>
  )
}

function GifCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % EXAMPLE_GIFS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full">
      <div className="relative">
        {/* GIF Carousel */}
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {EXAMPLE_GIFS.map((gif, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <Image
                  src={gif}
                  alt={`Example GIF ${index + 1}`}
                  width={400}
                  height={300}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="flex justify-center gap-2 mt-3">
          {EXAMPLE_GIFS.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-opacity ${
                index === currentSlide ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoVideo() {
  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-800">
      <iframe
        src={DEMO_VIDEO_EMBED_URL}
        title="YTgify Demo Video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}

function WaitlistSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('submitting')
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist' }),
      })
      if (response.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="mt-16 pt-12 border-t border-gray-800">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 text-white">
          Coming Soon: Share Your GIFs Instantly
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          We&apos;re building a home for your YouTube GIFs. Host, share, and discover - all free.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 max-w-lg mx-auto">
        <div className="flex items-center gap-3 text-gray-300">
          <span className="text-xl">&#128279;</span>
          <span>One-click shareable links</span>
        </div>
        <div className="flex items-center gap-3 text-gray-300">
          <span className="text-xl">&#128172;</span>
          <span>Works in Discord, Slack, X</span>
        </div>
        <div className="flex items-center gap-3 text-gray-300">
          <span className="text-xl">&#127760;</span>
          <span>Browse community creations</span>
        </div>
        <div className="flex items-center gap-3 text-gray-300">
          <span className="text-xl">&#127912;</span>
          <span>Remix and build on others&apos; GIFs</span>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-md mx-auto">
        {status === 'success' ? (
          <div className="text-center py-4 px-6 bg-green-500/15 border border-green-500/40 rounded-lg">
            <p className="text-green-300 font-semibold">You&apos;re on the list!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              required
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Joining...' : 'Join the Waitlist'}
            </button>
          </form>
        )}
        <p className="text-gray-500 text-sm mt-4 text-center">
          No spam. We&apos;ll only email you when sharing launches.
        </p>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] grid-pattern">
      {/* Ultra Narrow Blog Style - Max 800px */}
      <article className="max-w-[800px] mx-auto px-6 sm:px-12 pt-12 pb-16">
        {/* Logo and Chrome Store Badge - Side by Side */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 mt-2 mb-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Logo />
            <h2 className="text-4xl sm:text-5xl font-bold text-white">YTgify</h2>
          </div>
          <div className="flex-shrink-0">
            <ChromeStoreBadge />
          </div>
        </div>

        {/* Social Proof */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <a
              href={CHROME_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border border-yellow-500/40 rounded-full text-yellow-300 font-semibold hover:bg-yellow-500/25 transition-colors"
            >
              <span className="text-lg">5-star rated</span>
            </a>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/40 rounded-full text-blue-300 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              Featured
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/40 rounded-full text-green-300 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
              2,000+ weekly users
            </span>
          </div>
          {/* Featured Review */}
          <div className="text-center">
            <p className="text-gray-400 italic text-sm">
              &quot;No more searching for the perfect gif moment only to come up empty handed - now I can just make my own super easily. Love it.&quot;
            </p>
            <a
              href={CHROME_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 text-xs hover:text-gray-400 transition-colors"
            >
              - Chrome Web Store review
            </a>
          </div>
        </div>

        {/* Large headline */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 leading-tight text-white tracking-tight">
          YouTube to GIF Converter - Free, No Watermark
        </h1>

        {/* Description and Example GIFs - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
          {/* Left: Description */}
          <div>
            <p className="text-xl sm:text-2xl text-white leading-normal font-normal">
              Create animated GIFs from any YouTube video in seconds - no watermark, no uploads, no external tools. Just click, trim, and share.
            </p>
          </div>

          {/* Right: GIF Gallery */}
          <div className="flex items-center">
            <GifCarousel />
          </div>
        </div>

        {/* Benefit Callout */}
        <div className="text-center mb-16 py-6 px-4 rounded-lg bg-gray-900/50 border border-gray-800">
          <p className="text-lg text-white font-semibold mb-1">Your first GIF in under 30 seconds.</p>
          <p className="text-gray-400">No account needed. No software to download. Works right inside YouTube.</p>
        </div>

        {/* Features and Video - Single Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-white">See it in action</h2>
          {/* Features above video */}
          <div className="mb-6">
            <FeatureChecklist />
          </div>
          {/* Video */}
          <DemoVideo />

          {/* CTA after video */}
          <div className="mt-12 text-center">
            <p className="text-xl text-white mb-6 font-semibold">Ready to create your first GIF?</p>
            <div className="flex flex-col sm:flex-row items-start justify-center gap-6">
              <ChromeStoreBadge />
              <FirefoxStoreBadge />
            </div>
            <p className="text-gray-400 text-sm mt-4">100% free. No watermark. No tracking. Ever.</p>
          </div>

          {/* Waitlist Section */}
          <WaitlistSection />
        </div>
      </article>
    </div>
  )
}
