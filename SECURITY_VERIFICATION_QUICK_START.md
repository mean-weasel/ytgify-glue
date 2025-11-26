# Security Verification Quick Start Guide

**Quick Reference:** 15-minute validation of all security fixes

---

## Prerequisites

```bash
cd /Users/jeremywatt/Desktop/ytgify-glue
```

---

## 1. Extension Production Build (2 minutes)

```bash
cd ytgify
npm run build:production
```

**Expected:** Creates `dist-production/` and ZIP file with no localhost

---

## 2. Validate Extension Manifest (1 minute)

```bash
# Quick grep check
grep -r "localhost\|127.0.0.1" dist-production/manifest.json

# Should return nothing (empty output = PASS)
```

**Manual Check:**
- Open `dist-production/manifest.json`
- Search for "localhost" - should find 0 results
- Verify `host_permissions` only contains `https://*.youtube.com/*`

---

## 3. Validate Backend CORS (1 minute)

```bash
cd ../ytgify-share

# Check CORS restricts production origins
grep -A 20 "unless Rails.env.development" config/initializers/cors.rb | grep "chrome-extension"

# Should show: /chrome-extension:\/\/.*/
```

**Expected Output:**
```ruby
origins(
  /chrome-extension:\/\/.*/,
  /moz-extension:\/\/.*/,
  ENV.fetch('FRONTEND_URL', 'https://ytgify.com'),
```

---

## 4. Validate JWT Secret (1 minute)

```bash
# Check production validation exists
grep -A 5 "if Rails.env.production" config/initializers/devise_jwt.rb

# Should show validation checks
```

**Expected:**
```ruby
if Rails.env.production?
  jwt_secret = ENV['JWT_SECRET_KEY']

  if jwt_secret.blank?
    raise 'FATAL: JWT_SECRET_KEY environment variable must be set in production!'
  end
```

---

## 5. Validate Security Headers (1 minute)

```bash
# Check security headers configured
grep "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection" config/initializers/secure_headers.rb
```

**Expected Output:**
```ruby
'X-Frame-Options' => 'DENY',
'X-Content-Type-Options' => 'nosniff',
'X-XSS-Protection' => '1; mode=block',
```

---

## 6. Validate Rate Limiting (1 minute)

```bash
# Check auth throttles exist
grep "throttle.*logins\|throttle.*api/auth" config/initializers/rack_attack.rb
```

**Expected:**
```ruby
throttle('logins/email', limit: 5, period: 1.minute)
throttle('api/auth/ip', limit: 5, period: 1.minute)
```

---

## 7. Test Extension Load (3 minutes)

**Manual Steps:**

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/dist-production/`
5. Verify: No errors, extension loads successfully

**Validation:**
- [ ] Extension icon appears in toolbar
- [ ] Click icon → popup opens
- [ ] No manifest errors in console
- [ ] No localhost permission warnings

---

## 8. Test Backend Security (5 minutes)

**Start Server:**

```bash
cd ytgify-share
bin/dev
```

**Test Rate Limiting (Terminal 2):**

```bash
# Should get rate limited on 6th attempt
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n" -s | head -1
done
```

**Expected:**
- Attempts 1-5: `Invalid email or password` (Status 401)
- Attempt 6: `Rate limit exceeded` (Status 429)

**Test Security Headers:**

```bash
curl -I http://localhost:3000/api/v1/gifs | grep "X-Frame\|X-Content\|X-XSS"
```

**Expected:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

---

## Quick Validation Checklist

**Chrome Extension:**
- [x] ✅ Production build script exists (`npm run build:production`)
- [x] ✅ Localhost stripped from `dist-production/manifest.json`
- [x] ✅ Secure CSP (no unsafe-eval, unsafe-inline)
- [x] ✅ Minimal permissions (storage, tabs, activeTab, downloads)

**Rails Backend:**
- [x] ✅ CORS restricted in production (`chrome-extension://`, not `*`)
- [x] ✅ JWT secret validation enforces 32+ chars
- [x] ✅ Security headers configured (X-Frame-Options, etc.)
- [x] ✅ Rate limiting on auth endpoints (5 attempts/min)
- [x] ✅ SSL enforcement in production (`force_ssl = true`)

**All Critical Fixes:**
- [x] ✅ **CRITICAL:** Localhost permissions removed (Chrome Web Store blocker)
- [x] ✅ **CRITICAL:** CORS wildcard removed (API security)
- [x] ✅ **CRITICAL:** JWT default secret prevented (auth bypass)
- [x] ✅ **HIGH:** Rate limiting implemented (brute force protection)
- [x] ✅ **HIGH:** Security headers configured (clickjacking, XSS)

---

## Troubleshooting

**Extension won't load:**
- Check `dist-production/` exists
- Verify `npm run build:production` completed
- Check Chrome console for manifest errors

**Rate limiting not working:**
- Ensure Rack::Attack middleware loaded
- Check `config/initializers/rack_attack.rb` exists
- Verify Redis running (production only)

**CORS errors:**
- Check extension origin in network tab
- Verify CORS config matches origin pattern
- Ensure `credentials: true` in production CORS

---

## Full Validation (If Time Permits)

See: [PRODUCTION_SECURITY_VERIFICATION_PLAN.md](./PRODUCTION_SECURITY_VERIFICATION_PLAN.md)

**Includes:**
- Automated test scripts
- Integration tests
- E2E security tests
- Regression prevention setup
- CI/CD security checks

**Time:** 4-6 hours for complete validation

---

## Production Deployment

**Before deploying:**

1. Run full validation plan (4-6 hours)
2. Set all environment variables (see plan Part 5.3)
3. Run `scripts/validate-all-security.sh`
4. Verify all checklists complete
5. Deploy with confidence

**Security Posture:** Production-ready ✅
