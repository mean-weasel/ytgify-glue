-- YTgify Row Level Security Policies
-- Enables secure data access based on user authentication

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_gifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gif_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================
-- Anyone can view user profiles
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- GIFS POLICIES
-- ============================================================================
-- Anyone can view public gifs
CREATE POLICY "Public gifs are viewable by everyone"
  ON public.gifs FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      privacy = 'public'
      OR user_id = auth.uid()
      OR (privacy = 'unlisted')
    )
  );

-- Users can insert their own gifs
CREATE POLICY "Users can create gifs"
  ON public.gifs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own gifs
CREATE POLICY "Users can update own gifs"
  ON public.gifs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete (soft delete) their own gifs
CREATE POLICY "Users can delete own gifs"
  ON public.gifs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LIKES POLICIES
-- ============================================================================
-- Anyone can view likes on public gifs
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

-- Authenticated users can like gifs
CREATE POLICY "Authenticated users can like"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================
-- Anyone can view comments on public gifs
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

-- Authenticated users can comment
CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================
-- Anyone can view follows
CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

-- Authenticated users can follow
CREATE POLICY "Authenticated users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- COLLECTIONS POLICIES
-- ============================================================================
-- Public collections are viewable by everyone, private by owner
CREATE POLICY "Collections viewable by owner or if public"
  ON public.collections FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Users can create collections
CREATE POLICY "Users can create collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own collections
CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own collections
CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COLLECTION_GIFS POLICIES
-- ============================================================================
-- Viewable if collection is public or owned by user
CREATE POLICY "Collection gifs viewable by owner or if public"
  ON public.collection_gifs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

-- Users can add to own collections
CREATE POLICY "Users can add to own collections"
  ON public.collection_gifs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- Users can remove from own collections
CREATE POLICY "Users can remove from own collections"
  ON public.collection_gifs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HASHTAGS POLICIES
-- ============================================================================
-- Anyone can view hashtags
CREATE POLICY "Hashtags are viewable by everyone"
  ON public.hashtags FOR SELECT
  USING (true);

-- Authenticated users can create hashtags
CREATE POLICY "Authenticated users can create hashtags"
  ON public.hashtags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- GIF_HASHTAGS POLICIES
-- ============================================================================
-- Anyone can view gif hashtags
CREATE POLICY "Gif hashtags are viewable by everyone"
  ON public.gif_hashtags FOR SELECT
  USING (true);

-- Users can tag their own gifs
CREATE POLICY "Users can tag own gifs"
  ON public.gif_hashtags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gifs g
      WHERE g.id = gif_id AND g.user_id = auth.uid()
    )
  );

-- Users can remove tags from own gifs
CREATE POLICY "Users can untag own gifs"
  ON public.gif_hashtags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gifs g
      WHERE g.id = gif_id AND g.user_id = auth.uid()
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- System can create notifications (via service role)
CREATE POLICY "Service role can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- ============================================================================
-- VIEW_EVENTS POLICIES
-- ============================================================================
-- View events are insert-only for analytics
CREATE POLICY "Anyone can create view events"
  ON public.view_events FOR INSERT
  WITH CHECK (true);

-- Only service role can read view events (for analytics)
CREATE POLICY "Service role can read view events"
  ON public.view_events FOR SELECT
  USING (auth.uid() IS NOT NULL);
