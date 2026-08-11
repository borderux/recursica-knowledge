// Tests for the commit-trailer guard.
//
//   node --test 'buzz-agents/lib/*.test.mjs'
//
// Node's own runner, so there is nothing to install.
//
// Two failure modes are worth encoding rather than checking once by hand, and they pull in
// opposite directions. Letting a commit through without the operator's sign-off is the bug
// this exists to stop. Denying a commit that was correct all along is the bug that gets the
// guard deleted — so every case where the message is somewhere the guard cannot read is
// asserted to warn, not deny.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  inspectCommand,
  missingTrailers,
  parseCommitCommand,
  splitCommands,
  tokenize,
} from './commit-trailers.mjs'

const EMAIL = 'operator@example.test'
const SOB = `Signed-off-by: An Operator <${EMAIL}>`
const COA = `Co-authored-by: An Operator <${EMAIL}>`
const MODEL = 'Co-authored-by: A Model <noreply@example.invalid>'

/** inspectCommand over a raw command line, with the filesystem and HEAD stubbed out. */
const inspect = (cmd, { files = {}, head = null, email = EMAIL, name = 'An Operator' } = {}) =>
  inspectCommand(splitCommands(cmd).at(-1), {
    email,
    name,
    readFile: (p) => (p in files ? files[p] : null),
    headMessage: () => head,
  })

describe('which trailers a message is missing', () => {
  it('accepts a message carrying both, matched on the operator address', () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${COA}\n${SOB}`, EMAIL), [])
  })

  it('reports the sign-off when only the co-author line is there', () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${COA}`, EMAIL), ['Signed-off-by'])
  })

  it("reports the co-author line when only the model's is there — the f62eea9 shape", () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${MODEL}`, EMAIL), ['Co-authored-by', 'Signed-off-by'])
  })

  it('ignores a trailer naming somebody other than the operator', () => {
    const other = 'Signed-off-by: Someone Else <else@example.test>'
    assert.deepEqual(missingTrailers(`Subject\n\n${COA}\n${other}`, EMAIL), ['Signed-off-by'])
  })

  it("keeps the model's co-author line alongside the operator's — all three coexist", () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${COA}\n${MODEL}\n${SOB}`, EMAIL), [])
  })

  it('matches the trailer key case-insensitively, as git does', () => {
    assert.deepEqual(missingTrailers(`Subject\n\nCO-AUTHORED-BY: X <${EMAIL}>\nsigned-off-by: X <${EMAIL}>`, EMAIL), [])
  })

  it('compares the address case-insensitively', () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${COA.toUpperCase()}\n${SOB.toUpperCase()}`, EMAIL), [])
  })

  it('reads a trailer that is not in the last paragraph — matching more can only pass', () => {
    assert.deepEqual(missingTrailers(`${COA}\n${SOB}\n\nA body paragraph after them.`, EMAIL), [])
  })

  it('reports both when there is no address to compare against', () => {
    assert.deepEqual(missingTrailers(`Subject\n\n${COA}\n${SOB}`, ''), ['Co-authored-by', 'Signed-off-by'])
  })
})

describe('finding the commit inside a command line', () => {
  it('sees through global options that contain the word "commit"', () => {
    const parsed = parseCommitCommand(tokenize('git -c commit.gpgsign=false commit -F msg.txt'))
    assert.equal(parsed?.files[0], 'msg.txt')
  })

  it('is not fooled by a subcommand that merely mentions commits', () => {
    assert.equal(parseCommitCommand(tokenize('git log -1 --format=%B')), null)
    assert.equal(parseCommitCommand(tokenize('git rev-list --all')), null)
  })

  it('takes the commit out of a chained command', () => {
    const cmd = `git add -A && git commit -m "Subject"`
    assert.equal(parseCommitCommand(splitCommands(cmd).at(-1))?.messages[0], 'Subject')
  })

  it('does not split on a separator inside a quoted message', () => {
    const cmd = `git commit -m "Fix a && b handling"`
    assert.equal(splitCommands(cmd).length, 1)
    assert.equal(parseCommitCommand(splitCommands(cmd)[0])?.messages[0], 'Fix a && b handling')
  })

  it('reads --trailer in both the separated and = forms', () => {
    const parsed = parseCommitCommand(tokenize(`git commit -m x --trailer "${COA}" --trailer=${JSON.stringify(SOB)}`))
    assert.deepEqual(parsed?.trailers, [COA, SOB])
  })

  it('does not swallow the message when the commit is signed with -S', () => {
    const parsed = parseCommitCommand(tokenize('git commit -S -m Subject'))
    assert.deepEqual(parsed?.messages, ['Subject'])
  })

  it('records -F - as stdin rather than as a filename', () => {
    const parsed = parseCommitCommand(tokenize('git commit -F -'))
    assert.equal(parsed?.stdin, true)
    assert.deepEqual(parsed?.files, [])
  })
})

describe('the verdict on a commit', () => {
  it('passes a commit whose message file carries both trailers', () => {
    const v = inspect('git commit -F msg.txt', { files: { 'msg.txt': `Subject\n\n${COA}\n${SOB}` } })
    assert.equal(v.verdict, 'ok')
  })

  it('denies the commit that prompted this — a message file with only the model credited', () => {
    const v = inspect('git -c commit.gpgsign=false commit -F .git-commit-msg.txt', {
      files: { '.git-commit-msg.txt': `Subject\n\nBody.\n\n${MODEL}` },
    })
    assert.equal(v.verdict, 'deny')
    assert.deepEqual(v.missing, ['Co-authored-by', 'Signed-off-by'])
  })

  it('passes when the trailers come from --trailer instead of the message', () => {
    const v = inspect(`git commit -m Subject --trailer "${COA}" --trailer "${SOB}"`)
    assert.equal(v.verdict, 'ok')
  })

  // The first time this guard ran against a real commit it denied this exact command. The
  // substitutions reach the hook unexpanded, so the naive reader saw no address and refused
  // the form the documentation tells people to use. Regression, not a nicety.
  describe('the documented $(git config …) form', () => {
    const both =
      `--trailer "Co-authored-by: $(git config user.name) <$(git config user.email)>" ` +
      `--trailer "Signed-off-by: $(git config user.name) <$(git config user.email)>"`

    it('passes when both trailers are written that way', () => {
      assert.equal(inspect(`git commit -F msg.txt ${both}`, { files: { 'msg.txt': 'Subject' } }).verdict, 'ok')
    })

    it('passes with the file unreadable too — the flags alone are enough', () => {
      assert.equal(inspect(`git commit -F - ${both}`).verdict, 'ok')
    })

    it('accepts the --get spelling and backticks', () => {
      const alt =
        '--trailer "Co-authored-by: `git config --get user.name` <`git config --get user.email`>" ' +
        '--trailer "Signed-off-by: `git config user.name` <`git config --get user.email`>"'
      assert.equal(inspect(`git commit -m Subject ${alt}`).verdict, 'ok')
    })

    it('still denies when only one of the two is written that way', () => {
      const v = inspect('git commit -m Subject --trailer "Signed-off-by: $(git config user.name) <$(git config user.email)>"')
      assert.equal(v.verdict, 'deny')
      assert.deepEqual(v.missing, ['Co-authored-by'])
    })

    it('does not expand a substitution it cannot resolve — that stays unreadable', () => {
      const v = inspect('git commit -m "$(cat msg.txt)"')
      assert.equal(v.verdict, 'deny')
      assert.equal(v.source, 'unreadable')
    })
  })

  it('accepts -s as the sign-off, since git takes it from the same identity', () => {
    const v = inspect(`git commit -s -m Subject --trailer "${COA}"`)
    assert.equal(v.verdict, 'ok')
  })

  it('denies -s alone — the co-author line is required too, and GitHub only reads that one', () => {
    const v = inspect('git commit -s -m Subject')
    assert.equal(v.verdict, 'deny')
    assert.deepEqual(v.missing, ['Co-authored-by'])
  })

  it('reads the existing message on --amend --no-edit', () => {
    assert.equal(inspect('git commit --amend --no-edit', { head: `Subject\n\n${COA}\n${SOB}` }).verdict, 'ok')
    assert.equal(inspect('git commit --amend --no-edit', { head: 'Subject' }).verdict, 'deny')
  })

  it('leaves anything that is not a git commit alone', () => {
    assert.equal(inspect('git push --force-with-lease origin main'), null)
    assert.equal(inspect('npm test'), null)
  })

  it('leaves --fixup alone — git writes that message and the rebase consumes it', () => {
    assert.equal(inspect('git commit --fixup HEAD~1'), null)
  })

  // Denying this blocked the one command someone would use to check what they are about to
  // commit. Nothing is written, so there is nothing to guard.
  it('leaves --dry-run alone, which writes nothing', () => {
    assert.equal(inspect('git commit --dry-run -m "probe"'), null)
    assert.equal(inspect('git commit --dry-run'), null)
    assert.equal(inspect('true && git commit --dry-run -m "probe"'), null)
  })

  it('stops when the repository has no configured address, as AGENTS.md requires', () => {
    const v = inspect('git commit -m Subject', { email: '' })
    assert.equal(v.verdict, 'deny')
    assert.equal(v.reason, 'no-identity')
  })

  // The message being unreadable is not an excuse, because --trailer is always readable.
  // Each of these has the same one-flag remedy, and the deny reason says so.
  describe('denies when the message is somewhere it cannot look', () => {
    it('on stdin', () => {
      const v = inspect('git commit -F -')
      assert.equal(v.verdict, 'deny')
      assert.equal(v.reason, 'not-visible')
      assert.equal(v.source, 'stdin')
    })

    it('on a message file it could not read', () => {
      const v = inspect('git commit -F /tmp/does-not-exist.txt')
      assert.equal(v.verdict, 'deny')
      assert.equal(v.source, 'unreadable')
    })

    it('on a message the shell has not expanded yet', () => {
      const v = inspect('git commit -m "$(cat msg.txt)"')
      assert.equal(v.verdict, 'deny')
      assert.equal(v.source, 'unreadable')
    })

    it('on an editor commit, where there is no message yet at all', () => {
      const v = inspect('git commit')
      assert.equal(v.verdict, 'deny')
      assert.equal(v.source, 'editor')
    })

    it('on --amend when HEAD is unreadable', () => {
      const v = inspect('git commit --amend --no-edit', { head: null })
      assert.equal(v.verdict, 'deny')
      assert.equal(v.source, 'unreadable')
    })

    it('but a pipe is not blocked — --trailer is visible whatever the message does', () => {
      const v = inspect(`git commit -F - --trailer "${COA}" --trailer "${SOB}"`)
      assert.equal(v.verdict, 'ok')
    })

    it('names the missing trailers even then, so the remedy is exact', () => {
      const v = inspect(`git commit -F - --trailer "${COA}"`)
      assert.equal(v.verdict, 'deny')
      assert.deepEqual(v.missing, ['Signed-off-by'])
    })
  })
})
