// AUTO-GENERATED — do not edit by hand.
// Source of truth: CHANGELOG.md (repo root). Regenerate with:
//   node .claude/skills/release/release.mjs notes
// The /release skill rewrites this on every version bump so the What's New page
// always mirrors the changelog. Newest release is first (RELEASE_NOTES[0]).

export interface ReleaseSection {
  title: string
  items: string[]
}

export interface ReleaseNote {
  version: string
  date: string
  summary?: string
  sections: ReleaseSection[]
}

export const RELEASE_NOTES: ReleaseNote[] = []

export const LATEST_RELEASE = RELEASE_NOTES[0]
