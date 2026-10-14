---
name: recursica-skill-names-and-terms
description: House rules for names and terms — whose vocabulary wins, how navigation labels, page titles, and column headers relate, singular or plural, object labels in navigation, shortening and acronyms, and matching an integration's names. Use when choosing any name or term, or when different places use different names for the same meaning. Not for capitalization — see recursica-skill-typography-semantics.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Names and terms

Treat each house rule for naming as a constraint. The house rules are opinions, not neutral best practices. The house rules cover two questions:

- the wording of each name and term, such as a navigation item, a page title or a table header
- how consistently each name is used

The rules assume **complex enterprise web applications, designed for desktop first**. The personas come back every day and know the field the personas work in. The agent or the user chooses the words. This skill does not decide how the words are capitalized and styled.

## The three governing principles

1. **The persona's words win.** For example, when the personas say "Customers", label the page Customers, even if the business says "Accounts". The persona's word wins over three other words:

   - the business's term
   - the data model's field name
   - a word that sounds more precise to a designer

   The people who use the product are the people who have to recognize the name.

2. **A short, accurate label is better than the same label everywhere.** For example, a navigation item reads Orders, and the page the item opens is titled Purchase orders. A label may grow on a deeper page, but only while the extra words make the label more accurate. A recognizable name matters more than a consistent name. Recognition is the highest value in naming.
3. **An object must stay traceable.** For example, the persona clicks the Orders navigation item, reaches the Purchase orders page, and sees an Order number column. The persona should be able to follow the object from a navigation item, to a page, to a column header. The object should not disappear or change to a different term along the way.

## Whose vocabulary

**Use the words the personas use.** When the business and the personas call one object by different names, the personas' name wins. For example, the business says "Accounts" and the personas say "Customers".

1. First, work toward agreement between the business and the personas.
2. When the business and the personas do not agree, the people who use the product get the final say.

**Use the data model's term only when the persona does not already know the term from everyday use.** When a persona meets a concept without understanding the concept, the system's term can be the right term to teach. Everywhere else, keep the data model's field names out of the interface.

**When a client insists on a term the agent or the user thinks is wrong, use the client's term. Then test the client's term with usability testing.** Few other options exist. The test turns the disagreement into evidence instead of opinion.

**When two roles use different words for the same object, first check whether the two roles share a screen.** For example, buyers say "Vendors" and accountants say "Suppliers".

- **Different screens.** Each role can keep the role's own word.
- **The same screen.** Choose one term, and teach the other role the more common name. Treat the naming conflict as a real finding, not as a routine trade-off. Two roles that share a screen and use different words for one object are rare.

## Consistency across navigation, titles, and headers

**A navigation label, a page title, and a table header for the same object do not have to match exactly.** For example, the navigation item reads Orders, the page title reads Purchase orders, and the table header reads Order number.

**A label may get longer on a deeper page.** To reach a deeper page, the persona clicked through the shorter labels above the page. The persona understood the shorter labels well enough to go further. The deeper page can use the extra words that make the full idea clear.

**Stop making a label longer when the extra words neither add accuracy nor keep the label concise.** Concision matters most, and accuracy comes a close second. Leave out a word that neither makes the label more accurate nor keeps the label concise. For example, Purchase orders is more accurate than Orders. Purchase orders list adds length and no accuracy.

**NEVER let an object lose the object's name as the persona moves through the application.** For example, a navigation item reads Shipments, but the screen the item leads to never says "shipment".

- Watch for a navigation item that names an object with one term.
- Check whether the screen the navigation item leads to ever mentions the object.

A lost object name is the first naming defect that shows up in a review. A lost name almost always means nobody agrees on what the object is called.

## Singular or plural

**Match the plurality (the number of items) of the destination the persona arrives at.** A name describes the destination, not the link.

- **Plural.** Use a plural name when the destination holds many items. For example, a navigation item reads People, because the destination shows a list of people.
- **Singular.** Use a singular name when the destination is one item. For example, use Profile, because the persona edits one profile.

## Labels as nouns

**Write every label as a noun, never as a verb.** A button is the one exception, because a button label names an action. The rule covers each of these labels:

- a field label
- a filter label
- a column header
- a navigation item
- a KPI tile

**Write `Name`, not `Search`.** The persona does not fill in a search. The persona enters a name. A verb in a label describes the persona's action, and the persona knows that action. A noun in a label names the object the persona acts on.

**Include a noun in every label.** For example, write `Overdue requests`, not `Overdue`. An adjective alone is an incomplete label and names nothing. Add the noun the adjective describes.

**Cut words that add nothing.** Keep a word only if the word makes the label more accurate. For example, write `Pending requests`, not `Total pending requests`. On a screen a persona reads every day, the word _total_ adds length and no meaning. Concision comes first.

**Write a label as a noun phrase, not a sentence about the noun.** For example, write `Corrected lines`, not `Lines you have corrected`.

- Use two or three words.
- Use one qualifier (a word that says which one, such as _Overdue_) at most.
- Write the label as an adjective plus a noun.

| Instead of                   | Write                   | What was cut                                                                 |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `Lines you have corrected`   | `Corrected lines`       | a relative clause (a "that" or "which" phrase) used in place of an adjective |
| `Corrections needing review` | `Corrections to review` | an "-ing" form where a "to" form is shorter                                  |
| `Your corrections`           | `Corrections`           | a possessive that repeats what the screen already makes clear                |

**NEVER speak to the persona in a label.** For example, write `Corrections`, not `Your corrections`. `Your`, `you`, `my`, and `I` are the most common filler words in a label. A screen belongs to the person looking at the screen.

A possessive points to a difference only when the same screen also shows another party's items. When the same screen does show another party's items, name the other party in the qualifier. For example, write `Corrections` beside `Team corrections`, not `Your corrections` beside `All corrections`.

**A label that cannot be made shorter is usually two labels, or two columns that should be one column.** For example, a `Lines` column next to an `Untagged lines` column shows two facts and makes the persona subtract. One `Tagged lines` column that shows `11 / 34` has one heading and does the math for the persona. Combine two columns this way before writing a longer column header.

**Label wording matters most for table headers.** Personas read table headers more often than any other label on the screen. Table headers also have the least room. This skill and `recursica-skill-tables` jointly own label wording for table headers.

**NEVER define a term right next to the term.** A label followed by an explanation of the label shows that the label is unclear. For example, `Overdue — past the start date` shows that `Overdue` is unclear. Fix the label.

- If an idea needs more explanation than a good name gives, put the explanation in a tooltip or help content.
- Never put the explanation in a subtitle under the term the subtitle defines.

**The rule against defining a term next to the term covers every name on the screen, not only field labels.** The rule covers a page title, a section heading, a column header, and a navigation item.

The most common breach is not a label. The most common breach is text directly below a page heading or a section heading. The text repeats the heading. For example, a section heading reads Tags, and the text below reads "The labels used to group records."

The page scaffolding has a setting that adds a space below a heading for exactly that kind of text. `recursica-skill-screen-scaffolding` owns what may go in the space below a heading. Because of the rule against defining a term next to the term, the space below a heading is usually empty.

## Object labels in navigation

**Use object labels in primary navigation.** For example, write Forms, not View forms. Opening a list is moving to a place, not an action the persona takes.

**Write an action label as a verb plus an object**, as in Save form. An action acts on an object. A label with a verb and an object belongs on a button, not on a navigation item. `recursica-skill-buttons-links` owns button label wording and the verb-plus-object pattern.

**When a noun is ambiguous, add a qualifier. Try an adjective qualifier before a verb qualifier.** For example, an application for authors has a navigation item reading Pages.

- Pages could mean the pages of a book or the pages of a website.
- The fix is a qualifier that says which pages, such as Printed pages.
- A verb can sometimes make the noun clear, but an adjective usually makes the noun clearer.

**Decide for each noun whether the noun needs a qualifier.** No rule says when a qualifier is needed. A qualifier's only purpose is to make the noun clear. Do not add qualifiers as a habit.

## Shortening and acronyms

**A term may be shortened when the persona already knows the short form and the short form cannot be misread.** For example, shortening Administrator to Admin is fine. Shortening Administrator to Add is not, because a persona can no longer recognize Add as the same term.

**If the short form could be misread where the term appears, do not shorten the term.** Whether a persona knows a short form depends on the context. The test is whether the persona recognizes the short form, not how many characters the short form saves.

**A well-known acronym is fine.**

- When an acronym might or might not be well known, confirm with the user. `recursica-skill-design-router` says how to confirm with the user.
- When an acronym is not well known, write the term out the first time, with the acronym in parentheses. For example, write "service level agreement (SLA)".
- The rule to write the term out comes from `recursica-skill-typography-semantics`.

## Names from external integrations

**A name from a third-party integration must be mapped to the application's own name for the same concept.** For example, a billing service calls a customer a "Payer", and the application says "Customer". The persona sees only "Customer", so the persona sees one name for each concept.

- Keep a dictionary that translates each integration name into the internal name.
- Do not show both sets of names and leave the persona to work out which names match.

**Build the integration mapping in each application, one case at a time.** Recursica provides no integration mapping. Plan for the work, and do not assume a shared tool exists.

## Set by the theme or the component

- **Sentence case versus title case.** Sentence case capitalizes only the first word, as in "Purchase orders". Title case capitalizes every major word, as in "Purchase Orders".
  - The typography token (a named design value, such as a color or a size, set by the design system) sets the case.
  - The brand decides the case, and the case must not be changed.
  - The type style of a heading decides in advance whether the heading is in title case or sentence case. See `recursica-skill-typography-semantics`.
- **Other type styling, such as size, weight, and letter spacing.** Tokens own all other type styling.
- **The AP style guide (the Associated Press rules for writing style) applies to copy in general.** `recursica-skill-typography-semantics` records the AP style rule.

## Out of scope

- **Case, capitalization, and type styling.** Tokens and `recursica-skill-typography-semantics` own case, capitalization, and type styling.
- **Button label wording and the verb-plus-object pattern.** See `recursica-skill-buttons-links`.
- **Where navigation items sit, how many navigation items there are, and how navigation items nest.** See `recursica-skill-navigation`.
- **Field label wording inside a form, and labels that stand alone without context.** See `recursica-skill-forms`.
- **The wording of error messages.** See `recursica-skill-assistive-element` and `recursica-skill-feedback-messaging`.
- **Designing the data model and naming fields in the backend.** The data model and backend field names are not a UI concern.

## Open questions

- **Capitalization in the type token.** Nobody has confirmed whether the type token holds the capitalization. The rule stays the same: the token controls capitalization, and capitalization must not be changed. If a type style does not include capitalization, raise the missing capitalization as a gap. A missing capitalization is not permission to choose a case.
- **Naming with no personas.** Nobody has said who owns the naming decision when there is no persona to ask. A greenfield product (a brand-new product that nobody uses yet) has only the business term available.
- **Renames after launch.** When a term changes after launch, nothing says whether the old term is kept as an alias, redirected, or replaced.
- **The integration dictionary's form.** Nothing says whether the integration mapping dictionary has a standard house form. The house form would say where the dictionary lives. The house form would also say whether features share one dictionary or each feature builds a separate dictionary.
- **Label length limits.** Concision is the stated priority, but no number is given for the length of a label in a particular position. Nobody owns what happens to cut-off text outside a table cell.
- **Empty and unnamed objects.** Nothing says what a record with no name is called in a list.

## Pre-flight checklist

- [ ] Every label is a noun, with the noun present. No label other than a button label holds a verb. No label is an adjective standing alone.
- [ ] No label holds a filler word. Every word in a label makes the label more accurate.
- [ ] Every label and table header is a noun phrase of two or three words, with one qualifier at most. No label or table header holds a relative clause or a sentence. No label or table header holds `Your`, `you` or `my`, unless the same screen shows another party's items and names the other party.
- [ ] Where the persona would otherwise subtract one column from another, one combined column does the math. The two columns are not kept with longer headings.
- [ ] No label, heading, or page title has a definition next to the name. The line under a page title or a section heading holds no definition of the title or heading.
- [ ] Every object is named in the personas' vocabulary, not the business's or the data model's.
- [ ] The data model's term appears only where the persona does not already know the concept from everyday use.
- [ ] Any term the client insisted on is used as the client asked and flagged for usability testing. The term is not corrected without notice.
- [ ] Where two roles share a screen, one term is chosen. Where two roles do not share a screen, each role keeps the role's own term.
- [ ] The navigation label, the page title, and the column header can be recognized as the same object. A label gets longer on deeper pages only while the extra words add accuracy.
- [ ] No object's name disappears on the screen that the object's label leads to.
- [ ] Singular or plural matches what the destination holds.
- [ ] Primary navigation labels are objects, never actions. The verb-plus-object pattern is kept for buttons.
- [ ] Any qualifier on a navigation label is there to make an ambiguous noun clear, not out of habit.
- [ ] Every shortened term is known to the persona and cannot be misread in context. Terms that could be misread are written out.
- [ ] Acronyms are well known, confirmed with the user, or written out the first time.
- [ ] Names from an integration are mapped to a single internal name. The mapping is built in this application, not assumed to exist.
- [ ] No capitalization is set or changed by hand.
- [ ] Open questions were asked about, not decided: capitalization in the type token, naming with no personas, renames after launch, the integration dictionary's form, label length limits, and unnamed records.
