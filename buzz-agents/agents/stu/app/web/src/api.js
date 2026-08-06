// The one place the UI talks to the server. Errors carry the server's message through unchanged
// — BigQuery's RAISE text and the edit-chokepoint validation messages are both written to be
// read by the person who triggered them.

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new Error(payload?.error ?? `${method} ${path} failed (${res.status})`)
  return payload
}

export const api = {
  config: () => request('GET', '/api/config'),
  // Who the launcher said is at the keyboard, or null. The preferred path — see IdentityGate.
  presentedIdentity: () => request('GET', '/api/identity/presented'),
  knownIdentity: (pk) => request('GET', `/api/identity/known/${encodeURIComponent(pk)}`),
  // `{ members, unavailable }` — the roster needs a relay credential and often has none.
  members: () => request('GET', '/api/members'),
  bindIdentity: (b) => request('POST', '/api/identity', b),

  conversations: () => request('GET', '/api/conversations'),
  transcript: (cid) => request('GET', `/api/conversations/${encodeURIComponent(cid)}/transcript`),
  // The lines around one cited line. `radius` bounds it: the panel shows a window it can hold
  // without scrolling, and re-anchors when a different quote is chosen.
  lineContext: (cid, seq, radius) => request(
    'GET',
    `/api/conversations/${encodeURIComponent(cid)}/context?seq=${encodeURIComponent(seq)}` +
    (radius == null ? '' : `&radius=${encodeURIComponent(radius)}`),
  ),

  participants: () => request('GET', '/api/participants'),
  // Merge and rename are one call: a rename is a person with one record attached. Passing
  // person_id absorbs the ids into a person that already exists.
  mergeParticipants: (b) => request('POST', '/api/people', b),
  updatePerson: (personId, b) => request('PATCH', `/api/people/${encodeURIComponent(personId)}`, b),
  detachParticipant: (participantId, b) =>
    request('DELETE', `/api/participants/${encodeURIComponent(participantId)}/person`, b),

  tagLibrary: () => request('GET', '/api/tag-library'),
  tagUsage: (tagId) => request('GET', `/api/tags/${encodeURIComponent(tagId)}/usage`),
  dictionary: () => request('GET', '/api/dictionary'),
  findings: () => request('GET', '/api/findings'),
  edits: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null),
    ).toString()
    return request('GET', `/api/edits${qs ? `?${qs}` : ''}`)
  },

  orphanedEdits: () => request('GET', '/api/orphaned-edits'),

  setCleanedText: (lineId, b) => request('PATCH', `/api/lines/${encodeURIComponent(lineId)}`, b),
  // Withdraw an override entirely. Distinct from saving an empty correction, which is a person
  // recording that the source text was fine.
  clearLineEdit: (lineId, b) => request('DELETE', `/api/lines/${encodeURIComponent(lineId)}/edit`, b),
  addTag: (lineId, b) => request('POST', `/api/lines/${encodeURIComponent(lineId)}/tags`, b),
  removeTag: (lineId, tagId, b) =>
    request('DELETE', `/api/lines/${encodeURIComponent(lineId)}/tags/${encodeURIComponent(tagId)}`, b),
  addLibraryTag: (b) => request('POST', '/api/tag-library', b),
  decideTerm: (termId, b) => request('PATCH', `/api/dictionary/${encodeURIComponent(termId)}`, b),
  decideFinding: (id, b) => request('PATCH', `/api/findings/${encodeURIComponent(id)}`, b),
  // Answer an open question, or `{ dismiss: true }` to discard it from the analysis. A separate
  // route from decideFinding because answering and approving are different acts.
  resolveQuestion: (id, b) => request('PUT', `/api/findings/${encodeURIComponent(id)}/resolution`, b),
}
