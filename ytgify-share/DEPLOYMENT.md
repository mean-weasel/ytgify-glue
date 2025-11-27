# Deployment Guide

**Application:** ytgify
**Stack:** Rails 8.0.4 + Hotwire + PostgreSQL + Redis
**Deployment:** Kamal (Docker-based)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`bin/rails test`)
- [ ] No security vulnerabilities (`bundle exec brakeman -z`)
- [ ] Dependencies up-to-date (`bundle exec bundler-audit check`)
- [ ] Assets compile successfully (`RAILS_ENV=production bin/rails assets:precompile`)

### Configuration
- [ ] Production credentials configured
- [ ] Environment variables set (see below)
- [ ] Database migrations ready
- [ ] S3 bucket configured
- [ ] Domain DNS configured

### Infrastructure
- [ ] Production server provisioned (minimum 2GB RAM, 2 CPUs)
- [ ] PostgreSQL database created (version 14+)
- [ ] Redis instance running (version 7+)
- [ ] SSL certificate configured
- [ ] Firewall configured (ports 80, 443, 22)

---

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/ytgify_production

# Redis (for caching, Solid Queue, Solid Cable)
REDIS_URL=redis://host:6379/0

# Rails
RAILS_ENV=production
SECRET_KEY_BASE=<generate with: bin/rails secret>
RAILS_LOG_TO_STDOUT=true
RAILS_SERVE_STATIC_FILES=true

# JWT Authentication
JWT_SECRET_KEY=<generate with: bin/rails secret>
JWT_REFRESH_SECRET_KEY=<generate with: bin/rails secret>

# AWS S3 (for ActiveStorage)
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET=ytgify-production
AWS_S3_REGION=us-east-1

# Application
RAILS_MAX_THREADS=5
WEB_CONCURRENCY=2
```

### Optional

```bash
# Error Tracking (Sentry)
SENTRY_DSN=<your-sentry-dsn>

# Performance Monitoring
SCOUT_KEY=<your-scout-key>

# Email (if configured)
SMTP_ADDRESS=smtp.example.com
SMTP_PORT=587
SMTP_DOMAIN=yourdomain.com
SMTP_USERNAME=<username>
SMTP_PASSWORD=<password>
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

---

## Deployment Methods

### Method 1: Kamal (Recommended)

Kamal provides zero-downtime deployments with Docker.

#### Initial Setup

```bash
# 1. Install Kamal
gem install kamal

# 2. Initialize Kamal configuration
kamal init

# 3. Configure deployment (edit config/deploy.yml)
service: ytgify
image: your-username/ytgify

servers:
  web:
    hosts:
      - YOUR_SERVER_IP
    options:
      network: "private"

registry:
  username: your-dockerhub-username
  password:
    - DOCKER_PASSWORD

env:
  secret:
    - DATABASE_URL
    - REDIS_URL
    - SECRET_KEY_BASE
    # ... other secrets

# 4. Set environment variables on server
kamal env push

# 5. Bootstrap server (first time only)
kamal server bootstrap

# 6. Deploy
kamal deploy
```

#### Regular Deployment

```bash
# Deploy latest changes
git push origin main
kamal deploy

# Run migrations (if needed)
kamal app exec 'bin/rails db:migrate'

# Warm caches
kamal app exec 'bin/rails cache:warm'
```

#### Rollback

```bash
# Rollback to previous version
kamal rollback

# Check deployment history
kamal app details
```

### Method 2: Docker Compose (Alternative)

For simpler single-server deployments.

```bash
# 1. Build image
docker build -t ytgify .

# 2. Run with docker-compose
docker-compose up -d

# 3. Run migrations
docker-compose exec web bin/rails db:migrate

# 4. Check logs
docker-compose logs -f web
```

### Method 3: Traditional (Capistrano)

See `config/deploy.rb` for Capistrano configuration.

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Application health
curl https://yourdomain.com/up
# Expected: 200 OK

# Home page
curl -I https://yourdomain.com/
# Expected: 200 OK with HTML

# API health
curl https://yourdomain.com/api/v1/health
# Expected: {"status":"ok"}
```

### 2. Database Verification

```bash
# Check migrations
kamal app exec 'bin/rails db:migrate:status'

# Verify connection
kamal app exec 'bin/rails runner "puts User.count"'

# Check indexes
kamal app exec 'bin/rails runner "puts ActiveRecord::Base.connection.indexes(:gifs).map(&:name)"'
```

### 3. Cache Verification

```bash
# Check Redis connection
kamal app exec 'bin/rails runner "puts Rails.cache.redis.ping"'

# Warm caches
kamal app exec 'bin/rails cache:warm'

# Check cache stats
kamal app exec 'bin/rails cache:stats'
```

### 4. Background Jobs

```bash
# Check Solid Queue
kamal app exec 'bin/rails runner "puts SolidQueue::Job.count"'

# Process pending jobs
kamal app exec 'bin/rails solid_queue:start'
```

### 5. Monitor Logs

```bash
# Tail application logs
kamal app logs -f

# Check for errors
kamal app logs | grep ERROR

# Check performance
kamal app logs | grep "Completed.*in.*ms"
```

---

## Performance Optimization

### 1. Enable Caching

Caching is automatically enabled in production. Monitor cache hit rates:

```bash
kamal app exec 'bin/rails cache:stats'
```

### 2. Database Connection Pool

Adjust based on your server capacity:

```ruby
# config/database.yml
production:
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
```

### 3. Asset Compression

Assets are automatically compressed with gzip in production.

### 4. CDN (Optional)

Configure CloudFront or similar CDN for static assets:

```ruby
# config/environments/production.rb
config.asset_host = 'https://cdn.yourdomain.com'
```

---

## Monitoring

### Application Metrics

- **Response Time:** Target < 200ms (p95)
- **Error Rate:** Target < 0.1%
- **Uptime:** Target > 99.9%
- **Cache Hit Rate:** Target > 80%

### Database Metrics

- **Active Connections:** < 80% of pool size
- **Query Time:** < 100ms average
- **Slow Queries:** Log queries > 1s

### Redis Metrics

- **Memory Usage:** < 90% of max
- **Connected Clients:** Monitor for leaks
- **Keys:** Track growth over time

### Tools

1. **Built-in Rails Logs:**
   ```bash
   kamal app logs -f
   ```

2. **System Metrics:**
   ```bash
   kamal app exec 'free -h'  # Memory
   kamal app exec 'df -h'     # Disk
   ```

3. **Application Performance Monitoring (APM):**
   - Scout APM
   - New Relic
   - Datadog

4. **Error Tracking:**
   - Sentry
   - Honeybadger
   - Rollbar

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
kamal app logs --tail 100

# Common causes:
# - Missing environment variable
# - Database connection failed
# - Redis connection failed

# Verify environment
kamal env

# Test database connection
kamal app exec 'bin/rails runner "ActiveRecord::Base.connection"'

# Test Redis connection
kamal app exec 'bin/rails runner "Rails.cache.redis.ping"'
```

### Slow Performance

```bash
# Check for N+1 queries (if Bullet enabled)
kamal app logs | grep "N+1"

# Check slow queries
kamal app logs | grep "SLOW"

# Warm caches
kamal app exec 'bin/rails cache:warm'

# Check memory
kamal app exec 'free -h'
```

### Database Connection Issues

```bash
# Check connection pool
kamal app logs | grep "could not obtain a connection"

# Increase pool size
# Edit DATABASE_URL to include ?pool=20

# Restart application
kamal app restart
```

### Out of Memory

```bash
# Check memory usage
kamal app exec 'free -h'

# Check process memory
kamal app exec 'ps aux --sort=-%mem | head'

# Restart application (frees memory)
kamal app restart

# Consider upgrading server resources
```

---

## Maintenance

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20250108_120000.sql
```

**Automated Backups (Recommended):**
- Configure daily backups on your database host
- Retain daily backups for 7 days
- Retain weekly backups for 4 weeks
- Retain monthly backups for 12 months
- Test restoration process monthly

### Security Updates

```bash
# Check for vulnerabilities
bundle exec bundler-audit check --update

# Update gems
bundle update

# Test
bin/rails test

# Deploy
kamal deploy
```

### Log Rotation

Logs are automatically rotated by Docker. Configure retention:

```yaml
# docker-compose.yml or kamal config
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Cache Management

```bash
# Warm caches after deployment
kamal app exec 'bin/rails cache:warm'

# Clear specific caches
kamal app exec 'bin/rails cache:clear:trending'

# Clear all caches
kamal app exec 'bin/rails cache:clear'
```

---

## Scaling

### Horizontal Scaling

Add more servers to handle increased traffic:

```yaml
# config/deploy.yml
servers:
  web:
    hosts:
      - 1.2.3.4
      - 5.6.7.8
    options:
      network: "private"
```

### Vertical Scaling

Increase server resources and adjust configuration:

```bash
# Increase workers
export WEB_CONCURRENCY=4

# Increase threads
export RAILS_MAX_THREADS=10
```

### Database Scaling

1. **Connection Pooling:** Use PgBouncer
2. **Read Replicas:** Separate read/write operations
3. **Query Optimization:** Add indexes, use caching

### Caching Strategy

1. **Application Caching:** Already implemented (Solid Cache)
2. **CDN:** CloudFront for static assets
3. **Database Query Caching:** Enabled by default
4. **Fragment Caching:** Already implemented for GIF cards

---

## Security Checklist

- [ ] All secrets stored in encrypted credentials
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting enabled (Rack::Attack)
- [ ] Database credentials secured
- [ ] Server firewall configured
- [ ] SSH keys only (no password authentication)
- [ ] Regular security updates applied
- [ ] Error pages don't expose sensitive info
- [ ] Logs don't contain sensitive data

---

## Support

- **Documentation:** See README.md
- **Operations:** See RUNBOOK.md
- **API:** See API.md
- **Issues:** GitHub Issues

---

## Quick Command Reference

```bash
# Deploy
kamal deploy

# Rollback
kamal rollback

# Logs
kamal app logs -f

# Console
kamal app exec -i 'bin/rails console'

# Migrations
kamal app exec 'bin/rails db:migrate'

# Cache management
kamal app exec 'bin/rails cache:warm'
kamal app exec 'bin/rails cache:clear'

# Restart
kamal app restart

# Environment
kamal env push
```
