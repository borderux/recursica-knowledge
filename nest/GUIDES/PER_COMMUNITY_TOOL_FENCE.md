---
title: "Per-Community Tool Fence: one agent, one identity, a registry per community"
tags: [buzz, fencing, multi-tenant, mcp, claude-config]
status: active
created: 2026-09-18
---

# Per-community tool fence

One agent record, one identity, one name — a different MCP registry per community.

This is for the operator whose agent belongs to more than one Buzz community, where those
communities are different clients. The agent is the same person everywhere; what it can
reach must not be.

It is the next case after [`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md), which
pins one agent to one `CLAUDE_CONFIG_DIR` for its whole life and makes that OS-enforced with
the Seatbelt sandbox. **Read that one first** — its rule-syntax and `allowRead` findings apply
here unchanged and are not repeated below. It is the right shape for an agent that serves one
client, or none. It has nothing to say about an agent that serves three.

**One correction to it.** Its step 1 says to set `CLAUDE_CONFIG_DIR` in the agent record's
`env_vars`. That field does not exist on a managed agent on every build — where it is absent
the only command-shaped fields are the agent command and its override, and the launcher below
is the only lever left. Look at your own agent's settings before following either recipe.

---

## Why a launcher rather than a setting

The obvious move is to set `CLAUDE_CONFIG_DIR` on the agent and be done. It does not work
here, and the reason is worth knowing before you go looking for the field.

An agent **record** is community-agnostic — one record, `relay_url` empty, joined to several
communities. So any value stored on the record is the same in all of them. There is no
per-community settings screen, and on some builds there is no `env_vars` field on the record
at all.

The **process** is not community-agnostic. Buzz spawns one agent process per
`(pubkey, relayUrl)` and puts `BUZZ_RELAY_URL` in that process's environment. So the thing
that knows which community it is serving exists at spawn time, in the environment, before the
agent starts.

A launcher set as the agent's command reads it, picks a config directory, and `exec`s the
real ACP agent. That is the whole mechanism.

**What it does not fence:** the nest. `~/.buzz` — `AGENTS.md`, `.secrets/`, `REPOS/`,
`RESEARCH/`, `WORK_LOGS/` — is shared machine-wide across every community, and Buzz exposes no
working-directory override. Tools fence cleanly; the workspace does not. Do not present this
as client isolation of everything the agent touches, because it is not. It is isolation of
what the agent can *call*.

---

## Layout

Installed by `scripts/bootstrap-nest.mjs` into `~/.buzz/proxy/`:

| Path | Purpose |
| --- | --- |
| `buzz-agent-launcher.sh` | Set this as the agent's command in Buzz Desktop |
| `communities.map` | `<relay host>` → `<fence name>`, **tab**-separated. Yours to edit |
| `fences/<name>/.claude.json` | The MCP servers that community may load |
| `fences/<name>/settings.json` | `permissions.deny` + `disableClaudeAiConnectors` |
| `fences/_unknown/` | Deny-all fallback for an unmapped relay. Also the template |
| `ARMED` | The launcher applies the fence only while this file exists. Yours to create |
| `launcher.log` | One line per agent start |
| `verify-fence.sh` | Unmapped communities, login state, and the server list per fence |

`target` is optional and not shipped: the launcher finds the ACP agent where Buzz Desktop
ships it. Write a path into `~/.buzz/proxy/target` only if yours is somewhere else.

---

## Install

### 1. Add a fence per community

```sh
cd ~/.buzz/proxy
cp -R fences/_unknown fences/acme
printf 'acme.communities.buzz.xyz\tacme\n' >> communities.map
```

Then put that community's servers in `fences/acme/.claude.json`. **Tab-separated, not
spaces** — a line with spaces does not match and the community silently falls through to the
deny-all fence.

### 2. Map every community, not the ones you can see

The list of communities your agent runs in is **not** `ps`, and **not** `launcher.log`. Only
the community whose agent is currently awake appears in either. Buzz keeps the complete list,
one file per `(pubkey, relayUrl)` it has ever spawned:

```sh
ls ~/Library/Application\ Support/xyz.block.buzz.app/agents/agent-pids/
```

`verify-fence.sh` reads that directory and names any community with no line in
`communities.map`. Run it before you arm anything. A community you forget does not error —
it gets the empty registry, which looks from the inside like an agent whose tools all
disappeared.

### 3. Point the agent at the launcher

Buzz Desktop → the agent → agent command → `~/.buzz/proxy/buzz-agent-launcher.sh`.

On builds that separate the two, creating a custom harness and **assigning** it to the agent
are different steps. Creating it is not enough; the agent keeps the built-in harness until
you pick the new one from the agent's harness selector.

**Then quit and reopen Buzz Desktop.** Saving restarts the agent only on the community you
happen to be looking at. Every other community keeps its old process, and its old
environment, indefinitely — so a half-applied change looks exactly like a change that did not
apply.

### 4. Read the log before you arm it

The launcher applies nothing until you arm it, so a fresh install is a no-op that logs what
it would have done:

```sh
cat ~/.buzz/proxy/launcher.log
```

You want one `PROBE` line per agent process, each naming the fence you expect, and no
`_unknown` among them. Buzz runs several agents per community — `parallelism` in the agent's
settings — so expect that many lines per community, all with the same fence.

**One line per restart has an empty relay and lands in `_unknown`.** That is Buzz probing the
harness, not a session. Expect it; do not map it away.

### 5. Log in — once per fence, and it is not optional

```sh
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme claude auth login
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme claude auth status   # "loggedIn": true
```

A config directory is its own account. The credential lives in the login keychain under an
entry keyed to that directory, so **a fence you just created is correctly isolated and signed
out**, and no file the bootstrap writes can change that — only a login mints a credential.

**Do this before arming, for every fence including `_unknown`.** Arming an agent
whose fence has never been logged in produces an agent that answers `Authentication required`
to everything, on every community at once. The instinct is then to undo the isolation, which
is exactly backwards. Copying the account block out of `~/.claude.json` does not work either:
that is profile data, not the credential, and it leaves a directory that looks signed in.

### 6. Arm it

```sh
touch ~/.buzz/proxy/ARMED
```

Quit and reopen Buzz Desktop. `launcher.log` now reads `ARMED` instead of `PROBE`.

Arming is opt-in rather than opt-out on purpose: the file is yours, so `git pull &&
bootstrap-nest` can neither arm a fence you were still testing nor silently disarm one you
rely on. To back out, `rm ~/.buzz/proxy/ARMED` and restart — the launcher stays in the path
and keeps logging.

### 7. Verify from the process, not from the agent

```sh
~/.buzz/proxy/verify-fence.sh          # before arming: mapping and logins
~/.buzz/bin/check-agent-fence-live.sh  # after arming: which processes carry it
```

These answer different questions and both are needed. `verify-fence.sh` checks the launcher's
side — every community mapped, every fence logged in, and what each fence actually exposes.
`check-agent-fence-live.sh` reads `CLAUDE_CONFIG_DIR` out of every running agent process and
names the agent and community, which is the only thing that shows the fence reached the
process rather than the file.

**Never verify a fence by asking the agent.** A model will describe a fence it does not have,
and will report side effects it never performed. The evidence is the process environment and
the server list from the config directory.

---

## Adding a client later

```sh
cd ~/.buzz/proxy
cp -R fences/_unknown fences/acme2
printf 'acme2.communities.buzz.xyz\tacme2\n' >> communities.map
# edit fences/acme2/.claude.json
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme2 claude auth login
./verify-fence.sh
```

The agent command never changes again. Adding a client is a row in `communities.map`, a
directory, and a login.

---

## Traps

**The launcher must never log its environment.** The process it inherits carries
`BUZZ_PRIVATE_KEY` — the agent's own nsec — along with the auth tag. The shipped launcher
logs the relay, the host and the fence, and nothing else. Keep it that way: a `set -x`, an
`env >> log`, or a `log "$@"` added while debugging writes the agent's identity into a
world-readable file.

**Do not exec `$BUZZ_ACP_AGENT_COMMAND`.** Buzz sets it to whatever it was told to run, which
once this is installed is the launcher itself. A launcher that reads it execs itself forever.
The shipped one resolves the target independently and refuses a target that is itself.

**The deny rules in the shipped `settings.json` are written against `~/.buzz`.** If your nest
is elsewhere — `--nest`, `$BUZZ_HOME` — edit them. They are literal paths, and a rule naming a
directory you do not use denies nothing.

**`disableClaudeAiConnectors` is separate from the registry.** The claude.ai connectors ride
on the account login, not on `.claude.json`, so a fence with an empty `mcpServers` still
reaches all of Drive unless that flag is set. It is in the template for that reason.

**Two communities in one fence is one fence.** If two clients share a config directory, the
agent can reach both from either. The map is where that decision is made and it is easy to
make by accident — check `communities.map` for two hosts pointing at the same name.

---

## Turning the Seatbelt sandbox on

A fence directory here is an ordinary `CLAUDE_CONFIG_DIR`, so everything in
[`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md) applies to it unchanged — the
`sandbox` block, the `//`-or-`~/` rule syntax, the `allowRead` re-allow, and
`bin/verify-agent-fence.sh` to probe it with a manifest rather than a glob.

The one thing that differs: the block is now maintained per community rather than per agent.
A client added to `communities.map` without a matching `allowRead` gets a working fence and a
broken agent, and nothing in the launcher can see that.
