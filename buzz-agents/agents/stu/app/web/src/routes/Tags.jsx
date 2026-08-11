// The tag library. Many instances of one object, so a table.

import { useEffect, useState } from 'react'
import { Badge, Button, Dropdown, Group, Layer, Stack, Text, TextField } from '@recursica/mantine-adapter'
import { api } from '../api.js'
import { Page, Section } from '../shell/Page.jsx'
import { Absent, DataTable } from '../shell/DataTable.jsx'

const TYPES = ['insight', 'focus', 'tool', 'participant', 'action', 'emotion']

export function Tags({ identity, revision, onChanged }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

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
      render: (r) => Number(r.usage_count ?? 0),
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
      lede="The closed vocabulary the tagging rests on. A tag that exists only on a line cannot be looked up, filtered, or counted."
    >
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'usage', direction: 'desc' }}
        getRowKey={(r) => r.tag}
        rowHref={(r) => `/tags/${encodeURIComponent(r.tag)}`}
        emptyMessage="The tag library is empty. Run the dictionary sync before tagging anything."
      />

      <Section
        title="Add a tag"
        note="Written as yours, so the shared-sheet sync leaves it alone instead of retiring it on the next deploy."
      >
        <AddTag identity={identity} onChanged={onChanged} />
      </Section>
    </Page>
  )
}

function AddTag({ identity, onChanged }) {
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
      setTag(''); setType(null); setDescription('')
      onChanged()
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit}>
      <Layer layer={1}>
        <Stack gap="md">
          <Group gap="md" align="flex-end" wrap="wrap">
            <TextField
              label="Tag id"
              description="lower_snake_case — written verbatim into every tagged line"
              value={tag}
              onChange={(e) => setTag(e.currentTarget.value)}
            />
            <Dropdown
              label="Type"
              data={TYPES.map((t) => ({ value: t, label: t }))}
              value={type}
              onChange={setType}
            />
          </Group>
          <TextField
            label="Description"
            description="What a line has to be about for this tag to apply"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          {problem && <Text variant="body-small">{problem}</Text>}
          <div className="stu-actions">
            <Button type="submit" loading={busy} disabled={!tag.trim() || !type || !description.trim()}>
              Add to library
            </Button>
          </div>
        </Stack>
      </Layer>
    </form>
  )
}
