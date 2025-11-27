#!/bin/bash

set -e

echo "Building production version..."

# Step 1: Run production build
echo "Step 1: Running webpack build..."
npm run build

# Step 2: Remove localhost permissions from dist/manifest.json
echo "Step 2: Removing localhost permissions from dist/manifest.json..."

# Backup original manifest
cp dist/manifest.json dist/manifest.json.backup

# Remove localhost from host_permissions array
# Remove localhost from content_scripts matches array
# Remove localhost from web_accessible_resources matches array
node -e "
const fs = require('fs');
const manifestPath = 'dist/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Remove localhost from host_permissions
manifest.host_permissions = manifest.host_permissions.filter(
  perm => !perm.includes('localhost') && !perm.includes('127.0.0.1')
);

// Remove localhost from content_scripts matches
manifest.content_scripts.forEach(script => {
  script.matches = script.matches.filter(
    match => !match.includes('localhost') && !match.includes('127.0.0.1')
  );
});

// Remove localhost from web_accessible_resources matches
manifest.web_accessible_resources.forEach(resource => {
  resource.matches = resource.matches.filter(
    match => !match.includes('localhost') && !match.includes('127.0.0.1')
  );
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('✓ Localhost permissions removed');
"

# Step 3: Package the extension
echo "Step 3: Packaging extension..."
npm run package

# Restore backup
mv dist/manifest.json.backup dist/manifest.json

echo ""
echo "✓ Production build complete!"
echo "✓ Package created in web-ext-artifacts/"
echo "✓ Original manifest restored in dist/"
