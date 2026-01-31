import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken, extractBearerToken } from '@/lib/jwt'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/v1/users/[username]/follow - Follow a user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
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

    const followerId = payload.sub
    const supabase = getSupabase()

    // Find user to follow
    const { data: userToFollow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !userToFollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const followingId = userToFollow.id

    // Can't follow yourself
    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      )
    }

    // Create follow
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      })

    if (followError) {
      console.error('Follow error:', followError)
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      )
    }

    // Create notification for followed user
    await supabase.from('notifications').insert({
      recipient_id: followingId,
      actor_id: followerId,
      notifiable_type: 'Follow',
      notifiable_id: followerId, // Using follower's ID as the notifiable
      action: 'follow',
    })

    return NextResponse.json({ success: true, following: true }, { status: 201 })
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/users/[username]/follow - Unfollow a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
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

    const followerId = payload.sub
    const supabase = getSupabase()

    // Find user to unfollow
    const { data: userToUnfollow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !userToUnfollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const followingId = userToUnfollow.id

    // Delete follow
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (deleteError) {
      console.error('Unfollow error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unfollow user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, following: false })
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
