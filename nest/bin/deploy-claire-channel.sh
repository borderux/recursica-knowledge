#!/usr/bin/env bash
#
# Deploy Claire and her team to a new research channel.
#
# One channel == one Drive folder + one BigQuery dataset + one service account.
# Nothing is shared between channels, because channels are different clients.
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
set -euo pipefail

BUZZ_HOME="${BUZZ_HOME:-$HOME/.buzz}"
NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || echo /usr/local/bin/node)}"
TOOLBOX_BIN="${TOOLBOX_BIN:-$BUZZ_HOME/bin/toolbox}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
TEMPLATES="$BUZZ_HOME/mcp/templates"
SCHEMA_GUIDE="$BUZZ_HOME/GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md"
AGENTS_DIR="$BUZZ_HOME/.claude/agents"
PROJECT="${BQ_PROJECT:-}"
[[ -n "$PROJECT" ]] || PROJECT="{{BQ_PROJECT}}"

SLUG=""; CHANNEL_UUID=""; DRIVE_FOLDER=""; SA_KEY=""; ADMIN_KEY=""
LOCKDOWN="ask"; DRY_RUN="no"

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
    -h|--help)           sed -n '2,27p' "$0"; exit 0 ;;
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

for key in "$SA_KEY" "$ADMIN_KEY"; do
  mode="$(stat -f '%Lp' "$key")"
  [[ "$mode" == "600" ]] || die "$key is mode $mode — must be 600. Run: chmod 600 '$key'"
done
ok "keys present and mode 600"

SA_EMAIL="$("$NODE_BIN" -e "process.stdout.write(require('$SA_KEY').client_email)")"
ok "channel service account: $SA_EMAIL"
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
  | sed -e "s/@dataset/$DATASET/g" -e "s/{{BQ_PROJECT}}/$PROJECT/g" > "$SCHEMA_SQL"

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
if "$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
     --sql "SELECT 1 FROM \`$PROJECT.$DATASET\`.INFORMATION_SCHEMA.TABLES LIMIT 0" >/dev/null 2>&1; then
  awk '/CREATE SCHEMA IF NOT EXISTS/{skip=1} skip{if (/;[[:space:]]*$/) skip=0; next} {print}' \
    "$SCHEMA_SQL" > "$SCHEMA_SQL.tables"
  mv "$SCHEMA_SQL.tables" "$SCHEMA_SQL"
  ok "dataset already exists — applying table DDL only"
else
  warn "dataset does not exist yet — the admin key must hold bigquery.datasets.create"
fi

"$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" \
  --key "$ADMIN_KEY" --project "$PROJECT" --file "$SCHEMA_SQL" --quiet
ok "schema applied (idempotent)"

TABLE_COUNT="$("$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" --key "$ADMIN_KEY" --project "$PROJECT" \
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
EXISTING_GRANT="$("$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" --key "$ADMIN_KEY" --project "$PROJECT" \
  --sql "SELECT COUNT(*) AS n FROM \`$PROJECT\`.\`region-us\`.INFORMATION_SCHEMA.OBJECT_PRIVILEGES
         WHERE object_name = '$DATASET'
           AND grantee = 'serviceAccount:$SA_EMAIL'
           AND privilege_type IN ('roles/bigquery.dataEditor','roles/bigquery.dataOwner')" 2>/dev/null \
  | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(String(JSON.parse(s)[0].n))}catch{process.stdout.write('0')}})")"

if [[ "$EXISTING_GRANT" != "0" ]]; then
  ok "dataEditor on $DATASET already granted to $SA_EMAIL"
elif "$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
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
if [[ "$LOCKDOWN" == "ask" ]]; then
  printf '\n  This dataset currently grants access to ANY project-level editor/viewer:\n'
  printf '    roles/bigquery.dataEditor  projectEditor:%s\n' "$PROJECT"
  printf '    roles/bigquery.dataViewer  projectViewer:%s\n' "$PROJECT"
  printf '  Revoking them is required for real client isolation, but it will remove\n'
  printf '  access for anyone whose access came only from a project-level role.\n'
  read -r -p '  Revoke them now? [y/N] ' reply
  [[ "$reply" =~ ^[Yy] ]] && LOCKDOWN="yes" || LOCKDOWN="no"
fi

if [[ "$LOCKDOWN" == "yes" ]]; then
  "$NODE_BIN" "$BUZZ_HOME/mcp/bin/bq-exec.mjs" --key "$ADMIN_KEY" --project "$PROJECT" --quiet \
    --sql "REVOKE \`roles/bigquery.dataEditor\` ON SCHEMA \`$PROJECT\`.$DATASET FROM \"projectEditor:$PROJECT\";
           REVOKE \`roles/bigquery.dataViewer\` ON SCHEMA \`$PROJECT\`.$DATASET FROM \"projectViewer:$PROJECT\""
  ok "project-wide default grants revoked — dataset is now client-isolated"
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
  warn "no dictionary reader key at $DICT_KEY — tag_library left empty.
  The tag dictionary sheet is shared across projects, so it needs ONE identity
  holding Viewer on that one file. Create it, share the sheet with it, then:
    $BUZZ_HOME/bin/sync-tag-dictionary.mjs --dataset $DATASET \\
      --bq-key $SA_KEY --sheet-key $DICT_KEY"
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
