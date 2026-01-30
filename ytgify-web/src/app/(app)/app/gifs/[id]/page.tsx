import { notFound } from 'next/navigation'
import { getGif } from '@/lib/feed/actions'
import { getComments } from '@/lib/feed/comments'
import { AppHeader } from '@/components/layout'
import { GifDetailView } from './GifDetailView'

interface GifPageProps {
  params: Promise<{ id: string }>
}

export default async function GifPage({ params }: GifPageProps) {
  const { id } = await params
  const [gif, commentsData] = await Promise.all([
    getGif(id),
    getComments(id),
  ])

  if (!gif) {
    notFound()
  }

  return (
    <>
      <AppHeader showBack title="GIF" />
      <GifDetailView gif={gif} initialComments={commentsData} />
    </>
  )
}
