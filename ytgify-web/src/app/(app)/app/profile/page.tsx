import { getUserProfile } from '@/lib/auth/actions'
import { signOut } from '@/lib/auth/actions'
import { AppHeader } from '@/components/layout'
import { SettingsIcon, UserIcon } from '@/components/icons'
import Link from 'next/link'

export default async function ProfilePage() {
  const profile = await getUserProfile()

  return (
    <>
      <AppHeader
        showSearch={false}
        rightContent={
          <Link
            href="/app/settings"
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </Link>
        }
      />

      <div className="max-w-lg mx-auto">
        {/* Profile header */}
        <div className="px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserIcon size={36} className="text-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">
                {profile?.display_name || profile?.username || 'User'}
              </h1>
              <p className="text-gray-400 text-sm">
                @{profile?.username || 'username'}
              </p>
              {profile?.bio && (
                <p className="text-sm mt-2 text-gray-300 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold">{profile?.gifs_count || 0}</div>
              <div className="text-xs text-gray-400">GIFs</div>
            </div>
            <button className="text-center hover:bg-gray-900 rounded-lg py-2 transition-colors">
              <div className="text-xl font-bold">{profile?.follower_count || 0}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </button>
            <button className="text-center hover:bg-gray-900 rounded-lg py-2 transition-colors">
              <div className="text-xl font-bold">{profile?.following_count || 0}</div>
              <div className="text-xs text-gray-400">Following</div>
            </button>
          </div>

          {/* Edit profile button */}
          <Link
            href="/app/settings/profile"
            className="block w-full mt-4 py-2.5 text-center border border-gray-700 hover:border-gray-500 rounded-lg font-medium text-sm transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {/* Tabs placeholder */}
        <div className="border-b border-gray-800">
          <div className="flex">
            <button className="flex-1 py-3 text-center text-sm font-medium border-b-2 border-white">
              GIFs
            </button>
            <button className="flex-1 py-3 text-center text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors">
              Likes
            </button>
            <button className="flex-1 py-3 text-center text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors">
              Collections
            </button>
          </div>
        </div>

        {/* Empty GIFs state */}
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No GIFs yet</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">
            Create your first GIF from YouTube using our browser extension.
          </p>
          <Link
            href="/app/create"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-full text-sm font-medium transition-all"
          >
            Create GIF
          </Link>
        </div>

        {/* Sign out */}
        <div className="px-4 py-6 border-t border-gray-800">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full py-2.5 text-center text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
