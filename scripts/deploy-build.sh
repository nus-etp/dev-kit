#!/usr/bin/env bash
set -euo pipefail

KEEP_BUILDS="${DEPLOY_KEEP_BUILDS:-3}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${REPO_ROOT}/apps/web"

log() { echo "deploy-build: $*"; }
die() {
  echo "deploy-build: ERROR: $*" >&2
  exit 1
}

[[ "$KEEP_BUILDS" =~ ^[0-9]+$ ]] && ((KEEP_BUILDS >= 2)) \
  || die "DEPLOY_KEEP_BUILDS must be an integer >= 2 (got '${KEEP_BUILDS}')"

timestamp="$(date -u +%Y%m%d%H%M%S)"
revision="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
dist_dir=".next-${timestamp}-${revision}"

cd "$WEB_DIR"

remove_staged_build() { rm -rf "${WEB_DIR:?}/${dist_dir}"; }
trap remove_staged_build ERR INT TERM

log "building into apps/web/${dist_dir}"
NEXT_DIST_DIR="$dist_dir" pnpm build

if [[ ! -f "${dist_dir}/BUILD_ID" || ! -d "${dist_dir}/static" ]]; then
  remove_staged_build
  die "next build produced no BUILD_ID/static in ${dist_dir}; the live .next was not touched"
fi
trap - ERR INT TERM

if [[ -d .next && ! -L .next ]]; then
  log "moving the in-place .next directory aside to .next-${timestamp}-legacy"
  mv .next ".next-${timestamp}-legacy"
fi

ln -sfn "$dist_dir" .next.swap
mv -T .next.swap .next
log "switched .next -> ${dist_dir}"

active="$(readlink .next)"
shopt -s nullglob
builds=(.next-[0-9]*/)
builds=("${builds[@]%/}")
for ((index = 0; index < ${#builds[@]} - KEEP_BUILDS; index++)); do
  [[ "${builds[index]}" == "$active" ]] && continue
  log "pruning ${builds[index]}"
  rm -rf "${builds[index]}"
done
