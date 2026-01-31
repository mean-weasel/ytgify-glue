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

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
})

// PATCH /api/v1/comments/[id] - Update comment (owner only)
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
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this comment' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const result = updateCommentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Update comment
    const { data: comment, error: updateError } = await supabase
      .from('comments')
      .update({
        content: result.data.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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

    if (updateError) {
      console.error('Update comment error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/comments/[id] - Soft delete comment (owner only)
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
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      )
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('comments')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Delete comment error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
