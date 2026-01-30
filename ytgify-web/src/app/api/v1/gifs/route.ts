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

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Map extension privacy values to database enum
const privacyTransform = z.string().transform((val) => {
  // Extension sends 'public_access', map to 'public'
  if (val === 'public_access') return 'public'
  return val
}).pipe(z.enum(['public', 'unlisted', 'private']))

const gifMetadataSchema = z.object({
  youtube_video_url: z.string().url().optional(),
  youtube_video_title: z.string().optional(),
  youtube_channel_name: z.string().optional(),
  youtube_timestamp_start: z.coerce.number().optional(),
  youtube_timestamp_end: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  fps: z.coerce.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.string().optional(), // comma-separated
  privacy: privacyTransform.default('public'),
  has_text_overlay: z.coerce.boolean().default(false),
  text_overlay_data: z.string().optional(), // JSON string
  // Extension sends hashtag_names[] as array
  'hashtag_names[]': z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    // Verify the access token
    const payload = await verifyAccessToken(token)

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = payload.sub

    // Parse multipart form data
    const formData = await request.formData()

    // Support both flat keys (file) and Rails-style keys (gif[file])
    const file = (formData.get('file') || formData.get('gif[file]')) as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('gif') && !file.type.includes('image/gif')) {
      return NextResponse.json(
        { error: 'File must be a GIF' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Parse metadata from form data
    // Support both flat keys and Rails-style keys (gif[field])
    const metadataObj: Record<string, unknown> = {}
    const hashtagNames: string[] = []

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        // Handle Rails-style array keys: gif[hashtag_names][] -> collect into array
        if (key === 'gif[hashtag_names][]') {
          hashtagNames.push(value)
          continue
        }
        // Handle Rails-style keys: gif[field] -> field
        const match = key.match(/^gif\[(.+)\]$/)
        if (match) {
          metadataObj[match[1]] = value
        } else if (key !== 'file') {
          metadataObj[key] = value
        }
      }
    }

    // Convert hashtag array to comma-separated string for schema
    if (hashtagNames.length > 0) {
      metadataObj['hashtags'] = hashtagNames.join(',')
    }

    const metadataResult = gifMetadataSchema.safeParse(metadataObj)
    if (!metadataResult.success) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: metadataResult.error.flatten() },
        { status: 400 }
      )
    }

    const metadata = metadataResult.data
    const supabase = getSupabase()

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const filename = `${userId}/${timestamp}-${randomSuffix}.gif`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('gifs')
      .upload(filename, arrayBuffer, {
        contentType: 'image/gif',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gifs')
      .getPublicUrl(filename)

    // Create GIF record in database
    const { data: gif, error: dbError } = await supabase
      .from('gifs')
      .insert({
        user_id: userId,
        file_url: urlData.publicUrl,
        file_size: file.size,
        youtube_video_url: metadata.youtube_video_url,
        youtube_video_title: metadata.youtube_video_title,
        youtube_channel_name: metadata.youtube_channel_name,
        youtube_timestamp_start: metadata.youtube_timestamp_start,
        youtube_timestamp_end: metadata.youtube_timestamp_end,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        title: metadata.title,
        description: metadata.description,
        privacy: metadata.privacy,
        has_text_overlay: metadata.has_text_overlay,
        text_overlay_data: metadata.text_overlay_data ? JSON.parse(metadata.text_overlay_data) : null,
      })
      .select('*')
      .single()

    if (dbError || !gif) {
      console.error('Database error:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('gifs').remove([filename])
      return NextResponse.json(
        { error: 'Failed to create GIF record' },
        { status: 500 }
      )
    }

    // Handle hashtags if provided
    if (metadata.hashtags) {
      const tags = metadata.hashtags
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t.length > 0)

      for (const tagName of tags) {
        // Upsert hashtag
        const { data: hashtag } = await supabase
          .from('hashtags')
          .upsert({ name: tagName }, { onConflict: 'name' })
          .select('id')
          .single()

        if (hashtag) {
          // Link hashtag to gif
          await supabase
            .from('gif_hashtags')
            .insert({ gif_id: gif.id, hashtag_id: hashtag.id })
            .select()
        }
      }
    }

    // Get user profile for response
    const { data: profile } = await supabase
      .from('users')
      .select('username, display_name, avatar_url')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      gif: {
        id: gif.id,
        file_url: gif.file_url,
        thumbnail_url: gif.thumbnail_url,
        title: gif.title,
        description: gif.description,
        youtube_video_url: gif.youtube_video_url,
        youtube_video_title: gif.youtube_video_title,
        youtube_channel_name: gif.youtube_channel_name,
        youtube_timestamp_start: gif.youtube_timestamp_start,
        youtube_timestamp_end: gif.youtube_timestamp_end,
        duration: gif.duration,
        width: gif.width,
        height: gif.height,
        fps: gif.fps,
        like_count: gif.like_count,
        comment_count: gif.comment_count,
        view_count: gif.view_count,
        privacy: gif.privacy,
        has_text_overlay: gif.has_text_overlay,
        created_at: gif.created_at,
        user: {
          id: userId,
          username: profile?.username,
          display_name: profile?.display_name,
          avatar_url: profile?.avatar_url,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('GIF upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get feed of GIFs
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = extractBearerToken(authHeader)

    // Auth is optional for public feed
    let userId: string | null = null
    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload?.sub) {
        userId = payload.sub
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit
    const type = searchParams.get('type') || 'trending' // 'trending', 'following', 'latest'
    const supabase = getSupabase()

    let query = supabase
      .from('gifs')
      .select(`
        *,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('privacy', 'public')
      .is('deleted_at', null)

    if (type === 'following' && userId) {
      // Get gifs from users the current user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (following && following.length > 0) {
        const followingIds = following.map((f) => f.following_id)
        query = query.in('user_id', followingIds)
      } else {
        // No following, return empty
        return NextResponse.json({
          gifs: [],
          page,
          limit,
          has_more: false,
        })
      }
    }

    // Apply sorting
    if (type === 'trending') {
      // Simple trending: recent + engagement
      query = query.order('view_count', { ascending: false })
    } else if (type === 'latest') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: gifs, error } = await query

    if (error) {
      console.error('Feed error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      gifs: gifs || [],
      page,
      limit,
      has_more: (gifs?.length || 0) === limit,
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
