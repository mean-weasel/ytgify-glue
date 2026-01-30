import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const normalizedUsername = username.toLowerCase()

    // Check for optional auth
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)
    let currentUserId: string | null = null

    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload?.sub) {
        currentUserId = payload.sub
      }
    }

    const supabase = getSupabase()

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        website,
        twitter_handle,
        youtube_channel,
        is_verified,
        gifs_count,
        follower_count,
        following_count,
        created_at
      `)
      .eq('username', normalizedUsername)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user follows this user
    let is_following = false
    if (currentUserId && currentUserId !== user.id) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', user.id)
        .single()

      is_following = !!follow
    }

    // Get user's recent public GIFs
    const { data: gifs } = await supabase
      .from('gifs')
      .select(`
        id,
        file_url,
        thumbnail_url,
        title,
        like_count,
        comment_count,
        view_count,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      user: {
        ...user,
        is_following,
        is_self: currentUserId === user.id,
      },
      gifs: gifs || [],
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
