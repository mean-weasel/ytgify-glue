-- Enable pgmq extension for message queue functionality
-- pgmq provides a durable message queue built on Postgres
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues for different message types
-- These queues will be used by Edge Functions to process async tasks

-- Queue for GIF processing tasks (thumbnail generation, optimization)
SELECT pgmq.create('gif_processing');

-- Queue for notification delivery (push notifications, in-app notifications)
SELECT pgmq.create('notifications');

-- Queue for email sending (welcome emails, notifications)
SELECT pgmq.create('emails');

-- Queue for analytics events (view tracking, engagement)
SELECT pgmq.create('analytics');

-- Helper function to enqueue a GIF processing task
CREATE OR REPLACE FUNCTION enqueue_gif_processing(
  p_gif_id UUID,
  p_task_type TEXT DEFAULT 'thumbnail'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  SELECT pgmq.send(
    'gif_processing',
    jsonb_build_object(
      'gif_id', p_gif_id,
      'task_type', p_task_type,
      'created_at', NOW()
    )
  ) INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Helper function to enqueue a notification
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_recipient_id UUID,
  p_actor_id UUID,
  p_notifiable_type TEXT,
  p_notifiable_id UUID,
  p_action TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  -- Don't notify yourself
  IF p_recipient_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  SELECT pgmq.send(
    'notifications',
    jsonb_build_object(
      'recipient_id', p_recipient_id,
      'actor_id', p_actor_id,
      'notifiable_type', p_notifiable_type,
      'notifiable_id', p_notifiable_id,
      'action', p_action,
      'data', COALESCE(p_data, '{}'::jsonb),
      'created_at', NOW()
    )
  ) INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Helper function to enqueue an email
CREATE OR REPLACE FUNCTION enqueue_email(
  p_to_email TEXT,
  p_template TEXT,
  p_subject TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  SELECT pgmq.send(
    'emails',
    jsonb_build_object(
      'to', p_to_email,
      'template', p_template,
      'subject', p_subject,
      'data', COALESCE(p_data, '{}'::jsonb),
      'created_at', NOW()
    )
  ) INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Helper function to enqueue an analytics event
CREATE OR REPLACE FUNCTION enqueue_analytics_event(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  SELECT pgmq.send(
    'analytics',
    jsonb_build_object(
      'event_type', p_event_type,
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'user_id', p_user_id,
      'metadata', COALESCE(p_metadata, '{}'::jsonb),
      'created_at', NOW()
    )
  ) INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Trigger to automatically enqueue GIF processing when a new GIF is created
CREATE OR REPLACE FUNCTION trigger_gif_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enqueue thumbnail generation task
  PERFORM enqueue_gif_processing(NEW.id, 'thumbnail');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_gif_created
  AFTER INSERT ON gifs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gif_created();

-- Trigger to enqueue notifications for likes
CREATE OR REPLACE FUNCTION trigger_like_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gif_owner_id UUID;
BEGIN
  -- Get the GIF owner
  SELECT user_id INTO v_gif_owner_id
  FROM gifs
  WHERE id = NEW.gif_id;

  -- Enqueue notification (the function handles self-notification prevention)
  PERFORM enqueue_notification(
    v_gif_owner_id,
    NEW.user_id,
    'Gif',
    NEW.gif_id,
    'like'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_like_created();

-- Trigger to enqueue notifications for comments
CREATE OR REPLACE FUNCTION trigger_comment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gif_owner_id UUID;
BEGIN
  -- Get the GIF owner
  SELECT user_id INTO v_gif_owner_id
  FROM gifs
  WHERE id = NEW.gif_id;

  -- Enqueue notification
  PERFORM enqueue_notification(
    v_gif_owner_id,
    NEW.user_id,
    'Gif',
    NEW.gif_id,
    'comment',
    jsonb_build_object('comment_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_created();

-- Trigger to enqueue notifications for follows
CREATE OR REPLACE FUNCTION trigger_follow_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enqueue notification
  PERFORM enqueue_notification(
    NEW.following_id,
    NEW.follower_id,
    'User',
    NEW.follower_id,
    'follow'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_follow_created();

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION enqueue_gif_processing TO authenticated;
GRANT EXECUTE ON FUNCTION enqueue_notification TO authenticated;
GRANT EXECUTE ON FUNCTION enqueue_email TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_analytics_event TO authenticated;

COMMENT ON FUNCTION enqueue_gif_processing IS 'Enqueue a GIF for background processing (thumbnail generation, optimization)';
COMMENT ON FUNCTION enqueue_notification IS 'Enqueue a notification for async delivery';
COMMENT ON FUNCTION enqueue_email IS 'Enqueue an email for async sending';
COMMENT ON FUNCTION enqueue_analytics_event IS 'Enqueue an analytics event for async processing';
