// Email Worker Edge Function
// Processes email messages from pgmq and sends via Resend
// Supports templated emails for various notification types

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailMessage {
  to: string
  template: string
  subject: string
  data: Record<string, unknown>
  created_at: string
}

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => string> = {
  welcome: (data) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ec4899; font-size: 32px; margin: 0;">YTgify</h1>
      </div>
      <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to YTgify!</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Hi ${data.username || 'there'},
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        Thanks for joining YTgify! You can now create and share GIFs from your favorite YouTube videos.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ytgify.com/app" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600;">
          Start Creating
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 40px;">
        &copy; ${new Date().getFullYear()} YTgify. All rights reserved.
      </p>
    </div>
  `,

  notification_digest: (data) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ec4899; font-size: 32px; margin: 0;">YTgify</h1>
      </div>
      <h2 style="color: #1f2937; margin-bottom: 20px;">You have new activity!</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Hi ${data.username || 'there'},
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        You have ${data.notification_count || 0} unread notifications waiting for you.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ytgify.com/app/notifications" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600;">
          View Notifications
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 40px;">
        &copy; ${new Date().getFullYear()} YTgify. All rights reserved.
      </p>
    </div>
  `,

  password_reset: (data) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ec4899; font-size: 32px; margin: 0;">YTgify</h1>
      </div>
      <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Hi ${data.username || 'there'},
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.reset_url}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 40px;">
        &copy; ${new Date().getFullYear()} YTgify. All rights reserved.
      </p>
    </div>
  `,
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Read messages from the emails queue (batch of 10)
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'emails',
      vt: 60, // Visibility timeout in seconds (longer for emails)
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
        const payload = msg.message as EmailMessage

        // Get the template
        const templateFn = templates[payload.template]
        if (!templateFn) {
          console.error(`Unknown email template: ${payload.template}`)
          // Delete unknown templates to prevent queue buildup
          await supabase.rpc('pgmq_delete', {
            queue_name: 'emails',
            msg_id: msg.msg_id,
          })
          continue
        }

        // Render the email HTML
        const html = templateFn(payload.data)

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'YTgify <noreply@ytgify.com>',
            to: payload.to,
            subject: payload.subject,
            html: html,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`)
        }

        // Delete the message from queue after successful sending
        await supabase.rpc('pgmq_delete', {
          queue_name: 'emails',
          msg_id: msg.msg_id,
        })

        processed++
        console.log(`Sent email to ${payload.to}: ${payload.subject}`)
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
    console.error('Email worker error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
