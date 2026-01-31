import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/feed - Main personalized feed
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    let userId: string | null = null
    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload?.sub) {
        userId = payload.sub
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    const supabase = getSupabase()

    // Base query for public GIFs
    let query = supabase
      .from('gifs')
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
      .eq('privacy', 'public')
      .is('deleted_at', null)

    // If authenticated, mix in followed users' content
    if (userId) {
      // Get following list
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (following && following.length > 0) {
        const followingIds = following.map((f) => f.following_id)
        // Prioritize followed users but include public content
        query = query.or(`user_id.in.(${followingIds.join(',')}),view_count.gt.0`)
      }
    }

    // Order by recency weighted by engagement
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: gifs, error } = await query

    if (error) {
      console.error('Feed error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    // Add like status if authenticated
    let gifsWithLikeStatus = gifs || []
    if (userId && gifs && gifs.length > 0) {
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
      gifs: gifsWithLikeStatus,
      page,
      limit,
      has_more: (gifs?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
