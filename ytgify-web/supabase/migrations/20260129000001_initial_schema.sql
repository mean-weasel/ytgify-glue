-- YTgify Initial Schema Migration
-- Converted from Rails schema for Supabase

-- Enable required extensions (gen_random_uuid() is built-in to PostgreSQL 13+)

-- ============================================================================
-- USERS TABLE (extends Supabase Auth)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  twitter_handle TEXT,
  youtube_channel TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  gifs_count INTEGER DEFAULT 0 NOT NULL,
  total_likes_received INTEGER DEFAULT 0 NOT NULL,
  follower_count INTEGER DEFAULT 0 NOT NULL,
  following_count INTEGER DEFAULT 0 NOT NULL,
  preferences JSONB DEFAULT '{"default_privacy": "public", "recently_used_tags": [], "default_upload_behavior": "show_options"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- ============================================================================
-- GIFS TABLE
-- ============================================================================
CREATE TYPE gif_privacy AS ENUM ('public', 'unlisted', 'private');

CREATE TABLE public.gifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  youtube_video_url TEXT,
  youtube_video_title TEXT,
  youtube_channel_name TEXT,
  youtube_timestamp_start REAL,
  youtube_timestamp_end REAL,
  duration REAL,
  fps INTEGER,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  has_text_overlay BOOLEAN DEFAULT FALSE,
  text_overlay_data JSONB,
  is_remix BOOLEAN DEFAULT FALSE,
  parent_gif_id UUID REFERENCES public.gifs(id) ON DELETE SET NULL,
  remix_count INTEGER DEFAULT 0 NOT NULL,
  privacy gif_privacy DEFAULT 'public' NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  share_count INTEGER DEFAULT 0 NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gifs_user_id ON public.gifs(user_id);
CREATE INDEX idx_gifs_created_at ON public.gifs(created_at DESC);
CREATE INDEX idx_gifs_privacy ON public.gifs(privacy);
CREATE INDEX idx_gifs_deleted_at ON public.gifs(deleted_at);
CREATE INDEX idx_gifs_parent_gif ON public.gifs(parent_gif_id);
CREATE INDEX idx_gifs_public_feed ON public.gifs(deleted_at, privacy, created_at DESC);
CREATE INDEX idx_gifs_trending ON public.gifs(created_at DESC, like_count DESC, view_count DESC);
CREATE INDEX idx_gifs_popularity ON public.gifs(like_count DESC, view_count DESC);

-- ============================================================================
-- LIKES TABLE
-- ============================================================================
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, gif_id)
);

CREATE INDEX idx_likes_gif_id ON public.likes(gif_id);
CREATE INDEX idx_likes_created_at ON public.likes(created_at);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_comments_gif_id ON public.comments(gif_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);
CREATE INDEX idx_comments_deleted_at ON public.comments(deleted_at);

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_created_at ON public.follows(created_at);

-- ============================================================================
-- COLLECTIONS TABLE
-- ============================================================================
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  gifs_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_public ON public.collections(is_public);

-- ============================================================================
-- COLLECTION_GIFS TABLE (Junction)
-- ============================================================================
CREATE TABLE public.collection_gifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0 NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, gif_id)
);

CREATE INDEX idx_collection_gifs_gif ON public.collection_gifs(gif_id);
CREATE INDEX idx_collection_gifs_position ON public.collection_gifs(collection_id, position);

-- ============================================================================
-- HASHTAGS TABLE
-- ============================================================================
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hashtags_slug ON public.hashtags(slug);
CREATE INDEX idx_hashtags_usage ON public.hashtags(usage_count DESC);

-- ============================================================================
-- GIF_HASHTAGS TABLE (Junction)
-- ============================================================================
CREATE TABLE public.gif_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(gif_id, hashtag_id)
);

CREATE INDEX idx_gif_hashtags_hashtag ON public.gif_hashtags(hashtag_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notifiable_type TEXT NOT NULL,
  notifiable_id UUID NOT NULL,
  action TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_notifiable ON public.notifications(notifiable_type, notifiable_id);

-- ============================================================================
-- VIEW_EVENTS TABLE (Analytics)
-- ============================================================================
CREATE TABLE public.view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  duration INTEGER,
  is_unique BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_view_events_gif ON public.view_events(gif_id, created_at);
CREATE INDEX idx_view_events_viewer ON public.view_events(viewer_id, gif_id, created_at);
CREATE INDEX idx_view_events_created ON public.view_events(created_at);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gifs_updated_at BEFORE UPDATE ON public.gifs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
