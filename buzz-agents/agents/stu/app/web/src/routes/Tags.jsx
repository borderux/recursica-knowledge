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
import { Link as RouterLink } from 'react-router'
import {
  Badge, Button, Dropdown, Link, Modal, Stack, Text, TextArea, TextField,
} from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { formatCount } from '../format.js'
import { Page } from '../shell/Page.jsx'
import { Absent, DataTable } from '../shell/DataTable.jsx'

const TYPES = ['insight', 'focus', 'tool', 'participant', 'action', 'emotion']

// The submit button lives in the footer, which has to be a direct child of `Modal` and is therefore
// outside the `<form>`. This is what still connects them — see the footer's own note.
const FORM_ID = 'stu-add-tag'

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
    {
      key: 'tag',
      header: 'Tag',
      sortValue: (r) => r.tag,
      // The way into the record, and the only interactive thing in the row — a real `<a href>`, so
      // the browser's own link behaviour works. `recursica-skill-buttons-links` requires that and
      // outranks the tables skill's permission for whole-row navigation.
      render: (r) => (
        <Link component={RouterLink} to={`/tags/${encodeURIComponent(r.tag)}`}>{r.tag}</Link>
      ),
    },
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
        label="Tag library"
        columns={columns}
        rows={rows}
        initialSort={{ key: 'usage', direction: 'desc' }}
        getRowKey={(r) => r.tag}
        emptyMessage="The tag library is empty. Run the dictionary sync before tagging anything."
      />

      {/* Mounted always, opened by a prop — **not** `{adding && <AddTag/>}`. Mantine returns focus
          to the trigger through `useFocusReturn({ opened, … })`, which is wrapped in `useDidUpdate`:
          it skips the first run and only fires when `opened` *changes*. Mounting the modal on the
          click meant `opened` was a literal `true` for the component's whole life, so the effect
          body never ran, the trigger was never captured, and closing dropped focus. The binding is
          the fix; see `AddTag` for how the form still starts empty. */}
      <AddTag
        opened={adding}
        identity={identity}
        onClose={() => setAdding(false)}
        onDone={() => { setAdding(false); onChanged() }}
      />
    </Page>
  )
}

/**
 * The form itself is the modal's only content, so the `<form>` and the footer are **siblings**
 * rather than the footer sitting inside the form — see the note on `Modal.Footer` below.
 *
 * @param opened Bound, never a literal. The component stays mounted so that this can transition,
 *               which is the only thing that makes Mantine return focus to the trigger.
 */
function AddTag({ opened, identity, onClose, onDone }) {
  const [tag, setTag] = useState('')
  const [type, setType] = useState(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  // Staying mounted is what costs this: the form used to arrive empty because the whole component
  // was thrown away on close. Cleared on the way in instead, so opening `Add a tag` is still a
  // blank form and does not resume someone's abandoned half-entry from ten minutes ago.
  useEffect(() => {
    if (!opened) return
    setTag(''); setType(null); setDescription(''); setProblem(null); setBusy(false)
  }, [opened])

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setProblem(null)
    try {
      await api.addLibraryTag({ pubkey: identity.pubkey, tag, type, description })
      onDone()
    } catch (e) { setProblem(e.message); setBusy(false) }
  }

  return (
    // Neither Mantine nor the adapter labels the close control, so without `closeButtonProps` it
    // is a button announced as nothing.
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add a tag"
      closeButtonProps={{ 'aria-label': 'Close without adding a tag' }}
    >
      <form id={FORM_ID} onSubmit={submit}>
        <Stack gap="md">
          {/* One field per row, labels beside them — recursica-skill-forms, "Layout" and
              "Labels". Tag id and Type were on one row: two logical values, so not the
              compound-control exception. */}
          {/* `assistiveText` and not `description` — the adapter's TextField drops `description`
              silently, help text and `aria-describedby` with it. See the long note in
              `shell/IdentityGate.jsx`. The `TextArea` below keeps `description`, which works. */}
          {/* `data-autofocus` puts the opening focus on the first field. Without it Mantine's focus
              trap takes the first tabbable node in the DOM, and the adapter renders the header
              before the body — so focus landed on the close button, which
              `recursica-skill-modal:78` allows only when nothing else is focusable. */}
          <TextField
            data-autofocus
            formLayout="side-by-side"
            label="Tag id"
            assistiveText="lower_snake_case — written verbatim into every tagged line"
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
      </form>

      {/* **A direct child of `Modal`, and it has to be.** The adapter pulls the footer out of the
          scrolling body with `React.Children.forEach` over `Modal`'s own children, so it only ever
          sees direct ones. This sat inside the `<form>` above, where nothing found it — it stayed
          in the scroll area and took that container's padding on top of its own, doubling an inset
          that `recursica-skill-modal` lists under "Not your decision".

          Which is why the submit button reaches its form by `form={FORM_ID}` instead. Moving the
          footer out here moved it out of the form too, and a `type="submit"` button outside its
          form does nothing at all — Mantine portals the modal, so wrapping the whole `Modal` in the
          form is not available either. The id attribute is the one shape that keeps both. */}
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          type="submit"
          form={FORM_ID}
          variant="solid"
          loading={busy}
          disabled={!tag.trim() || !type || !description.trim()}
        >
          Add to library
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
