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

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']).optional(),
})

// GET /api/v1/collections/[id] - Get collection with GIFs
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    let userId: string | null = null
    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload?.sub) {
        userId = payload.sub
      }
    }

    const supabase = getSupabase()

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select(`
        *,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('id', id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Check privacy
    if (collection.privacy === 'private' && collection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Get GIFs in collection
    const { data: collectionGifs, error: gifsError } = await supabase
      .from('collection_gifs')
      .select(`
        position,
        gif:gifs (
          *,
          user:users!user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        )
      `)
      .eq('collection_id', id)
      .order('position', { ascending: true })

    if (gifsError) {
      console.error('Collection GIFs fetch error:', gifsError)
      return NextResponse.json(
        { error: 'Failed to fetch collection GIFs' },
        { status: 500 }
      )
    }

    const gifs = (collectionGifs || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((cg: { gif: any }) => cg.gif)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((g: any) => g && !g.deleted_at)

    return NextResponse.json({
      collection: {
        ...collection,
        gifs_count: gifs.length,
        is_own: collection.user_id === userId,
      },
      gifs,
    })
  } catch (error) {
    console.error('Get collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/collections/[id] - Update collection
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check ownership
    const { data: existingCollection, error: fetchError } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (existingCollection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this collection' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = updateCollectionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { data: collection, error: updateError } = await supabase
      .from('collections')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Update collection error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Update collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/collections/[id] - Delete collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check ownership
    const { data: existingCollection, error: fetchError } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (existingCollection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this collection' },
        { status: 403 }
      )
    }

    // Delete collection (cascade will handle collection_gifs)
    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete collection error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
