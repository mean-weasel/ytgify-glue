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

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parent_id: z.string().uuid().optional(),
})

// GET /api/v1/gifs/[id]/comments - List comments for a GIF
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gifId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    const supabase = getSupabase()

    // Verify GIF exists
    const { data: gif, error: gifError } = await supabase
      .from('gifs')
      .select('id')
      .eq('id', gifId)
      .is('deleted_at', null)
      .single()

    if (gifError || !gif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    // Fetch comments with user info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('gif_id', gifId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Comments fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Get total count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('gif_id', gifId)
      .is('deleted_at', null)

    return NextResponse.json({
      comments: comments || [],
      page,
      limit,
      total: count || 0,
      has_more: (comments?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/gifs/[id]/comments - Create a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gifId } = await params
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

    // Verify GIF exists
    const { data: gif, error: gifError } = await supabase
      .from('gifs')
      .select('id, user_id')
      .eq('id', gifId)
      .is('deleted_at', null)
      .single()

    if (gifError || !gif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const result = createCommentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { content, parent_id } = result.data

    // Verify parent comment exists if specified
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_id)
        .eq('gif_id', gifId)
        .is('deleted_at', null)
        .single()

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('comments')
      .insert({
        gif_id: gifId,
        user_id: userId,
        content,
        parent_id: parent_id || null,
      })
      .select(`
        id,
        content,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single()

    if (createError || !comment) {
      console.error('Create comment error:', createError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // Create notification for GIF owner (if not self-comment)
    if (gif.user_id !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: gif.user_id,
        actor_id: userId,
        notifiable_type: 'Comment',
        notifiable_id: comment.id,
        action: 'comment',
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
