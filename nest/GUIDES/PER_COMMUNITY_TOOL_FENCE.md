---
title: "Per-Community Tool Fence: a tool list per agent, per community"
tags: [buzz, fencing, multi-tenant, mcp, claude-config]
status: active
created: 2026-09-18
---

# Per-community tool fence

## The problem

You have two clients. Each one has their own Buzz community, and the same agent is in both —
same name, same face, same person as far as anyone in either community is concerned.

That agent's tools come from one file on your Mac. So when it is answering in the first
client's community, it can still query the second client's database, read the second client's
Drive folder, and quote one to the other. Not because anyone granted that — because the tool
list has no idea which community the question came from.

Buzz gives you no setting for this. Everything you can configure lives on the *agent*, and the
agent is one agent.

## What this does

It makes the tool list depend on **which agent** woke up and **which community** it woke up
in.

You keep your agents as they are — same identities, same names, same histories. But the
moment one starts in a community, it gets the tools you granted *that agent* in *that
community* and nothing else. A community you have not set up yet gets no tools at all rather
than everyone's, and so does an agent you have not set up.

**Both halves matter.** Key the fence on community alone and every agent in a client
community shares one tool list: the agent whose entire safety property is holding no client
data inherits the database and Drive access of the one that ingests it. That is the
guarantee [`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md) exists to make, and it is
undone by a fence that is per client but not per agent.

## Do you need it?

| | |
| --- | --- |
| One client, or none | **No.** Use [`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md) — one agent, one fixed tool list. Simpler, and OS-enforced |
| Several clients, a separate agent for each | **No.** Same guide. One fence per agent |
| Several clients, and **any agent appears in more than one** | **Yes.** Nothing stored on an agent can differ between communities, so this is the only lever |

It is normal for this to be some of your agents and not others. An agent that lives in one
community is fine on the per-agent guide; point the ones that span communities at this
launcher and leave the rest alone. They can coexist — both end up setting the same variable.

If you are not sure which you are, step 2 below is a command that lists every agent and
community pair on the machine.

## What it costs you

About fifteen minutes the first time, then two minutes per client after that.

1. Copy a folder per agent per community — or one into `_shared` for an agent that is the
   same everywhere — and add one line per community. *(5 min)*
2. Log in once per fence directory, in a browser. **Do this before you point any agent at
   the launcher.** The fence is live the moment an agent runs through it, and a directory
   nobody has logged into makes that agent answer `Authentication required` to everything.
   *(5 min, and it is per directory — the one real cost of splitting by agent as well as
   community)*
3. Point the agents at the launcher and restart Buzz. *(2 min)*
4. Run a script that tells you whether it actually took. *(1 min)*

Backing out means taking the launcher back out of the agent command. Nothing is destroyed
and nothing is migrated.

**The fence is always on, and there is no flag to switch it off.** An optional fence is the
same as no fence, because the machine that most needs one is the machine nobody got round to
configuring. A missing directory therefore falls back to the deny-all registry rather than to
the operator's own — an agent with no tools, which says so in the log.

## What it does not do

**It does not fence the workspace.** `~/.buzz` — `AGENTS.md`, `.secrets/`, `REPOS/`,
`RESEARCH/`, `WORK_LOGS/` — is one directory shared by every community, and Buzz offers no
way to vary it. So an agent still reads and writes the same files everywhere.

This fences what the agent can **call**, not everywhere it can look. That is a real limit and
it is worth saying out loud before anyone describes this as client isolation. Closing it needs
a product change in Buzz.

---

## Which directory an agent gets

In order, first hit wins:

| | |
| --- | --- |
| `fences/<community>/<agent>/` | A **client-bound** agent — different tools per client |
| `fences/_shared/<agent>/` | A **client-independent** agent — the same tools everywhere |
| `claude-config-<agent>-<community>/` | Legacy, written by `deploy-claire-channel.sh` |
| `claude-config-<agent>/` | Legacy, written by `deploy-betty.sh` and `deploy-loki.sh` |
| `fences/<community>/_default/` | An agent you have not set up yet, in a community you have |
| `fences/_unknown/_default/` | Nothing matched. Deny-all, rather than the operator's own registry |

**`_shared` is for agents that hold no client data.** Some agents are client-independent by
design: they serve every client identically and reach research through another agent rather
than through credentials of their own. Giving those a directory per community means N
identical copies and N separate logins, because the credential is keychain-scoped per
directory. One directory, one login. A per-community directory always wins over `_shared`,
so a client-bound agent cannot land there by accident, and nothing is in `_shared` unless
you put it there.

**The two legacy names are read, not written.** The deploy scripts already write there, and
so do the tools that resolve a client's server config by path — `scribe-ingest`,
`tagger-batch`, `survey-lines`. Repointing the deploys without those would write an agent's
tools somewhere nothing reads. The existing convention already encodes the same two shapes
this tree does — `<agent>` alone for client-independent, `<agent>-<client>` for
client-bound — so the launcher simply recognises it. An existing install works the moment
its agents are pointed at the launcher, with nothing to migrate.

One catch: the legacy per-client name is matched on the **fence** name, not the client slug.
They are usually the same word. Where they are not, the lookup misses and falls through
rather than guessing — visible in `launcher.log`, and fixed by naming the fence after the
slug in `communities.map`.

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

**A correction to [`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md) while you are
here.** Its step 1 says to set `CLAUDE_CONFIG_DIR` in the agent record's `env_vars`. That
field does not exist on a managed agent on every build — where it is absent, the agent command
is the only lever, and the launcher below is the only way to set that variable at all. Look at
your own agent's settings before following either recipe.

---

## Layout

Installed by `scripts/bootstrap-nest.mjs` into `~/.buzz/proxy/`:

| Path | Purpose |
| --- | --- |
| `buzz-agent-launcher.sh` | Set this as the agent's command in Buzz Desktop |
| `communities.map` | `<relay host>` → `<fence name>`, **tab**-separated. Yours to edit |
| `fences/<community>/<agent>/.claude.json` | The MCP servers that agent may load in that community |
| `fences/<community>/<agent>/settings.json` | `permissions.deny` + `disableClaudeAiConnectors` |
| `fences/_shared/<agent>/` | An agent that is the same in every community. One directory, one login |
| `fences/<community>/_default/` | Any agent in that community with no directory of its own |
| `fences/_unknown/_default/` | Deny-all fallback for an unmapped relay. Also the template |
| `model-env.sh` | Optional. Sourced before handing off, for running agents against a self-hosted model |
| `launcher.log` | One line per agent start |
| `verify-fence.sh` | Unmapped communities, login state, and the server list per fence |

`target` is optional and not shipped: the launcher finds the ACP agent where Buzz Desktop
ships it. Write a path into `~/.buzz/proxy/target` only if yours is somewhere else.

---

## Install

### 1. Add a fence per agent per community

```sh
cd ~/.buzz/proxy
mkdir -p fences/acme
cp -R fences/_unknown/_default fences/acme/_default   # this community's fallback
cp -R fences/_unknown/_default fences/acme/claire     # one per agent that needs its own
cp -R fences/_unknown/_default fences/acme/betty
printf 'acme.relay.example\tacme\n' >> communities.map   # your real host, not this one
```

The agent directory name is the agent's display name in Buzz, lower-cased, with every run of
non-alphanumeric characters replaced by a single dash. `Claire` is `claire`.

Then put each agent's servers in its own `.claude.json` — the client's database and Drive in
`fences/acme/claire/`, the knowledge server alone in `fences/acme/betty/`. An agent with no
directory of its own falls back to `fences/acme/_default`, which is per community, so the
fallback you write for one client is never another client's.

**Leave `_default` empty unless you mean it.** It is what a new agent gets before you have
thought about it, so an empty one is a new agent with no tools — visible, and fixed in a
minute. A generous one is a new agent holding a client's data before anyone decided it
should.

**Take the host from `launcher.log`, do not type what you expect.** It is `BUZZ_RELAY_URL`
with the scheme and any path stripped, and a relay can be hosted anywhere — the log prints the
host it parsed on every agent start, which is the only value guaranteed to match. The fence
name beside it is yours to choose and need not resemble the host.

**Tab-separated, not spaces** — a line with spaces does not match, and the community then
falls through to the deny-all fence with no error.

### 2. Cover every pair, not the ones you can see

The list of agent-and-community pairs on this machine is **not** `ps`, and **not**
`launcher.log`. Only the ones currently awake appear in either. Buzz keeps the complete list,
one file per `(pubkey, relayUrl)` it has ever spawned:

```sh
ls ~/Library/Application\ Support/xyz.block.buzz.app/agents/agent-pids/
```

`verify-fence.sh` reads that directory, resolves each pubkey to an agent name, and prints
every pair with where it would route — naming any community missing from `communities.map`
and any agent falling back to `_default`. Run it before you arm anything.

Neither gap errors. A missing community gets the empty registry; a missing agent directory
gets the fallback. Both look from the inside like an agent whose tools disappeared.

### 3. Log in — once per fence, before any agent uses it

```sh
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme/claire claude auth login
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme/claire claude auth status   # "loggedIn": true
```

Every directory the launcher can land on needs this — every `<community>/<agent>`, every
`<community>/_default`, and `_unknown/_default`. `verify-fence.sh` lists them and reports
which are signed out, so run it rather than working from memory.

A config directory is its own account. The credential lives in the login keychain under an
entry keyed to that directory, so **a fence you just created is correctly isolated and signed
out**, and no file the bootstrap writes can change that — only a login mints a credential.

**Every fence, including `_unknown/_default`, and all of it before step 4.** There is no
dry-run period to test in: an agent whose fence has
never been logged in answers `Authentication required` to everything from its first turn. The
instinct is then to undo the isolation, which is exactly backwards. Copying the account block
out of `~/.claude.json` does not work either: that is profile data, not the credential, and it
leaves a directory that looks signed in.

### 4. Point each agent at the launcher

Buzz Desktop → the agent → agent command → `~/.buzz/proxy/buzz-agent-launcher.sh`.

**Once per agent**, and the same path every time — the launcher works out which agent it is
from the environment, so there is nothing per-agent to configure here. An agent you do not
point at it keeps whatever it had, which is how you roll this out one agent at a time.

On builds that separate the two, creating a custom harness and **assigning** it to the agent
are different steps. Creating it is not enough; the agent keeps the built-in harness until
you pick the new one from the agent's harness selector.

**Then quit and reopen Buzz Desktop.** Saving restarts the agent only on the community you
happen to be looking at. Every other community keeps its old process, and its old
environment, indefinitely — so a half-applied change looks exactly like a change that did not
apply.

### 5. Read the log

```sh
cat ~/.buzz/proxy/launcher.log
```

You want one `FENCED` line per agent process, each naming the agent you expect and the fence
you expect, with no `_unknown` and no `-> _default` you did not intend. Buzz runs several agents per community — `parallelism` in the agent's
settings — so expect that many lines per community, all with the same fence.

**One line per restart has an empty relay and lands in `_unknown`.** That is Buzz probing the
harness, not a session. Expect it; do not map it away.

### 6. Verify from the process, not from the agent

```sh
~/.buzz/proxy/verify-fence.sh          # mapping and login state
~/.buzz/bin/check-agent-fence-live.sh  # which processes actually carry it
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
mkdir -p fences/acme2
cp -R fences/_unknown/_default fences/acme2/_default
cp -R fences/_unknown/_default fences/acme2/claire
printf 'acme2.relay.example\tacme2\n' >> communities.map   # your real host
# edit fences/acme2/claire/.claude.json
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme2/claire   claude auth login
CLAUDE_CONFIG_DIR=~/.buzz/proxy/fences/acme2/_default claude auth login
./verify-fence.sh
```

The agent command never changes again, for any agent. Adding a client is a row in
`communities.map`, a directory per agent, and a login per directory.

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

**The launcher resolves `node` itself, and must keep doing so.** Buzz Desktop is a GUI app
and inherits launchd's `PATH`, which contains neither `node` nor the Claude CLI. The ACP
adapter is a `.js` file with a `#!/usr/bin/env node` shebang, so exec'ing it directly under
that `PATH` dies with `env: node: No such file or directory` before the agent starts — which
reaches the operator as an agent that will not come up, with nothing about node anywhere
near it. The launcher runs a node-shebang target under Buzz's bundled node explicitly. It
works without this on a machine whose `PATH` happens to carry node, which is not the same as
being correct.

**Renaming an agent in Buzz silently moves it to `_default`.** The display name is the only
agent identifier Buzz puts in the process environment — there is no id — so the directory is
matched by name. Rename the agent and its directory stops matching; it does not error, it
falls back. `verify-fence.sh` reports a directory no running agent resolves to, which is what
a rename looks like from the outside. Rename the directory to match and log in again, because
the credential is keyed to the directory path.

---

## Turning the Seatbelt sandbox on

A fence directory here is an ordinary `CLAUDE_CONFIG_DIR`, so everything in
[`PER_CLIENT_AGENT_FENCE.md`](PER_CLIENT_AGENT_FENCE.md) applies to it unchanged — the
`sandbox` block, the `//`-or-`~/` rule syntax, the `allowRead` re-allow, and
`bin/verify-agent-fence.sh` to probe it with a manifest rather than a glob.

The one thing that differs: the block is now maintained per community rather than per agent.
A client added to `communities.map` without a matching `allowRead` gets a working fence and a
broken agent, and nothing in the launcher can see that.
