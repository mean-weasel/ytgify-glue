import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTokenPair } from '@/lib/jwt'
import { z } from 'zod'

// Support both direct fields and extension format (wrapped in "user" object)
const loginSchema = z.union([
  z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  z.object({
    user: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  }),
])

// Create client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Extract email/password from either format
    const data = result.data
    const email = 'user' in data ? data.user.email : data.email
    const password = 'user' in data ? data.user.password : data.password
    const supabase = getSupabase()

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Create JWT tokens
    const { accessToken, refreshToken } = await createTokenPair(
      authData.user.id,
      authData.user.email!
    )

    return NextResponse.json({
      // Extension compatibility: uses "token"
      token: accessToken,
      // Web app compatibility: uses "access_token" / "refresh_token"
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: profile.id,
        email: authData.user.email,
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
