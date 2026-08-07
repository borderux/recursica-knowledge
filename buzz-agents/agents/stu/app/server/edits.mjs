// Every write Stu makes goes through this module, and every function here writes its edit_log
// row. That is the whole design: there is no code path that mutates channel data without
// recording who changed what, from what, to what, and when.
//
// Two rules inherited from the operator's decisions (2026-08-02):
//   - Tags are never physically deleted. Removal is `removed_at` / `removed_by`.
//   - A human edit is authoritative over an agent's, and nothing an agent does may undo it.
//     Corrections are written to `line_edits`, not to `transcript_lines`, so Scribe's re-ingest
//     MERGE has no reach over them at all. See the schema guide, "Human edits survive a
//     re-ingest".
//
// Ordering note: the data write happens first, then the log row. If the log write fails the
// caller gets an error naming both facts, because an edit that happened but went unlogged is
// worse than one the user has to retry — they need to know the trail has a hole.

import { randomUUID } from 'node:crypto'

/**
 * An open question is a finding whose `finding_type` says so.
 *
 * The title test is a bridge and not a convention to keep. Before `open_question` existed as a
 * type, Analyst had nowhere to record that a row was a question rather than a claim — its only
 * writable path is `write_finding` — so it wrote the kind into the title, where nothing could
 * filter or count it. Rows already carrying that prefix are still answerable here rather than
 * stranded. The web app applies the same rule in `routes/Findings.jsx`; both should go once
 * Analyst writes the type.
 */
const LEGACY_QUESTION = /^\s*OPEN QUESTIONS?\s*:/i

function isOpenQuestion(finding) {
  return finding.finding_type === 'open_question' || LEGACY_QUESTION.test(finding.title ?? '')
}

/**
 * A reviewer's note goes onto the record, not over it.
 *
 * `notes` is where the agent recorded why it wrote the row: on a finding, the confidence
 * rationale and the caveats — on `f_17uXy2_experience_level_unresolved`, the standing instruction
 * not to resolve the question from the transcript and the recruiter check that has to happen
 * first. On a dictionary term it is Lexicon's evidence for the term. Neither column is optional in
 * practice: all 36 findings and all 220 terms in the client dataset carry one, averaging 315 and 880
 * characters (queried 2026-08-06).
 *
 * `SET notes = @note` replaced all of that with the reviewer's sentence, and destroyed it
 * silently — the audit row for a decision records the status change, so the overwritten note
 * was in no `edit_log` row and could not be recovered from one. The page that shows a reviewer
 * the agent's note and then offers them a Note box was the same page that deleted it.
 *
 * So the note is appended and marked as the reviewer's. Its text is already stored verbatim in
 * the `note` column of the decision's own audit row, so the append needs no second log row to be
 * reconstructible. Same rule the transcript follows: the human value lives beside the AI value,
 * never on top of it.
 *
 * Returns null for "no note given, leave the column alone" — distinct from a note that happens
 * to be the first one on an empty record.
 */
function appendNote(existing, note) {
  const text = (note ?? '').trim()
  if (!text) return null
  const entry = `Review note: ${text}`
  return existing ? `${existing}\n\n${entry}` : entry
}

export function createEdits(bq, queries) {
  const T = (name) => bq.table(name)

  /** Append one row to the audit trail. Never updated, never deleted. */
  async function log(actor, entry) {
    await bq.execute(`
      INSERT INTO ${T('edit_log')}
        (edit_id, edited_at, editor_pubkey, editor_email, target_table, target_key,
         conversation_id, field, action, old_value, new_value, source, note)
      VALUES
        (@edit_id, CURRENT_TIMESTAMP(), @pubkey, @email, @tbl, PARSE_JSON(@key),
         @cid, @field, @action, @old, @new, @source, @note)
    `, {
      edit_id: randomUUID(),
      pubkey: actor.pubkey,
      email: actor.email ?? null,
      tbl: entry.targetTable,
      key: JSON.stringify(entry.targetKey),
      cid: entry.conversationId ?? null,
      field: entry.field,
      action: entry.action,
      old: entry.oldValue ?? null,
      new: entry.newValue ?? null,
      source: entry.source ?? 'stu-ui',
      note: entry.note ?? null,
    })
  }

  /**
   * Delete a person that no longer has any participant record attached, and log it.
   *
   * Both a detach and a merge can strip a person's last record — a merge does it by moving those
   * records to a different person. An empty person is not a record of anything: it would sit in
   * the roster as a name nobody said, and the decision that created it is in `edit_log` either
   * way. Returns whether it went.
   */
  async function pruneEmptyPerson(actor, personId, note) {
    const remaining = await bq.query(
      `SELECT COUNT(*) AS n FROM ${T('participant_links')} WHERE person_id = @person`,
      { person: personId },
    )
    if (Number(remaining[0]?.n ?? 0) > 0) return false

    const person = await queries.person(personId)
    if (!person) return false

    await write(actor, {
      targetTable: 'people',
      targetKey: { person_id: personId },
      field: '*',
      action: 'delete',
      oldValue: person.display_name,
      newValue: null,
      note,
    }, () => bq.execute(
      `DELETE FROM ${T('people')} WHERE person_id = @person`, { person: personId },
    ))

    return true
  }

  async function write(actor, entry, run) {
    const affected = await run()
    try {
      await log(actor, entry)
    } catch (err) {
      throw new Error(
        `The change was applied but the audit log write failed, so this edit is not recorded: ` +
        `${err.message}`,
      )
    }
    return affected
  }

  return {
    log,

    /**
     * Correct the AI's correction. Writes `line_edits`, never `transcript_lines` — that is the
     * whole guarantee, not a detail of the implementation. Scribe rewrites `transcript_lines`
     * wholesale on every re-ingest; a verdict recorded here is out of its reach.
     *
     * Passing an empty string clears the correction back to "the original was fine", which is a
     * legitimate verdict on a bad correction. That is why the row's existence, rather than a
     * non-NULL `cleaned_text`, is what marks a line as edited: "no correction needed" and "no
     * opinion yet" are different answers and must not resolve to the same value.
     *
     * `original_text_at_edit` freezes what the source said at the moment of the decision. If a
     * later re-ingest changes that text, the mismatch is what raises the conflict — the human
     * judged wording that no longer exists, and only they can say whether it still applies.
     */
    async setCleanedText(actor, { conversationId, lineId, value, note }) {
      const before = await queries.line(conversationId, lineId)
      if (!before) throw new Error(`line not found: ${lineId}`)

      const next = value === '' ? null : value
      // before.cleaned_text is already resolved through the view, so this compares against what
      // the user is actually looking at — their own earlier edit if they made one.
      if (before.is_human_edited && before.cleaned_text === next) return { changed: false }

      await write(actor, {
        targetTable: 'line_edits',
        targetKey: { conversation_id: conversationId, line_id: lineId },
        conversationId,
        field: 'cleaned_text',
        action: 'update',
        oldValue: before.cleaned_text,
        newValue: next,
        note,
      }, () => bq.execute(`
        MERGE ${T('line_edits')} T
        USING (SELECT @cid AS conversation_id, @lid AS line_id) S
        ON T.conversation_id = S.conversation_id AND T.line_id = S.line_id
        WHEN MATCHED THEN UPDATE SET
          cleaned_text = @val, original_text_at_edit = @orig, ai_cleaned_text_at_edit = @ai,
          edited_by = @pubkey, edited_at = CURRENT_TIMESTAMP(), note = @note
        WHEN NOT MATCHED THEN INSERT
          (conversation_id, line_id, cleaned_text, original_text_at_edit,
           ai_cleaned_text_at_edit, edited_by, edited_at, note)
        VALUES
          (@cid, @lid, @val, @orig, @ai, @pubkey, CURRENT_TIMESTAMP(), @note)
      `, {
        val: next, orig: before.original_text, ai: before.ai_cleaned_text,
        pubkey: actor.pubkey, note: note ?? null, cid: conversationId, lid: lineId,
      }))

      return { changed: true, from: before.cleaned_text, to: next }
    },

    /**
     * Withdraw an override entirely, handing the line back to the AI's value. Distinct from
     * setting it to empty — that is a human saying "no correction needed", this is a human
     * saying "I should not have touched this".
     */
    async clearCleanedTextEdit(actor, { conversationId, lineId, note }) {
      const before = await queries.line(conversationId, lineId)
      if (!before) throw new Error(`line not found: ${lineId}`)
      if (!before.is_human_edited) return { changed: false }

      await write(actor, {
        targetTable: 'line_edits',
        targetKey: { conversation_id: conversationId, line_id: lineId },
        conversationId,
        field: 'cleaned_text',
        action: 'delete',
        oldValue: before.cleaned_text,
        newValue: before.ai_cleaned_text,
        note,
      }, () => bq.execute(`
        DELETE FROM ${T('line_edits')}
        WHERE conversation_id = @cid AND line_id = @lid
      `, { cid: conversationId, lid: lineId }))

      return { changed: true, from: before.cleaned_text, to: before.ai_cleaned_text }
    },

    /** Apply a tag to a line by hand. Refuses a tag that is not in the library. */
    async addTag(actor, { conversationId, lineId, tagId, justification, confidence = 1.0 }) {
      const known = await bq.query(
        `SELECT tag, active FROM ${T('tag_library')} WHERE tag = @tag`,
        { tag: tagId },
      )
      if (!known.length) {
        throw new Error(
          `"${tagId}" is not in the tag library. Add it to the library first — a tag id that ` +
          `exists only on a line cannot be looked up, filtered, or counted.`,
        )
      }
      if (!justification?.trim()) {
        // Same bar the agents are held to. An untraceable human tag is no better than an
        // untraceable machine one, and this tool exists to make reasoning inspectable.
        throw new Error('justification is required — say what in the line supports this tag')
      }

      // A previously removed tag comes back rather than duplicating: same (line, tag) identity.
      const existing = await bq.query(`
        SELECT tag_id, removed_at FROM ${T('tags')}
        WHERE conversation_id = @cid AND line_id = @lid AND tag_id = @tag
      `, { cid: conversationId, lid: lineId, tag: tagId })

      if (existing.length && existing[0].removed_at == null) return { changed: false }

      const restoring = existing.length > 0

      await write(actor, {
        targetTable: 'tags',
        targetKey: { conversation_id: conversationId, line_id: lineId, tag_id: tagId },
        conversationId,
        field: '*',
        action: restoring ? 'restore' : 'insert',
        oldValue: null,
        newValue: tagId,
        note: justification,
      }, () => restoring
        ? bq.execute(`
            UPDATE ${T('tags')}
            SET removed_at = NULL, removed_by = NULL, added_by = @pubkey,
                justification = @just, confidence = @conf, tagged_at = CURRENT_TIMESTAMP()
            WHERE conversation_id = @cid AND line_id = @lid AND tag_id = @tag
          `, {
            pubkey: actor.pubkey, just: justification, conf: confidence,
            cid: conversationId, lid: lineId, tag: tagId,
          })
        : bq.execute(`
            INSERT INTO ${T('tags')}
              (conversation_id, line_id, tag_id, confidence, justification, tagged_at, tagged_by, added_by)
            VALUES
              (@cid, @lid, @tag, @conf, @just, CURRENT_TIMESTAMP(), @by, @pubkey)
          `, {
            cid: conversationId, lid: lineId, tag: tagId, conf: confidence,
            just: justification, by: `human:${actor.email ?? actor.pubkey}`, pubkey: actor.pubkey,
          }))

      return { changed: true, restored: restoring }
    },

    /** Soft delete. The row stays so the history stays readable. */
    async removeTag(actor, { conversationId, lineId, tagId, note }) {
      const rows = await bq.query(`
        SELECT tag_id, justification, removed_at FROM ${T('tags')}
        WHERE conversation_id = @cid AND line_id = @lid AND tag_id = @tag
      `, { cid: conversationId, lid: lineId, tag: tagId })

      if (!rows.length) throw new Error(`tag "${tagId}" is not on line ${lineId}`)
      if (rows[0].removed_at != null) return { changed: false }

      await write(actor, {
        targetTable: 'tags',
        targetKey: { conversation_id: conversationId, line_id: lineId, tag_id: tagId },
        conversationId,
        field: '*',
        action: 'delete',
        oldValue: tagId,
        newValue: null,
        note,
      }, () => bq.execute(`
        UPDATE ${T('tags')}
        SET removed_at = CURRENT_TIMESTAMP(), removed_by = @pubkey
        WHERE conversation_id = @cid AND line_id = @lid AND tag_id = @tag
      `, { pubkey: actor.pubkey, cid: conversationId, lid: lineId, tag: tagId }))

      return { changed: true }
    },

    /**
     * Approve or reject a dictionary term. This is the human gate the schema guide describes —
     * an agent writes 'proposed' and only a person moves it off that.
     */
    async decideTerm(actor, { termId, status, note }) {
      const allowed = ['active', 'rejected', 'superseded', 'needs_clarification', 'proposed']
      if (!allowed.includes(status)) {
        throw new Error(`status must be one of ${allowed.join(' | ')}`)
      }

      const rows = await bq.query(
        `SELECT term_id, canonical_term, status, notes FROM ${T('project_dictionary')} WHERE term_id = @id`,
        { id: termId },
      )
      if (!rows.length) throw new Error(`dictionary term not found: ${termId}`)
      if (rows[0].status === status) return { changed: false }

      // Same overwrite as findings had, and worse here: a term's `notes` is Lexicon's evidence for
      // proposing it, which is the thing a reviewer is deciding on.
      const notes = appendNote(rows[0].notes, note)

      await write(actor, {
        targetTable: 'project_dictionary',
        targetKey: { term_id: termId },
        field: 'status',
        action: 'update',
        oldValue: rows[0].status,
        newValue: status,
        note,
      }, () => bq.execute(`
        UPDATE ${T('project_dictionary')}
        SET status = @status, decided_by = @pubkey, decided_at = CURRENT_TIMESTAMP(),
            notes = IF(@notes IS NULL, notes, @notes)
        WHERE term_id = @id
      `, { status, pubkey: actor.pubkey, notes, id: termId }))

      return { changed: true, from: rows[0].status, to: status }
    },

    /** Same gate for findings. Analyst can only ever write 'proposed'. */
    async decideFinding(actor, { findingId, status, note }) {
      const allowed = ['active', 'rejected', 'superseded', 'proposed']
      if (!allowed.includes(status)) {
        throw new Error(`status must be one of ${allowed.join(' | ')}`)
      }

      const rows = await bq.query(
        `SELECT finding_id, status, notes FROM ${T('findings')} WHERE finding_id = @id`,
        { id: findingId },
      )
      if (!rows.length) throw new Error(`finding not found: ${findingId}`)
      if (rows[0].status === status) return { changed: false }

      const notes = appendNote(rows[0].notes, note)

      await write(actor, {
        targetTable: 'findings',
        targetKey: { finding_id: findingId },
        field: 'status',
        action: 'update',
        oldValue: rows[0].status,
        newValue: status,
        note,
      }, () => bq.execute(`
        UPDATE ${T('findings')}
        SET status = @status, reviewed_by = @pubkey, reviewed_at = CURRENT_TIMESTAMP(),
            notes = IF(@notes IS NULL, notes, @notes)
        WHERE finding_id = @id
      `, { status, pubkey: actor.pubkey, notes, id: findingId }))

      return { changed: true, from: rows[0].status, to: status }
    },

    /**
     * Answer an open question, or dismiss it. The human gate again, one step further on: for a
     * finding, approval is a verdict on someone else's claim; for an open question, it is an
     * answer the dataset did not contain.
     *
     * Three paths, one write, per FR-10 — and deliberately not three functions. The reviewer
     * types an answer, or edits the agent's assumed one, or accepts that assumption unchanged;
     * all three arrive here as `answer` text, because which of them happened is a fact about the
     * reviewer's keystrokes and not about the resulting record. `proposed_answer` stays untouched
     * beside `resolution`, so "what the agent would have assumed" and "what a person decided"
     * remain two readable values rather than one that overwrote the other.
     *
     * Dismissal is the fourth path and it is a different action: `status = 'rejected'` with no
     * answer, which is a person saying the question should not shape the analysis — not that they
     * know what the answer is.
     */
    async resolveQuestion(actor, { findingId, answer, dismiss = false, note }) {
      const before = await queries.finding(findingId)
      if (!before) throw new Error(`finding not found: ${findingId}`)

      // Enforced here rather than trusted from the caller, like every other rule in this file. A
      // claim is approved or rejected; only a question gets an answer, and putting one on a claim
      // would leave a `resolution` nothing in the UI knows how to show.
      if (!isOpenQuestion(before)) {
        throw new Error(
          `${findingId} is a ${before.finding_type ?? 'finding'}, not an open question. ` +
          `Approve or reject it instead — an answer only means something on a question.`,
        )
      }

      const text = dismiss ? null : (answer ?? '').trim()
      if (!dismiss && !text) {
        // An empty answer is not a resolution. Dismissal is how a reviewer disposes of a question
        // without answering it, and it is a separate action so the two never collapse into one.
        throw new Error(
          'an answer is required — to close this question without answering it, dismiss it instead',
        )
      }

      const status = dismiss ? 'rejected' : 'active'
      if (before.status === status && (before.resolution ?? null) === text) {
        return { changed: false }
      }

      await write(actor, {
        targetTable: 'findings',
        targetKey: { finding_id: findingId },
        conversationId: before.conversation_id,
        field: 'resolution',
        action: dismiss ? 'delete' : 'update',
        oldValue: before.resolution,
        newValue: text,
        note,
      }, () => bq.execute(`
        UPDATE ${T('findings')}
        SET resolution = @answer, status = @status,
            reviewed_by = @pubkey, reviewed_at = CURRENT_TIMESTAMP(),
            notes = IF(@notes IS NULL, notes, @notes)
        WHERE finding_id = @id
      `, {
        answer: text, status, pubkey: actor.pubkey, id: findingId,
        notes: appendNote(before.notes, note),
      }))

      // The status move is its own audit row. History should answer "when was this question
      // resolved" without a reader having to infer it from a resolution row's timestamp — and a
      // dismissal writes no answer at all, so without this it would leave only a NULL behind.
      if (before.status !== status) {
        await log(actor, {
          targetTable: 'findings',
          targetKey: { finding_id: findingId },
          conversationId: before.conversation_id,
          field: 'status',
          action: 'update',
          oldValue: before.status,
          newValue: status,
          note,
        })
      }

      return { changed: true, from: before.resolution, to: text, status }
    },

    /**
     * Consolidate participant records into one person, and give that person the right name.
     *
     * Merging and renaming are the same write with a different number of ids, which is why there
     * is one function rather than two: a name correction is a person with one record attached,
     * and a merge is a person with several. Treating them separately would mean two code paths
     * to the same table and a rename that could not later absorb a duplicate.
     *
     * Nothing here touches `participants` or `transcript_lines.participant_id`. Scribe rewrites
     * `participants` on every re-ingest, so a consolidation stored there would be silently undone
     * — the same reasoning as `line_edits`. And `participant_id` is what `tags` and
     * `findings.participant_ids` cite; remapping it would move the ground under the citations the
     * dataset exists to make checkable. The link is a layer above those ids, never an edit to them.
     *
     * Passing `personId` absorbs the ids into a person that already exists, which is what the
     * next transcript needs when it spells an already-merged speaker the old way again.
     */
    async mergeParticipants(actor, {
      participantIds, personId = null, displayName, participantType, email, note,
    }) {
      const ids = [...new Set((participantIds ?? []).filter(Boolean))]
      if (!ids.length) throw new Error('name at least one participant record to consolidate')
      if (!displayName?.trim()) {
        throw new Error('a display name is required — it is what replaces the transcription service\'s label')
      }

      const records = await queries.participantRecords(ids)
      if (!records.length) {
        throw new Error(`no participant records found for ${ids.join(', ')}`)
      }
      // Every id the caller named must resolve, or the merge silently covers fewer people than
      // the user selected — and they would have no way to see which one was dropped.
      const found = new Set(records.map((r) => r.participant_id))
      const missing = ids.filter((id) => !found.has(id))
      if (missing.length) {
        throw new Error(`no participant records found for ${missing.join(', ')}`)
      }

      const name = displayName.trim()

      // Which people do these ids already belong to? Reusing that person rather than minting a
      // new one is what makes the operation idempotent, and it is also the common case as the
      // corpus grows: a new transcript spells an already-consolidated speaker the old way, and
      // absorbing it into the person who is already there is the whole point.
      const priorPersonIds = [...new Set(records.map((r) => r.person_id).filter(Boolean))]

      let target = personId
      if (!target) {
        if (priorPersonIds.length === 1) {
          target = priorPersonIds[0]
        } else if (priorPersonIds.length > 1) {
          throw new Error(
            `those records already belong to ${priorPersonIds.length} different people. ` +
            `Merging two people is a choice about which name survives — say which one they ` +
            `should all become rather than leaving it to the order they were selected in.`,
          )
        }
      }

      let existing = null
      if (target) {
        existing = await queries.person(target)
        if (!existing) throw new Error(`person not found: ${target}`)
      }

      if (!target) {
        target = `pe_${randomUUID()}`
        await write(actor, {
          targetTable: 'people',
          targetKey: { person_id: target },
          field: '*',
          action: 'insert',
          oldValue: null,
          newValue: name,
          note,
        }, () => bq.execute(`
          INSERT INTO ${T('people')}
            (person_id, display_name, participant_type, email, notes, created_by, created_at)
          VALUES
            (@id, @name, @type, @email, @notes, @pubkey, CURRENT_TIMESTAMP())
        `, {
          id: target, name, type: participantType ?? null, email: email ?? null,
          notes: note ?? null, pubkey: actor.pubkey,
        }))
      } else if (
        existing.display_name !== name ||
        (participantType ?? existing.participant_type) !== existing.participant_type ||
        (email ?? existing.email) !== existing.email
      ) {
        // Absorbing into an existing person may also correct its name in the same action. Logged
        // as its own update so History reads as what happened, not as a side effect of a merge.
        await write(actor, {
          targetTable: 'people',
          targetKey: { person_id: target },
          field: 'display_name',
          action: 'update',
          oldValue: existing.display_name,
          newValue: name,
          note,
        }, () => bq.execute(`
          UPDATE ${T('people')}
          SET display_name = @name,
              participant_type = COALESCE(@type, participant_type),
              email = COALESCE(@email, email),
              updated_by = @pubkey, updated_at = CURRENT_TIMESTAMP()
          WHERE person_id = @id
        `, {
          name, type: participantType ?? null, email: email ?? null,
          pubkey: actor.pubkey, id: target,
        }))
      }

      // One audit row per participant_id rather than per record. The id is the unit the person
      // acted on — "fold p_int into this person" — and it spans every interview they appear in,
      // so a
      // row per conversation would report eleven decisions where one was made.
      const linked = []
      for (const id of ids) {
        const mine = records.filter((r) => r.participant_id === id)
        // Skip only when every record for this id already points at the target. Testing one
        // record would leave a half-linked id looking done — the case that arises when a new
        // transcript adds an appearance to an id that was consolidated before it existed.
        if (mine.every((r) => r.person_id === target)) continue
        const before = mine.find((r) => r.person_id) ?? null

        const affected = await write(actor, {
          targetTable: 'participant_links',
          targetKey: { participant_id: id, person_id: target },
          field: '*',
          action: before ? 'update' : 'insert',
          oldValue: before?.person_id ?? null,
          newValue: target,
          note,
        }, () => bq.execute(`
          MERGE ${T('participant_links')} T
          USING (
            SELECT conversation_id, participant_id
            FROM ${T('participants_current')}
            WHERE participant_id = @pid
          ) S
          ON T.conversation_id = S.conversation_id AND T.participant_id = S.participant_id
          WHEN MATCHED THEN UPDATE SET
            person_id = @person, linked_by = @pubkey, linked_at = CURRENT_TIMESTAMP(), note = @note
          WHEN NOT MATCHED THEN INSERT
            (conversation_id, participant_id, person_id, linked_by, linked_at, note)
          VALUES
            (S.conversation_id, S.participant_id, @person, @pubkey, CURRENT_TIMESTAMP(), @note)
        `, { pid: id, person: target, pubkey: actor.pubkey, note: note ?? null }))

        linked.push({ participant_id: id, records: affected })
      }

      // Absorbing one person's records into another empties the person they came from.
      const removedPeople = []
      for (const prior of priorPersonIds) {
        if (prior === target) continue
        if (await pruneEmptyPerson(actor, prior, 'records merged into another person')) {
          removedPeople.push(prior)
        }
      }

      return {
        changed: linked.length > 0,
        person_id: target,
        display_name: name,
        linked,
        removed_people: removedPeople,
        record_count: records.length,
      }
    },

    /** Correct a consolidated person's name, type, or email. One audit row per field changed. */
    async updatePerson(actor, { personId, displayName, participantType, email, note }) {
      const before = await queries.person(personId)
      if (!before) throw new Error(`person not found: ${personId}`)

      const next = {
        display_name: displayName === undefined ? before.display_name : displayName?.trim(),
        participant_type: participantType === undefined ? before.participant_type : participantType,
        email: email === undefined ? before.email : email,
      }
      if (!next.display_name) throw new Error('a display name is required')

      const changedFields = Object.keys(next).filter((f) => next[f] !== before[f])
      if (!changedFields.length) return { changed: false }

      // The data write happens once; the log gets a row per field, so History answers "when did
      // this person's type change" without a reader having to diff two whole-row snapshots.
      await write(actor, {
        targetTable: 'people',
        targetKey: { person_id: personId },
        field: changedFields[0],
        action: 'update',
        oldValue: before[changedFields[0]],
        newValue: next[changedFields[0]],
        note,
      }, () => bq.execute(`
        UPDATE ${T('people')}
        SET display_name = @name, participant_type = @type, email = @email,
            notes = IF(@note IS NULL, notes, @note),
            updated_by = @pubkey, updated_at = CURRENT_TIMESTAMP()
        WHERE person_id = @id
      `, {
        name: next.display_name, type: next.participant_type ?? null, email: next.email ?? null,
        note: note ?? null, pubkey: actor.pubkey, id: personId,
      }))

      for (const field of changedFields.slice(1)) {
        await log(actor, {
          targetTable: 'people',
          targetKey: { person_id: personId },
          field,
          action: 'update',
          oldValue: before[field],
          newValue: next[field],
          note,
        })
      }

      return { changed: true, fields: changedFields }
    },

    /**
     * Undo a consolidation for one participant id, handing its records back to the transcription
     * service's own name. Distinct from correcting the person's name: this is a human saying
     * "these are not the same person after all".
     *
     * The person row goes when its last record leaves. An empty person is not a record of
     * anything — the decision to create it, and to undo it, is in `edit_log` either way.
     */
    async detachParticipant(actor, { participantId, note }) {
      const records = await queries.participantRecords([participantId])
      if (!records.length) throw new Error(`participant not found: ${participantId}`)

      const linked = records.filter((r) => r.person_id)
      if (!linked.length) return { changed: false }
      const personId = linked[0].person_id

      await write(actor, {
        targetTable: 'participant_links',
        targetKey: { participant_id: participantId, person_id: personId },
        field: '*',
        action: 'delete',
        oldValue: personId,
        newValue: null,
        note,
      }, () => bq.execute(`
        DELETE FROM ${T('participant_links')}
        WHERE participant_id = @pid AND person_id = @person
      `, { pid: participantId, person: personId }))

      const emptied = await pruneEmptyPerson(actor, personId, 'last participant record detached')

      return { changed: true, person_id: personId, person_removed: emptied }
    },

    /**
     * Add a tag to the library by hand. Written with origin = 'human', which is what stops
     * sync-tag-dictionary.mjs retiring it on the next run.
     */
    async addLibraryTag(actor, { tag, type, description, confidenceThreshold = 0.7, alias = [] }) {
      const TYPES = ['insight', 'focus', 'tool', 'participant', 'action', 'emotion']
      if (!/^[a-z][a-z0-9_]*$/.test(tag)) {
        throw new Error(`tag "${tag}" must be lower_snake_case — it is written verbatim into tags.tag_id`)
      }
      if (!TYPES.includes(type)) throw new Error(`type must be one of ${TYPES.join(' | ')}`)
      if (!description?.trim()) throw new Error('description is required')

      const existing = await bq.query(
        `SELECT tag, active, origin FROM ${T('tag_library')} WHERE tag = @tag`, { tag },
      )
      if (existing.length) throw new Error(`"${tag}" already exists in the library`)

      await write(actor, {
        targetTable: 'tag_library',
        targetKey: { tag },
        field: '*',
        action: 'insert',
        oldValue: null,
        newValue: tag,
        note: description,
      }, () => bq.execute(`
        INSERT INTO ${T('tag_library')}
          (tag, type, alias, description, confidence_threshold, active, origin, created_by, updated_at)
        VALUES
          (@tag, @type, @alias, @desc, @conf, TRUE, 'human', @pubkey, CURRENT_TIMESTAMP())
      `, {
        tag, type, alias, desc: description, conf: confidenceThreshold, pubkey: actor.pubkey,
      }))

      return { changed: true }
    },
  }
}
