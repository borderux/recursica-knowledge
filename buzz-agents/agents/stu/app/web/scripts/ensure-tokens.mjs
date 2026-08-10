// Put the Recursica token files where the build expects them.
//
// `@recursica/official-release` normally does this itself, from a postinstall script. That is
// enough on a default npm and not enough in general: npm 11 gates install scripts behind
// `allow-scripts`, and CI images routinely run with `--ignore-scripts`. When the postinstall is
// skipped the failure surfaces much later, as the PostCSS plugin reporting a missing cssPath,
// which reads like a config error rather than a missing dependency.
//
// So this runs before every build and dev server, and says nothing when there is nothing to do.
// The files stay gitignored either way — they belong to the release, not to this app.
//
// It copies on version, not on absence. "Copy only what is absent" was wrong in the one case
// that matters: bumping `@recursica/official-release` leaves the previous release's files
// sitting in web/, so every existing install keeps building against the old tokens and the
// bump silently does nothing. Going 2.6.0 -> 2.7.0 changed the generated CSS by 78 KB, and no
// build would have picked it up. So the version that was copied is recorded beside the files,
// and a mismatch re-copies all of them.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = join(WEB, 'node_modules', '@recursica', 'official-release')
const STAMP = join(WEB, '.recursica-tokens-version')

const FILES = [
  'recursica_variables_scoped.css',
  'recursica_brand.json',
  'recursica_tokens.json',
  'recursica_ui-kit.json',
  'recursica.json',
]

if (!existsSync(PKG)) {
  console.error(
    'ensure-tokens: @recursica/official-release is not installed.\n' +
    '  Run `npm install` in this directory first.',
  )
  process.exit(1)
}

const version = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version

// No stamp means files of unknown provenance — anything copied before this script started
// recording, including a stale release. Treat that as a mismatch and re-copy.
const stamped = existsSync(STAMP) ? readFileSync(STAMP, 'utf8').trim() : null
const current = stamped === version && FILES.every((file) => existsSync(join(WEB, file)))

if (!current) {
  // Every source is checked before anything is written. Bailing part-way through would leave
  // web/ holding some files from the new release and some from the old, which is worse than
  // the stale-but-consistent state this exists to avoid.
  const missing = FILES.filter((file) => !existsSync(join(PKG, file)))
  if (missing.length) {
    console.error(
      `ensure-tokens: @recursica/official-release ${version} does not ship ` +
      `${missing.join(', ')}.`,
    )
    process.exit(1)
  }

  for (const file of FILES) {
    const to = join(WEB, file)
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(join(PKG, file), to)
  }
  writeFileSync(STAMP, `${version}\n`)
  // Same version means a file went missing rather than the release moving — worth distinguishing,
  // or "2.7.0 -> 2.7.0" reads like the check itself is broken.
  const why = stamped === version ? version : stamped ? `${stamped} -> ${version}` : version
  console.log(`ensure-tokens: copied ${FILES.length} Recursica token file(s) into web/ (${why})`)
}
