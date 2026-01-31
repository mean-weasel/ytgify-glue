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

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']).default('public'),
})

// GET /api/v1/collections - List user's collections
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    const supabase = getSupabase()

    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        gifs_count:collection_gifs(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Collections fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      )
    }

    // Get cover images (first GIF from each collection)
    const collectionsWithCovers = await Promise.all(
      (collections || []).map(async (collection) => {
        const { data: firstGif } = await supabase
          .from('collection_gifs')
          .select('gif:gifs(thumbnail_url, file_url)')
          .eq('collection_id', collection.id)
          .order('position', { ascending: true })
          .limit(1)
          .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gif = firstGif?.gif as { thumbnail_url?: string; file_url?: string } | null
        return {
          ...collection,
          cover_url: gif?.thumbnail_url || gif?.file_url || null,
        }
      })
    )

    return NextResponse.json({
      collections: collectionsWithCovers,
      page,
      limit,
      has_more: (collections?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Get collections error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/collections - Create a collection
export async function POST(request: Request) {
  try {
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
    const body = await request.json()
    const result = createCollectionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        name: result.data.name,
        description: result.data.description,
        privacy: result.data.privacy,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Create collection error:', error)
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ collection }, { status: 201 })
  } catch (error) {
    console.error('Create collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
