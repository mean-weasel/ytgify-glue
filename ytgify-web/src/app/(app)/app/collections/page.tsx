import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCollections } from '@/lib/collections/actions'
import { AppHeader } from '@/components/layout'
import { CollectionsView } from './CollectionsView'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { collections } = await getCollections()

  return (
    <>
      <AppHeader showSearch={false} title="Collections" />

      <div className="max-w-lg mx-auto px-4 py-4">
        <CollectionsView initialCollections={collections} />
      </div>
    </>
  )
}
