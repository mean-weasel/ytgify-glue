// Notification Worker Edge Function
// Processes notification messages from pgmq and creates notification records
// Also handles real-time broadcast via Supabase Realtime

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationMessage {
  recipient_id: string
  actor_id: string
  notifiable_type: string
  notifiable_id: string
  action: string
  data: Record<string, unknown>
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

    // Read messages from the notifications queue (batch of 20)
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'notifications',
      vt: 30, // Visibility timeout in seconds
      qty: 20, // Number of messages to read
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
        const payload = msg.message as NotificationMessage

        // Skip self-notifications
        if (payload.recipient_id === payload.actor_id) {
          await supabase.rpc('pgmq_delete', {
            queue_name: 'notifications',
            msg_id: msg.msg_id,
          })
          continue
        }

        // Create the notification record
        const { data: notification, error: insertError } = await supabase
          .from('notifications')
          .insert({
            recipient_id: payload.recipient_id,
            actor_id: payload.actor_id,
            notifiable_type: payload.notifiable_type,
            notifiable_id: payload.notifiable_id,
            action: payload.action,
            data: payload.data,
          })
          .select(`
            *,
            actor:users!actor_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .single()

        if (insertError) {
          // Check if it's a duplicate (already exists)
          if (insertError.code === '23505') {
            console.log(`Notification already exists, skipping`)
          } else {
            throw new Error(`Failed to create notification: ${insertError.message}`)
          }
        }

        // Broadcast to real-time channel for the recipient
        // The client subscribes to this channel to receive notifications
        if (notification) {
          const channel = supabase.channel(`notifications:${payload.recipient_id}`)
          await channel.send({
            type: 'broadcast',
            event: 'new_notification',
            payload: notification,
          })
        }

        // Delete the message from queue after successful processing
        await supabase.rpc('pgmq_delete', {
          queue_name: 'notifications',
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
    console.error('Notification worker error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
