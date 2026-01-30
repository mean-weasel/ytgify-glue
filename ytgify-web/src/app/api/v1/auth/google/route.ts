import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAccessToken, createRefreshToken } from '@/lib/jwt'

// Create admin client with service role key
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_token, access_token } = body

    if (!id_token && !access_token) {
      return NextResponse.json(
        { error: 'Missing id_token or access_token' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabase()

    // Use Supabase's Google OAuth to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
      access_token: access_token,
    })

    if (authError || !authData.user) {
      console.error('Google auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Google authentication failed' },
        { status: 401, headers: corsHeaders }
      )
    }

    const user = authData.user

    // Get or create the user profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    let profile = existingProfile

    if (profileError && profileError.code === 'PGRST116') {
      // User doesn't exist, create profile from Google data
      const googleMeta = user.user_metadata
      const username = googleMeta.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || `user_${Date.now()}`

      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: username,
          display_name: googleMeta.full_name || googleMeta.name || username,
          avatar_url: googleMeta.avatar_url || googleMeta.picture,
        })
        .select()
        .single()

      if (createError) {
        console.error('Profile creation error:', createError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500, headers: corsHeaders }
        )
      }

      profile = newProfile
    } else if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Generate JWT tokens for the extension
    const accessToken = await createAccessToken(user.id, user.email || '')
    const refreshToken = await createRefreshToken(user.id, user.email || '')

    return NextResponse.json(
      {
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified,
          created_at: profile.created_at,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
