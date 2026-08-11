// Tests for the stale-checkout guard.
//
//   node --test 'nest/bin/*.test.mjs'
//
// Node's own runner, so there is nothing to install. The guard shells out to the real
// filesystem, so the fixtures below build a throwaway nest under the OS temp directory and
// point BUZZ_HOME at it — one directory with a `.git`, one without.
//
// The two failure modes pull in opposite directions, as they do for the guard beside this
// one. Letting a read of an abandoned copy through is the bug this exists to stop. Denying
// `ls`, `diff`, `mv` or `rm` is the bug that makes the guard the obstacle to removing the
// directory it is complaining about — and denying the message that reports the problem is
// how it gets switched off. Both directions are asserted.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-stale-checkout.mjs')

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-guard-'))
const repos = path.join(home, 'REPOS')
fs.mkdirSync(path.join(repos, 'abandoned', 'web', 'src'), { recursive: true })
fs.mkdirSync(path.join(repos, 'live', '.git'), { recursive: true })
fs.writeFileSync(path.join(repos, 'abandoned', 'web', 'src', 'App.jsx'), 'x\n')

/** @returns {'DENY'|'ALLOW'} */
function decide(tool_name, tool_input) {
  const out = execFileSync(process.execPath, [GUARD], {
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: 'utf8',
    env: { ...process.env, BUZZ_HOME: home },
  })
  if (!out.trim()) return 'ALLOW'
  assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, 'deny')
  return 'DENY'
}

describe('reading source from a directory with no .git', () => {
  it('denies Read', () => {
    assert.equal(decide('Read', { file_path: `${repos}/abandoned/web/src/App.jsx` }), 'DENY')
  })

  it('denies Grep and Glob', () => {
    assert.equal(decide('Grep', { path: `${repos}/abandoned`, pattern: 'x' }), 'DENY')
    assert.equal(decide('Glob', { pattern: `${repos}/abandoned/**/*.jsx` }), 'DENY')
  })

  // The shape that got through twice: the path is in the `cd`, the read is relative, and
  // git's own `fatal: not a git repository` arrives above the answer and goes unread.
  it('denies a cd into it followed by a relative grep', () => {
    const command = `cd ${repos}/abandoned && git remote -v; grep -n x web/src/App.jsx`
    assert.equal(decide('Bash', { command }), 'DENY')
  })

  it('denies cat, and head when a path is its argument', () => {
    assert.equal(decide('Bash', { command: `cat ${repos}/abandoned/web/src/App.jsx` }), 'DENY')
    assert.equal(decide('Bash', { command: `head -2 ${repos}/abandoned/web/src/App.jsx` }), 'DENY')
  })
})

describe('leaves alone what is not a source read', () => {
  it('allows a checkout that is a repository', () => {
    assert.equal(decide('Read', { file_path: `${repos}/live/web/src/App.jsx` }), 'ALLOW')
  })

  it('allows listing, including piped to a pager', () => {
    assert.equal(decide('Bash', { command: `ls -l ${repos}/abandoned/web/src` }), 'ALLOW')
    assert.equal(decide('Bash', { command: `ls ${repos}/abandoned | head -3` }), 'ALLOW')
    assert.equal(decide('Bash', { command: `find ${repos}/abandoned -type f | wc -l` }), 'ALLOW')
  })

  it('allows diagnosing and cleaning it up', () => {
    assert.equal(decide('Bash', { command: `diff -rq ${repos}/abandoned ${repos}/live` }), 'ALLOW')
    assert.equal(decide('Bash', { command: `mv ${repos}/abandoned ${repos}/abandoned.SUPERSEDED` }), 'ALLOW')
    assert.equal(decide('Bash', { command: `rm -rf ${repos}/abandoned` }), 'ALLOW')
  })

  // Prose about this guard quotes both a stale path and a verb like `grep`. Denying the
  // message that reports the problem is how a guard gets removed.
  it('allows a message that names the path', () => {
    const command = `printf 'stop grep-ing ${repos}/abandoned' | buzz messages send --content -`
    assert.equal(decide('Bash', { command }), 'ALLOW')
  })

  it('allows a clone into a directory that does not exist yet', () => {
    assert.equal(decide('Bash', { command: `git clone https://example.test/x ${repos}/new` }), 'ALLOW')
  })

  it('allows anything outside REPOS', () => {
    assert.equal(decide('Read', { file_path: `${home}/AGENTS.md` }), 'ALLOW')
  })
})

describe('fails open', () => {
  it('allows a payload it cannot parse', () => {
    const out = execFileSync(process.execPath, [GUARD], {
      input: 'not json',
      encoding: 'utf8',
      env: { ...process.env, BUZZ_HOME: home },
    })
    assert.equal(out.trim(), '')
  })
})
