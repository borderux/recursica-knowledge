// Tests for the credential-store guard.
//
//   node --test 'nest/bin/*.test.mjs'
//
// The two failure modes pull in opposite directions, and both are here. Letting an
// enumeration through is the bug this exists to stop. Denying the credential helper — or the
// message reporting an incident, which necessarily quotes the commands being denied — is the
// bug that gets a guard switched off, and the guard beside this one has been caught by it
// twice.
//
// The first test is a verbatim command a real reviewer ran on 2026-08-12, four minutes before
// disclosing it. If this suite ever passes without that one denied, the guard is decorative.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-credential-store.mjs')
const HOME = os.homedir()

function run(input) {
  const out = execFileSync(process.execPath, [GUARD], { input: JSON.stringify(input), encoding: 'utf8' })
  return out.trim() ? JSON.parse(out) : null
}

const bash = (command) => run({ tool_name: 'Bash', tool_input: { command } })
const denied = (r) => r?.hookSpecificOutput?.permissionDecision === 'deny'

describe('enumerating the keychain', () => {
  it('denies the exact command the reviewer ran', () => {
    assert.ok(denied(bash('security find-generic-password -s "github-token" -w | head -c 8')))
  })

  it('denies the other two named in AGENTS.md', () => {
    assert.ok(denied(bash('security find-internet-password -s github.com -w')))
    assert.ok(denied(bash('security dump-keychain')))
  })

  // `-d` prints the secrets; omitting it prints the inventory. The inventory is the disclosure,
  // so the deny cannot be keyed on the flag.
  it('denies dump-keychain without -d, which is the shape that looks harmless', () => {
    assert.ok(denied(bash('security dump-keychain 2>/dev/null | grep -i svce')))
  })

  // Each of these reaches the same syscall, and a leading-command glob sees none of them.
  // This is why the hook is registered with no `if` and does its own test.
  it('denies it however the command is spelled or positioned', () => {
    assert.ok(denied(bash('/usr/bin/security dump-keychain')), 'absolute path')
    assert.ok(denied(bash('cd /tmp && security dump-keychain')), 'not the leading command')
    assert.ok(denied(bash('FOO=1 sudo security dump-keychain')), 'env assignment and wrapper')
    assert.ok(denied(bash('echo start; security find-generic-password -s x')), 'after a semicolon')
    assert.ok(denied(bash('ls | xargs security dump-keychain')), 'later in a pipeline')
  })

  // `security(1)` is `security [-hilqv] [-p prompt] [command]`, so the subcommand is not
  // always word 2. A positional read let `security -v dump-keychain` through, and `-v` is a
  // flag somebody types for their own reasons rather than to evade anything.
  it('denies it behind a global flag, which is not where the subcommand is', () => {
    assert.ok(denied(bash('security -v dump-keychain')))
    assert.ok(denied(bash('security -q dump-keychain')))
    assert.ok(denied(bash('security -i find-generic-password -s x -w')))
    assert.ok(denied(bash('security -p prompt find-generic-password -s x -w')))
  })

  // `statementsOf` opens `$(…)` up, so the segment's last word arrives as `dump-keychain)"`.
  // An anchored test on that misses; the punctuation has to come off first.
  it('denies it inside command substitution', () => {
    assert.ok(denied(bash('echo "$(security dump-keychain)"')))
    assert.ok(denied(bash('security dump-keychain)"')), 'the isolated cause')
    assert.ok(denied(bash('TOKEN=$(security find-generic-password -s x -w)')))
  })

  it('unwraps one level of sh -c, as the trailer guard does for --exec', () => {
    assert.ok(denied(bash('bash -c "security dump-keychain"')))
    assert.ok(denied(bash("sh -c 'security find-generic-password -s x -w'")))
    assert.ok(denied(bash('zsh -c "cd /tmp && security dump-keychain"')))
  })

  it('leaves security subcommands that answer for one item alone', () => {
    assert.equal(denied(bash('security find-certificate -c example.com')), false)
  })
})

describe('reading credential files', () => {
  it('denies reading ~/.netrc and anything under ~/.ssh/', () => {
    assert.ok(denied(bash('cat ~/.netrc')))
    assert.ok(denied(bash(`cat ${HOME}/.ssh/id_ed25519`)), 'absolute path')
    assert.ok(denied(bash('grep -r . ~/.ssh/')))
  })

  it('denies the file tools too, not just Bash', () => {
    assert.ok(denied(run({ tool_name: 'Read', tool_input: { file_path: `${HOME}/.ssh/id_rsa` } })))
    assert.ok(denied(run({ tool_name: 'Grep', tool_input: { pattern: 'x', path: `${HOME}/.netrc` } })))
  })

  // Listing is how you find out what is there without disclosing it, and it is the first step
  // of cleaning any of this up. A guard that blocks its own remedy gets switched off.
  it('allows listing and stat-ing those paths', () => {
    assert.equal(denied(bash('ls -la ~/.ssh')), false)
    assert.equal(denied(bash(`stat ${HOME}/.netrc`)), false)
    assert.equal(denied(bash('find ~/.ssh -type f')), false)
  })

  // AGENTS.md says "~/.netrc, ~/.ssh/, and browser or app credential databases". These are the
  // app stores on this machine. `hosts.yml` is a GitHub token store, which is what everyone was
  // hunting on the day this guard was written.
  it('denies the app credential stores, not just the two obvious paths', () => {
    assert.ok(denied(bash('cat ~/.config/gh/hosts.yml')))
    assert.ok(denied(bash('cat ~/.aws/credentials')))
    assert.ok(denied(bash('cat ~/.npmrc')))
    assert.ok(denied(run({ tool_name: 'Read', tool_input: { file_path: `${HOME}/.config/gh/hosts.yml` } })))
  })

  // Scoped to the credential file, not the directory. A guard that denies reading ordinary
  // settings beside a secret teaches people to work around it.
  it('leaves the ordinary settings beside them alone', () => {
    assert.equal(denied(bash('cat ~/.aws/config')), false)
    assert.equal(denied(bash('cat ~/.config/gh/config.yml')), false)
  })

  it('denies the quieter read verbs too', () => {
    assert.ok(denied(bash('cut -d" " -f2 ~/.netrc')))
    assert.ok(denied(bash(`open ${HOME}/.ssh/id_rsa`)))
    assert.ok(denied(bash('tr -d "\\n" < ~/.npmrc')))
  })

  it('leaves ordinary files alone', () => {
    assert.equal(denied(bash('cat ~/.buzz/AGENTS.md')), false)
    assert.equal(denied(run({ tool_name: 'Read', tool_input: { file_path: `${HOME}/notes.md` } })), false)
  })
})

describe('what it does not catch, asserted so nobody reads it as total', () => {
  // No verb-and-path list catches laundering through an unremarkable path. Recorded here
  // rather than left for someone to discover and report as a defect.
  it('does not catch a copy to a neutral path and a read of that', () => {
    assert.equal(denied(bash(`cp ${HOME}/.ssh/id_rsa /tmp/k && cat /tmp/k`)), false)
  })

  // Inherited from statementsOf, which opens `$(…)` regardless of quoting. The sibling guard
  // has the same property. A heredoc body is stripped, so the usual incident-report shape is
  // unaffected — this costs one phrasing.
  it('over-denies a single-quoted substitution bash would not run', () => {
    assert.ok(denied(bash("buzz messages send --content 'we ran $(security dump-keychain)'")))
  })
})

describe('the sanctioned interface stays open', () => {
  it('allows the credential helper in both spellings', () => {
    assert.equal(denied(bash("printf 'protocol=https\\nhost=github.com\\n' | git credential-osxkeychain get")), false)
    assert.equal(denied(bash("printf 'protocol=https\\nhost=github.com\\n\\n' | git credential fill")), false)
  })
})

describe('reporting is not running', () => {
  // Every incident report about this guard quotes the commands it denies. A guard that judged
  // text rather than verbs would deny the message saying the guard was needed.
  it('allows a published message that names the denied commands', () => {
    assert.equal(
      denied(bash('buzz messages send --channel x --content "I ran security dump-keychain and disclosed it"')),
      false,
    )
    assert.equal(denied(bash('echo "never run security find-generic-password"')), false)
  })

  it('allows a heredoc body quoting them', () => {
    assert.equal(
      denied(bash("cat > report.md <<'EOF'\nsecurity dump-keychain\nsecurity find-generic-password -s x -w\nEOF")),
      false,
    )
  })

  // The stripper runs to end of input, so a command written after an unterminated heredoc
  // disappears from what the guard sees — and bash swallows it as body for the same reason, so
  // it never executes either. Constructed by everyone who audits this; left alone deliberately.
  it('is not bypassed by an unterminated heredoc, because bash does not run it either', () => {
    assert.equal(denied(bash("cat <<'EOF'\nsecurity dump-keychain")), false)
  })
})

describe('fails open', () => {
  it('allows a payload it cannot parse', () => {
    const out = execFileSync(process.execPath, [GUARD], { input: 'not json', encoding: 'utf8' })
    assert.equal(out.trim(), '')
  })

  it('allows a Bash call with no command', () => {
    assert.equal(denied(run({ tool_name: 'Bash', tool_input: {} })), false)
  })
})
