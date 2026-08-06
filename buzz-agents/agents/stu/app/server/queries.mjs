// Every read Stu performs. All parameterised; no caller builds SQL from user input.
//
// The organising rule: **nothing is returned without its provenance.** A tag always travels
// with its confidence, justification, and who applied it. A corrected line always travels with
// the original text and the dictionary terms that licensed the change. A finding always travels
// with its evidence. The UI cannot show an unsourced value because the API does not emit one.

export function createQueries(bq) {
  const T = (name) => bq.table(name)

  // ----------------------------------------------------- duplicate detection
  //
  // These compose into SQL by interpolation, which is only safe because every piece is a
  // constant defined here. No request value reaches them — the rule at the top of this file
  // still holds: no caller builds SQL from user input.

  /**
   * A name reduced to something comparable. NFKD decomposes an accented letter into its base
   * plus a combining mark and the character class then drops the mark, so "Zoë" meets
   * "Zoe". Punctuation goes the same way, which is what lets "A.B." meet "AB".
   */
  const NAME_KEY = (expr) =>
    `TRIM(REGEXP_REPLACE(REGEXP_REPLACE(` +
    `NORMALIZE_AND_CASEFOLD(IFNULL(${expr}, ''), NFKD), r'[^a-z0-9 ]', ' '), r' +', ' '))`

  /** The id without its `p_` prefix or separators, so `p_int_smith` reads as `int smith`. */
  const ID_KEY = (expr) =>
    `TRIM(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(${expr}), r'^p_', ''), r'[^a-z0-9]+', ' '))`

  /**
   * One key extends the other **on a token boundary**. The boundary is the whole rule, not a
   * refinement of it: a bare STARTS_WITH makes "Ana" and "Anabel" the same person, and it makes
   * every short first name a match for a longer one that merely begins the same way.
   */
  const EXTENDS = (x, y, key) =>
    `${x}.${key} != '' AND ${y}.${key} != '' AND (` +
    `STARTS_WITH(${y}.${key}, CONCAT(${x}.${key}, ' ')) OR ` +
    `STARTS_WITH(${x}.${key}, CONCAT(${y}.${key}, ' ')))`

  // Each rule carries the sentence shown to the user, so a suggestion always says why it is
  // being made. A merge offered without a reason is a machine guess presented as a fact.
  const RULES = (x, y) => [
    [`${x}.name_key = ${y}.name_key AND ${x}.name_key != ''`, 'identical name'],
    [EXTENDS(x, y, 'name_key'), 'one name extends the other'],
    [EXTENDS(x, y, 'id_key'), 'one id extends the other'],
    [`${x}.source_email IS NOT NULL AND ${x}.source_email = ${y}.source_email`, 'same email'],
  ]

  const MATCHES = (x, y) => RULES(x, y).map(([cond]) => `(${cond})`).join(' OR ')

  const REASONS = (x, y) => `ARRAY(SELECT reason FROM UNNEST([` +
    RULES(x, y).map(([cond, label]) => `IF(${cond}, '${label}', NULL)`).join(', ') +
    `]) AS reason WHERE reason IS NOT NULL)`

  // One row per participant_id with its comparison keys attached. A single representative name
  // per id is enough here — verified against the live dataset, no id carries two different
  // names — where the roster returns arrays because a disagreement there is worth showing.
  const ROSTER_KEYS = `
    WITH roster AS (
      SELECT
        pc.participant_id,
        ANY_VALUE(pc.person_id)            AS person_id,
        MAX(pc.source_name)                AS source_name,
        MAX(pc.source_email)               AS source_email,
        SUM(pc.line_count)                 AS line_count,
        COUNT(DISTINCT pc.conversation_id) AS conversation_count
      FROM ${T('participants_current')} pc
      GROUP BY pc.participant_id
    ),
    keyed AS (
      SELECT
        roster.*,
        ${NAME_KEY('roster.source_name')}  AS name_key,
        ${ID_KEY('roster.participant_id')} AS id_key
      FROM roster
    )`

  return {
    /** Interviews in this channel, newest first, with the counts that say how much is behind them. */
    async conversations() {
      return bq.query(`
        SELECT
          c.conversation_id,
          c.document_name,
          c.source_uri,
          c.participant_type,
          c.status,
          c.interview_date,
          c.ingested_at,
          c.line_count,
          (SELECT COUNT(*) FROM ${T('transcript_lines')} l
            WHERE l.conversation_id = c.conversation_id)              AS actual_line_count,
          (SELECT COUNT(*) FROM ${T('tags')} t
            WHERE t.conversation_id = c.conversation_id
              AND t.removed_at IS NULL)                               AS tag_count,
          (SELECT COUNT(DISTINCT t.line_id) FROM ${T('tags')} t
            WHERE t.conversation_id = c.conversation_id
              AND t.removed_at IS NULL)                               AS tagged_line_count,
          -- What lets the Status column say "Tagged": a tag run that finished without
          -- truncation over a range covering the whole transcript. Keyed on the covered row
          -- count and not on Tagger's '<conversation_id>:tag:reconcile' run_id, because the
          -- run_id spelling is Tagger's own convention while the count is the thing actually
          -- being claimed. A per-batch run covers 100 lines, so it never satisfies this for a
          -- longer transcript; a re-ingest that adds lines makes it stop satisfying it, which
          -- is what should happen.
          (SELECT MAX(r.rows_returned) FROM ${T('ingest_runs')} r
            WHERE r.conversation_id = c.conversation_id
              AND r.stage = 'tag'
              AND r.status = 'ok'
              AND NOT COALESCE(r.truncated, FALSE))                   AS tag_lines_covered,
          (SELECT COUNT(*) FROM ${T('line_edits')} e
            WHERE e.conversation_id = c.conversation_id)              AS edited_line_count,
          (SELECT COUNT(*) FROM ${T('lines_current')} l
            WHERE l.conversation_id = c.conversation_id
              AND l.source_changed_since_edit)                        AS conflict_count
        FROM ${T('conversations')} c
        ORDER BY c.ingested_at DESC
      `)
    },

    /**
     * Participants for one interview. demographics is JSON and decodes to an object.
     *
     * Reads `participants_current`, never `participants` — the same reason `transcript()` reads
     * `lines_current`. Reading the raw table shows the transcription service's speaker label as
     * if it still stood, after a person has already said it was wrong.
     *
     * `participant_name` is the resolved name, so every existing caller gets the correction for
     * free; `source_name` travels beside it so the two are never collapsed into one value.
     */
    async participants(conversationId) {
      return bq.query(`
        SELECT
          participant_id,
          resolved_name    AS participant_name,
          resolved_type    AS participant_type,
          resolved_email   AS email,
          source_name,
          source_type,
          archetype_id,
          demographics,
          person_id,
          is_consolidated,
          is_registered,
          line_count
        FROM ${T('participants_current')}
        WHERE conversation_id = @cid
        ORDER BY resolved_type DESC, participant_id
      `, { cid: conversationId })
    },

    /**
     * The consolidation roster: one row per `participant_id`, aggregated across every interview
     * it appears in.
     *
     * `participant_id` is the unit a person reasons about — "`p_int` and `p_int_smith` are the
     * same person" — even though a link is stored per `(conversation_id, participant_id)` record to
     * match the grain of `participants`. Names are returned as arrays rather than picked with
     * ANY_VALUE: one id carrying two different names or two different types is a finding, and
     * collapsing it silently would hide exactly the disagreement this screen exists to resolve.
     */
    async participantRoster() {
      return bq.query(`
        WITH by_id AS (
          SELECT
            pc.participant_id,
            ARRAY_AGG(DISTINCT pc.source_name  IGNORE NULLS ORDER BY pc.source_name)  AS source_names,
            ARRAY_AGG(DISTINCT pc.source_type  IGNORE NULLS ORDER BY pc.source_type)  AS source_types,
            ARRAY_AGG(DISTINCT pc.source_email IGNORE NULLS ORDER BY pc.source_email) AS source_emails,
            ARRAY_AGG(DISTINCT pc.person_id    IGNORE NULLS ORDER BY pc.person_id)    AS person_ids,
            COUNT(*)                                   AS record_count,
            COUNTIF(NOT pc.is_registered)              AS unregistered_count,
            COUNT(DISTINCT pc.conversation_id)         AS conversation_count,
            SUM(pc.line_count)                         AS line_count,
            MAX(pc.linked_at)                          AS linked_at,
            ANY_VALUE(pc.linked_by)                    AS linked_by
          FROM ${T('participants_current')} pc
          GROUP BY pc.participant_id
        ),
        appearances AS (
          SELECT
            pc.participant_id,
            ARRAY_AGG(
              STRUCT(
                pc.conversation_id AS conversation_id,
                c.document_name    AS document_name,
                pc.source_type     AS source_type,
                pc.line_count      AS line_count,
                pc.is_registered   AS is_registered
              )
              ORDER BY pc.line_count DESC
            ) AS appearances
          FROM ${T('participants_current')} pc
          LEFT JOIN ${T('conversations')} c ON c.conversation_id = pc.conversation_id
          GROUP BY pc.participant_id
        )
        SELECT
          b.participant_id,
          b.source_names,
          b.source_types,
          b.source_emails,
          b.record_count,
          b.unregistered_count,
          b.conversation_count,
          b.line_count,
          b.linked_at,
          b.linked_by,
          a.appearances,
          -- Normally one or none. More than one means someone linked this id's records to
          -- different people one at a time, which the UI flags rather than averages away.
          -- IFNULL because ARRAY_AGG over no rows is NULL, and a NULL count would read as
          -- "unknown" where it means "none".
          IFNULL(ARRAY_LENGTH(b.person_ids), 0) AS person_count,
          ppl.person_id,
          ppl.display_name            AS person_name,
          ppl.participant_type        AS person_type,
          ppl.email                   AS person_email,
          ppl.notes                   AS person_notes
        FROM by_id b
        JOIN appearances a ON a.participant_id = b.participant_id
        LEFT JOIN ${T('people')} ppl ON ppl.person_id = b.person_ids[SAFE_OFFSET(0)]
        ORDER BY b.line_count DESC, b.participant_id
      `)
    },

    /** Consolidated people, with how much of the corpus each one actually accounts for. */
    async people() {
      return bq.query(`
        WITH linked AS (
          SELECT
            pc.person_id,
            ARRAY_AGG(DISTINCT pc.participant_id ORDER BY pc.participant_id)         AS participant_ids,
            ARRAY_AGG(DISTINCT pc.source_name IGNORE NULLS ORDER BY pc.source_name)  AS source_names,
            COUNT(*)                            AS record_count,
            COUNT(DISTINCT pc.conversation_id)  AS conversation_count,
            SUM(pc.line_count)                  AS line_count
          FROM ${T('participants_current')} pc
          WHERE pc.person_id IS NOT NULL
          GROUP BY pc.person_id
        )
        SELECT
          p.person_id, p.display_name, p.participant_type, p.email, p.notes,
          p.created_by, p.created_at, p.updated_by, p.updated_at,
          COALESCE(l.participant_ids,    ARRAY<STRING>[]) AS participant_ids,
          COALESCE(l.source_names,       ARRAY<STRING>[]) AS source_names,
          COALESCE(l.record_count, 0)       AS record_count,
          COALESCE(l.conversation_count, 0) AS conversation_count,
          COALESCE(l.line_count, 0)         AS line_count
        FROM ${T('people')} p
        LEFT JOIN linked l ON l.person_id = p.person_id
        ORDER BY l.line_count DESC, p.display_name
      `)
    },

    /**
     * Records that look like the same person, offered for a human to confirm. Nothing here is
     * ever applied automatically — a suggestion is a place to look, and the merge is the operator's.
     *
     * Two shapes, because the roster keeps growing: Scribe ingests new transcripts, and a
     * speaker already consolidated arrives again under the old bad label. Matching only
     * record-against-record would surface `p_int` once, and then never again for the next
     * transcript that spells them `I.S.`.
     *
     *   `pairs`         — two unlinked ids that look like one person
     *   `personMatches` — an unlinked id that looks like a person already merged
     */
    async duplicateCandidates() {
      const pairs = await bq.query(`
        ${ROSTER_KEYS}
        SELECT
          lo.participant_id AS a_participant_id,
          lo.source_name    AS a_source_name,
          lo.line_count     AS a_line_count,
          lo.conversation_count AS a_conversation_count,
          hi.participant_id AS b_participant_id,
          hi.source_name    AS b_source_name,
          hi.line_count     AS b_line_count,
          hi.conversation_count AS b_conversation_count,
          ${REASONS('lo', 'hi')} AS reasons
        FROM keyed AS lo
        JOIN keyed AS hi ON lo.participant_id < hi.participant_id
        -- Only unlinked ids: once a record belongs to a person, the person is what it is
        -- compared against, below.
        WHERE lo.person_id IS NULL AND hi.person_id IS NULL
          AND (${MATCHES('lo', 'hi')})
        ORDER BY GREATEST(lo.line_count, hi.line_count) DESC
      `)

      const personMatches = await bq.query(`
        ${ROSTER_KEYS},
        person_keys AS (
          SELECT
            p.person_id,
            p.display_name,
            p.participant_type,
            p.email                       AS source_email,
            ${NAME_KEY('p.display_name')} AS name_key,
            -- A person has no participant_id of its own, so the id rule has nothing to compare
            -- against on this side. Empty string never matches: EXTENDS requires both non-empty.
            '' AS id_key
          FROM ${T('people')} p
        )
        SELECT
          k.participant_id,
          k.source_name,
          k.line_count,
          k.conversation_count,
          pk.person_id,
          pk.display_name AS person_name,
          pk.participant_type AS person_type,
          ${REASONS('k', 'pk')} AS reasons
        FROM keyed AS k
        CROSS JOIN person_keys AS pk
        WHERE k.person_id IS NULL
          AND (${MATCHES('k', 'pk')})
        ORDER BY k.line_count DESC
      `)

      return { pairs, personMatches }
    },

    /**
     * Every `(conversation_id, participant_id)` record behind a set of participant ids — what a
     * merge actually links. Sourced from the view, so a speaker that exists only in
     * `transcript_lines` is included: those are the records most in need of a name.
     */
    async participantRecords(participantIds) {
      return bq.query(`
        SELECT conversation_id, participant_id, source_name, source_type, source_email,
               person_id, is_registered, line_count
        FROM ${T('participants_current')}
        WHERE participant_id IN UNNEST(@ids)
        ORDER BY participant_id, line_count DESC
      `, { ids: participantIds })
    },

    /** One person, with the columns an edit needs to record its old values. */
    async person(personId) {
      const rows = await bq.query(`
        SELECT person_id, display_name, participant_type, email, notes, created_by, created_at
        FROM ${T('people')}
        WHERE person_id = @id
      `, { id: personId })
      return rows[0] ?? null
    },

    /**
     * Lines the transcription service attributed to nobody. They cannot be consolidated — there
     * is no speaker label to attach to a person — but they are missing provenance, so they are
     * reported rather than left out of the roster's totals silently.
     */
    async unattributedLines() {
      return bq.query(`
        SELECT l.conversation_id, c.document_name, COUNT(*) AS line_count
        FROM ${T('transcript_lines')} l
        LEFT JOIN ${T('conversations')} c ON c.conversation_id = l.conversation_id
        WHERE l.participant_id IS NULL
        GROUP BY l.conversation_id, c.document_name
        ORDER BY line_count DESC
      `)
    },

    /**
     * The reading view. One row per line, tags nested, correction provenance attached.
     *
     * `original_text` and `cleaned_text` are both returned, always and separately — the diff
     * between them is the hallucination check, so the API must never collapse them into one
     * "current text" field for convenience.
     *
     * Reads `lines_current`, never `transcript_lines`. The view resolves a human's correction
     * over the AI's and carries `ai_cleaned_text` alongside, so the UI can show all three
     * versions of a line: what the source said, what the machine made of it, what a person
     * decided. Reading the raw table would show the machine's value as if it still stood.
     */
    async transcript(conversationId) {
      // Tags are aggregated in a CTE and joined, rather than fetched by a correlated subquery
      // per line: BigQuery cannot de-correlate a subquery that reaches another table from the
      // SELECT list, and rejects the query outright.
      return bq.query(`
        WITH line_tags AS (
          SELECT
            t.line_id,
            ARRAY_AGG(
              STRUCT(
                t.tag_id            AS tag_id,
                t.confidence        AS confidence,
                t.justification     AS justification,
                t.tagged_by         AS tagged_by,
                t.tagged_at         AS tagged_at,
                t.added_by          AS added_by,
                t.window_size       AS window_size,
                lib.type            AS tag_type,
                lib.description     AS tag_description,
                lib.active          AS tag_active
              )
              ORDER BY t.confidence DESC, t.tag_id
            ) AS tags
          FROM ${T('tags')} t
          LEFT JOIN ${T('tag_library')} lib ON lib.tag = t.tag_id
          WHERE t.conversation_id = @cid AND t.removed_at IS NULL
          GROUP BY t.line_id
        )
        SELECT
          l.line_id,
          l.line_sequence_number,
          l.participant_id,
          -- Through participants_current, so a speaker a person has named reads with that name
          -- here. Joining the raw participants table shows the transcription service's label
          -- after it has been corrected, and shows nothing at all for a speaker Scribe never
          -- registered — which is hundreds of lines in some transcripts.
          p.resolved_name AS participant_name,
          p.resolved_type AS participant_type,
          p.source_name,
          l.time,
          l.original_text,
          l.cleaned_text,
          l.ai_cleaned_text,
          l.correction_type,
          l.confidence_score,
          l.transcription_note,
          l.dictionary_term_ids,
          l.corrected_at,
          l.is_human_edited,
          l.edited_by,
          l.edited_at,
          l.edit_note,
          l.source_changed_since_edit,
          lt.tags
        FROM ${T('lines_current')} l
        LEFT JOIN ${T('participants_current')} p
          ON p.conversation_id = l.conversation_id AND p.participant_id = l.participant_id
        LEFT JOIN line_tags lt ON lt.line_id = l.line_id
        WHERE l.conversation_id = @cid
        ORDER BY l.line_sequence_number
      `, { cid: conversationId })
    },

    /** The tag library, with how often each tag is actually used. An unused tag is a finding too. */
    async tagLibrary() {
      return bq.query(`
        SELECT
          lib.tag, lib.type, lib.alias, lib.description, lib.confidence_threshold,
          lib.active, lib.origin, lib.created_by, lib.updated_at,
          (SELECT COUNT(*) FROM ${T('tags')} t
            WHERE t.tag_id = lib.tag AND t.removed_at IS NULL) AS usage_count
        FROM ${T('tag_library')} lib
        ORDER BY lib.active DESC, usage_count DESC, lib.tag
      `)
    },

    /** Every line one tag landed on, across interviews. The fastest way to see it applied loosely. */
    async tagUsage(tagId) {
      return bq.query(`
        SELECT
          t.tag_id, t.conversation_id, t.line_id, t.confidence, t.justification,
          t.tagged_by, t.tagged_at, t.added_by,
          l.line_sequence_number,
          l.original_text,
          l.cleaned_text,
          p.resolved_name AS participant_name,
          c.document_name
        FROM ${T('tags')} t
        JOIN ${T('lines_current')} l
          ON l.line_id = t.line_id AND l.conversation_id = t.conversation_id
        LEFT JOIN ${T('participants_current')} p
          ON p.conversation_id = l.conversation_id AND p.participant_id = l.participant_id
        LEFT JOIN ${T('conversations')} c ON c.conversation_id = t.conversation_id
        WHERE t.tag_id = @tag AND t.removed_at IS NULL
        ORDER BY t.conversation_id, l.line_sequence_number
      `, { tag: tagId })
    },

    /** Dictionary terms with their evidence. Evidence is ARRAY<STRUCT> and decodes to objects. */
    async dictionary() {
      return bq.query(`
        SELECT
          term_id, canonical_term, variants, definition, term_type, status, confidence,
          evidence, first_seen_conversation_id, occurrence_count,
          proposed_by, proposed_at, decided_by, decided_at, notes
        FROM ${T('project_dictionary')}
        ORDER BY
          CASE status WHEN 'proposed' THEN 0 WHEN 'needs_clarification' THEN 1 ELSE 2 END,
          occurrence_count DESC,
          canonical_term
      `)
    },

    /**
     * Findings with their evidence resolved to live transcript text.
     *
     * `quote` is what the agent claimed was said; `line_text` is what the line actually says
     * now. Returning both is the point — a reviewer compares them without leaving the screen,
     * and a quote that has drifted from its line is visible rather than trusted.
     *
     * `document_name` is joined in so the Inbox can group by interview under a name a person
     * recognises rather than under a `c_…` id. It is NULL for a cross-interview finding, which
     * is a real state — `conversation_id` is nullable by design — and not a missing join.
     */
    async findings() {
      // Same de-correlation constraint as transcript(): resolve each citation to its live line
      // in a CTE, then join. `line_text` NULL means the cited line no longer exists — which the
      // write tool prevents at insert time, so seeing one here is worth surfacing loudly.
      return bq.query(`
        WITH resolved AS (
          SELECT
            f.finding_id,
            ARRAY_AGG(
              STRUCT(
                e.conversation_id                             AS conversation_id,
                e.line_id                                     AS line_id,
                e.quote                                       AS quote,
                COALESCE(l.cleaned_text, l.original_text)     AS line_text,
                l.line_sequence_number                        AS line_sequence_number
              )
              ORDER BY l.line_sequence_number
            ) AS evidence
          FROM ${T('findings')} f
          CROSS JOIN UNNEST(f.evidence) AS e
          LEFT JOIN ${T('lines_current')} l ON l.line_id = e.line_id
          GROUP BY f.finding_id
        )
        SELECT
          f.finding_id, f.project_name, f.conversation_id, f.scope, f.finding_type,
          f.title, f.statement, f.detail, f.tag_ids, f.participant_ids, f.confidence,
          f.status, f.produced_by, f.produced_at, f.reviewed_by, f.reviewed_at,
          f.document_uri, f.notes,
          -- The agent's assumed answer to an open question, and the human's. Both travel, always
          -- and separately: which one a reviewer is looking at is the whole question on this row.
          f.proposed_answer, f.resolution,
          c.document_name,
          r.evidence
        FROM ${T('findings')} f
        LEFT JOIN resolved r ON r.finding_id = f.finding_id
        LEFT JOIN ${T('conversations')} c ON c.conversation_id = f.conversation_id
        ORDER BY
          CASE f.status WHEN 'proposed' THEN 0 ELSE 1 END,
          f.confidence DESC,
          f.produced_at DESC
      `)
    },

    /**
     * One finding, with the columns a review needs to record what it replaced.
     */
    async finding(findingId) {
      const rows = await bq.query(`
        SELECT finding_id, conversation_id, finding_type, title, status,
               proposed_answer, resolution, reviewed_by, reviewed_at
        FROM ${T('findings')}
        WHERE finding_id = @id
      `, { id: findingId })
      return rows[0] ?? null
    },

    /**
     * The transcript around one cited line — a citation read in the conversation it came from.
     *
     * Bounded on purpose, and the bound is a design constraint rather than a performance one.
     * `recursica-skill-panels-modals` sends content that induces vertical scrolling out of a
     * panel and onto a page, so the panel gets a window it can hold; clicking a different quote
     * re-anchors the window rather than scrolling a whole transcript inside it.
     *
     * Reads `lines_current` for the same reason `transcript()` does: a reviewer checking a quote
     * against the line must see the line as it stands now, corrections included.
     */
    async lineContext(conversationId, sequence, radius = 5) {
      const [lines, conversation] = await Promise.all([
        bq.query(`
          SELECT
            l.line_id,
            l.line_sequence_number,
            l.participant_id,
            p.resolved_name AS participant_name,
            p.resolved_type AS participant_type,
            l.time,
            l.original_text,
            l.cleaned_text
          FROM ${T('lines_current')} l
          LEFT JOIN ${T('participants_current')} p
            ON p.conversation_id = l.conversation_id AND p.participant_id = l.participant_id
          WHERE l.conversation_id = @cid
            AND l.line_sequence_number BETWEEN @lo AND @hi
          ORDER BY l.line_sequence_number
        `, { cid: conversationId, lo: sequence - radius, hi: sequence + radius }),
        bq.query(`
          SELECT conversation_id, document_name, source_uri, line_count
          FROM ${T('conversations')}
          WHERE conversation_id = @cid
        `, { cid: conversationId }),
      ])

      return { lines, conversation: conversation[0] ?? null, anchor: sequence, radius }
    },

    /** Audit trail. Optionally scoped to one row so a line can show its own history. */
    async edits({ conversationId = null, targetTable = null, limit = 500 } = {}) {
      return bq.query(`
        SELECT
          edit_id, edited_at, editor_pubkey, editor_email, target_table, target_key,
          conversation_id, field, action, old_value, new_value, source, note
        FROM ${T('edit_log')}
        WHERE (@cid IS NULL OR conversation_id = @cid)
          AND (@tbl IS NULL OR target_table = @tbl)
        ORDER BY edited_at DESC
        LIMIT @lim
      `, { cid: conversationId, tbl: targetTable, lim: limit })
    },

    /** One line, with the columns an edit needs to record its old value. */
    async line(conversationId, lineId) {
      const rows = await bq.query(`
        SELECT conversation_id, line_id, original_text, cleaned_text, ai_cleaned_text,
               is_human_edited, edited_by, edited_at
        FROM ${T('lines_current')}
        WHERE conversation_id = @cid AND line_id = @lid
      `, { cid: conversationId, lid: lineId })
      return rows[0] ?? null
    },

    /**
     * Corrections whose line no longer exists, because a re-ingest re-parsed it away. The edit
     * itself is safe — it is in `line_edits`, which Scribe cannot reach — but it is attached to
     * nothing, so nobody would see it again unless it is asked for by name.
     */
    async orphanedEdits() {
      return bq.query(`
        SELECT e.conversation_id, e.line_id, e.cleaned_text, e.original_text_at_edit,
               e.edited_by, e.edited_at, e.note
        FROM ${T('line_edits')} e
        LEFT JOIN ${T('transcript_lines')} l
          ON l.conversation_id = e.conversation_id AND l.line_id = e.line_id
        WHERE l.line_id IS NULL
        ORDER BY e.edited_at DESC
      `)
    },
  }
}
