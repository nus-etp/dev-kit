#!/usr/bin/env node
// release.mjs — cut a new release for the ETP Starter Kit.
//
// One command performs every edit a release needs, keeping the version,
// changelog, and the in-app "What's new" page in lockstep:
//
//   1. bumps the version in the repo-root package.json (semver patch/minor/major)
//   2. rolls CHANGELOG.md: moves everything under "## [Unreleased]" into a new
//      "## [x.y.z] - <date>" section and fixes the compare/release links
//   3. regenerates the What's New data file (release-notes.ts) FROM the changelog,
//      so the page always mirrors CHANGELOG.md
//
// By default the script only edits files. With --finalize (or the granular
// --commit/--tag/--push/--github flags) it also runs the mechanical git + GitHub
// steps, so a whole release is one reproducible command:
//
//   node .claude/skills/release/release.mjs minor --finalize
//
// Usage:
//   node .claude/skills/release/release.mjs <patch|minor|major> [options]
//   node .claude/skills/release/release.mjs notes        # regen release-notes.ts only
//   node .claude/skills/release/release.mjs finalize      # git+gh for current version
//
// Options:
//   --date=YYYY-MM-DD   release date (default: today, local time)
//   --dry-run           print the plan without writing/running anything
//   --allow-empty       allow a release with no [Unreleased] entries
//   --no-format         skip formatting release-notes.ts (oxfmt)
//   --commit            git add + commit the release files
//   --tag               git tag -a vX.Y.Z         (implies --commit)
//   --push              git push + push the tag    (implies --tag)
//   --github            gh release create vX.Y.Z   (implies --tag)
//   --finalize          = --commit --tag --push --github (full release)
//   -h, --help

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const NOTES_PATH_REL = 'apps/web/src/app/(authed)/whats-new/release-notes.ts'

function repoRoot() {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
}

function bumpVersion(version, type) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!m) throw new Error(`Cannot parse version "${version}" (expected X.Y.Z)`)
  let [major, minor, patch] = m.slice(1).map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`
  throw new Error(`Unknown bump type "${type}" (use patch|minor|major)`)
}

// --- CHANGELOG.md surgery ---------------------------------------------------

// Move the [Unreleased] body into a new versioned section and fix link refs.
function rollChangelog(text, newVersion, oldVersion, date, allowEmpty) {
  const lines = text.split('\n')
  const uIdx = lines.findIndex((l) => /^## \[Unreleased\]/.test(l))
  if (uIdx === -1) throw new Error('No "## [Unreleased]" heading in CHANGELOG.md')

  let nextIdx = lines.findIndex((l, i) => i > uIdx && /^## \[/.test(l))
  if (nextIdx === -1) nextIdx = lines.length

  const body = lines.slice(uIdx + 1, nextIdx)
  while (body.length && body[0].trim() === '') body.shift()
  while (body.length && body[body.length - 1].trim() === '') body.pop()
  if (body.length === 0 && !allowEmpty) {
    throw new Error(
      'Nothing under [Unreleased]. Add entries first, or pass --allow-empty.',
    )
  }

  const newSection = [`## [${newVersion}] - ${date}`, '', ...body, '']
  const rebuilt = [
    ...lines.slice(0, uIdx + 1), // header + "## [Unreleased]"
    '', // keep [Unreleased] empty
    ...newSection,
    ...lines.slice(nextIdx),
  ]
  return updateLinks(rebuilt.join('\n'), newVersion, oldVersion)
}

// Repoint the [Unreleased] compare link and insert the new version's link.
function updateLinks(text, newVersion, oldVersion) {
  const m = /^\[Unreleased\]:\s*(\S+)\/compare\/v[\d.]+\.\.\.HEAD\s*$/m.exec(text)
  if (!m) throw new Error('Could not find the [Unreleased] link reference')
  const base = m[1]

  text = text.replace(
    /^\[Unreleased\]:.*$/m,
    `[Unreleased]: ${base}/compare/v${newVersion}...HEAD`,
  )
  const newLink = `[${newVersion}]: ${base}/compare/v${oldVersion}...v${newVersion}`
  return text.replace(/^(\[Unreleased\]:.*\n)/m, `$1${newLink}\n`)
}

// --- release-notes.ts generation -------------------------------------------

function stripMarkdown(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parse every "## [x.y.z] - date" section into a structured release.
function parseReleases(changelogText) {
  const releases = []
  let cur = null
  let section = null

  for (const line of changelogText.split('\n')) {
    const versioned = /^## \[(\d+\.\d+\.\d+)\]\s*-\s*(\S+)/.exec(line)
    if (versioned) {
      if (cur) releases.push(cur)
      cur = { version: versioned[1], date: versioned[2], summary: '', sections: [] }
      section = null
      continue
    }
    if (/^## \[/.test(line) || /^\[.+\]:\s*http/.test(line)) {
      // Unreleased heading or the link-reference block ends the current release.
      if (cur) {
        releases.push(cur)
        cur = null
      }
      continue
    }
    if (!cur) continue

    const heading = /^###\s+(.+?)\s*$/.exec(line)
    if (heading) {
      section = { title: heading[1], items: [] }
      cur.sections.push(section)
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet && section) {
      section.items.push(stripMarkdown(bullet[1]))
      continue
    }
    if (section && section.items.length && /^\s+\S/.test(line)) {
      // wrapped continuation of the previous bullet
      const last = section.items.length - 1
      section.items[last] = stripMarkdown(`${section.items[last]} ${line.trim()}`)
      continue
    }
    if (!section && line.trim()) {
      cur.summary = stripMarkdown(`${cur.summary} ${line.trim()}`)
    }
  }
  if (cur) releases.push(cur)
  return releases
}

function renderNotes(releases) {
  const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

  const entries = releases.map((r) => {
    const sections = r.sections
      .map((sec) => {
        const items = sec.items.map((i) => `          ${q(i)},`).join('\n')
        return `      {\n        title: ${q(sec.title)},\n        items: [\n${items}\n        ],\n      },`
      })
      .join('\n')
    const summary = r.summary ? `    summary: ${q(r.summary)},\n` : ''
    return `  {\n    version: ${q(r.version)},\n    date: ${q(r.date)},\n${summary}    sections: [\n${sections}\n    ],\n  },`
  })

  return `// AUTO-GENERATED — do not edit by hand.
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

export const RELEASE_NOTES: ReleaseNote[] = [
${entries.join('\n')}
]

export const LATEST_RELEASE = RELEASE_NOTES[0]
`
}

// --- finalize: format + git + github ---------------------------------------

// Pull a version's raw markdown body out of CHANGELOG.md (for gh release notes).
function extractSection(text, version) {
  const lines = text.split('\n')
  const esc = version.replace(/\./g, '\\.')
  const start = lines.findIndex((l) => new RegExp(`^## \\[${esc}\\]`).test(l))
  if (start === -1) throw new Error(`No "## [${version}]" section in CHANGELOG.md`)
  let end = lines.findIndex(
    (l, i) => i > start && (/^## \[/.test(l) || /^\[.+\]:\s*https?:/.test(l)),
  )
  if (end === -1) end = lines.length
  const body = lines.slice(start + 1, end)
  while (body.length && body[0].trim() === '') body.shift()
  while (body.length && body[body.length - 1].trim() === '') body.pop()
  return body.join('\n')
}

// Run a shell command (streamed). In dry-run, just print what would run.
function sh(cmd, root, dryRun) {
  if (dryRun) {
    console.log(`  $ ${cmd}`)
    return
  }
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

function formatNotes(root, dryRun) {
  sh(
    `pnpm -F @acme/web exec oxfmt "src/app/(authed)/whats-new/release-notes.ts"`,
    root,
    dryRun,
  )
}

// The mechanical git/GitHub steps for an already-written release of `version`.
function finalize(root, version, opts) {
  const { commit, tag, push, github, dryRun } = opts
  if (dryRun) console.log('\n[dry-run] finalize steps:')

  if (commit) {
    sh(`git add package.json CHANGELOG.md "${NOTES_PATH_REL}"`, root, dryRun)
    sh(`git commit -m "chore(release): v${version}"`, root, dryRun)
  }
  if (tag) sh(`git tag -a v${version} -m "v${version}"`, root, dryRun)
  if (push) {
    sh('git push', root, dryRun)
    sh(`git push origin v${version}`, root, dryRun)
  }
  if (github) {
    const changelog = opts.changelogText ?? readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    const notesFile = join(tmpdir(), `release-v${version}.md`)
    const body = extractSection(changelog, version)
    if (dryRun) {
      console.log(`  # write notes to ${notesFile}:`)
      console.log(body.replace(/^/gm, '  | '))
      console.log(
        `  $ gh release create v${version} --title "v${version}" --notes-file <notes> --verify-tag`,
      )
    } else {
      writeFileSync(notesFile, body + '\n')
      sh(
        `gh release create v${version} --title "v${version}" --notes-file "${notesFile}" --verify-tag`,
        root,
        false,
      )
    }
  }
}

// Resolve the finalize step set from CLI flags.
function finalizeOpts(flags, dryRun) {
  const all = flags.has('--finalize')
  const commit = all || flags.has('--commit') || flags.has('--tag') ||
    flags.has('--push') || flags.has('--github')
  const tag = all || flags.has('--tag') || flags.has('--push') ||
    flags.has('--github')
  const push = all || flags.has('--push')
  const github = all || flags.has('--github')
  return { commit, tag, push, github, dryRun, any: commit }
}

// --- main ------------------------------------------------------------------

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help') || args.length === 0) {
    console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 33).join('\n').replace(/^\/\/ ?/gm, ''))
    return
  }

  const flags = new Set(args.filter((a) => a.startsWith('--')))
  const dateArg = args.find((a) => a.startsWith('--date='))
  const positional = args.filter((a) => !a.startsWith('-'))
  const command = positional[0]

  const dryRun = flags.has('--dry-run')
  const allowEmpty = flags.has('--allow-empty')
  const date = dateArg ? dateArg.split('=')[1] : today()

  const root = repoRoot()
  const pkgPath = join(root, 'package.json')
  const changelogPath = join(root, 'CHANGELOG.md')
  const notesPath = join(root, NOTES_PATH_REL)

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const oldVersion = pkg.version

  // `notes`: regenerate release-notes.ts from the current changelog, no bump.
  if (command === 'notes') {
    const changelog = readFileSync(changelogPath, 'utf8')
    const notes = renderNotes(parseReleases(changelog))
    if (dryRun) {
      console.log(`[dry-run] would regenerate ${NOTES_PATH_REL}`)
    } else {
      writeFileSync(notesPath, notes)
      console.log(`Regenerated ${NOTES_PATH_REL} from CHANGELOG.md`)
    }
    return
  }

  // `finalize`: no bump — run git/gh steps for the version already in package.json.
  if (command === 'finalize') {
    const opts = finalizeOpts(flags, dryRun)
    if (!opts.any) opts.commit = opts.tag = opts.push = opts.github = true
    console.log(`Finalizing v${oldVersion}`)
    finalize(root, oldVersion, opts)
    return
  }

  if (!['patch', 'minor', 'major'].includes(command)) {
    throw new Error(`Expected patch|minor|major|notes|finalize, got "${command ?? ''}"`)
  }

  const newVersion = bumpVersion(oldVersion, command)
  const newChangelog = rollChangelog(
    readFileSync(changelogPath, 'utf8'),
    newVersion,
    oldVersion,
    date,
    allowEmpty,
  )
  const newNotes = renderNotes(parseReleases(newChangelog))
  const newPkg = JSON.stringify({ ...pkg, version: newVersion }, null, 2) + '\n'

  console.log(`${oldVersion} → ${newVersion}  (${command}, ${date})`)

  if (dryRun) {
    const section = newChangelog
      .split('\n')
      .slice(
        newChangelog.split('\n').findIndex((l) => l.includes(`[${newVersion}]`)),
      )
      .join('\n')
      .split(/\n## \[/)[0]
    console.log('\n[dry-run] new changelog section:\n')
    console.log(section.trim())
    console.log('\n[dry-run] would write: package.json, CHANGELOG.md, ' + NOTES_PATH_REL)
    if (!flags.has('--no-format')) console.log('[dry-run] would format release-notes.ts (oxfmt)')
    const opts = finalizeOpts(flags, true)
    if (opts.any) finalize(root, newVersion, { ...opts, changelogText: newChangelog })
    return
  }

  writeFileSync(pkgPath, newPkg)
  writeFileSync(changelogPath, newChangelog)
  writeFileSync(notesPath, newNotes)

  console.log('\nEdited:')
  console.log('  package.json')
  console.log('  CHANGELOG.md')
  console.log('  ' + NOTES_PATH_REL)

  if (!flags.has('--no-format')) formatNotes(root, false)

  const opts = finalizeOpts(flags, false)
  if (opts.any) {
    finalize(root, newVersion, opts)
    console.log(`\nReleased v${newVersion}.`)
    return
  }

  console.log('\nNext steps (or re-run with --finalize to do these automatically):')
  console.log('  git add package.json CHANGELOG.md "' + NOTES_PATH_REL + '"')
  console.log(`  git commit -m "chore(release): v${newVersion}"`)
  console.log(`  git tag -a v${newVersion} -m "v${newVersion}"`)
}

try {
  main()
} catch (err) {
  console.error(`release: ${err.message}`)
  process.exit(1)
}
