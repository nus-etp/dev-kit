#!/usr/bin/env bash
#
# create-app.sh — scaffold a new self-serve app repo from this template.
#
# Automates the mechanical parts of the per-app setup in SETUP.md:
#   1. creates a private repo from the template
#   2. generates a SESSION_SECRET
#   3. stores the two deploy-hook URLs as repo secrets
#
# The steps that still need a human (they touch external dashboards):
#   - provision the Neon database  -> DATABASE_URL
#   - create the Vercel project (Root Directory = apps/web) + set env vars
#   - create the two deploy hooks  -> paste the URLs when prompted
#   - (auth apps only) Resend + DNS -> see docs/EMAIL_SETUP.md
#
# Requires: gh (authenticated), and openssl or uuidgen.
#
# Usage:
#   ./scripts/create-app.sh <app-slug> [github-org]
#
set -euo pipefail

APP="${1:-}"
ORG="${2:-nus-etp-apps}"
TEMPLATE="${ORG}/dev-kit"

if [ -z "$APP" ]; then
  echo "Usage: $0 <app-slug> [github-org]" >&2
  exit 1
fi

REPO="${ORG}/${APP}"

echo "==> Creating ${REPO} from template ${TEMPLATE}"
gh repo create "$REPO" --template "$TEMPLATE" --private

if command -v uuidgen >/dev/null 2>&1; then
  SESSION_SECRET="$(uuidgen)$(uuidgen)"
else
  SESSION_SECRET="$(openssl rand -hex 24)"
fi
echo "==> Generated SESSION_SECRET (add this to the Vercel project env):"
echo "    SESSION_SECRET=${SESSION_SECRET}"

echo
echo "==> Now, in the Vercel dashboard for the shared account:"
echo "    1. Import ${REPO}, set Root Directory = apps/web"
echo "    2. Add env vars: DATABASE_URL (Neon), SESSION_SECRET (above),"
echo "       NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL"
echo "       (+ RESEND_API_KEY / RESEND_FROM if the app has login)"
echo "    3. Create two Deploy Hooks: main -> production, preview -> staging"
echo

read -r -p "Paste the MAIN (production) deploy hook URL: " HOOK_MAIN
read -r -p "Paste the PREVIEW (staging) deploy hook URL: " HOOK_PREVIEW

echo "==> Storing deploy-hook URLs as repo secrets on ${REPO}"
gh secret set VERCEL_DEPLOY_HOOK_MAIN    -R "$REPO" -b "$HOOK_MAIN"
gh secret set VERCEL_DEPLOY_HOOK_PREVIEW -R "$REPO" -b "$HOOK_PREVIEW"

echo
echo "==> Done. ${REPO} is ready."
echo "    The builder can now push to 'preview' (staging) or 'main' (production)."
echo "    See SETUP.md for the full flow and docs/EMAIL_SETUP.md for login email."
