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
 * There is deliberately no prose slot under the title, and adding one back is a decision for the
 * owner rather than a convenience for the next screen.
 *
 * `recursica-skill-screen-scaffolding` carries the rule — the slot's default state is empty, and a
 * line that only restates the heading is the heading again in smaller type. That rule was already
 * in the skill, was read, and still lost at fourteen call sites across this app, because writing a
 * sentence into an available string prop is easier than remembering not to. So the prop is gone:
 * the skill now says to delete the affordance rather than only its uses, and a component that
 * accepts no optional prose cannot grow it back next week.
 *
 * A fact the heading genuinely cannot carry still belongs on the screen — as content in the page,
 * where it is visible as a deliberate addition.
 *
 * @param trail  Ancestors only, `[{ label, to }]`. The current page is the H1 and is added as
 *               plain text — a breadcrumb whose last crumb links to where you already are is
 *               navigation that does nothing.
 * @param action Optional control on the title line, at the right.
 *
 *               On a page that is one table, the page title *is* that table's header, so this is
 *               where its add affordance goes — `recursica-skill-tables` puts it at the header and
 *               never below the table, because an unknown number of rows puts "below" at a position
 *               no one can predict and no reader scrolls to the end of a list to look for a button.
 *
 *               This is deliberately not the bottom-right primary action slot in
 *               `recursica-skill-screen-scaffolding`. That rule calls itself a starting position
 *               rather than a law; the table rule is specific about this case, so it wins.
 */
export function Page({ title, trail = [], action, children }) {
  return (
    <main className="stu-page">
      <Stack gap="lg">
        <Stack gap="xs">
          {trail.length > 0 && (
            /* A named navigation landmark. The page already has a second one — the rail's
               `<nav aria-label="Sections">` in `App.jsx` — and two unnamed nav regions are two
               entries reading "navigation" in a landmark list, which is the case `aria-label` is
               for. Both props reach the DOM: neither `component` nor `aria-label` is in the
               adapter's BLOCKED_STYLING_KEYS, so `filterStylingProps` passes them through to
               Mantine's polymorphic Box.

               **The `ul`/`li` half of this rule is not fixable from here.** Mantine's Breadcrumbs
               flattens its children into one Box with separators interleaved, so no list markup can
               be produced through the component and hand-rolling one around it would be an override
               of the thing that owns the structure. That is an adapter gap, logged rather than
               worked around. */
            <Breadcrumb component="nav" aria-label="Breadcrumb">
              {trail.map((crumb) => (
                <Link key={crumb.to} component={RouterLink} to={crumb.to}>
                  {crumb.label}
                </Link>
              ))}
              {/* The current page. `aria-current="page"` is what says so — position and a smaller
                  type size are a visual convention and carry nothing to a screen reader. It stays a
                  span rather than a link, because a crumb linking to where you already are is
                  navigation that does nothing. */}
              <Text variant="body-small" component="span" aria-current="page">{title}</Text>
            </Breadcrumb>
          )}
          {/* Exactly one H1 per page — recursica-skill-typography-semantics. */}
          <div className="stu-section-head">
            <Title order={1}>{title}</Title>
            {action}
          </div>
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
 * No prose slot here either, for the reason given on `Page` above. This was the sibling prop that
 * survived the previous pass: five page-level ledes were deleted and the twelve section notes were
 * left, which is why the defect was still on screen when the owner looked again.
 *
 * @param action Optional. A control belonging to the region — the add affordance for a table, per
 *               `recursica-skill-tables`, which puts it at the header and never below the table.
 */
export function Section({ title, action, children }) {
  return (
    <section className="stu-section">
      <Stack gap="sm">
        {/* Heading and its action on one line, so the action reads as belonging to this region. */}
        <div className="stu-section-head">
          <Title order={2}>{title}</Title>
          {action}
        </div>
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
