import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/hashtags/trending - Get trending hashtags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const supabase = getSupabase()

    // Get hashtags ordered by gifs_count (simple trending)
    const { data: hashtags, error } = await supabase
      .from('hashtags')
      .select('*')
      .gt('gifs_count', 0)
      .order('gifs_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Trending hashtags fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trending hashtags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      hashtags: hashtags || [],
    })
  } catch (error) {
    console.error('Get trending hashtags error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
