#!/bin/bash
echo "=== Testing CORS Headers ==="

# Test 1: Simple GET (should include CORS headers)
echo -e "\n1. GET /api/v1/gifs (check for Access-Control-Allow-Origin)"
curl -v -X GET http://localhost:3000/api/v1/gifs \
  -H "Origin: chrome-extension://test123" 2>&1 | grep -i "access-control"

# Test 2: OPTIONS preflight
echo -e "\n2. OPTIONS /api/v1/gifs (should return 200/204, not 404)"
curl -v -X OPTIONS http://localhost:3000/api/v1/gifs \
  -H "Origin: chrome-extension://test123" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" 2>&1 | head -20

# Test 3: Verify middleware order
echo -e "\n3. Middleware stack (Rack::Cors should be first)"
cd /Users/jeremywatt/Desktop/ytgify-glue/ytgify-share && \
  doppler run -- bin/rails middleware | grep -n -A2 -B2 "Rack::Cors"
