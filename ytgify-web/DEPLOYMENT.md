# YTgify Production Deployment Guide

## Pre-Deployment Checklist

### 1. Supabase Configuration

#### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-32-character-minimum-secret
```

#### Run Supabase Migrations
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy gif-processing
supabase functions deploy notification-worker
supabase functions deploy email-worker
```

#### Supabase Dashboard Configuration
1. **Storage Bucket**: Create `gifs` bucket with public access
2. **RLS Policies**: Verify all policies are applied
3. **Edge Functions**: Set environment variables:
   - `RESEND_API_KEY` (for email worker)
4. **Realtime**: Enable for `notifications` table
5. **pg_cron**: Enable and verify scheduled jobs

### 2. User Migration

```bash
# Dry run first
RAILS_DATABASE_URL=postgresql://... npm run migrate:users:dry-run

# Execute migration
RAILS_DATABASE_URL=postgresql://... npm run migrate:users
```

### 3. Vercel Deployment

#### Connect Repository
1. Go to vercel.com/new
2. Import `ytgify-glue/ytgify-web`
3. Framework: Next.js (auto-detected)
4. Root Directory: `ytgify-web`

#### Environment Variables
Add these in Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) |

#### Deploy
```bash
# Or push to main branch for auto-deploy
vercel --prod
```

### 4. DNS Configuration

#### Point ytgify.com to Vercel
1. In Vercel project settings → Domains
2. Add `ytgify.com`
3. Update DNS records:
   - `A` record: `76.76.21.21`
   - `CNAME` for www: `cname.vercel-dns.com`

#### SSL
- Vercel automatically provisions SSL certificate

### 5. Post-Deployment Verification

#### API Endpoints
```bash
# Health check
curl https://ytgify.com/api/v1/auth/me

# Feed endpoint
curl https://ytgify.com/api/v1/gifs?type=trending
```

#### Extension Configuration
Update Chrome/Firefox extensions:
- `API_BASE_URL=https://ytgify.com`

### 6. Monitoring

#### Vercel Analytics
- Enable in Vercel dashboard
- Monitor Core Web Vitals

#### Error Tracking
- Consider adding Sentry for error tracking

## Rollback Plan

If issues arise:

1. **Quick Rollback**: In Vercel dashboard, click on previous deployment → Promote to Production

2. **DNS Rollback**: Point ytgify.com back to Railway
   - Update A record to Railway IP
   - Update CNAME if needed

3. **Data Sync**: If user data diverged, may need manual reconciliation

## Post-Cutover Cleanup

See CLEANUP.md for Rails decommissioning steps.
