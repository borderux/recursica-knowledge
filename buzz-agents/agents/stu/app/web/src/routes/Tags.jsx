// The tag library. Many instances of one object, so a table.
//
// Adding a tag used to be a form permanently mounted under the table, which was wrong in three
// ways at once and all three are now rules:
//
//   1. **It is a rare action holding continuous space.** The reader comes here to read the library;
//      adding to it is occasional. `recursica-skill-screen-priority` ranks by frequency, not by
//      importance, and the trigger is what stays visible.
//   2. **It sat below a table of unknown length**, so its position depended on how many tags exist
//      and a reader who did not already know it was there had no reason to scroll to the end of a
//      list looking. The table header is the one position that does not move.
//   3. **It changes the rows of the table behind it**, so it belongs on a surface that opens and
//      closes — `recursica-skill-panels-modals`. Closing the modal is what says the work committed,
//      and the new row is the confirmation. An inline form leaves the reader with a form and a table
//      on screen at once and no answer to "did that save?".

import { useEffect, useState } from 'react'
import {
  Badge, Button, Dropdown, Modal, Stack, Text, TextArea, TextField,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { formatCount } from '../format.js'
import { Page } from '../shell/Page.jsx'
import { Absent, DataTable } from '../shell/DataTable.jsx'

const TYPES = ['insight', 'focus', 'tool', 'participant', 'action', 'emotion']

export function Tags({ identity, revision, onChanged }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api.tagLibrary().then(setRows).catch((e) => setError(e.message))
  }, [revision])

  if (error) return <Page title="Tags"><Text>{error}</Text></Page>
  if (!rows) return null

  const columns = [
    { key: 'tag', header: 'Tag', sortValue: (r) => r.tag, render: (r) => r.tag },
    { key: 'type', header: 'Type', sortValue: (r) => r.type, render: (r) => r.type },
    {
      key: 'usage',
      header: 'Lines tagged',
      sortValue: (r) => Number(r.usage_count ?? 0),
      // An unused tag is a finding too — either the taxonomy is wrong or the tagging missed it.
      render: (r) => formatCount(r.usage_count),
    },
    {
      key: 'threshold',
      header: 'Confidence floor',
      sortValue: (r) => Number(r.confidence_threshold ?? 0),
      render: (r) => r.confidence_threshold ?? <Absent />,
    },
    {
      key: 'origin',
      header: 'Source',
      sortValue: (r) => r.origin ?? 'sheet',
      render: (r) => (r.origin === 'human' ? 'Added here' : 'Shared dictionary'),
    },
    {
      key: 'state',
      header: 'State',
      sortValue: (r) => (r.active ? 0 : 1),
      render: (r) => <Badge variant={r.active ? 'success' : 'warning'}>{r.active ? 'Active' : 'Retired'}</Badge>,
    },
  ]

  return (
    <Page
      title="Tags"
      // This page is one table, so the page title is that table's header and this is the add
      // affordance's place. See `Page`'s own contract.
      action={<Button variant="solid" onClick={() => setAdding(true)}>Add a tag</Button>}
    >
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'usage', direction: 'desc' }}
        getRowKey={(r) => r.tag}
        rowHref={(r) => `/tags/${encodeURIComponent(r.tag)}`}
        emptyMessage="The tag library is empty. Run the dictionary sync before tagging anything."
      />

      {adding && (
        <AddTag
          identity={identity}
          onClose={() => setAdding(false)}
          onDone={() => { setAdding(false); onChanged() }}
        />
      )}
    </Page>
  )
}

function AddTag({ identity, onClose, onDone }) {
  const [tag, setTag] = useState('')
  const [type, setType] = useState(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setProblem(null)
    try {
      await api.addLibraryTag({ pubkey: identity.pubkey, tag, type, description })
      onDone()
    } catch (e) { setProblem(e.message); setBusy(false) }
  }

  return (
    <Modal opened onClose={onClose} title="Add a tag">
      <form onSubmit={submit}>
        <Stack gap="md">
          {/* One field per row, labels beside them — recursica-skill-forms, "Layout" and
              "Labels". Tag id and Type were on one row: two logical values, so not the
              compound-control exception. */}
          <TextField
            formLayout="side-by-side"
            label="Tag id"
            description="lower_snake_case — written verbatim into every tagged line"
            value={tag}
            onChange={(e) => setTag(e.currentTarget.value)}
          />
          <Dropdown
            formLayout="side-by-side"
            label="Type"
            data={TYPES.map((t) => ({ value: t, label: t }))}
            value={type}
            onChange={setType}
          />
          {/* A textarea, not a text field. `recursica-skill-textarea` says the control follows the
              expected answer — "a description" is its own first example — and the label is the
              tell: a field called Description promises room to write, and a single-line box scrolls
              sideways so the writer cannot see what they wrote. Both component skills already said
              this in both directions; the reason it shipped wrong is that `TextField` was already
              imported and this was not.

              The export is `TextArea`, capital A — `Textarea` is not in `RECURSICA_COMPONENTS` and
              would have been an undefined import. Checked against the package's own type
              declarations rather than the skill, which is the lesson from the last round of this. */}
          <TextArea
            formLayout="side-by-side"
            label="Description"
            description="What a line has to be about for this tag to apply"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          {problem && <Text variant="body-small">{problem}</Text>}
        </Stack>

        <Modal.Footer>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            type="submit"
            variant="solid"
            loading={busy}
            disabled={!tag.trim() || !type || !description.trim()}
          >
            Add to library
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
