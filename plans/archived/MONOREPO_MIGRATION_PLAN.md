# True Monorepo Migration Plan for ytgify-glue

## Overview

Consolidate three separate GitHub repositories into a single monorepo with unified CI and independent releases.

**Current State:**
- `neonwatty/ytgify` - Chrome extension (v1.0.13)
- `neonwatty/ytgify-firefox` - Firefox extension (v1.0.8)
- `neonwatty/ytgify-share` - Rails backend
- `neonwatty/ytgify-glue` - Integration repo (contains clones with separate `.git` directories)

**Target State:**
- Single `neonwatty/ytgify-glue` monorepo
- Path-based CI triggers (only run relevant tests when files change)
- Prefixed tags for independent releases (`chrome/v1.0.14`, `firefox/v1.0.9`, `backend/v1.0.0`)
- Integration tests run when extension or backend changes

---

## Phase 1: Clean Up Repository Structure

### 1.1 Remove Nested Git Directories
```bash
cd /Users/jeremywatt/Desktop/ytgify-glue
rm -rf ytgify/.git ytgify-firefox/.git ytgify-share/.git
```

### 1.2 Remove Per-App GitHub Directories
```bash
rm -rf ytgify/.github ytgify-firefox/.github ytgify-share/.github
```

### 1.3 Create Root GitHub Structure
```bash
mkdir -p .github/workflows
```

**Resulting structure:**
```
ytgify-glue/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Main orchestrator
│       ├── chrome-extension.yml      # Reusable workflow
│       ├── firefox-extension.yml     # Reusable workflow
│       ├── rails-backend.yml         # Reusable workflow
│       ├── integration-tests.yml     # Cross-app tests
│       └── release.yml               # Tag-based releases
├── ytgify/                           # Chrome extension (no .git)
├── ytgify-firefox/                   # Firefox extension (no .git)
├── ytgify-share/                     # Rails backend (no .git)
├── package.json                      # Root workspace config
└── CLAUDE.md                         # Updated instructions
```

---

## Phase 2: Create Unified CI Workflows

### 2.1 Main Orchestrator (`.github/workflows/ci.yml`)

Uses `dorny/paths-filter` to detect changes and conditionally trigger per-app workflows.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    outputs:
      chrome: ${{ steps.filter.outputs.chrome }}
      firefox: ${{ steps.filter.outputs.firefox }}
      rails: ${{ steps.filter.outputs.rails }}
      integration: ${{ steps.filter.outputs.integration }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            chrome:
              - 'ytgify/**'
              - 'ytgify-share/**'
              - 'package.json'
              - 'package-lock.json'
            firefox:
              - 'ytgify-firefox/**'
              - 'package.json'
              - 'package-lock.json'
            rails:
              - 'ytgify-share/**'
            integration:
              - 'ytgify/**'
              - 'ytgify-share/**'

  chrome:
    name: Chrome Extension
    needs: changes
    if: needs.changes.outputs.chrome == 'true'
    uses: ./.github/workflows/chrome-extension.yml

  firefox:
    name: Firefox Extension
    needs: changes
    if: needs.changes.outputs.firefox == 'true'
    uses: ./.github/workflows/firefox-extension.yml

  rails:
    name: Rails Backend
    needs: changes
    if: needs.changes.outputs.rails == 'true'
    uses: ./.github/workflows/rails-backend.yml

  integration:
    name: Integration Tests
    needs: [changes, chrome, rails]
    if: |
      always() &&
      needs.changes.outputs.integration == 'true' &&
      (needs.chrome.result == 'success' || needs.chrome.result == 'skipped') &&
      (needs.rails.result == 'success' || needs.rails.result == 'skipped')
    uses: ./.github/workflows/integration-tests.yml

  ci-success:
    name: CI Success
    needs: [changes, chrome, firefox, rails, integration]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check status
        run: |
          if [[ "${{ needs.chrome.result }}" == "failure" ]] || \
             [[ "${{ needs.firefox.result }}" == "failure" ]] || \
             [[ "${{ needs.rails.result }}" == "failure" ]] || \
             [[ "${{ needs.integration.result }}" == "failure" ]]; then
            exit 1
          fi
```

### 2.2 Chrome Extension Workflow (`.github/workflows/chrome-extension.yml`)

Reusable workflow preserving existing CI logic with `working-directory: ytgify`.

```yaml
name: Chrome Extension CI

on:
  workflow_call:

defaults:
  run:
    working-directory: ytgify

jobs:
  test:
    name: Test and Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
        working-directory: .
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run knip:production
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: chrome-coverage
          path: ytgify/tests/coverage/
          retention-days: 7
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: chrome-build
          path: ytgify/dist/
          retention-days: 7

  mock-e2e-tests:
    name: E2E Tests (Shard ${{ matrix.shard }}/4)
    timeout-minutes: 10
    runs-on: ubuntu-latest
    needs: test
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
        working-directory: .
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
      - run: npx playwright install chromium --with-deps
      - run: npm run build
      - run: sudo apt-get update && sudo apt-get install -y ffmpeg
      - run: npm run generate:test-videos
      - run: npx playwright test --config tests/playwright-mock.config.ts --shard=${{ matrix.shard }}/4
        env:
          HEADLESS: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: chrome-e2e-shard-${{ matrix.shard }}
          path: ytgify/tests/test-results/
          retention-days: 7
```

### 2.3 Firefox Extension Workflow (`.github/workflows/firefox-extension.yml`)

```yaml
name: Firefox Extension CI

on:
  workflow_call:

defaults:
  run:
    working-directory: ytgify-firefox

jobs:
  test:
    name: Test and Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
        working-directory: .
      - run: npm run lint:code
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: firefox-build
          path: ytgify-firefox/dist/
          retention-days: 7

  mock-e2e-tests:
    name: E2E Tests (Shard ${{ matrix.shard }}/3)
    timeout-minutes: 15
    runs-on: ubuntu-latest
    needs: test
    strategy:
      fail-fast: false
      matrix:
        include:
          - shard: 1
            pattern: "wizard-settings-matrix|error-handling|debug-frame-capture"
          - shard: 2
            pattern: "wizard-basic|gif-output-validation|debug-gif-parser"
          - shard: 3
            pattern: "newsletter-wizard|diagnostic-video|debug-gif-settings"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
        working-directory: .
      - run: sudo snap install firefox && firefox --version
      - run: npm run build
      - uses: FedericoCarboni/setup-ffmpeg@v2
      - run: npm run generate:test-videos
      - run: npm run test:selenium:mock -- --testPathPattern="${{ matrix.pattern }}"
        env:
          HEADLESS: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: firefox-e2e-shard-${{ matrix.shard }}
          path: ytgify-firefox/tests/test-results/
          retention-days: 7
```

### 2.4 Rails Backend Workflow (`.github/workflows/rails-backend.yml`)

```yaml
name: Rails Backend CI

on:
  workflow_call:

defaults:
  run:
    working-directory: ytgify-share

jobs:
  scan_ruby:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: ytgify-share/.ruby-version
          bundler-cache: true
          working-directory: ytgify-share
      - run: bin/brakeman --no-pager

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: ytgify-share/.ruby-version
          bundler-cache: true
          working-directory: ytgify-share
      - run: bin/rubocop -f github

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd="pg_isready" --health-interval=10s --health-timeout=5s --health-retries=3
    steps:
      - run: sudo apt-get update && sudo apt-get install -y build-essential git libpq-dev libyaml-dev pkg-config
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: ytgify-share/.ruby-version
          bundler-cache: true
          working-directory: ytgify-share
      - run: bin/rails db:test:prepare test
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432
```

### 2.5 Integration Tests Workflow (`.github/workflows/integration-tests.yml`)

```yaml
name: Integration Tests

on:
  workflow_call:

jobs:
  extension-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd="pg_isready" --health-interval=10s --health-timeout=5s --health-retries=3
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: ytgify-share/.ruby-version
          bundler-cache: true
          working-directory: ytgify-share
      - run: npm ci
      - run: bin/rails db:test:prepare
        working-directory: ytgify-share
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432
      - run: bin/rails server -p 3001 -e test &
        working-directory: ytgify-share
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432
      - run: sleep 10
      - run: npm run build
        working-directory: ytgify
      - run: npx playwright install chromium --with-deps
        working-directory: ytgify
      - run: npm run test:e2e:upload
        working-directory: ytgify
        env:
          REAL_BACKEND: true
          BACKEND_URL: http://localhost:3001
```

---

## Phase 3: Release Workflow with Prefixed Tags

### 3.1 Release Workflow (`.github/workflows/release.yml`)

Supports independent releases via prefixed tags: `chrome/v*`, `firefox/v*`, `backend/v*`

```yaml
name: Release

on:
  push:
    tags:
      - 'chrome/v*'
      - 'firefox/v*'
      - 'backend/v*'

jobs:
  parse-tag:
    runs-on: ubuntu-latest
    outputs:
      component: ${{ steps.parse.outputs.component }}
      version: ${{ steps.parse.outputs.version }}
    steps:
      - id: parse
        run: |
          TAG="${GITHUB_REF#refs/tags/}"
          echo "component=$(echo $TAG | cut -d'/' -f1)" >> $GITHUB_OUTPUT
          echo "version=$(echo $TAG | cut -d'/' -f2)" >> $GITHUB_OUTPUT

  release-chrome:
    needs: parse-tag
    if: needs.parse-tag.outputs.component == 'chrome'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:production
        working-directory: ytgify
      - run: cd ytgify/dist-production && zip -r ../ytgify-${{ needs.parse-tag.outputs.version }}.zip .
      - uses: softprops/action-gh-release@v1
        with:
          files: ytgify/ytgify-*.zip
          name: Chrome Extension ${{ needs.parse-tag.outputs.version }}

  release-firefox:
    needs: parse-tag
    if: needs.parse-tag.outputs.component == 'firefox'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build && npm run package
        working-directory: ytgify-firefox
      - uses: softprops/action-gh-release@v1
        with:
          files: ytgify-firefox/web-ext-artifacts/*.zip
          name: Firefox Extension ${{ needs.parse-tag.outputs.version }}

  release-backend:
    needs: parse-tag
    if: needs.parse-tag.outputs.component == 'backend'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: softprops/action-gh-release@v1
        with:
          name: Backend ${{ needs.parse-tag.outputs.version }}
```

### 3.2 Release Commands

```bash
# Release Chrome extension
cd ytgify && npm version patch  # bumps to 1.0.14
git add ytgify/package.json
git commit -m "chore(chrome): bump to v1.0.14"
git tag chrome/v1.0.14
git push && git push --tags

# Release Firefox extension (independent)
cd ytgify-firefox && npm version patch  # bumps to 1.0.9
git add ytgify-firefox/package.json
git commit -m "chore(firefox): bump to v1.0.9"
git tag firefox/v1.0.9
git push && git push --tags
```

---

## Phase 4: Update Root package.json

```json
{
  "name": "ytgify-glue",
  "version": "1.0.0",
  "description": "ytgify ecosystem - browser extensions + Rails backend",
  "private": true,
  "scripts": {
    "test:integration": "npm run test:integration:setup && npm run test:integration:run",
    "test:integration:setup": "cd ytgify-share && bin/rails db:test:prepare",
    "test:integration:run": "cd ytgify && npm run test:e2e:upload",
    "backend:start": "cd ytgify-share && bin/rails server",
    "backend:test": "cd ytgify-share && RAILS_ENV=test bin/rails server -p 3001",
    "extension:build": "cd ytgify && npm run build",
    "extension:build:dev": "cd ytgify && npm run dev",
    "ci:chrome": "cd ytgify && npm run lint && npm run typecheck && npm run test:coverage && npm run build",
    "ci:firefox": "cd ytgify-firefox && npm run lint:code && npm run typecheck && npm run test:coverage && npm run build",
    "ci:all": "npm run ci:chrome && npm run ci:firefox",
    "release:chrome": "git tag chrome/v$(node -p \"require('./ytgify/package.json').version\")",
    "release:firefox": "git tag firefox/v$(node -p \"require('./ytgify-firefox/package.json').version\")"
  },
  "workspaces": [
    "ytgify",
    "ytgify-firefox"
  ],
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## Phase 5: Migration Execution

### Step-by-Step Checklist

1. **Announce freeze** - No new PRs to individual repos
2. **Archive branches** in each repo (`pre-monorepo-archive`)
3. **Pull latest** into ytgify-glue subdirectories
4. **Remove `.git` directories** from subdirectories
5. **Remove `.github` directories** from subdirectories
6. **Create workflow files** in `.github/workflows/`
7. **Update package.json** with new scripts
8. **Commit all changes** to ytgify-glue main
9. **Test CI** with a test PR
10. **Set branch protection** to require `ci-success`
11. **Archive old repos** (GitHub Settings > Archive)
12. **Update external links** and documentation

---

## CI Behavior Summary

| Scenario | Chrome CI | Firefox CI | Rails CI | Integration |
|----------|-----------|------------|----------|-------------|
| Only `ytgify/**` changed | ✅ | ❌ | ❌ | ✅ |
| Only `ytgify-firefox/**` changed | ❌ | ✅ | ❌ | ❌ |
| Only `ytgify-share/**` changed | ✅ | ❌ | ✅ | ✅ |
| Chrome + Backend changed | ✅ | ❌ | ✅ | ✅ |
| Firefox + Backend changed | ✅ | ✅ | ✅ | ✅ |
| All three changed | ✅ | ✅ | ✅ | ✅ |
| Only docs/README changed | ❌ | ❌ | ❌ | ❌ |

**Key insight:** Backend changes trigger Chrome CI because the extension depends on the backend API. This ensures API compatibility is verified before merge.

---

## Pros and Cons

### Advantages
- **Single source of truth** - All code in one place
- **Atomic commits** - Cross-component changes in one PR
- **Simplified CI** - Path-based triggers, shared caching
- **Easier integration testing** - Native workflow dependencies
- **Unified issue tracking** - Single repo for all issues

### Disadvantages
- **Larger repo size** - ~100MB+ with all history
- **All-or-nothing access** - Can't restrict per-component
- **Migration effort** - One-time cost to consolidate
- **Learning curve** - Team needs to understand path filters

---

## Files to Create/Modify

### Create
- `.github/workflows/ci.yml` - Main orchestrator
- `.github/workflows/chrome-extension.yml` - Chrome CI
- `.github/workflows/firefox-extension.yml` - Firefox CI
- `.github/workflows/rails-backend.yml` - Rails CI
- `.github/workflows/integration-tests.yml` - Cross-app tests
- `.github/workflows/release.yml` - Tag-based releases

### Modify
- `package.json` - Add release and ci scripts
- `CLAUDE.md` - Update to reflect monorepo structure

### Delete
- `ytgify/.git/`
- `ytgify/.github/`
- `ytgify-firefox/.git/`
- `ytgify-firefox/.github/`
- `ytgify-share/.git/`
- `ytgify-share/.github/`

---

## Estimated Timeline

- **Implementation:** ~1 day
- **Testing:** ~0.5 days
- **Total:** ~1.5 days
