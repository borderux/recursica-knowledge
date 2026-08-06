---
title: "Research Channel Dataset Schema — DDL Claire Runs to Provision a Channel"
tags: [bigquery, schema, ddl, claire, dictionary, provisioning]
status: active
created: 2026-08-01
---

# Research channel dataset schema

Per project owner (2026-07-31): every Buzz channel acting as a research channel gets **its own BigQuery
dataset**, instantiated by the agents rather than pre-created by hand, from a schema stored with
the agent.

This is that schema. Claire runs it once per channel via the `bq-admin` MCP server
(see `GUIDES/BIGQUERY_MCP_AND_GOOGLE_AUTH_SETUP.md` §1.6 — the fenced worker server
**cannot** run `CREATE SCHEMA`).

> **Provisioned 2026-08-01:** `{{BQ_PROJECT}}.research_building_claire` exists with all
> eight tables, verified via `INFORMATION_SCHEMA.COLUMNS`. Two corrections were forced by
> executing this DDL for real — see *Gotchas* below.

## Gotchas found by running this DDL

1. **`window` is a BigQuery reserved keyword.** The original `tags.window INT64` failed with
   `Syntax error: Expected ")" or "," but got keyword WINDOW`. Renamed to `window_size` rather
   than permanently backticked — `tags` was empty in every dataset, so there was nothing to
   migrate. Any prompt or query ported from n8n that references `window` must be updated.
2. **`ARRAY<...>` columns report `is_nullable = 'NO'`.** They're implicitly `REPEATED`. Don't
   read a `NOT NULL` count from `INFORMATION_SCHEMA` as a constraint count — it includes arrays.

## Conventions

- **Dataset name:** `research_<channel_slug>` with `-` → `_`.
  `building-claire` → `research_building_claire`.
- `@dataset` below is that name. Claire substitutes it; nothing else is templated.
- Every table is `CREATE TABLE IF NOT EXISTS` so provisioning is idempotent and safe to re-run.
- `conversation_id` is **derived, not random**: `'c_' || source_id`, where `source_id` is the
  Drive file id. It is deliberately *not* the bare Doc ID — the prefix keeps it opaque and
  leaves room for `.vtt`/`.txt`/Otter sources later, which will use their own id scheme.
  A random surrogate was the original design and it was wrong: see below.
- **Determinism is the whole anti-duplicate mechanism.** `line_id` is
  `<conversation_id>:<line_sequence_number>`, and every write is a `MERGE` on it. That only
  prevents duplicates if `conversation_id` is stable across runs. With a per-run surrogate,
  a second ingest of the same document produced a new `conversation_id`, therefore new
  `line_id`s, therefore a `MERGE` that matched nothing and inserted a clean duplicate set.
  That is the origin of duplicate lines in an unisolated dataset. Deriving the id from the
  source makes re-processing a no-op at the write, independent of whether any agent
  remembered to check first.

---

## DDL

```sql
-- Run once per research channel. Idempotent.
CREATE SCHEMA IF NOT EXISTS `{{BQ_PROJECT}}.@dataset`
OPTIONS (location = 'US', description = 'Research channel dataset — provisioned by Claire');

-- ─────────────────────────────────────────────────────────────
-- Corpus
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.conversations` (
  conversation_id   STRING  NOT NULL OPTIONS (description = 'Derived: "c_" || source_id. Stable across runs — this is what makes MERGE deduplicate'),
  source_id         STRING           OPTIONS (description = 'Drive file id. The dedupe key: one live conversation per source_id'),
  project_name      STRING           OPTIONS (description = 'Needed by the gap tracker; absent in the n8n schema'),
  channel_id        STRING           OPTIONS (description = 'Buzz channel UUID this run came from'),
  document_name     STRING,
  source_uri        STRING           OPTIONS (description = 'Google Doc URL or other source location'),
  source_type       STRING           OPTIONS (description = 'google_doc | vtt | txt | other'),
  source_revision   STRING           OPTIONS (description = 'Docs API revisionId at ingest. Cheap change check — comparable without reading the document'),
  source_checksum   STRING           OPTIONS (description = 'content_sha256 from the Drive tool. Authoritative change test; survives formatting-only edits'),
  interview_date    DATE,
  participant_type  STRING           OPTIONS (description = 'Cohort key for cross-transcript synthesis'),
  status            STRING           OPTIONS (description = 'ingesting | ingested | failed | superseded. There is no "complete"'),
  ingested_at       TIMESTAMP,
  line_count        INT64            OPTIONS (description = 'Authoritative expected line count — reconcile reads against this'),
  ingest_cursor_line INT64           OPTIONS (description = 'Next SOURCE line to read, 1-based — the drive read window resumes here. NULL means start at 1, or on an ingested row, nothing left to read'),
  ingest_cursor_seq  INT64           OPTIONS (description = 'Highest line_sequence_number written so far. The next chunk continues dense numbering from here rather than restarting at 1')
)
PARTITION BY DATE(ingested_at)
CLUSTER BY conversation_id;

-- Migration for datasets provisioned before source_id/source_revision existed.
-- No-ops on a fresh dataset; the deploy script re-runs this block every time.
ALTER TABLE `{{BQ_PROJECT}}.@dataset.conversations`
  ADD COLUMN IF NOT EXISTS source_id STRING,
  ADD COLUMN IF NOT EXISTS source_revision STRING,
  ADD COLUMN IF NOT EXISTS ingest_cursor_line INT64,
  ADD COLUMN IF NOT EXISTS ingest_cursor_seq INT64;

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.participants` (
  conversation_id  STRING NOT NULL,
  participant_id   STRING NOT NULL OPTIONS (description = 'snake_case, p_first_last'),
  participant_name STRING,
  participant_type STRING OPTIONS (description = 'participant | interviewer | stakeholder | observer'),
  email            STRING,
  archetype_id     STRING,
  demographics     JSON   OPTIONS (description = 'Only what the source states — never inferred')
)
CLUSTER BY conversation_id;

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.transcript_lines` (
  conversation_id      STRING NOT NULL,
  line_id              STRING NOT NULL,
  participant_id       STRING,
  line_sequence_number INT64  NOT NULL,
  time                 STRING,
  original_text        STRING NOT NULL,
  cleaned_text         STRING OPTIONS (description = 'NULL below the correction threshold — never a copy of original_text'),
  correction_type      STRING,
  confidence_score     INT64,
  transcription_note   STRING,
  dictionary_term_ids  ARRAY<STRING> OPTIONS (description = 'Dictionary entries that licensed the correction — audit trail'),
  corrected_at         TIMESTAMP
)
CLUSTER BY conversation_id, line_sequence_number;

-- ─────────────────────────────────────────────────────────────
-- Tagging — library is a closed vocabulary in BigQuery, not a Sheet
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.tag_library` (
  tag                  STRING NOT NULL OPTIONS (description = 'Canonical tag id; agents may never invent one'),
  type                 STRING NOT NULL OPTIONS (description = 'insight | focus | tool | participant | action | emotion'),
  alias                ARRAY<STRING>,
  description          STRING NOT NULL,
  confidence_threshold FLOAT64 NOT NULL OPTIONS (description = 'Minimum computed confidence before this tag may apply'),
  active               BOOL NOT NULL,
  updated_at           TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.tags` (
  conversation_id STRING  NOT NULL,
  line_id         STRING  NOT NULL,
  tag_id          STRING  NOT NULL,
  confidence      FLOAT64 NOT NULL,
  window_size     INT64   OPTIONS (description = 'Context window width used when this tag was assigned; renamed from n8n `window` — WINDOW is a BigQuery reserved keyword and fails at CREATE TABLE'),
  justification   STRING  NOT NULL OPTIONS (description = 'Must cite specific language — vague justifications are rejected'),
  tagged_at       TIMESTAMP,
  tagged_by       STRING OPTIONS (description = 'Agent identity + prompt version that produced this')
)
CLUSTER BY conversation_id, line_id;

-- ─────────────────────────────────────────────────────────────
-- Project dictionary — the capability n8n never had
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.project_dictionary` (
  term_id         STRING NOT NULL,
  canonical_term  STRING NOT NULL OPTIONS (description = 'The one spelling the corpus should converge on'),
  variants        ARRAY<STRING>   OPTIONS (description = 'Surface forms mapping to canonical — this is the unification half'),
  definition      STRING          OPTIONS (description = 'Grounded in the transcript line that defines it, not invented'),
  term_type       STRING          OPTIONS (description = 'acronym | product | org | person | jargon | metric'),
  status          STRING NOT NULL OPTIONS (description = 'proposed | active | rejected | superseded | needs_clarification'),
  confidence      FLOAT64         OPTIONS (description = 'Lexicon confidence at proposal time'),
  evidence        ARRAY<STRUCT<
                    conversation_id STRING,
                    line_id         STRING,
                    quote           STRING
                  >>              OPTIONS (description = 'Every term must cite where it came from'),
  first_seen_conversation_id STRING,
  occurrence_count INT64          OPTIONS (description = 'Recurrence is the main signal a term matters'),
  proposed_by     STRING,
  proposed_at     TIMESTAMP,
  decided_by      STRING          OPTIONS (description = 'Human who approved or rejected — never an agent'),
  decided_at      TIMESTAMP,
  notes           STRING
)
CLUSTER BY status, canonical_term;

-- ─────────────────────────────────────────────────────────────
-- Findings — analysis output, with citations the database checks
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.findings` (
  finding_id      STRING NOT NULL,
  project_name    STRING,
  conversation_id STRING OPTIONS (description = 'NULL for a cross-interview finding; set for a per-interview one'),
  scope           STRING OPTIONS (description = 'interview | cohort | project'),
  finding_type    STRING OPTIONS (description = 'theme | sentiment | pain_point | need | behaviour | quote | opportunity | open_question | hypothesis'),
  title           STRING NOT NULL,
  statement       STRING NOT NULL OPTIONS (description = 'The claim itself, in one or two sentences'),
  detail          STRING,
  proposed_answer STRING OPTIONS (description = 'open_question only: the answer the agent would assume if nobody rules. Never authoritative'),
  resolution      STRING OPTIONS (description = 'The human answer to an open question. Written only from Stu — never a write_finding parameter'),
  evidence        ARRAY<STRUCT<
                    conversation_id STRING,
                    line_id         STRING,
                    quote           STRING
                  >> OPTIONS (description = 'Mandatory. A finding with no evidence rows is not a finding — the write tool refuses it'),
  tag_ids         ARRAY<STRING>,
  participant_ids ARRAY<STRING>,
  confidence      FLOAT64,
  status          STRING NOT NULL OPTIONS (description = 'proposed | active | rejected | superseded'),
  produced_by     STRING OPTIONS (description = 'Agent identity + prompt version that produced this'),
  produced_at     TIMESTAMP,
  reviewed_by     STRING OPTIONS (description = 'Human pubkey — set from Stu, never by an agent'),
  reviewed_at     TIMESTAMP,
  document_uri    STRING OPTIONS (description = 'The Drive write-up rendered from these rows'),
  notes           STRING
)
PARTITION BY DATE(produced_at)
CLUSTER BY status, conversation_id;

-- ─────────────────────────────────────────────────────────────
-- Human identity and the audit trail — what Stu writes through
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.users` (
  pubkey        STRING NOT NULL OPTIONS (description = 'Buzz hex pubkey — the identity edits attach to'),
  email         STRING NOT NULL,
  display_name  STRING,
  channel_id    STRING,
  first_seen_at TIMESTAMP,
  last_seen_at  TIMESTAMP
)
CLUSTER BY pubkey;

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.edit_log` (
  edit_id         STRING NOT NULL,
  edited_at       TIMESTAMP NOT NULL,
  editor_pubkey   STRING NOT NULL,
  editor_email    STRING          OPTIONS (description = 'Snapshot at edit time — users.email may change later'),
  target_table    STRING NOT NULL OPTIONS (description = 'transcript_lines | tags | tag_library | project_dictionary | participants | conversations | findings'),
  target_key      JSON   NOT NULL OPTIONS (description = 'Identifying columns of the row changed'),
  conversation_id STRING          OPTIONS (description = 'Denormalised for scoping and clustering'),
  field           STRING NOT NULL OPTIONS (description = 'Column changed; "*" for whole-row insert or delete'),
  action          STRING NOT NULL OPTIONS (description = 'insert | update | delete | restore | conflict'),
  old_value       STRING,
  new_value       STRING,
  source          STRING          OPTIONS (description = 'stu-ui | scribe-conflict'),
  note            STRING
)
PARTITION BY DATE(edited_at)
CLUSTER BY target_table, conversation_id;

-- Human corrections to transcript text. A SEPARATE TABLE on purpose — see "Human edits survive
-- a re-ingest" below. Scribe rewrites transcript_lines wholesale; it never touches this.
CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.line_edits` (
  conversation_id         STRING    NOT NULL,
  line_id                 STRING    NOT NULL OPTIONS (description = 'Same key as transcript_lines. One override per line, replaced in place'),
  cleaned_text            STRING             OPTIONS (description = 'The human verdict. NULL means "no correction needed" — the row existing is what makes that different from having no opinion'),
  original_text_at_edit   STRING             OPTIONS (description = 'What the source said when the human decided. If it no longer matches, the transcript changed under the edit and a person must look'),
  ai_cleaned_text_at_edit STRING             OPTIONS (description = 'What the AI had produced at that moment. Kept so the override can be read as a judgement on a specific correction'),
  edited_by               STRING    NOT NULL OPTIONS (description = 'Buzz pubkey'),
  edited_at               TIMESTAMP NOT NULL,
  note                    STRING
)
CLUSTER BY conversation_id, line_id;

-- The read surface for every consumer: agents, Stu, and any query written by hand.
-- Reading transcript_lines directly is reading the machine draft with the human correction
-- stripped out, which is only ever what Scribe wants.
CREATE OR REPLACE VIEW `{{BQ_PROJECT}}.@dataset.lines_current` AS
SELECT
  l.conversation_id,
  l.line_id,
  l.participant_id,
  l.line_sequence_number,
  l.time,
  l.original_text,
  -- The row existing is the override, so IF on the join rather than COALESCE: a human who
  -- clears a bad correction back to "nothing to fix" must not fall through to the AI's value.
  IF(e.line_id IS NULL, l.cleaned_text, e.cleaned_text)             AS cleaned_text,
  l.cleaned_text                                                    AS ai_cleaned_text,
  l.correction_type,
  l.confidence_score,
  l.transcription_note,
  l.dictionary_term_ids,
  l.corrected_at,
  e.line_id IS NOT NULL                                             AS is_human_edited,
  e.edited_by,
  e.edited_at,
  e.note                                                            AS edit_note,
  e.line_id IS NOT NULL AND e.original_text_at_edit != l.original_text AS source_changed_since_edit
FROM `{{BQ_PROJECT}}.@dataset.transcript_lines` l
LEFT JOIN `{{BQ_PROJECT}}.@dataset.line_edits` e
  ON e.conversation_id = l.conversation_id AND e.line_id = l.line_id;

-- ─────────────────────────────────────────────────────────────
-- Participant consolidation — one real person, several speaker labels
-- ─────────────────────────────────────────────────────────────
-- The transcription service names the same person differently in every transcript, so one
-- interviewer arrives as `p_int` in one document and `p_int_smith` in ten others. A person
-- resolves them here. Same arrangement as line_edits and for the same reason: Scribe owns
-- `participants` and rewrites it, so a consolidation stored there would be silently undone.
--
-- Nothing here rewrites `transcript_lines.participant_id`. That id is what `tags` and
-- `findings.participant_ids` cite, and remapping it would move the ground under the citations
-- the dataset exists to make checkable. A merge adds a layer above the ids; it never edits them.

CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.people` (
  person_id        STRING    NOT NULL OPTIONS (description = 'Channel-scoped, not conversation-scoped — a person spans interviews'),
  display_name     STRING    NOT NULL OPTIONS (description = 'The corrected name. Overrides participants.participant_name everywhere it is read'),
  participant_type STRING             OPTIONS (description = 'participant | interviewer | stakeholder | observer. A FALLBACK for records where the source states no role — never an override of one that does. Role is per-interview: the same person interviews nineteen and observes the twentieth'),
  email            STRING,
  notes            STRING             OPTIONS (description = 'Why these records are one person, when it was not obvious'),
  created_by       STRING    NOT NULL OPTIONS (description = 'Buzz pubkey'),
  created_at       TIMESTAMP NOT NULL,
  updated_by       STRING,
  updated_at       TIMESTAMP
)
CLUSTER BY person_id;

-- Which source records belong to that person. One link per participant record; a record
-- consolidated a second time moves, it does not duplicate.
CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.participant_links` (
  conversation_id STRING    NOT NULL,
  participant_id  STRING    NOT NULL OPTIONS (description = 'Same key as participants. May name a speaker that has no participants row — see is_registered below'),
  person_id       STRING    NOT NULL,
  linked_by       STRING    NOT NULL OPTIONS (description = 'Buzz pubkey. A link is only ever made by a human'),
  linked_at       TIMESTAMP NOT NULL,
  note            STRING
)
CLUSTER BY person_id, conversation_id;

-- The read surface for participants, the way lines_current is for lines. Reading `participants`
-- directly is reading the transcription service's names with the human's consolidation stripped
-- out.
--
-- Built from the UNION of `participants` and the speaker ids actually present in
-- `transcript_lines`, because those two disagree: a transcript can carry hundreds of lines from a
-- speaker Scribe never wrote a roster row for. Sourcing the view from `participants` alone would
-- make that speaker invisible here, and therefore impossible to merge or name — the records most
-- in need of consolidation would be the ones missing from the consolidation screen.
CREATE OR REPLACE VIEW `{{BQ_PROJECT}}.@dataset.participants_current` AS
WITH said AS (
  -- Weight, so a merge can be judged: the record with 2,703 lines is the one whose name should
  -- win. Aggregated in a CTE rather than a correlated subquery — BigQuery cannot de-correlate a
  -- subquery reaching another table from the SELECT list.
  SELECT conversation_id, participant_id, COUNT(*) AS line_count
  FROM `{{BQ_PROJECT}}.@dataset.transcript_lines`
  WHERE participant_id IS NOT NULL
  GROUP BY conversation_id, participant_id
),
speakers AS (
  SELECT conversation_id, participant_id FROM `{{BQ_PROJECT}}.@dataset.participants`
  UNION DISTINCT
  SELECT conversation_id, participant_id FROM said
)
SELECT
  s.conversation_id,
  s.participant_id,
  -- FALSE means the speaker exists only in the transcript. Not an error to hide: it is a roster
  -- Scribe did not finish, and it is displayed as a warning.
  p.participant_id IS NOT NULL                                  AS is_registered,
  p.participant_name                                            AS source_name,
  p.participant_type                                            AS source_type,
  p.email                                                       AS source_email,
  p.archetype_id,
  p.demographics,
  -- Both names travel, always and separately, for the same reason original_text and cleaned_text
  -- do: the difference between them is the correction, and collapsing them into one "current
  -- name" would hide what a person changed.
  COALESCE(ppl.display_name, p.participant_name)                AS resolved_name,
  -- Name and role resolve in OPPOSITE directions, and the asymmetry is the point.
  --
  -- A name is a property of the person, so the person's value wins: the transcription service
  -- got it wrong and a human fixed it. A role is a property of the appearance — the same
  -- researcher runs nineteen of these interviews and sits in on the twentieth as an observer,
  -- and both are true. So the person's type is a FALLBACK, filling the gap for a speaker the roster
  -- never registered at all, and it never overrides a role the transcript actually states. Resolving
  -- role the same way as name would relabel them as the interviewer of an interview they watched.
  COALESCE(p.participant_type, ppl.participant_type)             AS resolved_type,
  COALESCE(ppl.email, p.email)                                  AS resolved_email,
  k.person_id,
  k.person_id IS NOT NULL                                       AS is_consolidated,
  k.linked_by,
  k.linked_at,
  k.note                                                        AS link_note,
  ppl.display_name                                              AS person_name,
  ppl.notes                                                     AS person_notes,
  COALESCE(said.line_count, 0)                                  AS line_count
FROM speakers s
LEFT JOIN `{{BQ_PROJECT}}.@dataset.participants` p
  ON p.conversation_id = s.conversation_id AND p.participant_id = s.participant_id
LEFT JOIN said
  ON said.conversation_id = s.conversation_id AND said.participant_id = s.participant_id
LEFT JOIN `{{BQ_PROJECT}}.@dataset.participant_links` k
  ON k.conversation_id = s.conversation_id AND k.participant_id = s.participant_id
LEFT JOIN `{{BQ_PROJECT}}.@dataset.people` ppl
  ON ppl.person_id = k.person_id;

-- Soft delete: a tag is never physically removed once created.
ALTER TABLE `{{BQ_PROJECT}}.@dataset.tags`
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS removed_by STRING,
  ADD COLUMN IF NOT EXISTS added_by   STRING;

-- Provenance, so the sheet sync can tell its own rows from a human's.
ALTER TABLE `{{BQ_PROJECT}}.@dataset.tag_library`
  ADD COLUMN IF NOT EXISTS origin     STRING,
  ADD COLUMN IF NOT EXISTS created_by STRING;

-- Open questions. See "An open question is a finding, not a second table" below.
--
-- The descriptions are repeated from the CREATE TABLE deliberately: ADD COLUMN does not inherit
-- them, and `get_table_info` is what an agent reads to learn the column. A migrated dataset whose
-- descriptions are blank, or whose finding_type still lists the old seven types, contradicts the
-- tool description the same agent reads beside it.
ALTER TABLE `{{BQ_PROJECT}}.@dataset.findings`
  ADD COLUMN IF NOT EXISTS proposed_answer STRING
    OPTIONS (description = 'open_question only: the answer the agent would assume if nobody rules. Never authoritative'),
  ADD COLUMN IF NOT EXISTS resolution STRING
    OPTIONS (description = 'The human answer to an open question. Written only from Stu — never a write_finding parameter');

ALTER TABLE `{{BQ_PROJECT}}.@dataset.findings`
  ALTER COLUMN finding_type SET OPTIONS (
    description = 'theme | sentiment | pain_point | need | behaviour | quote | opportunity | open_question | hypothesis'
  );
```

`status = 'needs_clarification'` is a first-class state, not an error: it's how Lexicon flags a
term whose meaning the transcript genuinely does not settle. That is a research finding worth
surfacing, not a failed extraction.

**Only a human ever sets `status = 'active'`.** Lexicon writes `proposed`; approval happens in
the Buzz channel. A compounding artifact earns a gate.

`findings` carries the same gate for the same reason, and enforces it in config rather than in a
prompt: Analyst's `write_finding` tool hardcodes `status = 'proposed'` and takes no
`reviewed_by` parameter, so an agent has no reachable path to approving its own analysis. See
*Findings cite lines, and the citations are checked* below.

---

## Human edits survive a re-ingest

Project owner, 2026-08-02: a human's work is never deleted by an agent. One mechanism per table where an
agent and a human both write.

**`transcript_lines` / `line_edits`.** The first attempt at this was a pair of sticky columns —
`transcript_lines.edited_by`, plus a rule that Scribe's `MERGE` must skip rows carrying it. That
is the same class of protection as prompt-based rules,
which claimed constraints the configuration did not enforce: it holds exactly as long as every
future `MERGE` remembers the guard, and it fails silently when one doesn't. `MERGE` also cannot
express the guard for the delete branch — `WHEN NOT MATCHED BY SOURCE` takes no subquery — so
the version of it that mattered most could not be written at all.

So the human's correction is not stored in the table Scribe rewrites. It lives in
**`line_edits`**, keyed by `line_id`, and reads resolve through the **`lines_current`** view.
Scribe can issue the most careless `MERGE` imaginable against `transcript_lines` — overwriting
every column, deleting every row it does not recognise — and the human verdict is still what
every consumer reads, because it was never in range. Verified against the live dataset by
running exactly that MERGE over an edited line: `lines_current.cleaned_text` returned the human
value while `ai_cleaned_text` showed the machine's overwrite.

Two consequences a re-ingest can still produce, both **reported, never resolved by an agent**:

| Situation | Signal | Who decides |
|---|---|---|
| Source text changed under a human's correction | `lines_current.source_changed_since_edit` | The person who made the edit — only they can say whether it still applies |
| Re-parse dropped a line someone had corrected | `line_edits` row with no `transcript_lines` match | A person, in Stu |

Scribe runs both queries after its `MERGE` and reports what they return (`scribe.md.tmpl`,
*Human corrections outrank yours*). Neither is an error; a run that produces them is still a
successful run. A run that produces them **silently** is the failure the arrangement exists to
prevent.

`transcript_lines.cleaned_text` keeps its original meaning throughout — what the AI produced.
It is exposed as `ai_cleaned_text` in the view so a reviewer can always see what the machine
said and what the human replaced it with, side by side.

**`tag_library`.** The shared Tag Dictionary sheet is authoritative only while Claire does the
initial tagging. After that the human is. `origin` (`sheet` | `human`) is what lets
`bin/sync-tag-dictionary.mjs` tell the two apart: it retires only `origin = 'sheet'` rows, skips
sheet updates to `origin = 'human'` rows, and reconciles by asserting every sheet tag is present
and active rather than by counting active rows. Before this, a tag added in Stu was set
`active = FALSE` on the next sync and the sync reported success — a silent revert.

**`tags`.** Never physically deleted. Removal sets `removed_at` / `removed_by`; every read
filters on `removed_at IS NULL`. `added_by` is non-NULL when a human added the tag.

**`participants` / `participant_links` + `people`.** The transcription service splits one person
across several speaker labels — the same interviewer arrives as `p_int` in one transcript and
`p_int_smith` in ten others — and gets names wrong in ways only a person can fix. Scribe owns
`participants` and rewrites it, so the resolution lives in tables it cannot reach and reads
resolve through **`participants_current`**. Exactly the `line_edits` arrangement, for exactly the
same reason.

Two properties worth stating because they are easy to get wrong:

- **A merge never rewrites `transcript_lines.participant_id`.** That id is what `tags` and
  `findings.participant_ids` cite. Remapping it to a canonical speaker would silently move the
  ground under every existing citation — the opposite of what this dataset is for. The link is a
  layer above the ids and the ids never change, so a merge cannot invalidate a finding.
- **Name and role resolve in opposite directions.** A name is a property of the person, so a
  human's value overrides the source. A role is a property of the *appearance*: the same
  researcher runs nineteen interviews and observes the twentieth, and both are true. So
  `people.participant_type` is only a fallback for a record whose transcript states no role, and
  never an override of one that does.

`participants_current` is built from `participants` UNION the speaker ids present in
`transcript_lines`, because the two disagree. A transcript can carry hundreds of lines from a
speaker Scribe wrote no roster row for — 598 such lines in `research_acme` on 2026-08-03, two of
them speakers with 100 and 389 lines. Sourcing the view from `participants` alone would leave
those speakers unnamed *and* invisible to the screen that exists to name them.

---

## Findings cite lines, and the citations are checked

Analysis used to exist only as prose in a Drive document, which made "is this claim supported?"
unanswerable without re-reading the transcript by hand. `findings` moves the claim into the
dataset with its evidence attached, so every assertion is one join from the line that produced
it.

Analyst still holds **no general write access**. It gets exactly one write tool, `write_finding`
(defined in `mcp/templates/bq-channel-ro.yaml.tmpl`), whose SQL is fixed at config time on a
second source that carries no `bigquery-execute-sql` tool. The statement enforces three things
the model cannot talk its way around:

1. Empty evidence raises and writes nothing.
2. **Every cited `line_id` must already exist in `transcript_lines`.** A fabricated citation
   fails the call. This is the anti-hallucination gate, and it is the reason the table is worth
   having at all.
3. `status` is hardcoded `'proposed'`; `reviewed_by` / `reviewed_at` are not parameters.

> ⚠️ Never attach a `bigquery-execute-sql` tool to the `bq-channel-findings` source. It runs
> `writeMode: allowed`, and the only thing converting that into "one INSERT into one table" is
> the absence of a general-purpose SQL tool on it.

Verified 2026-08-02 against `research_acme` through the real MCP path — a finding citing
`…:99999` was refused, a finding citing `…:2` was written as `proposed`, and `execute_sql` on
the read-only source still refuses both an `UPDATE` and a `DELETE`.

### An open question is a finding, not a second table

Sometimes the analysis cannot settle something, and saying so is the useful output. Isabella is
stored as a nondiver and describes a full entry-level certification course; the honest result is
that her experience level is unresolved, not a confident guess either way.

**Before `open_question` existed, Analyst had nowhere to say that.** `write_finding` is its only
writable path, so it wrote the question as an ordinary finding and marked the kind in the title —
`OPEN QUESTION: she is coded nondiver, but…` typed as `theme`. The type column said one thing and
the title said another, and nothing could filter, count, or route on the difference. Found in
`research_padi` on 2026-08-06: 1 of 36 rows, plus one more prefixed `HYPOTHESIS:`.

**A second table was the wrong fix, and `gap_tracker` is not it either.** `gap_tracker` is
project-grain transcript hygiene — no `conversation_id`, no line-level evidence, only a repeated
`evidence_interview_ids`. An open question needs exactly what a finding needs: a claim, the lines
it rests on, and the checked citations that make it reviewable. Verified against `research_padi`
on 2026-08-06: all 38 `gap_tracker` rows are ingest hygiene and none is an analytical question.

So it is a `finding_type`, and it inherits the whole apparatus for free — mandatory evidence, the
line-existence gate, `status = 'proposed'`, and the human gate on approval.

Two columns carry what a claim does not need:

- **`proposed_answer`** — what the agent would assume if nobody rules. Optional, and it is not a
  verdict: a question Analyst judged unresolvable from the transcript should carry none. It is a
  `write_finding` parameter.
- **`resolution`** — the human's answer. Stu writes it; the reviewer types one, edits the
  assumption, or accepts it unchanged, and all three land here.

`status` carries the disposal: `active` is answered, `rejected` is dismissed — a person saying the
question should not shape the analysis, which is not the same as knowing the answer.

> ⚠️ **`resolution` must never become a `write_finding` parameter, and must never appear in that
> statement's `WHEN MATCHED THEN UPDATE SET`.** The MERGE re-runs with a stable `finding_id` and
> overwrites every column it names, so adding `resolution` to it would let a re-analysis erase a
> human's answer. This is the same rule as `line_edits` and the same reason — see *Human edits
> survive a re-ingest*. `proposed_answer` is the agent's own value and is safe to overwrite;
> `resolution` is not.

### A hypothesis is the same problem, and gets the same answer

The same sweep found a second prose prefix: `HYPOTHESIS: does not seek safety information when
researching, and knows it`, typed `behaviour`, confidence 0.45, one citation on an untagged line.
Same smuggling, different label — and left as prose it would have kept happening, because from
Analyst's position the alternative is dropping the observation entirely.

So `hypothesis` is a `finding_type` too (project owner, 2026-08-06).

**It is not the same thing as an open question and must not be folded into it.** A question is *I
cannot tell*; a hypothesis is *I think this, weakly*. A reviewer answers the first and judges the
second. Collapsing them would throw away the distinction that decides which of those two a reviewer
is being asked to do.

**It carries no extra columns and takes the ordinary decision.** `proposed_answer` and `resolution`
belong to questions; a hypothesis is a claim, so it is approved or rejected on its evidence like any
other. What it gains is a name the dataset can count and a group of its own in the Inbox, so a
0.45-confidence speculation stops arriving indistinguishable from a finding because both said
`theme`.

The reviewer-facing consequence is worth stating: approving a hypothesis promotes a guess to a
finding, and nothing but the evidence on the row stands behind that. Stu says so on the card.

### Counting these types before Analyst has re-run

**A type existing is not the same as a row carrying it, and the gap is visible in SQL.** In
`research_padi` on 2026-08-06, immediately after both types landed:

```
typed_hypothesis        0     prefixed_hypothesis        1
typed_open_question     0     prefixed_open_question     1
```

Both rows predate their type and still carry the kind in the title, because nothing rewrote them —
retyping client data by hand to make a query look right is not a fix, and `write_finding`'s MERGE
sets `finding_type` from the parameter, so the next Analyst run on the same `finding_id` corrects it
for free.

Until that run, **`WHERE finding_type = 'open_question'` returns nothing, and so does
`'hypothesis'`.** Stu reads the legacy prefixes as well as the type, so its Inbox groups them
correctly today; a query against the dataset does not, and will read as though the types never
landed. Anything counting these before the corpus has been re-analysed needs both halves:

```sql
WHERE finding_type IN ('open_question', 'hypothesis')
   OR REGEXP_CONTAINS(title, r'(?i)^\s*(OPEN QUESTIONS?|HYPOTHES[EI]S)\s*:')
```

**Both kinds in one clause, deliberately.** The first version of this query covered only
`open_question`, in a section that argues a hypothesis is the same problem with the same answer —
and that omission was worse than a miscount. The cleanup instruction below fires when no row
matches the prefix arm, which for hypothesis was true from the start because the arm never covered
it. So the bridge would have read as complete for a type it never bridged, and the prefixed
hypothesis row would have stayed uncounted through the exact check meant to prove nothing was left.
`HYPOTHES[EI]S` catches a plural, on the same reasoning as `QUESTIONS?`.

Delete the prefix arm once no row matches it — that is the signal the bridge has done its job and
both the app's prefix readers and this clause can go. Check it against **both** kinds before
deleting: a clause that is dead for one and load-bearing for the other looks finished and is not.

Run against `research_padi` on 2026-08-06 — extracted from this file rather than retyped, which is
how the omission above was found — it returns exactly two rows:

```
f_17uXy2_experience_level_unresolved   theme       OPEN QUESTION
f_1qFOG_hyp_safety_info_blindspot      behaviour   HYPOTHESIS
```

Both still carrying their prose prefix and neither carrying its type, which is the state this
clause exists for. When it returns nothing, the bridge is finished.

### Run accounting — the anti-truncation mechanism

```sql
CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.ingest_runs` (
  run_id          STRING NOT NULL,
  conversation_id STRING,
  channel_id      STRING,
  stage           STRING NOT NULL OPTIONS (description = 'extract | correct | dictionary | tag | analyze'),
  agent           STRING,
  prompt_ref      STRING  OPTIONS (description = 'Git tag or SHA of the prompt used — reproducibility'),
  rows_expected   INT64   OPTIONS (description = 'Independent COUNT(*) for this stage predicate'),
  rows_returned   INT64   OPTIONS (description = 'What the read actually returned'),
  rows_written    INT64,
  truncated       BOOL    OPTIONS (description = 'TRUE when returned < expected — fail the run, never continue'),
  status          STRING  OPTIONS (description = 'running | ok | failed | truncated'),
  error           STRING,
  started_at      TIMESTAMP,
  finished_at     TIMESTAMP
)
PARTITION BY DATE(started_at)
CLUSTER BY conversation_id, stage;
```

This table is the direct answer to *"we should fix any silent truncation."* Raising a row cap
only removes one cause; it doesn't make truncation *visible*. The rule that does:

> Every stage records `rows_expected` from an independent `COUNT(*)` and `rows_returned` from
> the read it actually performed. If they differ, the stage sets `truncated = TRUE`, **fails**,
> and Claire reports it in-channel. No stage is permitted to proceed on a short read.

Deliberately the opposite of the n8n behaviour, where `LIMIT 500` produced a partial result
indistinguishable from a complete one.

---

## Never process the same transcript twice

Three independent mechanisms, in increasing order of how much they cost to run and decreasing
order of how easy they are to skip. The cheap ones save work; the last one is the guarantee.

### 1. The metadata check — free, before reading anything

`get_file_info` returns `revision_id` for a Google Doc without pulling the body. Compare it to
what was recorded:

```sql
SELECT conversation_id, status, source_revision, source_checksum, line_count,
       ingest_cursor_line, ingest_cursor_seq
FROM `{{BQ_PROJECT}}.@dataset.conversations`
WHERE source_id = @source_id
```

Same `source_revision` **at `status = 'ingested'`** → **already processed, stop.** Report the
existing `conversation_id` and `line_count`. Do not read the document.

**Do not filter this query to `status = 'ingested'`, and do select both cursor columns.** A
crashed run sits at `ingesting` or `failed`; filtered out, it is invisible here and looks like a
fresh transcript, so the resume rule below can never fire and every attempt restarts from line 1.
The status is what distinguishes "already done" from "half done", so it has to be read, not
assumed.

### 2. The content check — after reading, before writing

A revision id changes on any edit, including a formatting tweak that leaves the transcript text
identical. `read_file` returns `content_sha256`, computed by the Drive tool over normalised text
so every agent gets the same value for the same content.

- Checksum matches the stored one → the change was cosmetic. Update `source_revision` on the
  existing row so the next run short-circuits at step 1, and stop.
- Checksum differs → the transcript genuinely changed. This is a **supersede**, not a second
  ingest: set the existing row to `status = 'superseded'`, then re-ingest. Because
  `conversation_id` is derived from `source_id` it is the *same* id, so the `MERGE` in step 3
  updates the existing lines in place rather than accumulating a second copy.

### 3. Deterministic keys plus MERGE — the actual guarantee

Steps 1 and 2 are checks, and a check can be skipped by a confused agent. This one cannot,
because it is a property of the write itself:

```
conversation_id = 'c_' || source_id                       -- stable across runs
line_id         = conversation_id || ':' || sequence      -- stable across runs
```

Re-running an identical ingest therefore rewrites the same rows with the same values. It is
wasted work, but it cannot create a duplicate. **BigQuery has no unique constraints, so this
naming discipline is the only thing standing between you and the 933-row problem.**

The canonical line write, which is also correct when a superseding transcript is *shorter*
than the one it replaces:

```sql
MERGE `{{BQ_PROJECT}}.@dataset.transcript_lines` T
USING (<parsed lines for this conversation>) S
ON T.line_id = S.line_id AND T.conversation_id = @cid
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED BY TARGET THEN INSERT (...) VALUES (...)
WHEN NOT MATCHED BY SOURCE AND T.conversation_id = @cid THEN DELETE
```

> ⚠️ **This form is correct only when `USING` holds the lines for the WHOLE conversation, and
> transcripts are ingested in chunks.** Run it per chunk and the delete clause removes everything
> the previous chunks wrote, because from one chunk's point of view those rows are "not matched by
> source" — chunk 2 wipes chunk 1, and the conversation ends up holding only its final chunk at a
> plausible row count. The per-chunk form adds a `line_sequence_number BETWEEN` bound to the
> delete and defers the tail sweep to the end; see **"Ingestion is chunked, and the cursor is what
> makes it resumable"** below, and use that one.

`WHEN NOT MATCHED BY SOURCE` is what removes lines that no longer exist in the new version.
Without it a re-ingest of an edited transcript leaves orphans: a 5-line transcript revised down
to 2 lines keeps all 5, and the 3 stale lines are indistinguishable from real content
downstream. Verified — the naive MERGE really does leave them.

> ⚠️ **`AND T.conversation_id = @cid` is load-bearing in both places.** `WHEN NOT MATCHED BY
> SOURCE` without that guard matches every row in the table that isn't in this transcript —
> which is every other conversation in the dataset — and deletes them all. The guard is the
> only thing scoping the delete to one conversation. Never write this clause unguarded.

### Claiming, and crashed runs

Before writing any lines, claim the conversation with a single `MERGE` — atomic, so two agents
racing on the same document cannot both claim it:

```sql
MERGE `{{BQ_PROJECT}}.@dataset.conversations` T
USING (SELECT @source_id AS source_id) S
ON T.source_id = S.source_id
WHEN NOT MATCHED THEN INSERT (conversation_id, source_id, status, ingested_at,
                              source_revision, source_checksum,
                              ingest_cursor_line, ingest_cursor_seq)
  VALUES (CONCAT('c_', @source_id), @source_id, 'ingesting', CURRENT_TIMESTAMP(),
          @revision_id, @content_sha256, 1, 0)
WHEN MATCHED THEN UPDATE SET status = 'ingesting', ingested_at = CURRENT_TIMESTAMP(),
                             source_revision = @revision_id, source_checksum = @content_sha256
```

**`source_revision` and `source_checksum` are written by the claim, not by the close.** They are
what the metadata check above compares against on the next run, and a crashed run never reaches
its close — so recording them only at the end leaves them NULL on exactly the rows that need
them. NULL matches no revision, so the resume test fails, the run is treated as "the source
moved", and it restarts from line 1 every time. A long transcript then cannot finish however
often it is retried.

Note the cursor columns are set here too: `1` / `0` on a fresh claim, a supersede, or any reset.
On a genuine resume the `WHEN MATCHED` branch must leave them untouched — resetting them is what
turns a resume back into a restart.

Set `status = 'ingested'` and the authoritative `line_count` only after the row count is
verified. A row left at `ingesting` means a previous run died partway: re-run it. The `MERGE`
on `line_id` makes resuming safe, so resume rather than refusing — but never report success on
a conversation still marked `ingesting`.

**The status vocabulary is exactly `ingesting | ingested | failed | superseded`.** There is no
`complete`. An earlier version of Scribe's prompt tested for `status = 'complete'`, which no
writer ever produces, so the "already ingested" guard never fired and every mention re-processed
the document. If you are comparing against a status string, it must be one of these four.

---

### Ingestion is chunked, and the cursor is what makes it resumable

`read_file` returns a **window** of a document, not the whole thing — at most 120 lines or
12,000 characters, cut on line boundaries. That is a property of the tool, not a request the
caller makes, because a two-hour interview read whole consumes the reader's context and the
failure mode is silent: the model keeps working on the part it can still see and reports
success. So one transcript is ingested as a sequence of chunks, each one read, parsed, and
`MERGE`d before the next is fetched.

That turns a single write into many, and creates two failure modes worth naming.

**1. A crash now lands mid-document.** `ingest_cursor_line` and `ingest_cursor_seq` are updated
with each chunk's `MERGE`, in the same statement that closes the chunk, so a resume knows both
where to read from and what sequence number to continue at:

```sql
UPDATE `{{BQ_PROJECT}}.@dataset.conversations`
SET ingest_cursor_line = <line after the last line actually consumed>,
    ingest_cursor_seq  = <highest line_sequence_number written>
WHERE conversation_id = '<conversation_id>'
```

"The line after the last line actually consumed" is `next_start_line` when the whole window was
used, the first line of a held-back partial turn when it was not, and `total_lines + 1` once the
read reports `complete`. Copying `next_start_line` in unconditionally skips any lines the writer
deliberately held back, and it does so invisibly: the sequence numbers stay dense and the row
count matches what was parsed.

Holding a partial turn back has two hard limits. **Nothing is held back on the final window** —
`complete: true` means there is no next chunk, and the last turn of any transcript looks
unfinished because nothing follows it, so the heuristic would drop every document's closing lines.
And **nothing is held back when no turn completes in the window at all**, or the cursor never
advances and the same window is read forever.

A window that yields no rows — an empty terminal window, or one of only blank lines — is skipped,
not written. Running the chunk `MERGE` with an empty `USING` leaves the `BETWEEN` bounds undefined,
and a `NOT MATCHED BY SOURCE` delete against an empty source removes every line in the
conversation.

A row at `status = 'ingesting'` with a cursor is a resume: read from `ingest_cursor_line` and
number from `ingest_cursor_seq + 1`. A row at `ingesting` with a NULL cursor died before its
first chunk landed — start at line 1. **Which is why the cursor is never set to NULL by a chunk,
not even the last one** — it goes to `total_lines + 1`, and only the statement that sets
`status = 'ingested'` sets it NULL. A cursor nulled at the final chunk, on a run that then dies
before closing the claim, reads as "nothing landed yet" while `ingest_cursor_seq` still says 75
— and the next run rewrites the whole transcript from sequence 76.

A cursor belongs to the document revision that produced it. A **supersede** therefore resets it
to `1` / `0` along with everything else: the `MERGE` is keyed on `source_id` and rewrites the same
row, so the sequence cursor from the previous completed ingest is still sitting there, and left
alone the new version's first chunk numbers from 76 instead of 1.

**One thing invalidates the cursor: the source changing underneath it.** Line numbers are
positions in the document, so an edit mid-ingest shifts every position after it and the cursor
now points at the wrong text. Re-check `revision_id` against the stored `source_revision` before
resuming; if it moved, reset the cursor and re-ingest from line 1. Resuming across an edit
splices two versions of a transcript together, which is worse than repeating the work.

**2. `NOT MATCHED BY SOURCE ... THEN DELETE` becomes dangerous.** In a whole-document `MERGE`
that clause is what removes lines a shortened transcript no longer has. Per chunk it means
something else entirely: the source is *this chunk*, so every line the previous chunks wrote is
"not matched by source" and gets deleted. Chunk 2 wipes chunk 1, and the transcript ends up
holding only its last chunk — at a plausible-looking row count.

So a chunked `MERGE` scopes its delete to the chunk's own sequence range:

```sql
WHEN NOT MATCHED BY SOURCE
  AND T.conversation_id = '<conversation_id>'
  AND T.line_sequence_number BETWEEN <chunk_first_seq> AND <chunk_last_seq>
THEN DELETE
```

and the tail that a shrunken transcript leaves behind is swept **once, after the last chunk**,
bounded by the highest sequence number the run actually wrote — the value now in
`ingest_cursor_seq`:

```sql
DELETE FROM `{{BQ_PROJECT}}.@dataset.transcript_lines`
WHERE conversation_id = '<conversation_id>'
  AND line_sequence_number > <highest line_sequence_number this run wrote>
```

Not `conversations.line_count`, which still holds the *previous* run's value at this point — on a
transcript that grew, that bound deletes the rows the run just wrote. Not `total_lines` either,
which counts source lines rather than speaker turns and makes the sweep a no-op.

Both predicates on the per-chunk delete are load-bearing. A delete scoped to neither the
conversation nor the chunk reaches every line in the dataset.

**`ingest_runs` gets one row per chunk**, with `run_id` of `<conversation_id>:extract:<start_line>`
so the accounting stays per-chunk and a short chunk is visible as a short chunk rather than
averaged away across the document. The whole-document reconciliation in "Truncation is a failure"
still runs at the end, against `conversations.line_count`.

---

### Deferred (create now, populate later)

```sql
CREATE TABLE IF NOT EXISTS `{{BQ_PROJECT}}.@dataset.gap_tracker` (
  project_name           STRING NOT NULL,
  gap_id                 STRING NOT NULL OPTIONS (description = 'GAP-01… never renumbered or reused'),
  category               STRING,
  status                 STRING OPTIONS (description = 'NEW | IN_PROGRESS | RESOLVED | REOPENED'),
  title                  STRING,
  description            STRING,
  why_it_matters         STRING,
  source_of_gap          STRING,
  evidence_interview_ids ARRAY<STRING>,
  first_identified_run   TIMESTAMP,
  last_updated_run       TIMESTAMP
)
CLUSTER BY project_name, gap_id;
```

Matches the `Knowledge Gaps` prompt's Artifact 2 so that agent needs no schema change when it
comes online.

---

## Provisioning sequence

1. Claire derives `@dataset` from the channel slug.
2. `list_dataset_ids` → if present, stop. Provisioning is not re-provisioning.
3. Execute the DDL above via `bq-admin` (`execute_sql`).
4. `get_dataset_info` + `list_table_ids` to confirm all eleven tables exist. Report the list
   in-channel — provisioning that silently half-succeeded is the same failure mode as a
   truncated read.
5. Seed `tag_library` from the shared Tag Dictionary sheet — see below. Then treat BigQuery as
   authoritative.
6. Add the fenced `bq-<channel>` MCP block and restart, so working agents are scoped to this
   dataset only.

### The tag dictionary is the one shared asset

Everything else here is per-client by construction. The tag dictionary is not: it is a research
taxonomy, identical for every engagement, and it lives in one sheet one folder **above** the
client folders.

```
Tag Dictionary   {{TAG_SHEET_ID}}
```

That location puts it outside every channel's Drive fence, so no channel service account can
read it — which is right, because a file sitting alongside the other clients' folders is exactly
what a channel account must not be able to reach. Widening a fence to include it would expose
the siblings too.

So the sheet is **never read at runtime.** `bin/sync-tag-dictionary.mjs` is the one-way bridge:

```bash
~/.buzz/bin/sync-tag-dictionary.mjs \
  --dataset research_<slug> \
  --bq-key    ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --sheet-key ~/.buzz/.secrets/claire-tag-dictionary-reader.json
```

Two identities on purpose: the reader holds Viewer on that single sheet and touches no client
data; the channel key does the write and touches nothing but its own dataset. `deploy-claire-channel.sh`
runs this automatically. Re-run it against each live dataset whenever the sheet changes — the
sheet is a source, not a mirror, and nothing propagates on its own.

Sheet columns map to the table as `type, tag, aliases, description, confidence` →
`type, tag, alias[], description, confidence_threshold`. The sync validates before it writes
anything: `tag` must be lower_snake_case (it becomes `tags.tag_id` verbatim), `type` must be in
the enum, `confidence` must be in (0, 1], no duplicate tags. Any failure aborts the whole sync —
a half-applied dictionary is worse than a stale one.

It `MERGE`s on `tag`, so re-running is a no-op. A tag deleted from the sheet is set
`active = FALSE`, never deleted: existing `tags` rows still reference it, and Tagger already
filters on `active`.

### On Sheets as a view

Project owner: *"sheets might be used for data viewing and editing in some cases."* Workable, with one
constraint — **one direction at a time.** Bidirectional Sheet↔BigQuery sync on a table agents
also write is a reliable way to lose edits. Either:

- Sheet is a **read-only mirror** (scheduled export, or a BigQuery-connected sheet), or
- Sheet is a **proposal inbox** that a human promotes into BigQuery — same gate as dictionary
  approval.

Not both on the same table.
