import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/hashtags/[name] - Get hashtag with GIFs
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const normalizedName = name.toLowerCase().replace(/^#/, '')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

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

    // Get hashtag
    const { data: hashtag, error: hashtagError } = await supabase
      .from('hashtags')
      .select('*')
      .eq('name', normalizedName)
      .single()

    if (hashtagError || !hashtag) {
      return NextResponse.json(
        { error: 'Hashtag not found' },
        { status: 404 }
      )
    }

    // Get GIFs with this hashtag
    const { data: gifHashtags, error: gifsError } = await supabase
      .from('gif_hashtags')
      .select(`
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
      .eq('hashtag_id', hashtag.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (gifsError) {
      console.error('Hashtag GIFs fetch error:', gifsError)
      return NextResponse.json(
        { error: 'Failed to fetch GIFs' },
        { status: 500 }
      )
    }

    const gifs = (gifHashtags || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((gh: { gif: any }) => gh.gif)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((g: any) => g && !g.deleted_at && g.privacy === 'public')

    // Add like status if authenticated
    let gifsWithLikeStatus = gifs
    if (userId && gifs.length > 0) {
      const gifIds = gifs.map((g) => g.id)
      const { data: likes } = await supabase
        .from('likes')
        .select('gif_id')
        .eq('user_id', userId)
        .in('gif_id', gifIds)

      const likedGifIds = new Set(likes?.map((l) => l.gif_id) || [])
      gifsWithLikeStatus = gifs.map((gif) => ({
        ...gif,
        is_liked: likedGifIds.has(gif.id),
      }))
    }

    return NextResponse.json({
      hashtag,
      gifs: gifsWithLikeStatus,
      page,
      limit,
      has_more: gifs.length === limit,
    })
  } catch (error) {
    console.error('Get hashtag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
