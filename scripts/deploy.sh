#!/bin/sh
# Validate and build the portfolio, then upload it to the production Cloudflare Pages project.
# Run with --dry-run to complete local checks and the build without uploading.
set -eu

case "${1:-}" in
  '') upload=true ;;
  --dry-run) upload=false ;;
  --help)
    printf 'Usage: ./scripts/deploy.sh [--dry-run]\n'
    exit 0
    ;;
  *)
    printf 'Usage: ./scripts/deploy.sh [--dry-run]\n' >&2
    exit 1
    ;;
esac
if [ "$#" -gt 1 ]; then
  printf 'Usage: ./scripts/deploy.sh [--dry-run]\n' >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf 'Install Node.js 22.15 or newer (including npm) before deploying.\n' >&2
  exit 1
fi
node --input-type=module -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 15)) {
    console.error("Node.js 22.15 or newer is required by the shared photo package.");
    process.exit(1);
  }
'

if [ ! -x node_modules/.bin/vite ] || [ ! -x node_modules/.bin/wrangler ]; then
  printf 'Install portfolio dependencies first: npm ci\n' >&2
  exit 1
fi
if [ ! -f ../photo_api/dist/index.js ] || [ ! -f ../photo_api/dist/ui/index.js ]; then
  printf 'Build the sibling photo package first:\n  npm --prefix ../photo_api ci\n  npm --prefix ../photo_api run build\n' >&2
  exit 1
fi

npm run check
npm test
npm run build

if [ "$upload" = false ]; then
  printf '\nDeployment checks passed. Production files: .svelte-kit/cloudflare\n'
  exit 0
fi

./node_modules/.bin/wrangler pages deploy .svelte-kit/cloudflare \
  --project-name ryansalik-com --branch master
