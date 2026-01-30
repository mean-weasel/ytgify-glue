/**
 * User Migration Script: Rails (Devise) → Supabase Auth
 *
 * This script migrates users from the Rails PostgreSQL database to Supabase.
 * It preserves UUIDs to maintain foreign key relationships with other tables.
 *
 * Usage:
 *   npx tsx scripts/migrate-users.ts --dry-run     # Preview migration
 *   npx tsx scripts/migrate-users.ts               # Execute migration
 *   npx tsx scripts/migrate-users.ts --batch=100   # Custom batch size
 *
 * Environment variables required:
 *   RAILS_DATABASE_URL - Connection string to Rails PostgreSQL
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (for admin operations)
 */

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

// Types
interface RailsUser {
  id: string
  email: string
  encrypted_password: string
  username: string
  display_name: string | null
  bio: string | null
  website: string | null
  twitter_handle: string | null
  youtube_channel: string | null
  is_verified: boolean
  gifs_count: number
  total_likes_received: number
  follower_count: number
  following_count: number
  preferences: Record<string, unknown>
  provider: string | null
  uid: string | null
  created_at: Date
  updated_at: Date
}

interface MigrationResult {
  total: number
  successful: number
  failed: number
  skipped: number
  errors: Array<{ userId: string; email: string; error: string }>
}

// Configuration
const config = {
  railsDatabaseUrl: process.env.RAILS_DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  batchSize: 50,
  dryRun: false,
}

// Parse command line arguments
const args = process.argv.slice(2)
for (const arg of args) {
  if (arg === '--dry-run') {
    config.dryRun = true
  } else if (arg.startsWith('--batch=')) {
    config.batchSize = parseInt(arg.split('=')[1], 10)
  }
}

// Validate configuration
function validateConfig() {
  const missing: string[] = []
  if (!config.railsDatabaseUrl) missing.push('RAILS_DATABASE_URL')
  if (!config.supabaseUrl) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach((v) => console.error(`   - ${v}`))
    console.error('\nExample .env.local:')
    console.error('  RAILS_DATABASE_URL=postgresql://user:pass@host:5432/ytgify_production')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...')
    process.exit(1)
  }
}

// Initialize clients
function initClients() {
  const railsPool = new pg.Pool({
    connectionString: config.railsDatabaseUrl,
  })

  const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return { railsPool, supabase }
}

// Fetch users from Rails database
async function fetchRailsUsers(pool: pg.Pool): Promise<RailsUser[]> {
  console.log('📖 Fetching users from Rails database...')

  const result = await pool.query<RailsUser>(`
    SELECT
      id,
      email,
      encrypted_password,
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
      provider,
      uid,
      created_at,
      updated_at
    FROM users
    ORDER BY created_at ASC
  `)

  console.log(`   Found ${result.rows.length} users`)
  return result.rows
}

// Check if user already exists in Supabase
async function userExistsInSupabase(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from('users').select('id').eq('id', userId).single()
  return !!data
}

// Create user in Supabase Auth with preserved UUID and password hash
async function createAuthUser(
  supabase: ReturnType<typeof createClient>,
  user: RailsUser
): Promise<{ success: boolean; error?: string }> {
  // Supabase Admin API to create user with specific ID and password hash
  // Note: This requires using the Supabase Management API or direct SQL

  // For password-based users, we use the admin createUser method
  // For OAuth users, we create them without a password

  const userMetadata: Record<string, unknown> = {
    username: user.username,
    display_name: user.display_name,
    migrated_from: 'rails',
    migrated_at: new Date().toISOString(),
  }

  if (user.provider && user.uid) {
    userMetadata.provider = user.provider
    userMetadata.provider_id = user.uid
  }

  // Use Supabase Admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: undefined, // We'll set the password hash directly via SQL
    email_confirm: true, // Mark email as confirmed since they were verified in Rails
    user_metadata: userMetadata,
    app_metadata: {
      provider: user.provider || 'email',
      providers: user.provider ? [user.provider] : ['email'],
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Now we need to:
  // 1. Update the auth.users id to match the Rails UUID
  // 2. Copy the bcrypt password hash
  // This requires direct database access via SQL

  return { success: true }
}

// Migrate a single user
async function migrateUser(
  supabase: ReturnType<typeof createClient>,
  user: RailsUser,
  dryRun: boolean
): Promise<{ success: boolean; skipped: boolean; error?: string }> {
  // Check if user already exists
  const exists = await userExistsInSupabase(supabase, user.id)
  if (exists) {
    return { success: true, skipped: true }
  }

  if (dryRun) {
    console.log(`   [DRY RUN] Would migrate: ${user.email} (${user.username})`)
    return { success: true, skipped: false }
  }

  // For the actual migration, we need to use direct SQL because:
  // 1. We need to preserve the UUID from Rails
  // 2. We need to copy the bcrypt password hash directly
  // 3. Supabase Admin API doesn't support setting custom UUIDs

  // This will be done via Supabase SQL or a stored procedure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('migrate_user_from_rails', {
    p_user_id: user.id,
    p_email: user.email,
    p_encrypted_password: user.encrypted_password,
    p_username: user.username,
    p_display_name: user.display_name,
    p_bio: user.bio,
    p_website: user.website,
    p_twitter_handle: user.twitter_handle,
    p_youtube_channel: user.youtube_channel,
    p_is_verified: user.is_verified,
    p_gifs_count: user.gifs_count,
    p_total_likes_received: user.total_likes_received,
    p_follower_count: user.follower_count,
    p_following_count: user.following_count,
    p_preferences: user.preferences,
    p_provider: user.provider,
    p_provider_id: user.uid,
    p_created_at: user.created_at.toISOString(),
  })

  if (error) {
    return { success: false, skipped: false, error: error.message }
  }

  return { success: true, skipped: false }
}

// Main migration function
async function migrate(): Promise<MigrationResult> {
  validateConfig()

  console.log('🚀 Starting user migration: Rails → Supabase')
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Batch size: ${config.batchSize}`)
  console.log('')

  const { railsPool, supabase } = initClients()

  const result: MigrationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  try {
    // Fetch all users from Rails
    const users = await fetchRailsUsers(railsPool)
    result.total = users.length

    if (users.length === 0) {
      console.log('✅ No users to migrate')
      return result
    }

    // Process in batches
    console.log(`\n📤 Migrating users to Supabase...`)

    for (let i = 0; i < users.length; i += config.batchSize) {
      const batch = users.slice(i, i + config.batchSize)
      const batchNum = Math.floor(i / config.batchSize) + 1
      const totalBatches = Math.ceil(users.length / config.batchSize)

      console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} users)`)

      for (const user of batch) {
        const { success, skipped, error } = await migrateUser(supabase, user, config.dryRun)

        if (skipped) {
          result.skipped++
        } else if (success) {
          result.successful++
        } else {
          result.failed++
          result.errors.push({
            userId: user.id,
            email: user.email,
            error: error || 'Unknown error',
          })
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary')
    console.log('='.repeat(50))
    console.log(`   Total users:     ${result.total}`)
    console.log(`   Successful:      ${result.successful}`)
    console.log(`   Skipped:         ${result.skipped}`)
    console.log(`   Failed:          ${result.failed}`)

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach((e) => {
        console.log(`   - ${e.email}: ${e.error}`)
      })
    }

    if (config.dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.')
      console.log('   Run without --dry-run to execute migration.')
    }

    return result
  } finally {
    await railsPool.end()
  }
}

// Run migration
migrate()
  .then((result) => {
    if (result.failed > 0) {
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
