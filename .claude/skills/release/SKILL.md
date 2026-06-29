---
name: release
description: Cut a new release of the ETP Starter Kit — bump the semver version (patch/minor/major), roll CHANGELOG.md, and regenerate the in-app "What's new" page. Use when asked to release, cut a release, bump/raise the version, tag a version, or update the changelog for a new version.
---

# release

One script does the whole release. Your only judgment call is the bump type
(semver): `patch` = fixes, `minor` = new features, `major` = breaking.

```bash
# from the repo root, after adding entries under "## [Unreleased]" in CHANGELOG.md:
node .claude/skills/release/release.mjs minor --finalize
```

`--finalize` runs the full mechanical chain: bump `package.json` → roll
`CHANGELOG.md` → regenerate the What's New page (`release-notes.ts`) → format it →
git commit + tag + push → publish the GitHub release (notes pulled from the
changelog). Drop `--finalize` to edit files only and review the diff first.

Preview anything without touching files/git: add `--dry-run`.
Everything else (`finalize`, `notes`, `--allow-empty`, granular
`--commit`/`--tag`/`--push`/`--github`, `--no-format`) is in `--help`:

```bash
node .claude/skills/release/release.mjs --help
```

## Notes

- `CHANGELOG.md` is the single source of truth — write bullets under
  `## [Unreleased]` ([Keep a Changelog](https://keepachangelog.com/) categories).
  The script aborts if it's empty (pass `--allow-empty` for a version-only release).
- **Never hand-edit `release-notes.ts`** — it's regenerated from the changelog.
- Only the root `package.json` is versioned; it flows to the UI footer via
  `next.config.js` (`NEXT_PUBLIC_APP_VERSION`). A running dev server needs a
  restart to show the new version.
- The script never auto-runs typecheck — verify after with
  `pnpm -F @acme/web typecheck` if you want a compile check.
- Tag baseline: `v0.1.0` = first release.

## Announcement artifacts (optional, manual)

The script only touches code/changelog. Outward-facing materials live under
`artifacts/v_<major>_<minor>_<patch>/` and are written by hand per release —
copy the `artifacts/v_0_1_0/` template folder, rename it to the new version, and
fill in the `{{PLACEHOLDERS}}`:

- `email-draft.md` — release announcement email.
- `highlights.html` — standalone highlights page (duplicate the
  `section.feature` block per feature).
- `screenshots/` — `NN-short-name.png` images referenced by `highlights.html`.

Keep the bullets in sync with the matching `## [x.y.z]` section of CHANGELOG.md.
