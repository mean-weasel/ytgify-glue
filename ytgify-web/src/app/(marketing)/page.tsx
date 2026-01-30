'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import {
  CHROME_EXTENSION_URL,
  FIREFOX_ADDON_URL,
  DEMO_VIDEO_EMBED_URL,
  FORMSPREE_ENDPOINT
} from '@/lib/constants'

// Example GIF URLs
const EXAMPLE_GIFS = [
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/free-gratis.gif',
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/boom-baby.gif',
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/witness-me.gif',
]

function Logo() {
  return (
    <div className="flex justify-center">
      <div className="relative p-3 rounded-2xl bg-gradient-to-br from-[#E91E8C]/10 to-[#7B2FBE]/10 border-2 border-pink-200/50 shadow-lg">
        <Image
          src="/ytgify-logo.svg"
          alt="YTgify"
          width={64}
          height={64}
          className="w-14 h-14 sm:w-16 sm:h-16"
        />
      </div>
    </div>
  )
}

function ChromeStoreBadge() {
  return (
    <a
      href={CHROME_EXTENSION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block hover:opacity-90 transition-opacity"
    >
      <Image
        src="/chrome-web-store-badge.png"
        alt="Available in the Chrome Web Store"
        width={309}
        height={87}
        className="h-20 sm:h-[90px] w-auto"
      />
    </a>
  )
}

function FirefoxStoreBadge() {
  return (
    <a
      href={FIREFOX_ADDON_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block hover:opacity-90 transition-opacity"
    >
      <Image
        src="/firefox-addons-badge.png"
        alt="Get the Firefox Add-on"
        width={172}
        height={60}
        className="h-20 sm:h-[90px] w-auto"
      />
    </a>
  )
}

function HeroDescription() {
  return (
    <p className="text-xl sm:text-2xl text-white leading-normal font-normal">
      Create animated GIFs from any YouTube video in seconds - no watermark, no uploads, no external tools. Just click, trim, and share.
    </p>
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
      <main>
        <article className="max-w-[800px] mx-auto px-12 sm:px-6 pt-12 pb-16">
          {/* Header with Logo and Chrome Badge */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 mt-2 mb-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Logo />
              <h2 className="text-4xl sm:text-5xl font-bold text-white">YTgify</h2>
            </div>
            <div className="flex-shrink-0">
              <ChromeStoreBadge />
            </div>
          </div>

          {/* Social Proof Section */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
              <a
                href="https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border border-yellow-500/40 rounded-full text-yellow-300 font-semibold hover:bg-yellow-500/25 transition-colors"
              >
                <span className="text-lg">⭐⭐⭐⭐⭐</span>
                <span>5-star rated</span>
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

            {/* User Review */}
            <div className="text-center">
              <p className="text-gray-400 italic text-sm">
                &ldquo;No more searching for the perfect gif moment only to come up empty handed — now I can just make my own super easily. Love it.&rdquo;
              </p>
              <a
                href="https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 text-xs hover:text-gray-400 transition-colors"
              >
                — Chrome Web Store review
              </a>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 leading-tight text-white tracking-tight">
            YouTube to GIF Converter - Free, No Watermark
          </h1>

          {/* Description and Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
            <div>
              <HeroDescription />
            </div>
            <div className="flex items-center">
              <GifCarousel />
            </div>
          </div>

          {/* Value Proposition Callout */}
          <div className="text-center mb-16 py-6 px-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <p className="text-lg text-white font-semibold mb-1">Your first GIF in under 30 seconds.</p>
            <p className="text-gray-400">No account needed. No software to download. Works right inside YouTube.</p>
          </div>

          {/* Features, Demo, and CTAs */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-white">See it in action</h2>
            <div className="mb-6">
              <FeatureChecklist />
            </div>
            <DemoVideo />

            {/* Download CTAs */}
            <div className="mt-12 text-center">
              <p className="text-xl text-white mb-6 font-semibold">Ready to create your first GIF?</p>
              <div className="flex flex-col sm:flex-row items-start justify-center gap-6">
                <ChromeStoreBadge />
                <FirefoxStoreBadge />
              </div>
              <p className="text-gray-400 text-sm mt-4">100% free. No watermark. No tracking. Ever.</p>
            </div>

            {/* Waitlist */}
            <WaitlistSection />
          </div>
        </article>
      </main>
    </div>
  )
}
