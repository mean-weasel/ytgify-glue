# Rails App Decommissioning Guide

## Overview

After successful migration to Next.js + Supabase, follow these steps to decommission the Rails application.

## Pre-Cleanup Verification

Before decommissioning, verify:

- [ ] All users successfully migrated to Supabase Auth
- [ ] All GIFs accessible through new app
- [ ] Extension uploads working with new API
- [ ] No active sessions on Rails app
- [ ] DNS fully propagated to Vercel
- [ ] At least 1 week of stable production on new stack

## Cleanup Steps

### 1. Archive Rails Database

```bash
# Export full database backup
pg_dump -h <host> -U <user> -d ytgify_production > ytgify_rails_final_backup.sql

# Compress and store
gzip ytgify_rails_final_backup.sql
# Upload to S3 or secure storage
```

### 2. Archive Rails Codebase

The Rails app is in `ytgify-share/`. Keep it archived but don't delete:

```bash
# Tag the final version
cd ytgify-share
git tag -a v1.0.0-final-rails "Final Rails version before Next.js migration"
git push origin v1.0.0-final-rails
```

### 3. Deactivate Railway

1. Go to Railway dashboard
2. Navigate to ytgify-share service
3. Click "Settings" → "Danger Zone" → "Delete Service"
4. Remove associated PostgreSQL database after data verification

### 4. Update Repository Structure

After migration is complete and stable:

```bash
# Remove Rails-specific CI workflows
rm .github/workflows/rails.yml

# Update root CLAUDE.md to remove Rails references
# Keep ytgify-share/ archived but documented as deprecated
```

### 5. Clean Up Doppler

1. Go to Doppler dashboard
2. Archive `ytgify-share` project configurations
3. Keep `ytgify` (extension) project active

### 6. DNS Cleanup

If using Railway's domain:
- Remove any Railway DNS records
- Ensure only Vercel records remain

### 7. Storage Migration

If Rails used different storage (AWS S3 with different bucket):

```bash
# Sync old GIFs to new Supabase storage if needed
aws s3 sync s3://ytgify-rails-bucket s3://ytgify-supabase-bucket
```

## Post-Cleanup Verification

- [ ] ytgify.com loads correctly
- [ ] All app routes working
- [ ] API endpoints responding
- [ ] Extensions can upload
- [ ] iOS app (Capacitor) working
- [ ] No 404s or broken links

## Keep for Reference

Don't delete these immediately:

1. **Database backup** - Keep for at least 6 months
2. **Rails codebase** - Keep archived in git
3. **Doppler configs** - Archive, don't delete
4. **S3 buckets** - Ensure all assets migrated before deletion

## Timeline

| Day | Action |
|-----|--------|
| 0 | Production cutover to Vercel |
| 7 | Verify stability, deactivate Railway |
| 14 | Archive Doppler configs |
| 30 | Clean up any remaining resources |
| 180 | Consider deleting archived backups |

## Emergency Contacts

If issues arise during cleanup:

- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com
- Railway Support: support@railway.app
