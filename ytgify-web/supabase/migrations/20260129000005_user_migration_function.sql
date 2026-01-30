-- User Migration Function: Rails (Devise) → Supabase Auth
-- This function migrates users preserving their UUIDs and bcrypt password hashes.
--
-- Devise and Supabase Auth both use bcrypt, so password hashes are compatible.
-- The function:
-- 1. Inserts into auth.users with the original UUID and password hash
-- 2. Inserts profile data into public.users
-- 3. Handles OAuth users (Google) by storing provider info in metadata

-- Create the migration function
CREATE OR REPLACE FUNCTION migrate_user_from_rails(
  p_user_id UUID,
  p_email TEXT,
  p_encrypted_password TEXT,
  p_username TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_twitter_handle TEXT DEFAULT NULL,
  p_youtube_channel TEXT DEFAULT NULL,
  p_is_verified BOOLEAN DEFAULT FALSE,
  p_gifs_count INTEGER DEFAULT 0,
  p_total_likes_received INTEGER DEFAULT 0,
  p_follower_count INTEGER DEFAULT 0,
  p_following_count INTEGER DEFAULT 0,
  p_preferences JSONB DEFAULT '{"default_privacy": "public", "recently_used_tags": [], "default_upload_behavior": "show_options"}'::jsonb,
  p_provider TEXT DEFAULT NULL,
  p_provider_id TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_instance_id UUID;
  v_raw_app_meta JSONB;
  v_raw_user_meta JSONB;
BEGIN
  -- Get the Supabase instance ID (required for auth.users)
  SELECT COALESCE(
    (SELECT id FROM auth.schema_migrations LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  ) INTO v_instance_id;

  -- Build app metadata
  IF p_provider IS NOT NULL THEN
    v_raw_app_meta := jsonb_build_object(
      'provider', p_provider,
      'providers', jsonb_build_array(p_provider)
    );
  ELSE
    v_raw_app_meta := jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    );
  END IF;

  -- Build user metadata
  v_raw_user_meta := jsonb_build_object(
    'username', p_username,
    'display_name', COALESCE(p_display_name, p_username),
    'migrated_from', 'rails',
    'migrated_at', NOW()
  );

  IF p_provider IS NOT NULL AND p_provider_id IS NOT NULL THEN
    v_raw_user_meta := v_raw_user_meta || jsonb_build_object(
      'provider', p_provider,
      'provider_id', p_provider_id
    );
  END IF;

  -- Insert into auth.users with the original UUID and password hash
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    p_user_id,
    v_instance_id,
    p_email,
    p_encrypted_password,  -- Bcrypt hash from Devise (compatible!)
    p_created_at,          -- Mark as confirmed (they were in Rails)
    v_raw_app_meta,
    v_raw_user_meta,
    'authenticated',
    'authenticated',
    p_created_at,
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into public.users profile table
  INSERT INTO public.users (
    id,
    email,
    username,
    display_name,
    bio,
    website,
    twitter_handle,
    youtube_channel,
    is_verified,
    gifs_count,
    total_likes_received,
    follower_count,
    following_count,
    preferences,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_email,
    p_username,
    COALESCE(p_display_name, p_username),
    p_bio,
    p_website,
    p_twitter_handle,
    p_youtube_channel,
    p_is_verified,
    p_gifs_count,
    p_total_likes_received,
    p_follower_count,
    p_following_count,
    p_preferences,
    p_created_at,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN p_user_id;
END;
$$;

-- Grant execute permission to service role (for migration script)
GRANT EXECUTE ON FUNCTION migrate_user_from_rails TO service_role;

-- Add comment explaining the function
COMMENT ON FUNCTION migrate_user_from_rails IS
'Migrates a user from Rails/Devise to Supabase Auth.
Preserves the original UUID and bcrypt password hash.
Used by the user migration script (scripts/migrate-users.ts).
After migration is complete, this function can be dropped.';


-- ============================================================================
-- Helper function to verify migration
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_user_migration(p_email TEXT)
RETURNS TABLE (
  auth_exists BOOLEAN,
  profile_exists BOOLEAN,
  auth_id UUID,
  profile_id UUID,
  email_match BOOLEAN,
  password_set BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) as auth_exists,
    EXISTS(SELECT 1 FROM public.users WHERE email = p_email) as profile_exists,
    (SELECT id FROM auth.users WHERE email = p_email) as auth_id,
    (SELECT id FROM public.users WHERE email = p_email) as profile_id,
    (SELECT au.email = pu.email
     FROM auth.users au
     JOIN public.users pu ON au.id = pu.id
     WHERE au.email = p_email) as email_match,
    (SELECT encrypted_password IS NOT NULL AND encrypted_password != ''
     FROM auth.users WHERE email = p_email) as password_set;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_user_migration TO service_role;

COMMENT ON FUNCTION verify_user_migration IS
'Verifies that a user was migrated correctly.
Returns status of auth.users and public.users records.';


-- ============================================================================
-- Cleanup function (run after migration is complete)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_migration_functions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DROP FUNCTION IF EXISTS migrate_user_from_rails;
  DROP FUNCTION IF EXISTS verify_user_migration;
  DROP FUNCTION IF EXISTS cleanup_migration_functions;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_migration_functions TO service_role;

COMMENT ON FUNCTION cleanup_migration_functions IS
'Removes all migration-related functions after migration is complete.
Run this after verifying the migration was successful.';
