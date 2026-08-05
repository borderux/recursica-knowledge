# Stu — traceability explorer for a research channel

A local web app that renders one Buzz research channel's BigQuery dataset as a navigable graph,
so a person can check that every AI-produced claim traces back to a real transcript line.

This is the app Stu launches. The agent that launches it is defined one directory up, in
[`../SYSTEM_PROMPT.md`](../SYSTEM_PROMPT.md) and [`../agent.json`](../agent.json).

```bash
~/.buzz/bin/stu --slug acme --channel <channel-uuid>
# stu: acme → http://127.0.0.1:4317
```

Idempotent — a second launch prints the running URL instead of binding another port.
That launcher is installed into `~/.buzz` from [`nest/bin/stu`](../../../../nest/bin/stu), and
it runs **this directory** — `bootstrap-nest.mjs` bakes the absolute path in when it installs
the script, so nothing is copied. Re-run bootstrap if you move the clone.

## Running it from this directory

```bash
cp stu.env.example stu.env      # fill in slug, project, channel
./start.command                 # first run installs and builds; Ctrl-C stops it
```

`start.command` runs Stu out of this folder with no dependency on the `~/.buzz` layout —
double-click it in Finder, or `./start.command --port 4400`. It runs in the foreground, unlike
`nest/bin/stu`, which installs a launchd job tied to Buzz Desktop's lifetime.

Two things it needs that this directory deliberately does not contain:

- **A service-account key.** `start.command` looks in `STU_BQ_KEY`, then
  `secrets/claire-<slug>-service-user.json` beside this README, then `~/.buzz/.secrets/`.
  Send it through a channel that is not this repository.
- **A network, once.** No build is committed. `npm install` in `web/` fetches the dependencies
  *and* the Recursica tokens — `@recursica/official-release`'s postinstall writes
  `recursica_variables_scoped.css` and the token JSON into `web/`, which is what
  `web/postcss.config.js` and `web/src/main.jsx` read. Those five files are gitignored: they
  belong to the Recursica release, and a vendored copy is a stale copy.

The server itself installs nothing. It imports only Node builtins — it reaches BigQuery over
REST and signs its own JWT — so Node 18+ is the whole runtime requirement.

One caveat on a machine without the Buzz CLI: `server/identity.mjs` shells out to `buzz` for the
channel roster, so edit attribution degrades. Reading and tracing findings work regardless.

## Nothing here names a client

No slug, project id, channel uuid, or key is committed. `stu.env` supplies all four and is
gitignored; `stu.env.example` documents them. `server/config.mjs` fails with a readable message
rather than falling back to a default, because a default project id is how one client's explorer
quietly opens against another client's data.

## What it is for

> *"allow the user to verify the traceability of the findings, and to make sure no hallucinations
> were added by the ai"* — the operator, 2026-08-02

Every design decision resolves toward that. The governing rule, enforced in `server/queries.mjs`
rather than left to the UI: **no AI-produced value is returned without its provenance.** A tag
always travels with its confidence, justification, and who applied it. A corrected line always
travels with the original text and the dictionary terms that licensed the change. A finding
always travels with its evidence *and* the live text of each cited line, so drift between what
an agent quoted and what the line says is visible rather than trusted.

Where provenance is missing, that absence is displayed as a warning — not hidden.

## Layout

| Path | What it holds |
|---|---|
| `server/bq.mjs` | BigQuery client. Parameterised queries, exhaustive pagination, nested-type decoding. |
| `server/queries.mjs` | Every read. No caller builds SQL from user input. |
| `server/edits.mjs` | **Every write.** Each function writes its own `edit_log` row. |
| `server/identity.mjs` | Email ↔ pubkey binding via channel membership. |
| `server/config.mjs` | Resolves the one dataset this process may read, once, at startup. |
| `server/server.mjs` | HTTP API + static host. Binds `127.0.0.1` only. |
| `web/` | React + Mantine + the Recursica design system. |

The service-account key is read in the server process and never reaches the browser. The dataset
is resolved once at startup and nothing at runtime can widen it — the same fence discipline as
the `bq-<slug>` MCP server, with IAM underneath as the layer that fails safe.

## The audit trail

Every change goes through `server/edits.mjs`, and every function there writes an `edit_log` row:
field, old value, new value, timestamp, and the editor's Buzz pubkey. There is no route that
reaches BigQuery with a write and skips it — that is a property of the module layout, not a
convention to remember.

If the data write succeeds and the log write fails, the caller gets an error naming both facts.
An edit that happened but went unrecorded is worse than one you have to retry.

**Identity is attribution, not authentication.** Anyone who can reach the loopback port can claim
any channel member's identity. It records who *says* they made a change. The upgrade, when it
matters: sign each edit with the user's own Nostr key and store the signature alongside the row —
an addition, not a migration.

## Human edits are sticky

Where an agent and a person both write, the person wins:

- **`transcript_lines`** — editing `cleaned_text` stamps `edited_by`. Scribe's re-ingest `MERGE`
  must not overwrite a row so marked. See *Human edits survive a re-ingest* in
  [`nest/GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md`](../../../../nest/GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md).
- **`tags`** — never physically deleted. Removal sets `removed_at` / `removed_by`.
- **`tag_library`** — a tag added here is written `origin = 'human'`, which is what stops
  `nest/bin/sync-tag-dictionary.mjs` retiring it on the next sheet sync.
- **`participants`** — the transcription service splits one person across several speaker labels.
  A consolidation is written to `people` / `participant_links` and read through
  `participants_current`, so Scribe's re-ingest has no reach over it. It never rewrites
  `transcript_lines.participant_id`, which is what tags and findings cite — a merge is a layer
  above those ids, so it cannot invalidate a citation.

## Development

```bash
cd web && npm install && npm run build   # the server serves web/dist
~/.buzz/bin/stu --slug acme --foreground # server in the foreground

cd web && npm run dev                    # Vite on :5173, proxying /api to :4317
```

`npm run build` runs the Recursica PostCSS plugin in strict mode, so a missing or incomplete
token file fails the build rather than shipping unstyled components.

Component and layout rules come from [`skills/`](../../../../skills/) at the root of this
repository — start at
[`skills/meta/recursica-skill-design-router`](../../../../skills/meta/recursica-skill-design-router/SKILL.md).
