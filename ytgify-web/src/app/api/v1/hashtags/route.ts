import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/v1/hashtags - List hashtags (with optional search)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    const supabase = getSupabase()

    let dbQuery = supabase
      .from('hashtags')
      .select('*')

    // Search by name if query provided
    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`)
    }

    // Order by gifs_count
    dbQuery = dbQuery
      .order('gifs_count', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: hashtags, error } = await dbQuery

    if (error) {
      console.error('Hashtags fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch hashtags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      hashtags: hashtags || [],
      page,
      limit,
      has_more: (hashtags?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Get hashtags error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
