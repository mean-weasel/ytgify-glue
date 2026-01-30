import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/notifications/actions'
import { AppHeader } from '@/components/layout'
import { NotificationsView } from './NotificationsView'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const initialData = await getNotifications()

  return (
    <>
      <AppHeader showSearch={false} title="Notifications" />

      <div className="max-w-lg mx-auto px-4 py-4">
        <NotificationsView initialData={initialData} userId={user.id} />
      </div>
    </>
  )
}
