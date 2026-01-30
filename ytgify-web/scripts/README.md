# User Migration: Rails → Supabase

This script migrates users from the Rails/Devise database to Supabase Auth while preserving:
- User UUIDs (important for foreign key relationships)
- Bcrypt password hashes (users can continue using their existing passwords)
- Profile data (username, bio, etc.)
- OAuth connections (Google)

## Prerequisites

1. **Rails database access** - Connection string to the production Rails PostgreSQL database
2. **Supabase credentials** - URL and service role key for the target Supabase project

## Setup

Create a `.env.migration` file in the project root:

```bash
# Rails database connection
RAILS_DATABASE_URL=postgresql://user:password@host:5432/ytgify_production

# Supabase target (use staging for testing, production for final migration)
NEXT_PUBLIC_SUPABASE_URL=https://zjhjrsxjxyliqnzskvlq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# Or for staging:
# NEXT_PUBLIC_SUPABASE_URL=https://iapcktekatocpxxkhskd.supabase.co
```

## Running the Migration

### Step 1: Test with Dry Run

First, run in dry-run mode to see what would be migrated without making changes:

```bash
# Load env vars and run dry run
source .env.migration && npm run migrate:users:dry-run
```

This will:
- Connect to the Rails database
- List all users that would be migrated
- Show any potential issues
- NOT make any changes to Supabase

### Step 2: Test on Staging

Run the actual migration against staging first:

```bash
# Set staging credentials in .env.migration, then:
source .env.migration && npm run migrate:users
```

After migration, verify users can log in on staging.

### Step 3: Migrate to Production

Once verified on staging:

```bash
# Update .env.migration with production credentials, then:
source .env.migration && npm run migrate:users
```

## Verification

After migration, you can verify users were migrated correctly:

```sql
-- In Supabase SQL Editor:
SELECT * FROM verify_user_migration('user@example.com');
```

This returns:
- `auth_exists`: User exists in auth.users
- `profile_exists`: User exists in public.users
- `auth_id` / `profile_id`: Should match
- `email_match`: Emails match between tables
- `password_set`: Password hash was migrated

## Post-Migration Cleanup

After verifying the migration is complete and all users can log in:

```sql
-- In Supabase SQL Editor:
SELECT cleanup_migration_functions();
```

This removes the migration-related functions from the database.

## Troubleshooting

### "Connection refused" to Rails database
- Ensure the Rails database is accessible from your machine
- Check firewall rules and database user permissions
- For Railway: Get the connection string from Railway dashboard

### "duplicate key" errors
- Users already exist in Supabase (the script skips duplicates)
- Run with `--dry-run` to see which users would be skipped

### Password not working after migration
- Devise and Supabase both use bcrypt, so hashes should be compatible
- Check that the hash format is `$2a$...` or `$2b$...`
- If issues persist, users can reset their password

### OAuth users
- Google OAuth users are migrated with their provider info in metadata
- They'll need to re-link their Google account on first login in the new system

## What Gets Migrated

| Rails Field | Supabase Location |
|-------------|-------------------|
| id (UUID) | auth.users.id, public.users.id |
| email | auth.users.email, public.users.email |
| encrypted_password | auth.users.encrypted_password |
| username | public.users.username |
| display_name | public.users.display_name |
| bio | public.users.bio |
| website | public.users.website |
| twitter_handle | public.users.twitter_handle |
| youtube_channel | public.users.youtube_channel |
| is_verified | public.users.is_verified |
| gifs_count | public.users.gifs_count |
| follower_count | public.users.follower_count |
| following_count | public.users.following_count |
| preferences | public.users.preferences |
| provider/uid | auth.users.raw_user_meta_data |
| created_at | Preserved in both tables |

## What's NOT Migrated

- `reset_password_token` - Users will need to request new reset tokens
- `sign_in_count`, `last_sign_in_at` - Supabase tracks these separately
- `jti` - Supabase uses different JWT strategy
- Avatar files - Need separate migration (ActiveStorage → Supabase Storage)
