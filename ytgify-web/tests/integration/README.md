# Integration Tests

These tests verify the full Extension → Backend API → Database flow.

## Prerequisites

### 1. Supabase Project Setup

#### Storage Bucket

Create a `gifs` bucket in Supabase Storage:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Name: `gifs`
5. Set to **Public** (for public GIF URLs)
6. Save

Add a storage policy for authenticated uploads:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload GIFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gifs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public GIF access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gifs');

-- Allow users to delete their own GIFs
CREATE POLICY "Users can delete their GIFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gifs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Test User

Seed the test user by running:

```bash
# Set environment variables first
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run the seed script
npm run seed:test-user
```

Or create manually in Supabase:
- Email: `integration-test@example.com`
- Password: `password123`
- Username: `integration_test`

### 2. Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-jwt-secret-at-least-32-characters
```

### 3. Start the Backend

```bash
npm run dev
```

The backend should be running at http://localhost:3000.

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run with browser UI
npm run test:integration:headed

# Debug mode
npm run test:integration:debug
```

## Test Coverage

The integration tests cover:

1. **Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Token refresh
   - Get current user

2. **GIF Operations**
   - Upload GIF (multipart form with Rails-style keys)
   - Retrieve GIF by ID
   - List GIFs from feed
   - Delete GIF

3. **Error Handling**
   - 404 for non-existent resources
   - 401 for unauthorized requests
   - Invalid token handling

## Test Fixtures

- `fixtures/test.gif` - Minimal 1x1 pixel GIF for upload tests

## Troubleshooting

### "Failed to authenticate" error

1. Verify the test user exists in Supabase
2. Check that the password is correct
3. Run `npm run seed:test-user` to create/verify the test user

### "Failed to upload file" error

1. Verify the `gifs` storage bucket exists
2. Check storage policies are configured
3. Ensure the service role key has storage permissions

### Connection refused

1. Make sure the backend is running (`npm run dev`)
2. Check the `BACKEND_URL` environment variable (defaults to http://localhost:3000)
