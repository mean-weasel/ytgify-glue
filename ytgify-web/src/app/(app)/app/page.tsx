import { getUserProfile } from '@/lib/auth/actions'
import { getFeed } from '@/lib/feed/actions'
import { AppHeader } from '@/components/layout'
import { Feed } from '@/components/gif'
import Link from 'next/link'

export default async function FeedPage() {
  const [profile, initialFeed] = await Promise.all([
    getUserProfile(),
    getFeed(),
  ])

  const hasContent = initialFeed.gifs.length > 0

  return (
    <>
      <AppHeader />

      <div className="max-w-lg mx-auto px-4">
        {/* Welcome banner for new users or users with no content */}
        {(!hasContent || !profile?.gifs_count) && (
          <div className="py-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-800">
              <h1 className="text-xl font-bold mb-2">
                Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}!
              </h1>
              <p className="text-gray-400 text-sm mb-4">
                Create GIFs from YouTube videos and share them with the world.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://ytgify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-full text-sm font-medium transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c6.628 0 12-5.373 12-12S18.628 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  Install Extension
                </a>
                <Link
                  href="/app/trending"
                  className="px-4 py-2 border border-gray-700 hover:border-gray-500 rounded-full text-sm font-medium transition-colors"
                >
                  Explore Trending
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="py-4">
          <Feed type="home" initialData={initialFeed} />
        </div>

        {/* User quick stats when feed is empty */}
        {!hasContent && profile && (
          <div className="pb-8">
            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/app/profile"
                className="text-center p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="text-2xl font-bold">{profile.gifs_count}</div>
                <div className="text-xs text-gray-400 mt-1">GIFs</div>
              </Link>
              <Link
                href="/app/profile?tab=followers"
                className="text-center p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="text-2xl font-bold">{profile.follower_count}</div>
                <div className="text-xs text-gray-400 mt-1">Followers</div>
              </Link>
              <Link
                href="/app/profile?tab=following"
                className="text-center p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="text-2xl font-bold">{profile.following_count}</div>
                <div className="text-xs text-gray-400 mt-1">Following</div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
