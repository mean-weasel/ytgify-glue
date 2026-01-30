import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCollection, getCollectionGifs } from '@/lib/collections/actions'
import { AppHeader } from '@/components/layout'
import { CollectionDetailView } from './CollectionDetailView'

interface CollectionPageProps {
  params: Promise<{ id: string }>
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const collection = await getCollection(id)

  if (!collection) {
    notFound()
  }

  // Check if user owns this collection
  const isOwner = user?.id === collection.user_id

  // Private collections only visible to owner
  if (!collection.is_public && !isOwner) {
    redirect('/app/collections')
  }

  const initialGifs = await getCollectionGifs(id)

  return (
    <>
      <AppHeader showSearch={false} title={collection.name} showBack />

      <div className="max-w-lg mx-auto px-4 py-4">
        <CollectionDetailView
          collection={collection}
          initialGifs={initialGifs}
          isOwner={isOwner}
        />
      </div>
    </>
  )
}
