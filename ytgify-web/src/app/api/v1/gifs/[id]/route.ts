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

const updateGifSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  privacy: z.enum(['public', 'unlisted', 'private']).optional(),
  hashtags: z.array(z.string()).optional(),
})

// GET /api/v1/gifs/[id] - Get single GIF with details
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

    // Fetch GIF with user and hashtags
    const { data: gif, error } = await supabase
      .from('gifs')
      .select(`
        *,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          follower_count,
          following_count,
          gifs_count
        ),
        hashtags:gif_hashtags (
          hashtag:hashtags (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !gif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    // Check privacy
    if (gif.privacy === 'private' && gif.user_id !== userId) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    // Check if current user has liked this GIF
    let isLiked = false
    let isFollowingCreator = false

    if (userId) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('gif_id', id)
        .single()

      isLiked = !!like

      // Check if following the creator
      if (gif.user_id !== userId) {
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('following_id', gif.user_id)
          .single()

        isFollowingCreator = !!follow
      }
    }

    // Increment view count (fire and forget)
    supabase
      .from('gifs')
      .update({ view_count: (gif.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {})

    // Format hashtags
    const hashtags = gif.hashtags
      ?.map((h: { hashtag: { id: string; name: string } }) => h.hashtag)
      .filter(Boolean) || []

    return NextResponse.json({
      gif: {
        id: gif.id,
        file_url: gif.file_url,
        thumbnail_url: gif.thumbnail_url,
        title: gif.title,
        description: gif.description,
        youtube_video_url: gif.youtube_video_url,
        youtube_video_title: gif.youtube_video_title,
        youtube_channel_name: gif.youtube_channel_name,
        youtube_timestamp_start: gif.youtube_timestamp_start,
        youtube_timestamp_end: gif.youtube_timestamp_end,
        duration: gif.duration,
        width: gif.width,
        height: gif.height,
        fps: gif.fps,
        like_count: gif.like_count,
        comment_count: gif.comment_count,
        view_count: gif.view_count,
        privacy: gif.privacy,
        has_text_overlay: gif.has_text_overlay,
        created_at: gif.created_at,
        is_liked: isLiked,
        is_own: gif.user_id === userId,
        user: {
          id: gif.user.id,
          username: gif.user.username,
          display_name: gif.user.display_name,
          avatar_url: gif.user.avatar_url,
          is_verified: gif.user.is_verified,
          follower_count: gif.user.follower_count,
          following_count: gif.user.following_count,
          gifs_count: gif.user.gifs_count,
          is_following: isFollowingCreator,
        },
        hashtags,
      },
    })
  } catch (error) {
    console.error('Get GIF error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/gifs/[id] - Update GIF (owner only)
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
    const { data: existingGif, error: fetchError } = await supabase
      .from('gifs')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingGif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    if (existingGif.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this GIF' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const result = updateGifSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { hashtags, ...updateData } = result.data

    // Update GIF
    const { data: gif, error: updateError } = await supabase
      .from('gifs')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update GIF' },
        { status: 500 }
      )
    }

    // Update hashtags if provided
    if (hashtags !== undefined) {
      // Remove existing hashtags
      await supabase
        .from('gif_hashtags')
        .delete()
        .eq('gif_id', id)

      // Add new hashtags
      for (const tagName of hashtags) {
        const normalizedTag = tagName.trim().toLowerCase().replace(/^#/, '')
        if (normalizedTag.length === 0) continue

        const { data: hashtag } = await supabase
          .from('hashtags')
          .upsert({ name: normalizedTag }, { onConflict: 'name' })
          .select('id')
          .single()

        if (hashtag) {
          await supabase
            .from('gif_hashtags')
            .insert({ gif_id: id, hashtag_id: hashtag.id })
        }
      }
    }

    return NextResponse.json({ gif })
  } catch (error) {
    console.error('Update GIF error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/gifs/[id] - Soft delete GIF (owner only)
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
    const { data: existingGif, error: fetchError } = await supabase
      .from('gifs')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingGif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    if (existingGif.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this GIF' },
        { status: 403 }
      )
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('gifs')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete GIF' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete GIF error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
