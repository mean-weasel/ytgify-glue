import { getTrendingFeed } from '@/lib/feed/actions'
import { AppHeader } from '@/components/layout'
import { Feed } from '@/components/gif'
import { TrendingIcon } from '@/components/icons'

export default async function TrendingPage() {
  const initialFeed = await getTrendingFeed()

  return (
    <>
      <AppHeader />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <TrendingIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Trending</h1>
            <p className="text-sm text-gray-400">Popular GIFs right now</p>
          </div>
        </div>

        {/* Trending Feed */}
        <Feed type="trending" initialData={initialFeed} />
      </div>
    </>
  )
}
