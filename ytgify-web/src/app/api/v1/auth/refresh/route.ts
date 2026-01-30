import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRefreshToken, verifyAccessToken, extractBearerToken, createTokenPair } from '@/lib/jwt'
import { z } from 'zod'

// Support refresh_token in body (web app) or empty body with Bearer token (extension)
const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
})

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // Try to parse body (may be empty for extension calls)
    let bodyRefreshToken: string | undefined
    try {
      const body = await request.json()
      const result = refreshSchema.safeParse(body)
      if (result.success) {
        bodyRefreshToken = result.data.refresh_token
      }
    } catch {
      // Empty body is okay for extension-style refresh
    }

    let payload

    // Method 1: Use refresh_token from body (web app)
    if (bodyRefreshToken) {
      payload = await verifyRefreshToken(bodyRefreshToken)
    } else {
      // Method 2: Use Bearer token from header (extension)
      const authHeader = request.headers.get('Authorization')
      const token = extractBearerToken(authHeader)
      if (token) {
        // Try as access token first (extension sends access token)
        payload = await verifyAccessToken(token)
        // Also try as refresh token if access token verification fails
        if (!payload) {
          payload = await verifyRefreshToken(token)
        }
      }
    }

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
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
    const { accessToken, refreshToken: newRefreshToken } = await createTokenPair(
      payload.sub,
      payload.email
    )

    return NextResponse.json({
      // Extension compatibility: uses "token"
      token: accessToken,
      // Web app compatibility: uses "access_token" / "refresh_token"
      access_token: accessToken,
      refresh_token: newRefreshToken,
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
