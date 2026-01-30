-- YTgify Counter Cache Triggers
-- Automatically updates count columns when related records change

-- ============================================================================
-- LIKE COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_gif_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gifs SET like_count = like_count + 1 WHERE id = NEW.gif_id;
    UPDATE public.users SET total_likes_received = total_likes_received + 1
      WHERE id = (SELECT user_id FROM public.gifs WHERE id = NEW.gif_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gifs SET like_count = like_count - 1 WHERE id = OLD.gif_id;
    UPDATE public.users SET total_likes_received = total_likes_received - 1
      WHERE id = (SELECT user_id FROM public.gifs WHERE id = OLD.gif_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_gif_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_gif_like_count();

-- ============================================================================
-- COMMENT COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_gif_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gifs SET comment_count = comment_count + 1 WHERE id = NEW.gif_id;
    -- Update reply count if it's a reply
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gifs SET comment_count = comment_count - 1 WHERE id = OLD.gif_id;
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_gif_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_gif_comment_count();

-- ============================================================================
-- FOLLOW COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE public.users SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================================================
-- GIF COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_gif_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET gifs_count = gifs_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET gifs_count = gifs_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_gif_count
  AFTER INSERT OR DELETE ON public.gifs
  FOR EACH ROW EXECUTE FUNCTION update_user_gif_count();

-- ============================================================================
-- REMIX COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_remix_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_gif_id IS NOT NULL THEN
    UPDATE public.gifs SET remix_count = remix_count + 1 WHERE id = NEW.parent_gif_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_gif_id IS NOT NULL THEN
    UPDATE public.gifs SET remix_count = remix_count - 1 WHERE id = OLD.parent_gif_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_remix_count
  AFTER INSERT OR DELETE ON public.gifs
  FOR EACH ROW EXECUTE FUNCTION update_remix_count();

-- ============================================================================
-- COLLECTION GIF COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_collection_gif_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections SET gifs_count = gifs_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections SET gifs_count = gifs_count - 1 WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_collection_gif_count
  AFTER INSERT OR DELETE ON public.collection_gifs
  FOR EACH ROW EXECUTE FUNCTION update_collection_gif_count();

-- ============================================================================
-- HASHTAG USAGE COUNT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_hashtag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hashtags SET usage_count = usage_count - 1 WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_hashtag_usage_count
  AFTER INSERT OR DELETE ON public.gif_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();

-- ============================================================================
-- VIEW COUNT INCREMENT FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_gif_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_unique THEN
    UPDATE public.gifs SET view_count = view_count + 1 WHERE id = NEW.gif_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_gif_view_count
  AFTER INSERT ON public.view_events
  FOR EACH ROW EXECUTE FUNCTION increment_gif_view_count();

-- ============================================================================
-- CREATE USER PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      LOWER(SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 8))
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth.users is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
