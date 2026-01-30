import { NextRequest, NextResponse } from 'next/server'
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
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Toggle like on a GIF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload?.sub) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = payload.sub
    const { id: gifId } = await params

    const supabase = getSupabase()

    // Check if GIF exists
    const { data: gif, error: gifError } = await supabase
      .from('gifs')
      .select('id, user_id, like_count')
      .eq('id', gifId)
      .is('deleted_at', null)
      .single()

    if (gifError || !gif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('gif_id', gifId)
      .single()

    let isLiked: boolean
    let newLikeCount: number

    if (existingLike) {
      // Unlike: remove the like
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('gif_id', gifId)

      // Decrement counter
      const { data: updated } = await supabase
        .from('gifs')
        .update({ like_count: Math.max(0, gif.like_count - 1) })
        .eq('id', gifId)
        .select('like_count')
        .single()

      isLiked = false
      newLikeCount = updated?.like_count ?? gif.like_count - 1
    } else {
      // Like: add the like
      await supabase.from('likes').insert({
        user_id: userId,
        gif_id: gifId,
      })

      // Increment counter
      const { data: updated } = await supabase
        .from('gifs')
        .update({ like_count: gif.like_count + 1 })
        .eq('id', gifId)
        .select('like_count')
        .single()

      isLiked = true
      newLikeCount = updated?.like_count ?? gif.like_count + 1
    }

    return NextResponse.json(
      {
        gif_id: gifId,
        is_liked: isLiked,
        like_count: newLikeCount,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE is an alias for unlike
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params })
}
