import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/users/[username]/following - List users that a user follows
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

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

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get following
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select(`
        following:users!following_id (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          is_verified,
          follower_count,
          following_count,
          gifs_count
        ),
        created_at
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (followsError) {
      console.error('Following fetch error:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch following' },
        { status: 500 }
      )
    }

    // Get total count
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id)

    // Check if current user follows each user
    const following = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (follows || []).map(async (f: any) => {
        let isFollowing = false
        if (currentUserId && f.following) {
          const { data: followCheck } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', f.following.id)
            .single()
          isFollowing = !!followCheck
        }
        return {
          ...f.following,
          is_following: isFollowing,
          followed_at: f.created_at,
        }
      })
    )

    return NextResponse.json({
      following,
      page,
      limit,
      total: count || 0,
      has_more: (follows?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Get following error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
