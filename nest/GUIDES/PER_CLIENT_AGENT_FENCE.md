---
title: "Per-Client Agent Fence: Verified Recipe"
tags: [buzz, fencing, sandbox, seatbelt, claude-config]
status: active
created: 2026-09-17
---

Verified end-to-end on 2026-09-17. Gives each agent an **OS-enforced** read fence, on one macOS
user account, with no product change to Buzz.

## The rule syntax is the whole game

A leading **single** `/` in a permission rule is **project-relative**, not filesystem-absolute.
It matches nothing, loads with no warning, and denies nothing — while looking like a fence.

```
Read(/Users/…/client-b/**)    -> file was read. silent no-op.
Read(//Users/…/client-b/**)   -> denied                       OK
Read(~/.buzz/…/client-b/**)   -> denied                       OK
```

Use `//` or `~/`. Audit any settings file you already have for single-slash rules.

## It holds under bypassPermissions

Earlier conclusion that bypass defeats the fence was **wrong** — that run used the broken
syntax. With correct syntax, in `bypassPermissions` (the mode Buzz agents run in), a recursive
grep the model had no reason to refuse produced a raw OS error:

```
/…/client-a/OK.txt:ALPHA-ALLOWED-CANARY
ugrep: warning: cannot open directory /…/client-b: Operation not permitted
```

Allowed dir read, denied dir refused by the kernel. Shell `cat` in default mode gave the same
`Operation not permitted`, and the Read tool gave `File is in a directory that is denied by
your permission settings` in **both** modes.

So there is no need to move agents off bypass, and no risk of them stalling on prompts.

## When this is not the right guide

This fences an agent for its whole life, which is right as long as each agent serves one
client. If any agent belongs to several communities and those communities are different
clients, the fence has to vary per community as well as per agent, and no value stored on the
agent record can do that — see [PER_COMMUNITY_TOOL_FENCE.md](PER_COMMUNITY_TOOL_FENCE.md).

The two are the same mechanism: that guide's launcher picks one of these directories at spawn
instead of the record naming one. Everything below applies unchanged to each directory it
creates, and the two can run side by side — agents that span communities on the launcher, the
rest here.

## Recipe, per client agent

1. One `CLAUDE_CONFIG_DIR` per client agent, set in that agent's `env_vars`.

   **Check that field exists before you plan around it.** It is absent on newer managed-agent
   records, where the only command-shaped fields are the agent command and its override. Where
   it is absent, the launcher in the per-community guide is the only lever.
2. In `<config dir>/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "filesystem": {
      "allowRead": ["/Users/<you>/.buzz/.secrets/<this-client-key>.json"]
    }
  },
  "permissions": {
    "deny": ["Read(~/.buzz/.secrets/**)", "Read(~/.buzz/mcp/**)"]
  }
}
```

**The re-allow goes in `sandbox.filesystem.allowRead`, NOT `permissions.allow`.** They are
different systems. With the narrow allow in `permissions.allow` the agent's own key came back
`Operation not permitted` along with everyone else's — a fence that silently breaks the agent
it is protecting. `allowRead` takes precedence inside a denied region; use plain absolute
paths there, not the `Read(...)` rule syntax.

3. Put only that client's MCP servers in `<config dir>/.claude.json`.
4. Move that client's subagents to `<config dir>/agents/`.

## Constraints, verified

- **`runtime: claude` only.** `buzz-agent` agents get none of this; 10 live agents are on it.
  Flipping runtime re-opens the full connector list — set `runtime` and `CLAUDE_CONFIG_DIR` in
  the **same** save.
- **Denylist, not allowlist.** `sandbox.filesystem.allowManagedReadPathsOnly` (deny-by-default)
  reads only from machine-level managed settings, not a per-agent file.
- **A fresh config dir is signed out.** One interactive login per dir; the credential is
  keychain-scoped per directory.
- **Never trust an agent's description of its own refusal.** During this work a nested agent
  attributed a denial to "the sandbox" when it came from an unrelated nest hook, and elsewhere
  refused pre-emptively without running the command at all. Only a raw OS error
  (`Operation not permitted`) is evidence. Ask for verbatim output, and prefer an indirect
  command the model has no reason to refuse.

## Verified on a real agent (2026-09-17)

Built for one client agent: own config dir, four connectors instead of eleven, that client's
five subagents copied in, eight deny rules, five `allowRead` re-allows. Probed through the
agent's own settings in `bypassPermissions`:

```
READABLE  ok                                 own service key
READABLE  ok                                 own mcp config x2
BLOCKED   ok  [Operation not permitted]      two other clients' service keys
BLOCKED   ok  [Operation not permitted]      two other clients' mcp configs
BLOCKED   ok  [Operation not permitted]      another client's subagent definition
BLOCKED   ok  [Operation not permitted]      the global connector list
BLOCKED   ok  [Operation not permitted]      the agent registry
RESULT: fence intact (10 probes)
```

Reusable checker: `bin/verify-agent-fence.sh <manifest>`.

## Two traps that make a broken fence look like a working one

1. **Build the probe list outside the fence.** A correct fence blocks *directory listing*, so a
   glob evaluated inside the sandbox expands to nothing and a globbing verifier reports a clean
   pass having tested zero files. Pass an explicit manifest; fail loudly on zero probes.
2. **The sandbox blocks writes outside the workspace**, including `/tmp`. A verifier that
   captures stderr to `/tmp` loses every error message and reports garbage. Keep scratch files
   inside the workspace.
