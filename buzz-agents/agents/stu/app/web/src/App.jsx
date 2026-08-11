import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { Badge, Layer, Stack, Text, Title } from '@recursica/mantine-adapter'
import { api } from './api.js'
import { IdentityGate } from './shell/IdentityGate.jsx'
import { Interviews } from './routes/Interviews.jsx'
import { Interview } from './routes/Interview.jsx'
import { People } from './routes/People.jsx'
import { Tags } from './routes/Tags.jsx'
import { TagDetail } from './routes/TagDetail.jsx'
import { Dictionary } from './routes/Dictionary.jsx'
import { Findings } from './routes/Findings.jsx'
import { History } from './routes/History.jsx'

const STORAGE_KEY = 'stu.identity'

// Six destinations. recursica-skill-navigation puts complex subject matter at about five items
// per level, and recursica-skill-screen-scaffolding sends anything past three or four to a left
// rail. Both point the same way, so the rail is not a preference here.
//
// `People` sits directly under `Interviews` because it is the same subject matter one level up:
// the interviews are where a speaker is read, and this is where it is settled who was speaking.
//
// Labels are object nouns, never actions — `Interviews`, not `View interviews`.
const SECTIONS = [
  { to: '/interviews', label: 'Interviews' },
  { to: '/people', label: 'People' },
  { to: '/tags', label: 'Tags' },
  { to: '/dictionary', label: 'Dictionary' },
  { to: '/findings', label: 'Findings' },
  { to: '/history', label: 'History' },
]

export default function App() {
  const [config, setConfig] = useState(null)
  const [identity, setIdentity] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })
  const [error, setError] = useState(null)
  // Bumped after any write so every screen refetches. Blunt, and right for a local single-user
  // tool: a stale count next to a value the user just changed reads as a bug.
  const [revision, setRevision] = useState(0)
  const onChanged = useCallback(() => setRevision((r) => r + 1), [])

  useEffect(() => {
    api.config().then(setConfig).catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <main className="stu-page stu-page--narrow">
        <Title order={1}>Stu could not start</Title>
        <Text>{error}</Text>
      </main>
    )
  }

  // recursica-skill-screen-scaffolding: a page that is loading shows nothing, then shows the
  // content. No spinner, no skeleton. This wait is a local socket, well under the three seconds
  // that would earn one.
  if (!config) return null

  if (!identity) {
    return (
      <IdentityGate
        config={config}
        onBound={(who) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(who))
          setIdentity(who)
        }}
      />
    )
  }

  const screens = { identity, revision, onChanged }

  return (
    <div className="stu-shell">
      <Rail config={config} identity={identity} />
      <div className="stu-main">
        <Routes>
          <Route path="/" element={<Navigate to="/interviews" replace />} />
          <Route path="/interviews" element={<Interviews {...screens} />} />
          <Route path="/interviews/:cid" element={<Interview {...screens} />} />
          {/* A cited line is a place you can be sent to. Findings link straight here. */}
          <Route path="/interviews/:cid/lines/:seq" element={<Interview {...screens} />} />
          <Route path="/people" element={<People {...screens} />} />
          <Route path="/tags" element={<Tags {...screens} />} />
          <Route path="/tags/:tagId" element={<TagDetail {...screens} />} />
          {/* Each tab is its own route, so a tab survives a refresh and works with back and
              forward — recursica-skill-tabs states it as a house preference. Neither `/dictionary`
              nor `/findings` has content of its own; the first tab is where the work is. */}
          <Route path="/dictionary" element={<Navigate to="/dictionary/spellings" replace />} />
          <Route path="/dictionary/:tab" element={<Dictionary {...screens} />} />
          <Route path="/findings" element={<Navigate to="/findings/inbox" replace />} />
          <Route path="/findings/:tab" element={<Findings {...screens} />} />
          <Route path="/history" element={<History {...screens} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  )
}

/**
 * The navigation rail. Text labels only — `recursica-skill-navigation` forbids an icon-only rail
 * outright, and marks navigation up as a semantic list.
 *
 * The brand sits top-left and the person's identity at the bottom, which is where a rail puts
 * what a header would have carried in its upper right.
 */
function Rail({ config, identity }) {
  const { pathname } = useLocation()

  return (
    <div className="stu-rail">
      <Layer layer={1}>
        {/* Layout lives on a plain element inside the Layer. The Layer owns its own box; setting
            `display` or height on it from out here would be an override, not a gap. */}
        <div className="stu-rail__inner">
          <div className="stu-rail__brand">
            <Title order={2} component="div">Stu</Title>
            <Text variant="caption">{config.slug}</Text>
          </div>

          <nav aria-label="Sections">
            <ul className="stu-rail__list">
              {SECTIONS.map((s) => (
                <li key={s.to}>
                  <NavLink
                    to={s.to}
                    className="stu-rail__link"
                    // A section stays selected while you are inside it, so a line three levels
                    // deep still answers "where am I" from the rail as well as the breadcrumb.
                    aria-current={pathname.startsWith(s.to) ? 'page' : undefined}
                  >
                    {s.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="stu-rail__foot">
            <Stack gap="xs">
              <Text variant="caption">Editing as</Text>
              <Text variant="body-small">{identity.email}</Text>
              <Badge variant="warning">attribution, not a login</Badge>
            </Stack>
          </div>
        </div>
      </Layer>
    </div>
  )
}

function NotFound() {
  return (
    <main className="stu-page stu-page--narrow">
      <Title order={1}>No such page</Title>
      <Text>That address does not match anything in this channel.</Text>
    </main>
  )
}
