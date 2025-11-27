#!/bin/bash
set -e

echo "🔍 Rails Backend API Integration Validation"
echo "==========================================="

cd /Users/jeremywatt/Desktop/ytgify-glue/ytgify-share

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: CORS Headers on GET
echo -e "\n📋 Test 1: CORS Headers on GET /api/v1/gifs"
CORS_HEADER=$(curl -s -X GET http://localhost:3000/api/v1/gifs \
  -H "Origin: chrome-extension://test123" -I | grep -i "access-control-allow-origin" || echo "")

if [ -n "$CORS_HEADER" ]; then
  echo -e "${GREEN}✓ PASS${NC}: CORS headers present"
  echo "  $CORS_HEADER"
else
  echo -e "${RED}✗ FAIL${NC}: CORS headers missing"
  exit 1
fi

# Test 2: OPTIONS Preflight
echo -e "\n📋 Test 2: OPTIONS Preflight Request"
OPTIONS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:3000/api/v1/gifs \
  -H "Origin: chrome-extension://test123" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type")

if [ "$OPTIONS_STATUS" = "200" ] || [ "$OPTIONS_STATUS" = "204" ]; then
  echo -e "${GREEN}✓ PASS${NC}: OPTIONS returns $OPTIONS_STATUS"
else
  echo -e "${RED}✗ FAIL${NC}: OPTIONS returns $OPTIONS_STATUS (expected 200 or 204)"
  exit 1
fi

# Test 3: User Authentication
echo -e "\n📋 Test 3: POST /api/v1/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test123" \
  -d '{"user":{"email":"gifmaster@example.com","password":"password123"}}')

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ PASS${NC}: Login successful, JWT token received"
  echo "  Token (first 50 chars): ${TOKEN:0:50}..."
else
  echo -e "${RED}✗ FAIL${NC}: Login failed"
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 4: Authenticated Request
echo -e "\n📋 Test 4: Authenticated GET /api/v1/auth/me"
ME_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: chrome-extension://test123")

if echo "$ME_RESPONSE" | grep -q '"email".*"gifmaster@example.com"'; then
  echo -e "${GREEN}✓ PASS${NC}: Authenticated request successful"
  echo "  User: gifmaster@example.com"
else
  echo -e "${RED}✗ FAIL${NC}: Authenticated request failed"
  echo "  Response: $ME_RESPONSE"
  exit 1
fi

# Summary
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "✅ CORS headers working"
echo "✅ OPTIONS preflight working"
echo "✅ Authentication working"
echo "✅ JWT tokens working"
echo ""
echo "🎉 Backend is ready for Chrome extension integration!"
