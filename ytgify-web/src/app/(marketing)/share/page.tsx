'use client'

import { useState } from 'react'
import { FORMSPREE_ENDPOINT } from '@/lib/constants'

export default function SharePage() {
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
        body: JSON.stringify({ email, source: 'share-waitlist' }),
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
    <div className="min-h-screen bg-[#0a0a0a] grid-pattern flex items-center justify-center p-6">
      <div className="max-w-2xl text-center relative">
        {/* Gradient blur background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <p className="text-gray-500 text-sm tracking-widest uppercase mb-8 relative">YTgify</p>

        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-[1.1] relative">
          Your corner of YouTube.<br />
          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            All GIF&apos;d up.
          </span>
        </h1>

        <p className="text-gray-400 text-xl mb-12 max-w-md mx-auto relative">
          GIFs you won&apos;t find anywhere else. Made by the YouTube-obsessed.
        </p>

        <div className="relative max-w-md mx-auto">
          {status === 'success' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C]/20 to-[#7B2FBE]/20 border-2 border-[#E91E8C]/50 mb-4">
                <svg className="w-8 h-8 text-[#E91E8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">You&apos;re on the list!</p>
              <p className="text-gray-400">We&apos;ll email you when there&apos;s something new.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] disabled:opacity-50"
                required
                disabled={status === 'submitting'}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-6 py-3 bg-gradient-to-r from-[#E91E8C] to-[#7B2FBE] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {status === 'submitting' ? (
                  <>
                    <span>Joining...</span>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </button>
            </form>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm mt-4">Failed to join. Please try again.</p>
          )}
        </div>

        <p className="text-gray-600 text-sm mt-6 relative">
          No spam. We&apos;ll only email you when sharing launches.
        </p>
      </div>
    </div>
  )
}
