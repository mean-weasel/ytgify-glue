'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/layout'
import { SearchIcon, XIcon } from '@/components/icons'

export default function SearchPage() {
  const [query, setQuery] = useState('')

  return (
    <>
      <AppHeader showBack showSearch={false} title="Search" />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search input */}
        <div className="relative">
          <SearchIcon
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs, users, or hashtags"
            className="w-full h-12 pl-12 pr-10 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 transition-colors"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        {/* Recent searches or suggestions */}
        {!query && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">
              Try searching for
            </h2>
            <div className="flex flex-wrap gap-2">
              {['funny', 'reaction', 'meme', 'sports', 'music'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-full text-sm transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results would go here */}
        {query && (
          <div className="mt-6 text-center py-8">
            <p className="text-gray-400 text-sm">
              Search functionality coming soon...
            </p>
          </div>
        )}
      </div>
    </>
  )
}
