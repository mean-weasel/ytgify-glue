import { notFound } from 'next/navigation'
import { getUserByUsername, getUserGifs } from '@/lib/users/actions'
import { getUserProfile } from '@/lib/auth/actions'
import { AppHeader } from '@/components/layout'
import { UserProfileView } from './UserProfileView'

interface UserPageProps {
  params: Promise<{ username: string }>
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params
  const [profile, currentUser, gifsData] = await Promise.all([
    getUserByUsername(username),
    getUserProfile(),
    getUserGifs(''), // We'll need the profile ID first
  ])

  if (!profile) {
    notFound()
  }

  // Now fetch GIFs with the actual profile ID
  const userGifs = await getUserGifs(profile.id)

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <>
      <AppHeader showBack title={`@${profile.username}`} />
      <UserProfileView
        profile={profile}
        initialGifs={userGifs}
        isOwnProfile={isOwnProfile}
      />
    </>
  )
}
