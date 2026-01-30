'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SearchIcon, ChevronLeftIcon } from '@/components/icons'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  rightContent?: React.ReactNode
}

export function AppHeader({
  title,
  showBack = false,
  showSearch = true,
  rightContent
}: AppHeaderProps) {
  const pathname = usePathname()

  // Determine title based on route if not provided
  const getDefaultTitle = () => {
    if (pathname === '/app') return 'Home'
    if (pathname === '/app/trending') return 'Trending'
    if (pathname === '/app/notifications') return 'Notifications'
    if (pathname === '/app/profile') return 'Profile'
    if (pathname === '/app/create') return 'Create GIF'
    if (pathname.startsWith('/app/gifs/')) return 'GIF'
    if (pathname.startsWith('/app/users/')) return 'Profile'
    return 'YTgify'
  }

  const displayTitle = title ?? getDefaultTitle()

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-lg border-b border-gray-800 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Left side */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ChevronLeftIcon size={24} />
            </button>
          ) : (
            <Link href="/app" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                YTgify
              </span>
            </Link>
          )}

          {/* Title - shows on inner pages */}
          {showBack && displayTitle && (
            <h1 className="text-lg font-semibold text-white truncate">
              {displayTitle}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <Link
              href="/app/search"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Search"
            >
              <SearchIcon size={22} />
            </Link>
          )}
          {rightContent}
        </div>
      </div>
    </header>
  )
}

// Simple header variant for non-authenticated pages
export function SimpleHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 bg-black border-b border-gray-800">
      <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
        <button
          onClick={() => window.history.back()}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <h1 className="text-lg font-semibold text-white ml-2">{title}</h1>
      </div>
    </header>
  )
}
