import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/feed/following - GIFs from users you follow
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

    // Get following list
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (!following || following.length === 0) {
      return NextResponse.json({
        gifs: [],
        page,
        limit,
        has_more: false,
        message: 'Follow some users to see their GIFs here',
      })
    }

    const followingIds = following.map((f) => f.following_id)

    // Get GIFs from followed users
    const { data: gifs, error } = await supabase
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
      .in('user_id', followingIds)
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Following feed error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    // Add like status
    let gifsWithLikeStatus = gifs || []
    if (gifs && gifs.length > 0) {
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
    console.error('Following feed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
