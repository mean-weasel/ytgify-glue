import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTokenPair } from '@/lib/jwt'
import { z } from 'zod'

// User fields schema (shared between formats)
const userFieldsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password_confirmation: z.string().optional(), // Extension sends this, we ignore it
})

// Support both direct fields and extension format (wrapped in "user" object)
const registerSchema = z.union([
  userFieldsSchema,
  z.object({ user: userFieldsSchema }),
])

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Extract fields from either format
    const data = result.data
    const fields = 'user' in data ? data.user : data
    const { email, password, username } = fields
    const normalizedUsername = username.toLowerCase()
    const supabase = getSupabase()

    // Check if username is taken
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Create auth user with username in metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Wait a moment for the trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get user profile (created by database trigger)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
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
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
