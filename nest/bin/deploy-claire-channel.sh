#!/usr/bin/env bash
#
# Deploy Claire and her team to a research channel, on this machine.
#
# One channel == one Drive folder + one BigQuery dataset + one service account.
# Nothing is shared between channels, because channels are different clients.
#
# Run it whether or not the client already exists. The dataset half is idempotent —
# CREATE SCHEMA is dropped when the dataset is already there, tables are IF NOT
# EXISTS, the tag sync is a MERGE — and the other half is per-machine and has not
# been done here yet: registering the three MCP servers and rendering the four
# subagents. Skipping it leaves an operator with Claire and no tools.
#
# Usage:
#   deploy-claire-channel.sh \
#     --slug acme \
#     --channel-uuid <channel-uuid> \
#     --drive-folder {{DRIVE_FOLDER}} \
#     --sa-key ~/.buzz/.secrets/claire-acme-service-user.json \
#     --admin-key ~/.buzz/.secrets/{{BQ_PROJECT}}-abc123def456.json
#
# --sa-key     the channel's own service account. Runtime identity for every agent.
# --admin-key  a provisioning identity that can CREATE SCHEMA. Used only by this
#              script, never registered as a tool. If omitted, --sa-key is tried
#              and will fail unless it holds project-level dataset-create rights.
#
# Tag dictionary — the one asset shared across all projects:
# --dict-key       identity holding Viewer on the shared tag dictionary sheet.
#                  Defaults to ~/.buzz/.secrets/claire-tag-dictionary-reader.json.
# --tag-sheet      override the dictionary sheet id.
# --tag-csv        seed from a CSV instead of the sheet (offline / testing).
# --skip-tag-sync  leave tag_library empty. Tagger will refuse to tag.
#
# Project-wide default grants — pass one of these explicitly:
# --lock-down      REVOKE the projectEditor/projectViewer grants BigQuery puts on every
#                  new dataset. Correct for a client you are creating. Needs an identity
#                  with bigquery.datasets.update, so usually --admin-key.
# --no-lockdown    leave them. Correct when joining a client someone else created and
#                  already locked down.
# Given neither, it asks — and with no terminal to ask at it picks --no-lockdown and
# says so in the summary. Passing one keeps the choice yours.
#
# --dry-run        validate and stop before changing anything.
#
set -euo pipefail

BUZZ_HOME="${BUZZ_HOME:-$HOME/.buzz}"
NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || echo /usr/local/bin/node)}"
TOOLBOX_BIN="${TOOLBOX_BIN:-$BUZZ_HOME/bin/toolbox}"
# Resolved from PATH the same way NODE_BIN is, because that is what bootstrap's
# prerequisite check tests. Hardcoding ~/.local/bin/claude meant a Homebrew or npm
# install passed "✓ claude CLI" at bootstrap and then died here naming a path the
# operator had never heard of.
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude 2>/dev/null || echo "$HOME/.local/bin/claude")}"
# Every BigQuery statement this script runs goes through this helper, because neither
# gcloud nor bq is installed on a Buzz host. Named once so a missing copy is caught in
# preflight instead of six times at the call sites.
BQ_EXEC="${BQ_EXEC:-$BUZZ_HOME/mcp/bin/bq-exec.mjs}"
TEMPLATES="$BUZZ_HOME/mcp/templates"
SCHEMA_GUIDE="$BUZZ_HOME/GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md"
AGENTS_DIR="$BUZZ_HOME/.claude/agents"
PROJECT="${BQ_PROJECT:-}"
[[ -n "$PROJECT" ]] || PROJECT="{{BQ_PROJECT}}"
# The token the schema guide carries, which this script substitutes at deploy time so
# that --project keeps working (see $resolveComment in nest-manifest.json). Assembled
# rather than written out, because bootstrap-nest.mjs resolves tokens in this file too:
# spelled literally, the *pattern* became the install-time project id and the
# substitution silently matched nothing.
PROJECT_TOKEN="$(printf '{{%s}}' BQ_PROJECT)"

SLUG=""; CHANNEL_UUID=""; DRIVE_FOLDER=""; SA_KEY=""; ADMIN_KEY=""
LOCKDOWN="ask"; DRY_RUN="no"; LOCKDOWN_FAILED="no"; LOCKDOWN_SKIPPED="no"

# The tag dictionary is shared across every project, unlike everything else here.
TAG_SHEET="${TAG_SHEET:-}"
[[ -n "$TAG_SHEET" ]] || TAG_SHEET="{{TAG_SHEET_ID}}"
DICT_KEY="${DICT_KEY:-$BUZZ_HOME/.secrets/claire-tag-dictionary-reader.json}"
TAG_CSV=""; SKIP_TAG_SYNC="no"

die() { printf '\n\033[31mERROR\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)              SLUG="$2"; shift 2 ;;
    --channel-uuid)      CHANNEL_UUID="$2"; shift 2 ;;
    --drive-folder)      DRIVE_FOLDER="$2"; shift 2 ;;
    --sa-key)            SA_KEY="$2"; shift 2 ;;
    --admin-key)         ADMIN_KEY="$2"; shift 2 ;;
    --project)           PROJECT="$2"; shift 2 ;;
    --dict-key)          DICT_KEY="$2"; shift 2 ;;
    --tag-sheet)         TAG_SHEET="$2"; shift 2 ;;
    --tag-csv)           TAG_CSV="$2"; shift 2 ;;
    --skip-tag-sync)     SKIP_TAG_SYNC="yes"; shift ;;
    --lock-down)         LOCKDOWN="yes"; shift ;;
    --no-lockdown)       LOCKDOWN="no"; shift ;;
    --dry-run)           DRY_RUN="yes"; shift ;;
    # The header block, however long it is. It was a literal '2,27p', which silently
    # stopped covering the whole thing the moment a flag was documented below line 27.
    -h|--help)           awk 'NR>1 && /^#/ {print; next} NR>1 {exit}' "$0"; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ -n "$SLUG" ]]          || die "--slug is required"
[[ -n "$CHANNEL_UUID" ]]  || die "--channel-uuid is required"
[[ -n "$DRIVE_FOLDER" ]]  || die "--drive-folder is required"
[[ -n "$SA_KEY" ]]        || die "--sa-key is required"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "--slug must be lowercase alphanumeric with hyphens: got '$SLUG'"

ADMIN_KEY="${ADMIN_KEY:-$SA_KEY}"
DATASET="research_${SLUG//-/_}"
BQ_SERVER="bq-${SLUG}"
# Analyst reads and never writes. A second server over the same dataset with
# writeMode: blocked is what makes that a fact rather than a prompt instruction.
BQ_SERVER_RO="bq-${SLUG}-ro"
DRIVE_SERVER="drive-${SLUG}"
BQ_YAML="$BUZZ_HOME/mcp/${BQ_SERVER}.yaml"
BQ_YAML_RO="$BUZZ_HOME/mcp/${BQ_SERVER_RO}.yaml"

# ─────────────────────────────────────────────────────────── preflight

step "Preflight"
[[ -x "$NODE_BIN" ]]     || die "node not found at $NODE_BIN"
[[ -x "$TOOLBOX_BIN" ]]  || die "toolbox not found at $TOOLBOX_BIN"
[[ -x "$CLAUDE_BIN" ]]   || die "claude CLI not found at $CLAUDE_BIN"
[[ -f "$SCHEMA_GUIDE" ]] || die "schema guide missing: $SCHEMA_GUIDE"
[[ -f "$SA_KEY" ]]       || die "service account key not found: $SA_KEY"
[[ -f "$ADMIN_KEY" ]]    || die "admin key not found: $ADMIN_KEY"
# Checked here rather than at the first call site: without it, the dataset probe below
# fails for a reason that has nothing to do with the dataset, and reports an IAM problem.
[[ -f "$BQ_EXEC" ]]      || die "BigQuery helper missing: $BQ_EXEC
  Every statement this script runs needs it. Re-run scripts/bootstrap-nest.mjs to install it."

# stat does not follow symlinks, and -L is what makes this the mode of the key itself
# rather than of a link pointing at it. A slug-named link to a differently-named
# service-account key is a supported layout, and reported 755 before this.
for key in "$SA_KEY" "$ADMIN_KEY"; do
  mode="$(stat -L -f '%Lp' "$key")"
  [[ "$mode" == "600" ]] || die "$key is mode $mode — must be 600. Run: chmod 600 '$key'"
done
ok "keys present and mode 600"

SA_EMAIL="$("$NODE_BIN" -e "process.stdout.write(require('$SA_KEY').client_email)")"
ok "channel service account: $SA_EMAIL"

# The runtime identity becomes GOOGLE_APPLICATION_CREDENTIALS for every MCP server this
# script registers, so whatever is in --sa-key is what all four agents are, permanently.
#
# Until now nothing questioned WHICH identity that was. The checks above confirm the key
# exists and is 0600; the drive and dataset checks confirm it can reach this channel. An
# over-privileged key passes all of them — it can reach this channel and a great deal else.
# That is not hypothetical: a key downloaded from the Google console is named after the
# project and key id, so its filename says nothing about the account inside, and the
# provisioning identity this script documents for --admin-key has exactly that shape.
#
# The runtime account for a channel is claire-<sa_slug>-service-user by convention. A
# warning rather than a hard failure, because the convention is ours and a legitimate
# client could be named otherwise — but it should be a deliberate answer, not a silent one.
case "$SA_EMAIL" in
  claire-*) ;;
  *)
    warn "--sa-key is $SA_EMAIL, which is not a claire-<slug>-service-user account.
      This key becomes the runtime identity for every agent in this channel. If it is a
      provisioning or shared account, they inherit rights well beyond this client and
      nothing later will flag it. Confirm this is the channel's own service account
      before continuing."
    ;;
esac
ok "dataset: $PROJECT.$DATASET"
ok "servers: $BQ_SERVER, $DRIVE_SERVER"

if [[ "$DRY_RUN" == "yes" ]]; then
  warn "--dry-run: stopping before any change"
  exit 0
fi

# ─────────────────────────────────────────────────────────── drive check

step "Verifying the service account can reach the Drive folder"
PREFLIGHT_OUT="$(
  GOOGLE_APPLICATION_CREDENTIALS="$SA_KEY" DRIVE_ROOT_FOLDER_ID="$DRIVE_FOLDER" \
  "$NODE_BIN" "$BUZZ_HOME/mcp/drive-fence/preflight.mjs" 2>&1
)" || die "the service account cannot reach the Drive folder.
  Share it with $SA_EMAIL as Contributor, then re-run.
  Service accounts are not members of your Workspace domain — sharing with
  everyone at your company does NOT cover them.
  Drive said: $PREFLIGHT_OUT"
ok "$PREFLIGHT_OUT"

# ─────────────────────────────────────────────────────────── dataset

step "Provisioning dataset $DATASET"
SCHEMA_SQL="$(mktemp -t claire-schema)"
trap 'rm -f "$SCHEMA_SQL"' EXIT
# The guide contains illustrative SQL too — MERGE claims, dedupe lookups — so taking
# every ```sql fence would feed BigQuery statements that are documentation, not DDL.
# Keep only whole statements whose leading keyword is CREATE or ALTER.
awk '
  # buf resets at every fence boundary: a statement never spans blocks, and an
  # unterminated example (no trailing ";") must not swallow the next block.
  /^```sql$/ { fence = 1; buf = ""; next }
  /^```$/    { fence = 0; buf = ""; next }
  !fence     { next }
  { buf = buf $0 "\n" }
  /;[[:space:]]*$/ {
    stmt = buf; buf = ""
    probe = stmt
    gsub(/--[^\n]*\n/, "", probe)          # strip comment lines before sniffing
    sub(/^[[:space:]]+/, "", probe)
    if (probe ~ /^(CREATE|ALTER)[[:space:]]/) printf "%s", stmt
  }
' "$SCHEMA_GUIDE" \
  | sed -e "s/@dataset/$DATASET/g" -e "s/$PROJECT_TOKEN/$PROJECT/g" > "$SCHEMA_SQL"

# A backstop for the substitution above. Any token still standing here would otherwise
# reach BigQuery inside DDL and come back as a validation error naming the token, which
# reads like a config mistake rather than an install one.
if grep -q '{{[A-Z_]\{1,\}}}' "$SCHEMA_SQL"; then
  die "the extracted DDL still holds unresolved template tokens:
  $(grep -o '{{[A-Z_]\{1,\}}}' "$SCHEMA_SQL" | sort -u | tr '\n' ' ')
  These come from $SCHEMA_GUIDE, which is deliberately installed with its tokens
  intact — see \$resolveComment in nest-manifest.json. Substituting them is this
  script's job, so this is a bug here, not a broken install."
fi

# What the guide asks for, counted rather than hardcoded, because the check below
# compares against it. A literal goes stale silently the first time a table is added
# to the guide — which is exactly what happened to the "8" this replaced.
EXPECTED_TABLES="$(grep -c 'CREATE TABLE IF NOT EXISTS' "$SCHEMA_SQL")"
EXPECTED_VIEWS="$(grep -c 'CREATE OR REPLACE VIEW\|CREATE VIEW' "$SCHEMA_SQL" || true)"
statements="$(grep -c 'CREATE SCHEMA IF NOT EXISTS\|CREATE TABLE IF NOT EXISTS' "$SCHEMA_SQL")"
# A floor rather than a literal: enough to catch fences that stopped parsing, without
# failing the next time the schema legitimately grows.
[[ "$statements" -ge 9 ]] || die "extracted only $statements CREATE statements from the guide — expected at least 9. Did the guide's SQL fences change?"
ok "extracted $statements CREATE statements from the schema guide ($EXPECTED_TABLES tables, $EXPECTED_VIEWS views)"

# CREATE SCHEMA IF NOT EXISTS still demands bigquery.datasets.create even when the
# dataset is already there, so an identity scoped to one dataset cannot run it. The
# intended workflow is that the dataset is created by hand in the console, so drop
# the statement when it would be a no-op anyway.
# The helper exits 2 for a rejected query and 0 on success. Anything else means it could
# not run at all, which is not evidence about the dataset either way — reporting it as a
# missing dataset sends the operator to IAM for a grant that was never the problem.
set +e
"$NODE_BIN" "$BQ_EXEC" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
  --sql "SELECT 1 FROM \`$PROJECT.$DATASET\`.INFORMATION_SCHEMA.TABLES LIMIT 0" >/dev/null 2>&1
probe_rc=$?
set -e

case "$probe_rc" in
  0)
    awk '/CREATE SCHEMA IF NOT EXISTS/{skip=1} skip{if (/;[[:space:]]*$/) skip=0; next} {print}' \
      "$SCHEMA_SQL" > "$SCHEMA_SQL.tables"
    mv "$SCHEMA_SQL.tables" "$SCHEMA_SQL"
    ok "dataset already exists — applying table DDL only"
    ;;
  2)
    warn "dataset does not exist yet — the admin key must hold bigquery.datasets.create"
    ;;
  *)
    die "could not probe $PROJECT.$DATASET — $BQ_EXEC exited $probe_rc.
  That is the helper failing to run, not a verdict on the dataset. Re-run it without
  --quiet to see why:
    $NODE_BIN $BQ_EXEC --key $ADMIN_KEY --project $PROJECT --sql 'SELECT 1'"
    ;;
esac

"$NODE_BIN" "$BQ_EXEC" \
  --key "$ADMIN_KEY" --project "$PROJECT" --file "$SCHEMA_SQL" --quiet
ok "schema applied (idempotent)"

TABLE_COUNT="$("$NODE_BIN" "$BQ_EXEC" --key "$ADMIN_KEY" --project "$PROJECT" \
  --sql "SELECT COUNT(*) AS n FROM \`$PROJECT.$DATASET\`.INFORMATION_SCHEMA.TABLES
         WHERE table_type = 'BASE TABLE'" 2>/dev/null \
  | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s)[0].n))")"
# Counts BASE TABLEs only, so the view does not pad the total and let a genuinely
# missing table through — with a plain ">= tables + views" floor, one absent table is
# exactly offset by the one view that exists.
[[ "$TABLE_COUNT" -ge "$EXPECTED_TABLES" ]] \
  || die "expected $EXPECTED_TABLES tables in $DATASET, found $TABLE_COUNT"
ok "$TABLE_COUNT of $EXPECTED_TABLES tables verified"

# ─────────────────────────────────────────────────────────── iam

step "Granting the channel service account dataset-scoped access"
# GRANT needs bigquery.datasets.update, which a dataset-scoped dataEditor does not
# hold. When the grant was already made in the console — the documented path — this
# step is a no-op, so check before attempting it rather than failing the deploy.
EXISTING_GRANT="$("$NODE_BIN" "$BQ_EXEC" --key "$ADMIN_KEY" --project "$PROJECT" \
  --sql "SELECT COUNT(*) AS n FROM \`$PROJECT\`.\`region-us\`.INFORMATION_SCHEMA.OBJECT_PRIVILEGES
         WHERE object_name = '$DATASET'
           AND grantee = 'serviceAccount:$SA_EMAIL'
           AND privilege_type IN ('roles/bigquery.dataEditor','roles/bigquery.dataOwner')" 2>/dev/null \
  | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(String(JSON.parse(s)[0].n))}catch{process.stdout.write('0')}})")"

if [[ "$EXISTING_GRANT" != "0" ]]; then
  ok "dataEditor on $DATASET already granted to $SA_EMAIL"
elif "$NODE_BIN" "$BQ_EXEC" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
       --sql "GRANT \`roles/bigquery.dataEditor\` ON SCHEMA \`$PROJECT\`.$DATASET TO \"serviceAccount:$SA_EMAIL\"" \
       >/dev/null 2>&1; then
  ok "dataEditor on $DATASET granted to $SA_EMAIL"
else
  die "could not grant dataEditor on $DATASET to $SA_EMAIL, and no existing grant found.
  Grant it in the console: BigQuery -> $DATASET -> Sharing -> Permissions -> Add principal
    principal: $SA_EMAIL
    role:      BigQuery Data Editor
  Then re-run this script."
fi

# BigQuery seeds every new dataset with projectEditor/projectViewer ACL entries.
# They mean any project-level editor reads every client's data, which defeats the
# entire per-channel design. Removing them is the difference between real isolation
# and the appearance of it.

# An agent deploying on its owner's behalf has no terminal, and `read` fails on EOF —
# which under `set -e` killed the run right here, after the DDL and before the tag
# library, the rendered configs and the server registration. That is the same
# "looked deployed, has no tools" outcome the failed-REVOKE path above exists to
# avoid, reached by a different route. So decide it without asking, and pick the
# reversible side: an un-revoked grant is two statements to run later and both
# verify-channel-isolation.py and the summary below say so, whereas a channel that
# stopped halfway through registration looks finished from the outside.
if [[ "$LOCKDOWN" == "ask" && ! -t 0 ]]; then
  LOCKDOWN="no"; LOCKDOWN_SKIPPED="yes"
  warn "no terminal to ask at — leaving the project-wide default grants in place.
      Pass --lock-down to revoke them, or --no-lockdown to choose this deliberately.
      Repeated at the end of this run so it is not lost in the scroll."
fi

if [[ "$LOCKDOWN" == "ask" ]]; then
  printf '\n  This dataset currently grants access to ANY project-level editor/viewer:\n'
  printf '    roles/bigquery.dataEditor  projectEditor:%s\n' "$PROJECT"
  printf '    roles/bigquery.dataViewer  projectViewer:%s\n' "$PROJECT"
  printf '  Revoking them is required for real client isolation, but it will remove\n'
  printf '  access for anyone whose access came only from a project-level role.\n'
  read -r -p '  Revoke them now? [y/N] ' reply
  [[ "$reply" =~ ^[Yy] ]] && LOCKDOWN="yes" || LOCKDOWN="no"
fi

# Built once so the summary can print exactly what failed to run, verbatim and pasteable.
# Kept flush left: it is echoed inside an indented block, and a continuation line carrying
# its own leading spaces lands ragged there.
REVOKE_SQL="REVOKE \`roles/bigquery.dataEditor\` ON SCHEMA \`$PROJECT\`.$DATASET FROM \"projectEditor:$PROJECT\";
REVOKE \`roles/bigquery.dataViewer\` ON SCHEMA \`$PROJECT\`.$DATASET FROM \"projectViewer:$PROJECT\";"

if [[ "$LOCKDOWN" == "yes" ]]; then
  # Not fatal, and deliberately so. REVOKE needs bigquery.datasets.update, which the
  # documented setup withholds from a channel account on purpose — so the common case
  # is a deploy that can wire everything and cannot do this one step. Aborting here
  # used to skip the tag library, the rendered configs and the server registration,
  # leaving a channel that looked deployed and had no tools. It is repeated in the
  # summary instead, because a warning 200 lines up is a warning nobody reads.
  if "$NODE_BIN" "$BQ_EXEC" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
       --sql "$REVOKE_SQL" 2>/dev/null; then
    ok "project-wide default grants revoked — dataset is now client-isolated"
  else
    LOCKDOWN_FAILED="yes"
    warn "could NOT revoke the project-wide default grants — continuing.
      REVOKE needs bigquery.datasets.update, which a dataset-scoped account does not
      hold. Re-run with --admin-key <provisioning key>, or run it once by hand. The
      exact statements are repeated at the end of this run."
  fi
else
  warn "project default grants LEFT IN PLACE — any project editor can read this client's data"
fi

# ─────────────────────────────────────────────────────────── tag dictionary

step "Seeding the tag library from the shared tag dictionary"
# The tag dictionary is the one thing that IS common to every project. It lives
# one folder up from the client folders, so it is outside every channel's Drive
# fence and no channel account can read it — correct, and the reason this is a
# deploy-time copy rather than a runtime read. Tagger only ever reads BigQuery.
if [[ "$SKIP_TAG_SYNC" == "yes" ]]; then
  warn "tag dictionary sync skipped — tag_library will be empty and Tagger will refuse to tag"
elif [[ -n "$TAG_CSV" ]]; then
  "$NODE_BIN" "$BUZZ_HOME/bin/sync-tag-dictionary.mjs" \
    --dataset "$DATASET" --project "$PROJECT" --bq-key "$SA_KEY" --from-csv "$TAG_CSV" \
    || warn "tag dictionary sync failed — see above; the rest of the deploy is unaffected"
elif [[ -f "$DICT_KEY" ]]; then
  "$NODE_BIN" "$BUZZ_HOME/bin/sync-tag-dictionary.mjs" \
    --dataset "$DATASET" --project "$PROJECT" --bq-key "$SA_KEY" \
    --sheet-key "$DICT_KEY" --sheet "$TAG_SHEET" \
    || warn "tag dictionary sync failed — see above; the rest of the deploy is unaffected"
else
  # Whether a missing reader key matters at all depends on what is already in the table,
  # and only one of the two cases is a problem. An operator joining a client inherits a
  # tag_library another operator seeded, needs no reader key of their own, and used to be
  # told "tag_library left empty" — which was false, alarming, and arrived in the middle
  # of an otherwise clean deploy. Ask the table instead of assuming the empty case.
  #
  # Same one-line extraction idiom as the table count above. A failure of any kind leaves
  # this empty and falls through to the warning, which is the safe direction: wrongly
  # reassuring an operator that their tags are fine is worse than one warning too many.
  set +e
  EXISTING_TAGS="$("$NODE_BIN" "$BQ_EXEC" --key "$SA_KEY" --project "$PROJECT" \
    --sql "SELECT COUNT(*) AS n FROM \`$PROJECT.$DATASET.tag_library\`" 2>/dev/null \
    | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s)[0].n)))" 2>/dev/null)"
  set -e

  if [[ "$EXISTING_TAGS" =~ ^[0-9]+$ ]] && [[ "$EXISTING_TAGS" -gt 0 ]]; then
    ok "tag_library already holds $EXISTING_TAGS tag(s) — left alone.
      No dictionary reader key here, so nothing was re-synced from the shared sheet. That
      is the normal case when joining a client someone else set up: the tags came with the
      dataset. Tagger has what it needs."
  else
    warn "no dictionary reader key at $DICT_KEY — tag_library is empty and Tagger will refuse to tag.
      The tag dictionary sheet is shared across projects, so it needs ONE identity
      holding Viewer on that one file. Create it, share the sheet with it, then:
        $BUZZ_HOME/bin/sync-tag-dictionary.mjs --dataset $DATASET \\
          --bq-key $SA_KEY --sheet-key $DICT_KEY"
  fi
fi

# ─────────────────────────────────────────────────────────── configs

step "Rendering configs"
mkdir -p "$AGENTS_DIR" "$BUZZ_HOME/mcp"

sed -e "s/@SLUG@/$SLUG/g" -e "s/@DATASET@/$DATASET/g" \
    -e "s/@PROJECT@/$PROJECT/g" -e "s/@CHANNEL_UUID@/$CHANNEL_UUID/g" \
    "$TEMPLATES/bq-channel.yaml.tmpl" > "$BQ_YAML"
ok "wrote $BQ_YAML"

sed -e "s/@SLUG@/$SLUG/g" -e "s/@DATASET@/$DATASET/g" \
    -e "s/@PROJECT@/$PROJECT/g" -e "s/@CHANNEL_UUID@/$CHANNEL_UUID/g" \
    "$TEMPLATES/bq-channel-ro.yaml.tmpl" > "$BQ_YAML_RO"
ok "wrote $BQ_YAML_RO"

for role in scribe lexicon tagger analyst; do
  sed -e "s/@SLUG@/$SLUG/g" -e "s|@DATASET@|$PROJECT.$DATASET|g" \
      -e "s/@PROJECT@/$PROJECT/g" -e "s/@CHANNEL_UUID@/$CHANNEL_UUID/g" \
      "$TEMPLATES/agents/$role.md.tmpl" > "$AGENTS_DIR/$role-$SLUG.md"
  ok "wrote $AGENTS_DIR/$role-$SLUG.md"
done

# ─────────────────────────────────────────────────────────── register

step "Registering MCP servers (user scope)"

"$CLAUDE_BIN" mcp remove --scope user "$BQ_SERVER"    >/dev/null 2>&1 || true
"$CLAUDE_BIN" mcp remove --scope user "$BQ_SERVER_RO" >/dev/null 2>&1 || true
"$CLAUDE_BIN" mcp remove --scope user "$DRIVE_SERVER" >/dev/null 2>&1 || true

"$CLAUDE_BIN" mcp add-json --scope user "$BQ_SERVER" "$(cat <<JSON
{
  "type": "stdio",
  "command": "$TOOLBOX_BIN",
  "args": ["--config", "$BQ_YAML", "--stdio", "--disable-reload"],
  "env": { "GOOGLE_APPLICATION_CREDENTIALS": "$SA_KEY" }
}
JSON
)" >/dev/null
ok "registered $BQ_SERVER"

"$CLAUDE_BIN" mcp add-json --scope user "$BQ_SERVER_RO" "$(cat <<JSON
{
  "type": "stdio",
  "command": "$TOOLBOX_BIN",
  "args": ["--config", "$BQ_YAML_RO", "--stdio", "--disable-reload"],
  "env": { "GOOGLE_APPLICATION_CREDENTIALS": "$SA_KEY" }
}
JSON
)" >/dev/null
ok "registered $BQ_SERVER_RO (read-only, for Analyst)"

"$CLAUDE_BIN" mcp add-json --scope user "$DRIVE_SERVER" "$(cat <<JSON
{
  "type": "stdio",
  "command": "$NODE_BIN",
  "args": ["$BUZZ_HOME/mcp/drive-fence/server.mjs"],
  "env": {
    "GOOGLE_APPLICATION_CREDENTIALS": "$SA_KEY",
    "DRIVE_ROOT_FOLDER_ID": "$DRIVE_FOLDER",
    "DRIVE_FENCE_LABEL": "$SLUG"
  }
}
JSON
)" >/dev/null
ok "registered $DRIVE_SERVER"

# ─────────────────────────────────────────────────────────── done

step "Deployed — two things left, both manual"

if [[ "$LOCKDOWN_FAILED" == "yes" ]]; then
  cat <<EOF

  0. THIS DATASET IS NOT YET ISOLATED. The revoke could not run with the key given.
     Until these two statements succeed, anyone holding a project-level Editor or
     Viewer role on $PROJECT can read this client's data. Run them in the BigQuery
     console as someone who can administer the dataset:

$(printf '%s\n' "$REVOKE_SQL" | sed 's/^/       /')

     Everything else below completed. verify-channel-isolation.py also reports this,
     so it is not on your memory to track.
EOF
fi

if [[ "$LOCKDOWN_SKIPPED" == "yes" ]]; then
  cat <<EOF

  0. NOBODY CHOSE whether to revoke the project-wide default grants, because there
     was no terminal to ask at, so they were left as they were. Which of these you
     are looking at depends on the dataset:

       a NEW dataset — it is not isolated yet, and these two statements are what
       isolate it. Run them as someone who can administer the dataset:

$(printf '%s\n' "$REVOKE_SQL" | sed 's/^/       /')

       a dataset you are JOINING — whoever created it has already done this, and
       there is nothing for you to run.

     Do not guess which. verify-channel-isolation.py answers it directly, and its
     answer is about Google's IAM layer rather than about this script:

       $BUZZ_HOME/bin/verify-channel-isolation.py --slug $SLUG --key $SA_KEY
EOF
fi

cat <<EOF

  1. RESTART Buzz Desktop / Claude Code. MCP servers are only picked up at start.
     Then confirm:  $CLAUDE_BIN mcp list

  2. CHECK IAM for $SA_EMAIL in the Google Cloud console.
     It must hold exactly one project-level role:

       ✓ roles/bigquery.jobUser      lets it run a query, grants no data access
       ✗ roles/bigquery.dataEditor   at PROJECT level — reaches every client
       ✗ roles/bigquery.dataViewer   at PROJECT level — reaches every client
       ✗ roles/bigquery.admin, Editor, Owner

     Data access comes from the dataset grant this script made. A project-level
     data role silently defeats every fence here, and nothing in this script can
     detect it — the Cloud Resource Manager API is disabled on the project.

  Drive: share ONLY this client's folder with $SA_EMAIL as Contributor.

  Channel $SLUG is now:
    dataset  $PROJECT.$DATASET
    folder   $DRIVE_FOLDER
    servers  $BQ_SERVER, $BQ_SERVER_RO, $DRIVE_SERVER
    agents   scribe-$SLUG, lexicon-$SLUG, tagger-$SLUG, analyst-$SLUG

EOF
