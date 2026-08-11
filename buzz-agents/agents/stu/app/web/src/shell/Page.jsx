// The page scaffold every screen uses, so location is answerable from the page itself and not
// only from the rail — `recursica-skill-navigation`, "indicating location".
//
// Composition rules being applied here, all from `recursica-skill-screen-scaffolding`:
//   - the page title lives in the page, not in the chrome
//   - a breadcrumb appears once you are below the top level, and nowhere above it
//   - regions are divided by space and headings, never by cards
//   - content has a maximum width that comes from the design system, and the space beyond it
//     stays empty

import { Link as RouterLink } from 'react-router'
import { Breadcrumb, Link, Stack, Text, Title } from '@recursica/mantine-adapter'

/**
 * @param trail  Ancestors only, `[{ label, to }]`. The current page is the H1 and is added as
 *               plain text — a breadcrumb whose last crumb links to where you already are is
 *               navigation that does nothing.
 * @param lede   One line under the title, and usually absent. Never a definition of the title:
 *               `recursica-skill-screen-scaffolding`, "the line under a heading", says delete it
 *               and keep it deleted unless a reader would then get something wrong. If the title
 *               needs explaining, `recursica-skill-naming-terminology` says fix the title.
 * @param action The page's primary action. Rendered bottom right by `Page.Footer` below.
 */
export function Page({ title, trail = [], lede, children }) {
  return (
    <main className="stu-page">
      <Stack gap="lg">
        <Stack gap="xs">
          {trail.length > 0 && (
            <Breadcrumb>
              {trail.map((crumb) => (
                <Link key={crumb.to} component={RouterLink} to={crumb.to}>
                  {crumb.label}
                </Link>
              ))}
              <Text variant="body-small" component="span">{title}</Text>
            </Breadcrumb>
          )}
          {/* Exactly one H1 per page — recursica-skill-typography-semantics. */}
          <Title order={1}>{title}</Title>
          {lede && <Text variant="subtitle">{lede}</Text>}
        </Stack>

        {children}
      </Stack>
    </main>
  )
}

/**
 * A named region inside a page. A heading with space above it is the primary divider, so this is
 * a heading and a gap — deliberately not a container.
 *
 * @param note Same contract as `Page`'s `lede`, and the same default of absent: an ordering, a
 *             constraint, a consequence, or a state the reader would infer wrongly — never a
 *             restatement of `title`. `recursica-skill-screen-scaffolding` owns the slot.
 */
export function Section({ title, note, children }) {
  return (
    <section className="stu-section">
      <Stack gap="sm">
        <Stack gap={4}>
          <Title order={2}>{title}</Title>
          {note && <Text variant="body-small">{note}</Text>}
        </Stack>
        {children}
      </Stack>
    </section>
  )
}

/**
 * Nothing to show, said in words. Not an illustration and not a spinner: an empty result and a
 * result still loading are different claims, and the reader is entitled to know which they have.
 */
export function Empty({ children }) {
  return <Text variant="body-small">{children}</Text>
}
