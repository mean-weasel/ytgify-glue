import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    // Auth is optional for trending feed
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

    // Fetch trending GIFs (by engagement in last 7 days)
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
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('view_count', { ascending: false })
      .order('like_count', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Trending feed error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trending feed' },
        { status: 500, headers: corsHeaders }
      )
    }

    // If user is authenticated, check which GIFs they've liked
    let likedGifIds: Set<string> = new Set()
    if (userId && gifs && gifs.length > 0) {
      const gifIds = gifs.map((g) => g.id)
      const { data: likes } = await supabase
        .from('likes')
        .select('gif_id')
        .eq('user_id', userId)
        .in('gif_id', gifIds)

      if (likes) {
        likedGifIds = new Set(likes.map((l) => l.gif_id))
      }
    }

    // Format response
    const formattedGifs = (gifs || []).map((gif) => ({
      id: gif.id,
      file_url: gif.file_url,
      thumbnail_url: gif.thumbnail_url,
      title: gif.title,
      description: gif.description,
      youtube_video_url: gif.youtube_video_url,
      youtube_video_title: gif.youtube_video_title,
      youtube_channel_name: gif.youtube_channel_name,
      duration: gif.duration,
      width: gif.width,
      height: gif.height,
      like_count: gif.like_count,
      comment_count: gif.comment_count,
      view_count: gif.view_count,
      share_count: gif.share_count,
      is_liked: likedGifIds.has(gif.id),
      created_at: gif.created_at,
      user: gif.user,
    }))

    return NextResponse.json(
      {
        gifs: formattedGifs,
        page,
        limit,
        has_more: (gifs?.length || 0) === limit,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Trending feed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
