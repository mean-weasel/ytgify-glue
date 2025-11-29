# Git Submodules Strategy for ytgify-glue

## Overview

Keep three separate GitHub repositories with git submodules for version pinning and cross-repo CI orchestration.

**Current State:**
- `neonwatty/ytgify` - Chrome extension (v1.0.13) - separate GitHub repo
- `neonwatty/ytgify-firefox` - Firefox extension (v1.0.8) - separate GitHub repo
- `neonwatty/ytgify-share` - Rails backend - separate GitHub repo
- `neonwatty/ytgify-glue` - Contains cloned repos with separate `.git` directories (NOT submodules)

**Target State:**
- Each app remains in its own GitHub repo with independent CI
- `ytgify-glue` uses git submodules to reference specific versions
- Cross-repo CI triggers via `repository_dispatch`
- Integration tests run in ytgify-glue on schedule or dispatch

---

## Phase 1: Convert to Git Submodules

### 1.1 Current Structure (Cloned Repos)
```
ytgify-glue/
├── .git/                    # Glue repo
├── ytgify/
│   └── .git/                # Separate Chrome repo
├── ytgify-firefox/
│   └── .git/                # Separate Firefox repo
└── ytgify-share/
    └── .git/                # Separate Rails repo
```

### 1.2 Convert to Submodules
```bash
cd /Users/jeremywatt/Desktop/ytgify-glue

# Backup current state
cp -r ytgify ytgify-backup
cp -r ytgify-firefox ytgify-firefox-backup
cp -r ytgify-share ytgify-share-backup

# Remove cloned directories
rm -rf ytgify ytgify-firefox ytgify-share

# Add as proper git submodules
git submodule add git@github.com:neonwatty/ytgify.git ytgify
git submodule add git@github.com:neonwatty/ytgify-firefox.git ytgify-firefox
git submodule add git@github.com:neonwatty/ytgify-share.git ytgify-share

# Commit submodule configuration
git add .gitmodules ytgify ytgify-firefox ytgify-share
git commit -m "Convert to git submodules"
```

### 1.3 Resulting .gitmodules File
```ini
[submodule "ytgify"]
    path = ytgify
    url = git@github.com:neonwatty/ytgify.git
    branch = main

[submodule "ytgify-firefox"]
    path = ytgify-firefox
    url = git@github.com:neonwatty/ytgify-firefox.git
    branch = main

[submodule "ytgify-share"]
    path = ytgify-share
    url = git@github.com:neonwatty/ytgify-share.git
    branch = main
```

### 1.4 Target Structure
```
ytgify-glue/
├── .git/
├── .gitmodules              # Submodule configuration
├── .github/
│   └── workflows/
│       └── integration-tests.yml
├── ytgify/                  # Submodule -> neonwatty/ytgify
├── ytgify-firefox/          # Submodule -> neonwatty/ytgify-firefox
├── ytgify-share/            # Submodule -> neonwatty/ytgify-share
└── package.json
```

---

## Phase 2: Cross-Repo CI Triggers

### 2.1 Add repository_dispatch to Chrome CI

Add to `ytgify/.github/workflows/ci.yml`:

```yaml
  # Add this job at the end of the existing workflow
  notify-integration:
    name: Notify Integration Repo
    runs-on: ubuntu-latest
    needs: [test, mock-e2e-tests]
    if: github.ref == 'refs/heads/main' && success()
    steps:
      - name: Trigger Integration Tests
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.GLUE_REPO_TOKEN }}
          repository: neonwatty/ytgify-glue
          event-type: chrome-extension-updated
          client-payload: |
            {
              "repo": "ytgify",
              "sha": "${{ github.sha }}",
              "ref": "${{ github.ref }}"
            }
```

### 2.2 Add repository_dispatch to Rails CI

Add to `ytgify-share/.github/workflows/ci.yml`:

```yaml
  notify-integration:
    name: Notify Integration Repo
    runs-on: ubuntu-latest
    needs: [scan_ruby, lint, test]
    if: github.ref == 'refs/heads/main' && success()
    steps:
      - name: Trigger Integration Tests
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.GLUE_REPO_TOKEN }}
          repository: neonwatty/ytgify-glue
          event-type: backend-updated
          client-payload: |
            {
              "repo": "ytgify-share",
              "sha": "${{ github.sha }}",
              "ref": "${{ github.ref }}"
            }
```

### 2.3 Add repository_dispatch to Firefox CI (Optional)

Add to `ytgify-firefox/.github/workflows/ci.yml`:

```yaml
  notify-integration:
    name: Notify Integration Repo
    runs-on: ubuntu-latest
    needs: [test, mock-e2e-tests]
    if: github.ref == 'refs/heads/main' && success()
    steps:
      - name: Trigger Integration Tests
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.GLUE_REPO_TOKEN }}
          repository: neonwatty/ytgify-glue
          event-type: firefox-extension-updated
          client-payload: |
            {
              "repo": "ytgify-firefox",
              "sha": "${{ github.sha }}",
              "ref": "${{ github.ref }}"
            }
```

### 2.4 Required Secrets Setup

1. Create a GitHub Personal Access Token (PAT) with `repo` scope
2. Add as secret `GLUE_REPO_TOKEN` to:
   - `neonwatty/ytgify`
   - `neonwatty/ytgify-firefox`
   - `neonwatty/ytgify-share`

---

## Phase 3: Integration Tests in ytgify-glue

### 3.1 Integration Test Workflow

Create `.github/workflows/integration-tests.yml` in ytgify-glue:

```yaml
name: Integration Tests

on:
  # Triggered by component repos
  repository_dispatch:
    types: [chrome-extension-updated, backend-updated, firefox-extension-updated]

  # Manual trigger with version selection
  workflow_dispatch:
    inputs:
      chrome_ref:
        description: 'Chrome extension ref (tag, branch, SHA)'
        required: false
        default: 'main'
      backend_ref:
        description: 'Backend ref'
        required: false
        default: 'main'
      firefox_ref:
        description: 'Firefox extension ref'
        required: false
        default: 'main'

  # Nightly compatibility check
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: Update submodule to triggered SHA (dispatch)
        if: github.event_name == 'repository_dispatch'
        run: |
          if [ "${{ github.event.action }}" = "chrome-extension-updated" ]; then
            cd ytgify && git fetch origin && git checkout ${{ github.event.client_payload.sha }}
          elif [ "${{ github.event.action }}" = "backend-updated" ]; then
            cd ytgify-share && git fetch origin && git checkout ${{ github.event.client_payload.sha }}
          elif [ "${{ github.event.action }}" = "firefox-extension-updated" ]; then
            cd ytgify-firefox && git fetch origin && git checkout ${{ github.event.client_payload.sha }}
          fi

      - name: Update submodules to input refs (manual)
        if: github.event_name == 'workflow_dispatch'
        run: |
          cd ytgify && git fetch origin && git checkout ${{ github.event.inputs.chrome_ref || 'main' }}
          cd ../ytgify-share && git fetch origin && git checkout ${{ github.event.inputs.backend_ref || 'main' }}
          cd ../ytgify-firefox && git fetch origin && git checkout ${{ github.event.inputs.firefox_ref || 'main' }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: ytgify-share/.ruby-version
          bundler-cache: true
          working-directory: ytgify-share

      - name: Install dependencies
        run: |
          npm ci
          cd ytgify && npm ci
          cd ../ytgify-share && bundle install

      - name: Setup database
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/ytgify_test
          RAILS_ENV: test
        run: |
          cd ytgify-share
          bin/rails db:create db:migrate

      - name: Build Chrome extension
        run: cd ytgify && npm run build

      - name: Install Playwright
        run: cd ytgify && npx playwright install chromium --with-deps

      - name: Start Rails server
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/ytgify_test
          RAILS_ENV: test
        run: |
          cd ytgify-share
          bin/rails server -p 3001 &
          sleep 10

      - name: Run integration tests
        env:
          BACKEND_URL: http://localhost:3001
          REAL_BACKEND: true
        run: cd ytgify && npm run test:e2e:upload

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: ytgify/tests/test-results/
          retention-days: 14
```

---

## Phase 4: Submodule Management

### 4.1 Common Commands

```bash
# Clone with submodules
git clone --recurse-submodules git@github.com:neonwatty/ytgify-glue.git

# Update all submodules to latest remote
git submodule update --remote --merge

# Update specific submodule
git submodule update --remote ytgify

# Check submodule status
git submodule status

# Pull including submodule updates
git pull --recurse-submodules
```

### 4.2 Version Pinning for Releases

```bash
# Pin to specific tags for release validation
cd ytgify && git checkout v1.0.14
cd ../ytgify-share && git checkout v1.0.1
cd ../ytgify-firefox && git checkout v1.0.9

# Commit the pinned versions
cd ..
git add ytgify ytgify-share ytgify-firefox
git commit -m "Pin submodules to release v1.1.0 candidates"
```

### 4.3 Developer Setup Script

Create `scripts/setup-dev.sh`:

```bash
#!/bin/bash
set -e

echo "Setting up ytgify development environment..."

# Clone or update submodules
if [ ! -d ".git" ]; then
  git clone --recurse-submodules git@github.com:neonwatty/ytgify-glue.git
  cd ytgify-glue
else
  git submodule update --init --recursive
fi

# Install root dependencies
npm install

# Install Chrome extension dependencies
cd ytgify && npm install && cd ..

# Install Firefox extension dependencies
cd ytgify-firefox && npm install && cd ..

# Install Rails dependencies
cd ytgify-share && bundle install && cd ..

# Setup database
cd ytgify-share
bin/rails db:create db:migrate db:seed
cd ..

echo "Setup complete!"
```

---

## Phase 5: Version Compatibility Matrix

Create `COMPATIBILITY.md` in ytgify-glue:

```markdown
# Version Compatibility Matrix

| ytgify (Chrome) | ytgify-firefox | ytgify-share | Status | Tested |
|-----------------|----------------|--------------|--------|--------|
| v1.0.13         | v1.0.8         | main         | Stable | 2024-11-27 |
| main            | main           | main         | Dev    | Nightly |

## API Compatibility

### JWT Token Format
- Required from: ytgify-share main
- Consumed by: ytgify v1.0.0+, ytgify-firefox v1.0.0+

### GIF Upload API
- Endpoint: POST /api/v1/gifs
- Required from: ytgify-share main
- Minimum client: ytgify v1.0.0+
```

---

## Comparison: Submodules vs True Monorepo

| Aspect | Git Submodules | True Monorepo |
|--------|----------------|---------------|
| **Repo Independence** | Each app has own repo, CI, releases | All in one repo |
| **CI Complexity** | Cross-repo triggers via dispatch | Path-based in single workflow |
| **Access Control** | Per-repo permissions | All-or-nothing |
| **Git History** | Preserved per component | Merged or fresh start |
| **Clone Size** | Clone only what you need | Full repo (~100MB+) |
| **Atomic Commits** | Coordinated PRs across repos | Single PR |
| **Setup Complexity** | Submodule commands, secrets | Simpler |
| **Integration Testing** | Dispatch triggers, scheduled | Native workflow deps |

---

## Pros and Cons

### Advantages of Submodules
- **Team autonomy** - Each repo can have different workflows, permissions
- **Independent CI** - Each app's CI runs only for that app
- **Smaller clones** - Developers only clone what they work on
- **Clear ownership** - Explicit repo boundaries
- **Preserved history** - Each component keeps its full git history

### Disadvantages of Submodules
- **Cross-repo coordination** - Multi-repo PRs for breaking changes
- **CI token management** - PATs needed for cross-repo triggers
- **Submodule learning curve** - Team needs to understand submodule commands
- **Integration test delay** - Runs after component CI, not inline
- **Version drift risk** - Components can get out of sync

---

## Implementation Checklist

### Phase 1: Convert to Submodules
- [ ] Backup current directory structure
- [ ] Remove cloned directories
- [ ] Add as git submodules
- [ ] Commit `.gitmodules` and submodule references
- [ ] Test clone with `--recurse-submodules`

### Phase 2: Cross-Repo CI Triggers
- [ ] Create PAT with `repo` scope
- [ ] Add `GLUE_REPO_TOKEN` secret to ytgify repo
- [ ] Add `GLUE_REPO_TOKEN` secret to ytgify-share repo
- [ ] Add `notify-integration` job to ytgify CI
- [ ] Add `notify-integration` job to ytgify-share CI
- [ ] (Optional) Add to ytgify-firefox CI

### Phase 3: Integration Tests
- [ ] Create `integration-tests.yml` in ytgify-glue
- [ ] Test `repository_dispatch` trigger
- [ ] Test `workflow_dispatch` manual trigger
- [ ] Enable nightly schedule
- [ ] Verify artifact uploads

### Phase 4: Documentation
- [ ] Create `scripts/setup-dev.sh`
- [ ] Create `COMPATIBILITY.md`
- [ ] Update README with submodule instructions
- [ ] Document release process

---

## Estimated Timeline

- **Phase 1 (Submodules):** ~2 hours
- **Phase 2 (CI Triggers):** ~2 hours
- **Phase 3 (Integration):** ~2 hours
- **Phase 4 (Documentation):** ~1 hour
- **Testing:** ~1 hour
- **Total:** ~1 day
