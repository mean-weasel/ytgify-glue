# Performance & Security

**Related:** [Architecture](04-ARCHITECTURE.md) | [Monitoring](12-MONITORING-LEGAL.md)

---

## 5. Performance & Scalability

### 5.1 Performance Targets
- Page load time: < 2 seconds (server-rendered HTML)
- GIF load time: < 1 second (via CDN)
- API response time: < 200ms (p95)
- Search results: < 500ms (PostgreSQL full-text search)

### 5.2 Optimization Strategies
- **Frontend:**
  - Minimal JavaScript bundle (Hotwire + small Stimulus controllers)
  - Lazy loading GIFs (IntersectionObserver via **Stimulus**)
  - Service worker for caching (via **serviceworker-rails** gem)
  - Tailwind CSS purging (only include used classes)
- **Backend:**
  - Database query optimization (proper indexes, `includes` for N+1 prevention)
  - Fragment caching (Russian doll caching for GIF partials)
  - Redis caching for frequently accessed data (trending GIFs, popular tags)
  - Pagination for all list endpoints (via **pagy** gem)
- **Storage:**
  - CloudFront CDN for all static assets
  - Edge caching (long TTL for immutable GIFs)
  - Compression (gzip, brotli via Rack middleware)

### 5.3 Scalability Considerations
- Horizontal scaling (multiple Puma instances behind load balancer)
- Database read replicas for heavy read traffic (via **makara** gem)
- Redis cluster for caching and Sidekiq
- Separate storage for hot (recent) vs cold (old) GIFs
- Background job queue scaling (multiple Sidekiq workers)

---

## 6. Security & Privacy

### 6.1 Security Measures
- HTTPS everywhere (via **Let's Encrypt** or cloud provider SSL)
- SQL injection prevention (ActiveRecord parameterized queries)
- XSS prevention (ERB auto-escaping, CSP headers via **secure_headers** gem)
- CSRF tokens (Rails default for all forms)
- Rate limiting via **Rack::Attack** (to prevent abuse)
- Secure password hashing (bcrypt via Devise)
- Regular security audits (via **bundler-audit**, **brakeman**)
- Dependency updates (automated with **Dependabot**)

### 6.2 Privacy Considerations
- GDPR compliance (if EU users):
  - Right to access data (export feature)
  - Right to delete account (destroy action with cascading deletes)
  - Cookie consent (via **cookie_consent** gem)
  - Privacy policy page
- Terms of Service page
- Clear data retention policy
- User data export option (CSV/JSON download)
- Anonymize analytics data
