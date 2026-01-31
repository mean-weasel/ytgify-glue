/**
 * Seed Test User Script
 *
 * Creates an integration test user in Supabase for running integration tests.
 * The user is created in both Supabase Auth and the users table.
 *
 * Usage:
 *   npx tsx scripts/seed-test-user.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (for admin operations)
 */

import { createClient } from '@supabase/supabase-js'

const TEST_USER = {
  email: 'integration-test@example.com',
  password: 'password123',
  username: 'integration_test',
  display_name: 'Integration Test User',
}

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

// Validate configuration
function validateConfig() {
  const missing: string[] = []
  if (!config.supabaseUrl) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach((v) => console.error(`   - ${v}`))
    console.error('\nExample .env.local:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...')
    process.exit(1)
  }
}

async function seedTestUser() {
  validateConfig()

  console.log('🌱 Seeding integration test user...\n')

  const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Check if user already exists
  const { data: existingUsers } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', TEST_USER.email)
    .limit(1)

  if (existingUsers && existingUsers.length > 0) {
    console.log('✓ Test user already exists:')
    console.log(`  Email: ${TEST_USER.email}`)
    console.log(`  ID: ${existingUsers[0].id}`)
    console.log('\n✅ Ready for integration tests!')
    return
  }

  // Create auth user using admin API
  console.log('Creating Supabase Auth user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true, // Auto-confirm email for testing
    user_metadata: {
      username: TEST_USER.username,
    },
  })

  if (authError) {
    // Check if user already exists in auth but not in users table
    if (authError.message.includes('already been registered')) {
      console.log('Auth user already exists, checking users table...')

      // Get the auth user to get their ID
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const existingAuthUser = authUsers.users.find(u => u.email === TEST_USER.email)

      if (existingAuthUser) {
        // Create the users table entry
        const { error: insertError } = await supabase.from('users').insert({
          id: existingAuthUser.id,
          email: TEST_USER.email,
          username: TEST_USER.username,
          display_name: TEST_USER.display_name,
        })

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('❌ Failed to create users table entry:', insertError.message)
          process.exit(1)
        }

        console.log('✓ Created users table entry for existing auth user')
        console.log(`  ID: ${existingAuthUser.id}`)
      }
    } else {
      console.error('❌ Failed to create auth user:', authError.message)
      process.exit(1)
    }
  } else if (authData.user) {
    console.log(`✓ Created auth user: ${authData.user.id}`)

    // Create corresponding entry in users table
    console.log('Creating users table entry...')
    const { error: insertError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: TEST_USER.email,
      username: TEST_USER.username,
      display_name: TEST_USER.display_name,
    })

    if (insertError) {
      console.error('❌ Failed to create users table entry:', insertError.message)
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      process.exit(1)
    }

    console.log('✓ Created users table entry')
  }

  console.log('\n✅ Test user seeded successfully!')
  console.log('\nTest credentials:')
  console.log(`  Email: ${TEST_USER.email}`)
  console.log(`  Password: ${TEST_USER.password}`)
  console.log('\nYou can now run integration tests with:')
  console.log('  npm run test:integration')
}

// Run
seedTestUser().catch((error) => {
  console.error('❌ Seed script failed:', error)
  process.exit(1)
})
