// Put the Recursica token files where the build expects them.
//
// `@recursica/official-release` normally does this itself, from a postinstall script. That is
// enough on a default npm and not enough in general: npm 11 gates install scripts behind
// `allow-scripts`, and CI images routinely run with `--ignore-scripts`. When the postinstall is
// skipped the failure surfaces much later, as the PostCSS plugin reporting a missing cssPath,
// which reads like a config error rather than a missing dependency.
//
// So this runs before every build and dev server, copies only what is absent, and says nothing
// when there is nothing to do. The files stay gitignored either way — they belong to the
// release, not to this app.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = join(WEB, 'node_modules', '@recursica', 'official-release')

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

const copied = []
for (const file of FILES) {
  const from = join(PKG, file)
  const to = join(WEB, file)
  if (existsSync(to)) continue
  if (!existsSync(from)) {
    console.error(`ensure-tokens: ${file} is missing from @recursica/official-release.`)
    process.exit(1)
  }
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
  copied.push(file)
}

if (copied.length) {
  console.log(`ensure-tokens: copied ${copied.length} Recursica token file(s) into web/`)
}
