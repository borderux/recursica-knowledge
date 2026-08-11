// Tests for the stale-checkout guard.
//
//   node --test 'nest/bin/*.test.mjs'
//
// Node's own runner, so there is nothing to install. The guard stats real paths, so the
// fixtures build a throwaway nest and point BUZZ_HOME at it. Three shapes, because all
// three exist under a real `REPOS/`:
//
//   abandoned/  no .git at all          — the thing this guard is about
//   live/       .git is a directory     — an ordinary clone
//   worktree/   .git is a FILE          — 41 of the 47 directories in the real nest
//
// **The fixture home is `<tmp>/.buzz`, and every command below uses absolute paths.**
// That is not decoration. The first version of this guard exempted any command matching
// `\bbuzz\b`, intending `buzz messages send` — and matched the `.buzz` inside every
// absolute path in the nest instead, so nearly every real command bypassed it. The first
// test suite used relative paths and passed, which is how the bypass shipped.
//
// The two failure modes pull in opposite directions. Letting a read of an abandoned copy
// through is the bug this exists to stop. Denying `ls`, `diff`, `mv`, `rm` — or the
// message reporting the problem — is the bug that gets the guard deleted. Both are here.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-stale-checkout.mjs')

const home = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stale-guard-')), '.buzz')
const repos = path.join(home, 'REPOS')
fs.mkdirSync(path.join(repos, 'abandoned', 'web', 'src'), { recursive: true })
fs.mkdirSync(path.join(repos, 'live', '.git'), { recursive: true })
fs.mkdirSync(path.join(repos, 'worktree'), { recursive: true })
fs.writeFileSync(path.join(repos, 'worktree', '.git'), `gitdir: ${repos}/live/.git/worktrees/w\n`)
fs.writeFileSync(path.join(repos, 'abandoned', 'web', 'src', 'App.jsx'), 'x\n')

const STALE = path.join(repos, 'abandoned')
const LIVE = path.join(repos, 'live')
const WORKTREE = path.join(repos, 'worktree')

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

const bash = (command) => decide('Bash', { command })

describe('the commands that caused the incidents', () => {
  // Verbatim shape, 21:21:05Z: orient with git, ignore `fatal: not a git repository`,
  // read source in the same command line. Bypassed the first version twice over — on
  // `buzz` from the absolute path, and again on `git log`.
  it('denies cd + git + a relative grep, in one line, absolute', () => {
    assert.equal(
      bash(`cd ${STALE} && git remote -v; git log --oneline -3; grep -n "cleaned_text" web/src/routes/Interview.jsx`),
      'DENY',
    )
  })

  it('denies the same shape with && throughout', () => {
    assert.equal(bash(`cd ${STALE} && git log --oneline -3 && grep -n x web/src/routes/App.jsx`), 'DENY')
  })

  it('denies a plain cat of an absolute stale path', () => {
    assert.equal(bash(`cat ${STALE}/web/src/App.jsx`), 'DENY')
  })

  it('denies a find piped into xargs grep', () => {
    assert.equal(bash(`find ${STALE} -name '*.jsx' | xargs grep -ln dictionar`), 'DENY')
  })

  it('denies a read hidden in command substitution', () => {
    assert.equal(bash(`echo "$(cat ${STALE}/web/src/App.jsx)"`), 'DENY')
  })

  it('denies head when the stale path is its own argument', () => {
    assert.equal(bash(`head -2 ${STALE}/web/src/App.jsx`), 'DENY')
  })
})

describe('the file tools', () => {
  it('denies Read, Grep and Glob on the stale tree', () => {
    assert.equal(decide('Read', { file_path: `${STALE}/web/src/App.jsx` }), 'DENY')
    assert.equal(decide('Grep', { path: STALE, pattern: 'x' }), 'DENY')
    assert.equal(decide('Glob', { pattern: `${STALE}/**/*.jsx` }), 'DENY')
  })

  it('allows a clone and a worktree', () => {
    assert.equal(decide('Read', { file_path: `${LIVE}/README.md` }), 'ALLOW')
    assert.equal(decide('Read', { file_path: `${WORKTREE}/README.md` }), 'ALLOW')
  })
})

describe('a worktree is not a stale copy', () => {
  // `.git` is a file in a linked worktree. Treating "not a directory" as stale would
  // deny reads in 41 of the 47 checkouts in the real nest.
  it('allows reading one', () => {
    assert.equal(bash(`cat ${WORKTREE}/server/edits.mjs`), 'ALLOW')
    assert.equal(bash(`cd ${WORKTREE} && grep -n x server/edits.mjs`), 'ALLOW')
  })
})

describe('leaves alone what is not a source read', () => {
  it('allows listing, including piped to a pager', () => {
    assert.equal(bash(`ls -l ${STALE}/web/src`), 'ALLOW')
    assert.equal(bash(`ls ${STALE} | head -3`), 'ALLOW')
    assert.equal(bash(`find ${STALE} -type f | wc -l`), 'ALLOW')
    assert.equal(bash(`du -sh ${STALE}`), 'ALLOW')
  })

  it('allows diagnosing and cleaning it up', () => {
    assert.equal(bash(`diff -rq ${STALE} ${LIVE}`), 'ALLOW')
    assert.equal(bash(`mv ${STALE} ${STALE}.SUPERSEDED`), 'ALLOW')
    assert.equal(bash(`rm -rf ${STALE}`), 'ALLOW')
    assert.equal(bash(`git -C ${STALE} remote -v`), 'ALLOW')
  })

  // Prose about this guard quotes a stale path and a verb like `grep` in the same
  // breath. Denying the message that reports the problem is how a guard gets removed.
  it('allows a message that names the path', () => {
    assert.equal(bash(`printf 'stop grep-ing ${STALE}' | buzz messages send --content -`), 'ALLOW')
    assert.equal(bash(`gh issue create --body 'cat ${STALE}/x is now denied'`), 'ALLOW')
  })

  it('allows a clone into a directory that does not exist yet', () => {
    assert.equal(bash(`git clone https://example.test/x ${repos}/new`), 'ALLOW')
  })

  it('allows anything outside REPOS', () => {
    assert.equal(decide('Read', { file_path: `${home}/AGENTS.md` }), 'ALLOW')
    assert.equal(bash(`cat ${home}/AGENTS.md`), 'ALLOW')
  })
})

describe('a publishing verb speaks only for its own segment', () => {
  it('does not let git log exempt a read beside it', () => {
    assert.equal(bash(`git log --oneline -3; cat ${STALE}/web/src/App.jsx`), 'DENY')
  })

  it('does not let a buzz call exempt a read beside it', () => {
    assert.equal(bash(`buzz messages get --channel x; grep -rn y ${STALE}`), 'DENY')
  })
})

describe('quoted data is never commands', () => {
  // Every report about this guard is written as `cat > report.md <<'EOF'` with a table of
  // the commands it denies. Segmenting on newline made those body lines into commands, so
  // the message explaining that the guard was broken was itself denied.
  const report = [
    `cat > ${home}/.scratch/report.md <<'EOF'`,
    '| command | |',
    '|---|---|',
    `| \`cat ${STALE}/server/edits.mjs\` | DENY |`,
    `| \`cd ${STALE} && grep -n x file.js\` | DENY |`,
    '',
    `Reading source from ${STALE} is denied as of today.`,
    'EOF',
  ].join('\n')

  it('allows a heredoc report quoting denied commands', () => {
    assert.equal(bash(report), 'ALLOW')
  })

  it('allows writing that report and then sending it', () => {
    assert.equal(bash(`${report}\nbuzz messages send --channel x --content - < ${home}/.scratch/report.md`), 'ALLOW')
  })

  it('allows an indented heredoc and a herestring', () => {
    assert.equal(bash(`cat > ${home}/x <<-EOF\n\tcat ${STALE}/y\n\tEOF`), 'ALLOW')
    assert.equal(bash(`buzz messages send --content - <<< "grep ${STALE}"`), 'ALLOW')
  })

  it('allows an inline --content naming a denied command', () => {
    assert.equal(bash(`buzz messages send --content "cat ${STALE}/x is denied"`), 'ALLOW')
  })

  // The heredoc must not become a way to launder a real read.
  it('still denies a real read on the line that opens the heredoc', () => {
    assert.equal(bash(`grep -n x ${STALE}/web/src/App.jsx > out <<'EOF'\nnote\nEOF`), 'DENY')
  })

  it('still denies a real read after the heredoc closes', () => {
    assert.equal(bash(`cat > ${home}/x <<'EOF'\nnote\nEOF\ncat ${STALE}/web/src/App.jsx`), 'DENY')
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
