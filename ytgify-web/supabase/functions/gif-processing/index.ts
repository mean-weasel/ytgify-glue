// GIF Processing Edge Function
// Processes GIFs in the background: thumbnail generation, optimization
// Triggered by pgmq messages from the 'gif_processing' queue

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GifProcessingMessage {
  gif_id: string
  task_type: 'thumbnail' | 'optimize'
  created_at: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Read messages from the queue (batch of 10)
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'gif_processing',
      vt: 30, // Visibility timeout in seconds
      qty: 10, // Number of messages to read
    })

    if (readError) {
      console.error('Error reading from queue:', readError)
      return new Response(
        JSON.stringify({ error: 'Failed to read from queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let errors = 0

    for (const msg of messages) {
      try {
        const payload = msg.message as GifProcessingMessage

        if (payload.task_type === 'thumbnail') {
          await generateThumbnail(supabase, payload.gif_id)
        } else if (payload.task_type === 'optimize') {
          // Future: GIF optimization logic
          console.log(`Optimization task for GIF ${payload.gif_id} - not implemented yet`)
        }

        // Delete the message from queue after successful processing
        await supabase.rpc('pgmq_delete', {
          queue_name: 'gif_processing',
          msg_id: msg.msg_id,
        })

        processed++
      } catch (err) {
        console.error(`Error processing message ${msg.msg_id}:`, err)
        errors++
        // Message will become visible again after visibility timeout
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('GIF processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateThumbnail(supabase: any, gifId: string) {
  // Get GIF record
  const { data: gif, error: gifError } = await supabase
    .from('gifs')
    .select('id, file_url, user_id, thumbnail_url')
    .eq('id', gifId)
    .single()

  if (gifError || !gif) {
    throw new Error(`GIF not found: ${gifId}`)
  }

  // Skip if thumbnail already exists
  if (gif.thumbnail_url) {
    console.log(`Thumbnail already exists for GIF ${gifId}`)
    return
  }

  // For GIFs, we can extract the first frame as thumbnail
  // In a production environment, you would use an image processing service
  // For now, we'll use a simple approach: set the GIF URL as thumbnail
  // (browsers will show first frame when used as img src)

  // In production, you could:
  // 1. Use Sharp (via npm) to extract first frame
  // 2. Use a third-party service like Cloudinary
  // 3. Use Canvas API in a worker

  // For MVP, just use the GIF URL as thumbnail
  const thumbnailUrl = gif.file_url

  // Update the GIF record
  const { error: updateError } = await supabase
    .from('gifs')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', gifId)

  if (updateError) {
    throw new Error(`Failed to update thumbnail: ${updateError.message}`)
  }

  console.log(`Generated thumbnail for GIF ${gifId}`)
}
