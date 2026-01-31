import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'
import { z } from 'zod'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const addGifSchema = z.object({
  gif_id: z.string().uuid(),
})

// POST /api/v1/collections/[id]/gifs - Add GIF to collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload?.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = payload.sub
    const supabase = getSupabase()

    // Check collection ownership
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (collection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to modify this collection' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = addGifSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { gif_id } = result.data

    // Verify GIF exists
    const { data: gif, error: gifError } = await supabase
      .from('gifs')
      .select('id, user_id')
      .eq('id', gif_id)
      .is('deleted_at', null)
      .single()

    if (gifError || !gif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    // Check if already in collection
    const { data: existing } = await supabase
      .from('collection_gifs')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('gif_id', gif_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'GIF already in collection' },
        { status: 400 }
      )
    }

    // Get next position
    const { data: lastGif } = await supabase
      .from('collection_gifs')
      .select('position')
      .eq('collection_id', collectionId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (lastGif?.position || 0) + 1

    // Add GIF to collection
    const { error: addError } = await supabase
      .from('collection_gifs')
      .insert({
        collection_id: collectionId,
        gif_id,
        position,
      })

    if (addError) {
      console.error('Add to collection error:', addError)
      return NextResponse.json(
        { error: 'Failed to add GIF to collection' },
        { status: 500 }
      )
    }

    // Update collection timestamp
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', collectionId)

    // Create notification for GIF owner (if not self)
    if (gif.user_id !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: gif.user_id,
        actor_id: userId,
        notifiable_type: 'Collection',
        notifiable_id: collectionId,
        action: 'collection_add',
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Add to collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/collections/[id]/gifs - Remove GIF from collection
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: collectionId } = await params
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload?.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = payload.sub
    const { searchParams } = new URL(request.url)
    const gifId = searchParams.get('gif_id')

    if (!gifId) {
      return NextResponse.json(
        { error: 'gif_id query parameter required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Check collection ownership
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (collection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to modify this collection' },
        { status: 403 }
      )
    }

    // Remove GIF from collection
    const { error: deleteError } = await supabase
      .from('collection_gifs')
      .delete()
      .eq('collection_id', collectionId)
      .eq('gif_id', gifId)

    if (deleteError) {
      console.error('Remove from collection error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove GIF from collection' },
        { status: 500 }
      )
    }

    // Update collection timestamp
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', collectionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove from collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
