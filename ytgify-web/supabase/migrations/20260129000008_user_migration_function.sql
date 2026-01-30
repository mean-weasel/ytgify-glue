-- User Migration Function
-- Migrates users from Rails Devise to Supabase Auth while preserving UUIDs

-- This function is called by the migration script to:
-- 1. Create a user in auth.users with the preserved UUID
-- 2. Copy the bcrypt password hash from Devise
-- 3. Create the profile in public.users

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
  p_preferences JSONB DEFAULT '{}',
  p_provider TEXT DEFAULT NULL,
  p_provider_id TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
  v_instance_id UUID;
  v_aud TEXT;
BEGIN
  -- Get instance_id and aud from existing auth config
  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  v_aud := 'authenticated';

  -- Insert into auth.users with preserved UUID
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_instance_id,
    v_aud,
    'authenticated',
    p_email,
    p_encrypted_password, -- Devise bcrypt hash is compatible with Supabase
    NOW(), -- Mark email as confirmed
    NOW(),
    jsonb_build_object(
      'provider', COALESCE(p_provider, 'email'),
      'providers', ARRAY[COALESCE(p_provider, 'email')]
    ),
    jsonb_build_object(
      'username', p_username,
      'display_name', p_display_name,
      'migrated_from', 'rails',
      'migrated_at', NOW()
    ),
    FALSE,
    p_created_at,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into auth.identities if this is an OAuth user
  IF p_provider IS NOT NULL AND p_provider_id IS NOT NULL THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      p_provider_id,
      p_provider,
      jsonb_build_object(
        'sub', p_provider_id,
        'email', p_email
      ),
      NOW(),
      p_created_at,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

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
    p_display_name,
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
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    website = EXCLUDED.website,
    twitter_handle = EXCLUDED.twitter_handle,
    youtube_channel = EXCLUDED.youtube_channel,
    is_verified = EXCLUDED.is_verified,
    gifs_count = EXCLUDED.gifs_count,
    total_likes_received = EXCLUDED.total_likes_received,
    follower_count = EXCLUDED.follower_count,
    following_count = EXCLUDED.following_count,
    preferences = EXCLUDED.preferences,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION migrate_user_from_rails TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION migrate_user_from_rails IS
'Migrates a user from Rails Devise to Supabase Auth, preserving the UUID and password hash.
Called by the migration script in scripts/migrate-users.ts';
