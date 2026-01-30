'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  CHROME_EXTENSION_URL,
  DEMO_VIDEO_EMBED_URL,
  FORMSPREE_ENDPOINT,
  MOBILE_REMINDER,
  MOBILE_REMINDER_EMAIL
} from '@/lib/constants'

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#E91E8C]/20 to-[#7B2FBE]/20"></div>
        <div className="w-48 h-4 rounded bg-gray-800"></div>
        <div className="w-32 h-4 rounded bg-gray-800"></div>
      </div>
    </div>
  )
}

function DesktopWelcome() {
  const tips = [
    'Look for the pink GIF button below any YouTube video',
    'Drag to select the exact clip you want (max 10 seconds)',
    'Add custom text overlay for memes',
    'No watermark, ever'
  ]

  return (
    <article className="max-w-[800px] mx-auto px-12 sm:px-6 pt-12 pb-16">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Image
          src="/ytgify-logo.svg"
          alt="YTgify Logo"
          width={56}
          height={56}
          className="w-12 h-12 sm:w-14 sm:h-14"
        />
        <h2 className="text-4xl sm:text-5xl font-bold text-white">YTgify</h2>
      </div>

      {/* Success Message */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#E91E8C]/20 to-[#7B2FBE]/20 border-2 border-[#E91E8C]/50 mb-6">
          <svg className="w-10 h-10 text-[#E91E8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-lg text-gray-400">
          YTgify is now installed and ready to create GIFs from any YouTube video.
        </p>
      </div>

      {/* Demo Video Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">See how it works</h2>
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
      </div>

      {/* Where to Find It */}
      <div className="mb-10 py-6 px-6 rounded-lg bg-gray-900/50 border border-gray-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E91E8C]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#E91E8C]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Where to find it</h3>
            <p className="text-gray-400">
              Look for the <span className="text-[#E91E8C] font-semibold">pink GIF button</span> below any YouTube video, right next to the like/dislike buttons. Click it to open the GIF creator.
            </p>
          </div>
        </div>
      </div>

      {/* Try It Now CTA */}
      <div className="text-center mb-10">
        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#E91E8C] to-[#7B2FBE] text-white font-bold text-lg rounded-full hover:opacity-90 transition-opacity shadow-lg"
        >
          Try it now on YouTube
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      {/* Quick Tips */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4">Quick tips</h2>
        <div className="space-y-3">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3">
              <svg width="20" height="20" className="text-[#E91E8C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-300">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rating CTA */}
      <div className="text-center py-8 px-6 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <div className="text-3xl mb-3">5-star rated</div>
        <h3 className="text-xl font-bold text-white mb-2">Enjoying YTgify?</h3>
        <p className="text-gray-400 mb-4">
          A quick review helps others discover the extension and keeps development going!
        </p>
        <a
          href={`${CHROME_EXTENSION_URL}/reviews`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-semibold rounded-full hover:bg-yellow-500/30 transition-colors"
        >
          Leave a review
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </article>
  )
}

function MobileWelcome() {
  const [shareSuccess, setShareSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleShare = async () => {
    const shareData = {
      title: MOBILE_REMINDER.title,
      text: MOBILE_REMINDER.text,
      url: MOBILE_REMINDER.url
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        setShareSuccess(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          fallbackToEmail()
        }
      }
    } else {
      fallbackToEmail()
    }
  }

  const fallbackToEmail = () => {
    window.location.href = `mailto:?subject=${MOBILE_REMINDER_EMAIL.subject}&body=${MOBILE_REMINDER_EMAIL.body}`
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setEmailStatus('submitting')
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'mobile-welcome' }),
      })
      if (response.ok) {
        setEmailStatus('success')
        setEmail('')
      } else {
        setEmailStatus('error')
      }
    } catch {
      setEmailStatus('error')
    }
  }

  const features = [
    { icon: '&#10024;', text: 'No watermark' },
    { icon: '&#9889;', text: '30 seconds to GIF' },
    { icon: '&#128221;', text: 'Add text overlays' },
    { icon: '&#127916;', text: 'Works inside YouTube' }
  ]

  return (
    <article className="max-w-[800px] mx-auto px-6 pt-12 pb-16">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Image
          src="/ytgify-logo.svg"
          alt="YTgify Logo"
          width={56}
          height={56}
          className="w-12 h-12 sm:w-14 sm:h-14"
        />
        <h2 className="text-4xl font-bold text-white">YTgify</h2>
      </div>

      {/* Desktop Extension Message */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#E91E8C]/20 to-[#7B2FBE]/20 border-2 border-[#E91E8C]/50 mb-6">
          <svg className="w-10 h-10 text-[#E91E8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          YTgify is a Desktop Extension
        </h1>
        <p className="text-lg text-gray-400 mb-2">
          It works inside Chrome and Firefox on your computer.
        </p>
        <p className="text-gray-500">
          Save the link to install when you&apos;re back at your desktop.
        </p>
      </div>

      {/* Primary CTA - Share/Save Link */}
      <div className="mb-8">
        {!shareSuccess ? (
          <button
            onClick={handleShare}
            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[#E91E8C] to-[#7B2FBE] text-white font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Save Link for Later
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-green-400 text-lg font-semibold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Link saved!
            </div>
            <p className="text-gray-500 text-sm mt-2">Check your notes, email, or messages</p>
          </div>
        )}
      </div>

      {/* Secondary CTA - Email Capture */}
      <div className="mb-10 py-6 px-6 rounded-lg bg-gray-900/50 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-1 text-center">Want updates?</h2>
        <p className="text-gray-500 text-sm text-center mb-4">
          Get notified about new features. No spam.
        </p>
        {emailStatus === 'success' ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-green-400 font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              You&apos;re subscribed!
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#E91E8C]"
              required
              disabled={emailStatus === 'submitting'}
            />
            <button
              type="submit"
              disabled={emailStatus === 'submitting'}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {emailStatus === 'submitting' ? 'Subscribing...' : 'Get Updates'}
            </button>
          </form>
        )}
        {emailStatus === 'error' && (
          <p className="text-red-400 text-sm mt-2 text-center">Failed to subscribe. Please try again.</p>
        )}
      </div>

      {/* Demo Video Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4 text-center">See what you can do with YTgify</h2>
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
      </div>

      {/* Quick Features List */}
      <div className="mb-10">
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-gray-300">
              <span className="text-lg" dangerouslySetInnerHTML={{ __html: feature.icon }} />
              <span className="text-sm">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export default function WelcomePage() {
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid-pattern">
      {isMobile === null ? (
        <LoadingState />
      ) : isMobile ? (
        <MobileWelcome />
      ) : (
        <DesktopWelcome />
      )}
    </div>
  )
}
