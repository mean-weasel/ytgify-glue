'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, TrendingIcon, PlusCircleIcon, BellIcon, UserIcon } from '@/components/icons'

interface NavItem {
  href: string
  label: string
  icon: typeof HomeIcon
  matchExact?: boolean
}

const navItems: NavItem[] = [
  { href: '/app', label: 'Home', icon: HomeIcon, matchExact: true },
  { href: '/app/trending', label: 'Trending', icon: TrendingIcon },
  { href: '/app/create', label: 'Create', icon: PlusCircleIcon },
  { href: '/app/notifications', label: 'Alerts', icon: BellIcon },
  { href: '/app/profile', label: 'Profile', icon: UserIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.matchExact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon

          // Special styling for the Create button
          if (item.href === '/app/create') {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
                aria-label={item.label}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shadow-lg shadow-pink-500/25">
                  <Icon size={24} className="text-white" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={24} filled={active} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
