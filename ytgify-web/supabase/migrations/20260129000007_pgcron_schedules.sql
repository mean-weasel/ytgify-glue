-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Note: pg_cron jobs must be created by the postgres user
-- These jobs invoke Edge Functions to process queued messages

-- Schedule GIF processing worker every minute
-- This processes thumbnail generation and optimization tasks
SELECT cron.schedule(
  'gif-processing-worker',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/gif-processing',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule notification worker every 30 seconds
-- This creates notification records and broadcasts to real-time
SELECT cron.schedule(
  'notification-worker',
  '*/1 * * * *', -- Every minute (cron doesn't support seconds)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notification-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule email worker every 2 minutes
-- This sends queued emails via Resend
SELECT cron.schedule(
  'email-worker',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/email-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule daily cleanup job at 3 AM UTC
-- Cleans up old messages, archives old notifications, etc.
SELECT cron.schedule(
  'daily-cleanup',
  '0 3 * * *', -- 3 AM UTC daily
  $$
  -- Archive read notifications older than 30 days
  DELETE FROM notifications
  WHERE read_at IS NOT NULL
    AND read_at < NOW() - INTERVAL '30 days';

  -- Clean up soft-deleted GIFs older than 30 days
  DELETE FROM gifs
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';

  -- Clean up old view events (keep last 90 days)
  DELETE FROM view_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Vacuum analyze affected tables
  VACUUM ANALYZE notifications;
  VACUUM ANALYZE gifs;
  VACUUM ANALYZE view_events;
  $$
);

-- Schedule weekly stats aggregation job (Sunday 4 AM UTC)
SELECT cron.schedule(
  'weekly-stats',
  '0 4 * * 0', -- 4 AM UTC on Sundays
  $$
  -- Update user stats that might have drifted
  UPDATE users u SET
    gifs_count = COALESCE((
      SELECT COUNT(*) FROM gifs g
      WHERE g.user_id = u.id AND g.deleted_at IS NULL
    ), 0),
    follower_count = COALESCE((
      SELECT COUNT(*) FROM follows f
      WHERE f.following_id = u.id
    ), 0),
    following_count = COALESCE((
      SELECT COUNT(*) FROM follows f
      WHERE f.follower_id = u.id
    ), 0);

  -- Update GIF stats that might have drifted
  UPDATE gifs g SET
    like_count = COALESCE((
      SELECT COUNT(*) FROM likes l WHERE l.gif_id = g.id
    ), 0),
    comment_count = COALESCE((
      SELECT COUNT(*) FROM comments c
      WHERE c.gif_id = g.id AND c.deleted_at IS NULL
    ), 0)
  WHERE g.deleted_at IS NULL;
  $$
);

-- Comments for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';
