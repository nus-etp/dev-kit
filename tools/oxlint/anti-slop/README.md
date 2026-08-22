# anti-slop (vendored Oxlint plugin)

Local copy of the generic [anti-slop](https://github.com/dmmulroy/anti-slop) Oxlint
plugin. Do not hand-edit the rule sources here — they are vendored and replaced
wholesale on update (see below). This directory is excluded from lint/format via
`tooling/oxlint/shared.json` → `ignorePatterns`.

## How it's wired into this monorepo

Oxlint runs **per package** (`oxlint .` in each workspace), and every workspace dir
(`apps/*`, `packages/*`, `tooling/*`) is exactly two levels below the repo root.

- **Rules** (all 15 generic rules at `"error"`) live once in
  `tooling/oxlint/shared.json`, inherited by every package via `extends`.
- **Plugin registration** (`jsPlugins`) lives in **each package's own
  `.oxlintrc.json`**, not in the shared config:

  ```json
  "jsPlugins": [
    { "name": "anti-slop", "specifier": "../../tools/oxlint/anti-slop/index.ts" }
  ]
  ```

  Why per-leaf: Oxlint resolves a JS plugin's *relative* specifier unreliably when
  inherited through `extends` across differing extends depths. `tooling/*` configs
  extend `../oxlint/shared.json` (1 level) while `apps/*`/`packages/*` extend
  `../../tooling/oxlint/shared.json` (2 levels); a specifier placed in the shared
  config loads for the 2-level consumers but **fails to load** for the `tooling/*`
  ones. Declaring `jsPlugins` in each leaf makes the base predictable (the leaf
  dir), so the uniform `../../tools/...` path resolves everywhere.

The Effect subplugin (`effect/`) is copied but **not enabled** — enable it only if a
package takes a direct `effect` dependency.

## Versioning

`@oxlint/plugins` is pinned in `pnpm-workspace.yaml` (`catalog:`) to the **same
version as `oxlint`** (currently `1.64.0`). Oxlint's JS-plugin API is alpha and not
semver-stable, so keep the two in lockstep — bump both together, never one alone.

## Updating the plugin

The install script copies from the skill's bundled assets, not from GitHub, so
updating is two steps:

1. Refresh the skill from upstream (note: `pnpm dlx`, not `npx`, in this repo):

   ```bash
   pnpm dlx skills add dmmulroy/anti-slop --skill install-anti-slop
   ```

2. Re-copy into the repo, reviewing the diff first, then re-lint:

   ```bash
   node .claude/skills/install-anti-slop/scripts/install.mjs --force
   git diff tools/oxlint/anti-slop
   pnpm lint
   ```

If the update adds or renames rules, merge those entries into the `rules` block of
`tooling/oxlint/shared.json` by hand — the copy step only touches this directory.
