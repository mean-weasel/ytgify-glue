# YTGify Development Makefile
#
# Doppler Projects:
#   - ytgify: Chrome extension (env vars: GOOGLE_CLIENT_ID, API_BASE_URL)
#   - ytgify-share: Rails backend (env vars: RAILS_MASTER_KEY, DATABASE_URL, AWS_*, etc.)
#
# First time setup: make setup
# Daily development: make dev

.PHONY: setup setup-extension setup-backend check-doppler \
        dev dev-backend dev-extension dev-extension-build \
        build build-production test test-backend test-extension clean

# =============================================================================
# SETUP TARGETS
# =============================================================================

## Configure Doppler for both extension and backend
setup: setup-extension setup-backend
	@echo "Setup complete. Run 'make check-doppler' to verify."

## Configure Doppler for Chrome extension (ytgify project)
setup-extension:
	@echo "Setting up Doppler for Chrome extension..."
	cd ytgify && doppler setup --project ytgify --config dev --no-interactive
	@echo "Extension Doppler setup complete."

## Configure Doppler for Rails backend (ytgify-share project)
setup-backend:
	@echo "Setting up Doppler for Rails backend..."
	cd ytgify-share && doppler setup --project ytgify-share --config dev --no-interactive
	@echo "Backend Doppler setup complete."

## Verify Doppler configuration for both directories
check-doppler:
	@echo "=== Extension (ytgify) Doppler Config ==="
	@cd ytgify && doppler configure 2>/dev/null || echo "Not configured - run 'make setup-extension'"
	@echo ""
	@echo "=== Backend (ytgify-share) Doppler Config ==="
	@cd ytgify-share && doppler configure 2>/dev/null || echo "Not configured - run 'make setup-backend'"

# =============================================================================
# DEVELOPMENT TARGETS
# =============================================================================

## Start both backend and extension dev servers (run in separate terminals or use tmux)
dev:
	@echo "Starting development servers..."
	@echo "Run these in separate terminals:"
	@echo "  make dev-backend     # Rails server on port 3000"
	@echo "  make dev-extension   # Extension with watch mode"
	@echo ""
	@echo "Or for one-shot extension build: make dev-extension-build"

## Start Rails backend server with Doppler (requires mise for Ruby)
dev-backend:
	cd ytgify-share && mise exec -- doppler run -- bin/rails server -b 0.0.0.0 -p 3000

## Start extension dev build with watch mode
dev-extension:
	cd ytgify && doppler run -- npm run dev

## One-shot extension build for local development
dev-extension-build:
	cd ytgify && doppler run -- npm run build:dev
	@echo "Extension built. Reload in chrome://extensions/"

# =============================================================================
# BUILD TARGETS
# =============================================================================

## Production build of extension (for Chrome Web Store)
build:
	cd ytgify && npm run build

## Chrome Web Store build (strips localhost permissions)
build-production:
	cd ytgify && npm run build:production

# =============================================================================
# TEST TARGETS
# =============================================================================

## Run all tests
test: test-extension test-backend

## Run extension tests (unit + E2E)
test-extension:
	cd ytgify && npm test && npm run test:e2e

## Run Rails backend tests
test-backend:
	cd ytgify-share && mise exec -- bin/rails test

# =============================================================================
# UTILITY TARGETS
# =============================================================================

## Clean build artifacts
clean:
	cd ytgify && rm -rf dist dist-production
	@echo "Build artifacts cleaned."

## Install dependencies for both projects
install:
	cd ytgify && npm install
	cd ytgify-share && mise exec -- bundle install
	@echo "Dependencies installed."

## Reset database and seed test data
db-reset:
	cd ytgify-share && mise exec -- doppler run -- bin/rails db:reset db:seed
	@echo "Database reset and seeded."
