---
title: "Setup — BigQuery MCP Tool and Google Docs Service Account"
tags: [bigquery, mcp, google-auth, service-account, claire, setup]
status: active
created: 2026-08-01
---

# Setup: BigQuery MCP tool + Google Docs service account

Answers operator requirements in `#building-claire`. Every claim below is
verified against the toolbox source or a live HTTP check — citations inline.

---

## Prerequisites & Architecture Overview

Before proceeding, ensure the Google Cloud service account and Drive permissions are configured per `CLAIRE_ZERO_TO_RUNNING.md`.

- **Toolbox binary**: `~/.buzz/bin/toolbox`
- **Service account**: `claire-transcript-reader@{{BQ_PROJECT}}.iam.gserviceaccount.com`
- **Permissions**: Scoped read access to `research_<slug>` datasets and `{{TAG_SHEET_ID}}`.

---

## Part 1 — Install the BigQuery MCP tool

Use Google's own **MCP Toolbox for Databases** (`googleapis/mcp-toolbox`, formerly
`genai-toolbox`). It ships a prebuilt BigQuery toolset, so there's no YAML to author.

Latest release at time of writing: **v1.8.0**, published 2026-07-28
(`GET /repos/googleapis/mcp-toolbox/releases/latest`).

### 1.1 Download the binary

This machine is darwin/arm64. URL verified live — returns `HTTP/2 200`:

```bash
mkdir -p ~/.buzz/bin && cd ~/.buzz/bin
curl -O https://storage.googleapis.com/mcp-toolbox-for-databases/v1.8.0/darwin/arm64/toolbox
chmod +x toolbox
./toolbox --version
```

Swap `darwin/arm64` for `linux/amd64`, `darwin/amd64`, or `windows/amd64` elsewhere.

### 1.2 Authenticate (ADC)

The toolbox uses Application Default Credentials. `gcloud` is **not installed on this
machine** (verified), so either install the Cloud SDK, or point ADC at a service-account key:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/.buzz/.secrets/recursica-bq-sa.json
```

Keep the key outside any git working tree. Part 2 covers creating it.

IAM roles on `{{BQ_PROJECT}}` for the agent's service account:

| Need | Role |
|---|---|
| Run queries + create datasets | `roles/bigquery.user` |
| Read/write table data | `roles/bigquery.dataEditor` |

Verify in the console before relying on it — role contents do drift, and least-privilege is
worth a second pass once the dataset naming settles.

### 1.3 ⚠️ The default config silently truncates at 50 rows

**Read this before configuring anything.** From
`internal/sources/bigquery/bigquery.go` on `main`:

```go
if r.MaxQueryResultRows == 0 {
    r.MaxQueryResultRows = 50          // line 137-139
}
```

and the result loop:

```go
out := []any{}
for s.MaxQueryResultRows <= 0 || len(out) < s.MaxQueryResultRows {   // line 612
    ...
}
if len(out) > 0 {
    return out, nil                    // no truncation flag, no warning
}
```

The loop stops at the cap and returns the rows **with no indication that more existed**.
Out of the box that is a 50-row silent truncation — a 10× regression on the `LIMIT 500` we're
migrating away from, and the exact failure class the operator called out.

`MaxQueryResultRows <= 0` disables the cap, so set it negative:

```
BIGQUERY_MAX_QUERY_RESULT_ROWS=-1
```

Removing the cap is necessary but **not sufficient**. An uncapped read can still come back
short for other reasons, and nothing in this tool will tell you. The durable fix is
reconciliation in the pipeline: every read that feeds an agent records `rows_returned`
alongside a separate `COUNT(*)` for the same predicate, and the run **fails loudly** on
mismatch. That's what `ingest_runs` in the schema doc is for.

### 1.4 Write modes

Also from `bigquery.go` (lines 53-57, 133-135):

| `writeMode` | Behaviour |
|---|---|
| `allowed` | **default** — DDL and DML permitted |
| `protected` | SELECT, plus writes confined to the session's anonymous dataset |
| `blocked` | SELECT only |

So `CREATE SCHEMA` works by default. Good — agent-provisioned datasets need it.

### 1.5 ⚠️ `allowedDatasets` and `CREATE SCHEMA` are mutually exclusive

This one directly constrains the per-channel-dataset design. From
`internal/tools/bigquery/bigqueryexecutesql/bigqueryexecutesql.go` (lines 173-176):

```go
if len(source.BigQueryAllowedDatasets()) > 0 {
    switch statementType {
    case "CREATE_SCHEMA", "DROP_SCHEMA", "ALTER_SCHEMA":
        return nil, util.NewAgentError(fmt.Sprintf(
            "dataset-level operations like '%s' are not allowed when dataset restrictions are in place", statementType), nil)
```

And an allowlisted dataset must already **exist at server startup** — the source verifies each
one with `dataset.Metadata(ctx)` and refuses to start otherwise:
`"allowedDataset '%s' not found in project '%s'"` (bigquery.go ~lines 218-226).

Consequence: you cannot have one MCP server that both creates datasets and is fenced to a
dataset allowlist. Pick per server.

### 1.6 Recommended: two server instances

```jsonc
{
  "mcpServers": {
    // Claire only. Provisions a new research channel's dataset. No allowlist,
    // so CREATE SCHEMA is permitted — therefore it can reach every dataset in
    // the project. Keep it out of the analysis agents' configs.
    "bq-admin": {
      "command": "$HOME/.buzz/bin/toolbox",
      "args": ["--prebuilt", "bigquery", "--stdio"],
      "env": {
        "BIGQUERY_PROJECT": "{{BQ_PROJECT}}",
        "BIGQUERY_MAX_QUERY_RESULT_ROWS": "-1"
      }
    },

    // The working agents. Fenced to one channel's dataset, so a bug in Tagger
    // cannot write into another research channel. Add one block per channel.
    // NOTE: --config, NOT --prebuilt. See the correction below.
    "bq-building-claire": {
      "type": "stdio",
      "command": "$HOME/.buzz/bin/toolbox",
      "args": [
        "--config", "$HOME/.buzz/mcp/bq-building-claire.yaml",
        "--stdio", "--disable-reload"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS":
          "$HOME/.buzz/.secrets/{{BQ_PROJECT}}-abc123def456.json"
      }
    }
  }
}
```

#### ⚠️ Correction (2026-08-01): `BIGQUERY_ALLOWED_DATASETS` does not exist

An earlier draft of this guide told you to fence the worker server with
`BIGQUERY_ALLOWED_DATASETS` on top of `--prebuilt bigquery`. **That is wrong, and it fails
silently — the worst kind.** The prebuilt config is embedded in the binary and substitutes
*exactly seven* variables:

```
BIGQUERY_PROJECT  BIGQUERY_LOCATION  BIGQUERY_USE_CLIENT_OAUTH  BIGQUERY_SCOPES
BIGQUERY_MAX_QUERY_RESULT_ROWS  BIGQUERY_IMPERSONATE_SERVICE_ACCOUNT
BIGQUERY_MAXIMUM_BYTES_BILLED
```

Verify yourself: `strings ~/.buzz/bin/toolbox | grep -oE '\$\{BIGQUERY_[A-Z_]+[^}]*\}' | sort -u`

There is no `allowedDatasets` line and no `writeMode` line in the prebuilt source. Any other
`BIGQUERY_*` var is ignored with **no warning**, so the server starts happily, `claude mcp list`
shows it, every query works — and it is **not fenced at all**. It would also start fine before
the dataset existed, which is exactly the symptom that would have made you think it was working.

So the fenced server **must** use a hand-authored config: `~/.buzz/mcp/bq-building-claire.yaml`.
This is also the toolbox's own advice — it warns on every `--prebuilt` start that prebuilt
configs are *"not secure enough for run time."* The hand-authored file emits no such warning.

`writeMode` accepts `allowed` | `protected` | `blocked`; use `blocked` for a read-only analyst
server. `maximumBytesBilled` is set to 1 GiB so a runaway query fails instead of billing.

#### Verified fence behaviour (2026-08-01)

Run against the real config with `toolbox invoke`:

| Test | Result |
|---|---|
| `SELECT COUNT(*)` in `research_building_claire` | ✅ succeeds |
| Same against `other_client_db` | ❌ `query accesses dataset '{{BQ_PROJECT}}.other_client_db', which is not in the allowed list` |
| `CREATE SCHEMA` | ❌ `dataset-level operations like 'CREATE_SCHEMA' are not allowed when dataset restrictions are in place` |
| 200-row query, hand-authored config | ✅ returns **200** |
| 200-row query, `--prebuilt` default | ⚠️ returns **50**, no truncation flag |

That last row is the silent truncation reproduced live. `maxQueryResultRows: -1` removes the cap;
only `ingest_runs` reconciliation makes a short read *visible*.

Operational cost, stated plainly: standing up a new research channel means provisioning the
dataset with `bq-admin`, then **adding a config block and restarting** so the fenced server
can verify it at startup. Once per channel, not per run — but it is a manual step, and it is
the price of the isolation. If that friction isn't worth it, the alternative is a single
un-fenced server plus dataset-level IAM on the service account.

### 1.6b How to actually register it (verified 2026-08-01)

Don't hand-edit `~/.claude.json` — it also holds OAuth account state and session caches, and a
concurrent Claude Code session can overwrite your edit. Use the CLI, which locks correctly:

```
claude mcp add-json [--scope user] <name> <json>
```

`claude` lives at `~/.local/bin/claude` on this machine (not on the default PATH).

**Use `--scope user`.** The existing `pencil` server sits at the root `mcpServers` key of
`~/.claude.json`, which is user scope — and that's what feeds Buzz agent sessions. The CLI
defaults to `local` scope, which would not reach them.

**⚠️ Register `bq-admin` before the fenced server, not alongside it.** The fenced server's config
declares `allowedDatasets: [research_building_claire]`, and the toolbox **verifies every
allowlisted dataset exists at startup and refuses to start otherwise** (§1.5). Registering it
before the dataset is provisioned produces a server that fails on every launch. Correct order:

1. Register `bq-admin` ✅ *done 2026-08-01*
2. Restart, provision the dataset with it ✅ *done — all 8 tables verified*
3. *Then* register `bq-<channel>` ← current step

Match `pencil`'s entry shape, which includes `"type": "stdio"`. Paths must be absolute — `~` is
not expanded inside an MCP config.

### 1.6a Verifying registration

After adding the config and restarting, confirm an agent can actually reach it — a downloaded
binary and a registered server are different things. The binary can be smoke-tested directly
without any MCP client:

```bash
BIGQUERY_PROJECT={{BQ_PROJECT}} \
BIGQUERY_MAX_QUERY_RESULT_ROWS=-1 \
GOOGLE_APPLICATION_CREDENTIALS=~/.buzz/.secrets/{{BQ_PROJECT}}-abc123def456.json \
~/.buzz/bin/toolbox --prebuilt bigquery --stdio
```

It should log `Initialized 1 sources: bigquery-source`. That proves the credential and IAM work.
It does **not** prove any agent can use it — check the MCP server list for that.

### 1.7 ⚠️ The prebuilt config is documented as build-time only

The toolbox logs this on every start:

> `WARN These prebuilt configs are intended for 'build-time' use cases, where agents are helping
> trusted developers build things. They are not secure enough for 'run time' use cases, where the
> agent will be talking to potentially untrusted developers.`

Claire's pipeline is a run-time case: unattended, processing third-party interview transcripts,
with `writeMode: allowed` by default. `--prebuilt` is fine for getting Phase 0–1 working, but
before this runs autonomously, graduate to a hand-authored toolset YAML that exposes only the
tools each agent needs — Tagger has no business holding `execute_sql` with DDL rights.

### 1.8 Drive-backed external tables need the Sheet shared too

`{{BQ_PROJECT}}.knowledge.tags` is `table_type = EXTERNAL` with `is_insertable_into = NO` — a
federated table over the tags Google Sheet. Querying it as the service account fails:

> `Error 403: Access Denied: BigQuery BigQuery: Permission denied while getting Drive credentials.`

Adding the Drive scope is necessary but **not sufficient** — verified: setting
`BIGQUERY_SCOPES=https://www.googleapis.com/auth/bigquery,https://www.googleapis.com/auth/drive`
alone still 403s. The Sheet itself must also be shared with the service account:

1. Open the tags Sheet (`{{TAG_SHEET_ID}}`)
2. Share with `claire-transcript-reader@{{BQ_PROJECT}}.iam.gserviceaccount.com` as Viewer
3. Keep `BIGQUERY_SCOPES` set as above

Only needed to read the *existing* library once, to seed the native `tag_library` table. After
that, drop the Drive scope — an external Sheet table can't be written to, has no schema
enforcement, and adds a second credential dependency to every tagging run.

### 1.9 Prebuilt tool inventory

From `internal/prebuiltconfigs/tools/bigquery.yaml`: `analyze_contribution`,
`ask_data_insights`, `execute_sql`, `forecast`, `get_dataset_info`, `get_table_info`,
`list_dataset_ids`, `list_table_ids`, `search_catalog`.

Other env vars that config exposes: `BIGQUERY_LOCATION`, `BIGQUERY_USE_CLIENT_OAUTH`,
`BIGQUERY_SCOPES`, `BIGQUERY_IMPERSONATE_SERVICE_ACCOUNT`, `BIGQUERY_MAXIMUM_BYTES_BILLED`,
`BIGQUERY_ENDPOINT`.

Set `BIGQUERY_MAXIMUM_BYTES_BILLED` as a cost fuse — an agent writing an accidental
cross-join against the corpus is a billing event, not just a bug.

---

## Part 2 — Create the Google Docs service account

### 2.1 The gotcha that wastes an afternoon

**Service accounts are not members of your Workspace domain.** Sharing a doc with "everyone at
example.com" does **not** grant the service account access —
[Google's own docs say so explicitly](https://developers.google.com/workspace/guides/create-credentials).
You must either share with the service account's email directly, or use domain-wide delegation
and impersonate a real user.

### 2.2 Steps (recommended path — direct share)

1. **Enable the APIs** in `{{BQ_PROJECT}}`:
   Console → APIs & Services → Library → enable **Google Docs API** and **Google Drive API**.
   (Drive is needed for folder listing and file metadata; Docs alone won't cover it.)

2. **Create the service account:**
   IAM & Admin → Service Accounts → *Create service account*.
   Name it for its job, e.g. `claire-transcript-reader`. Note the generated email:
   `claire-transcript-reader@{{BQ_PROJECT}}.iam.gserviceaccount.com`.

3. **Grant BigQuery roles** (Part 1.2): `roles/bigquery.user` + `roles/bigquery.dataEditor`.

4. **Create a JSON key:** Service account → Keys → *Add key* → JSON. Store at
   `~/.buzz/.secrets/recursica-bq-sa.json`, `chmod 600`, and **never** inside a git worktree.
   One key reused by both the BigQuery MCP servers and the Docs reader is fine.

5. **Share the transcripts folder with the service account email.** Create a Drive folder
   (e.g. *Research Transcripts*), share it with the address from step 2 as **Viewer**, and drop
   every interview transcript in there. Inheritance means new docs are readable with no further
   action.

6. **Scopes** for the Docs/Drive client:
   `https://www.googleapis.com/auth/documents.readonly` and
   `https://www.googleapis.com/auth/drive.readonly`. Read-only is sufficient — nothing in this
   pipeline writes back to a Doc.

### 2.3 Why the folder share beats domain-wide delegation

Domain-wide delegation would let the SA impersonate any user and read anything they can:

- Requires a **Super Admin** in the Admin console (Security → Access and data control →
  API controls → Domain-wide delegation), registering the SA's Client ID against those scopes.
- Grants far more reach than this pipeline needs.
- Documents still have to be shared with the *impersonated user* — so it doesn't even remove
  the sharing step, it just moves it.

The folder share needs no admin privilege, is visible to anyone inspecting the folder, and is
revoked by removing one collaborator. Use it unless transcripts are scattered across private
drives and can't be consolidated.

### 2.4 Verify before wiring agents

Confirm the credential can actually fetch a doc before building on it. With
`GOOGLE_APPLICATION_CREDENTIALS` set:

```bash
python3 - <<'PY'
import google.auth
from google.auth.transport.requests import AuthorizedSession
creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/documents.readonly"])
s = AuthorizedSession(creds)
DOC_ID = "PASTE_A_SHARED_DOC_ID"
r = s.get(f"https://docs.googleapis.com/v1/documents/{DOC_ID}?includeTabsContent=true")
print(r.status_code, r.json().get("title", r.text[:300]))
PY
```

`200` plus the title means the share worked. `403` means step 5 didn't take effect for that
doc — check the folder, not the code.

Requires `google-auth` (`python3 -m pip install google-auth requests`). Not yet verified on this
machine; the package isn't installed here.

---

## Sources

- [MCP Toolbox for Databases (googleapis/mcp-toolbox)](https://github.com/googleapis/mcp-toolbox) — source of every code citation above, read from `main`
- [Connect LLMs to BigQuery with MCP](https://docs.cloud.google.com/bigquery/docs/pre-built-tools-with-mcp-toolbox)
- [Using the fully managed remote BigQuery MCP server](https://cloud.google.com/blog/products/data-analytics/using-the-fully-managed-remote-bigquery-mcp-server-to-build-data-ai-agents) — a hosted alternative to the self-hosted binary; not evaluated here
- [Create access credentials — Google Workspace](https://developers.google.com/workspace/guides/create-credentials)
- [Domain-wide delegation best practices](https://support.google.com/a/answer/14437356)
