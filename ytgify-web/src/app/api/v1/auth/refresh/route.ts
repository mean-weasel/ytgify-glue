import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRefreshToken, createTokenPair } from '@/lib/jwt'
import { z } from 'zod'

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
})

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = refreshSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { refresh_token } = result.data

    // Verify the refresh token
    const payload = await verifyRefreshToken(refresh_token)

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    const supabase = getSupabase()

    // Verify user still exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create new token pair
    const { accessToken, refreshToken } = await createTokenPair(
      payload.sub,
      payload.email
    )

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: profile.id,
        email: payload.email,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        gifs_count: profile.gifs_count,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
      },
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
