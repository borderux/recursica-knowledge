---
name: recursica-skill-naming-terminology
description: House rules for names and terms — whose vocabulary wins, how navigation labels, page titles, and column headers relate, singular or plural, object labels in navigation, shortening and acronyms, and matching an integration's names. Use when choosing any name or term, or when one thing has different names in different places. Not for capitalization — see recursica-skill-typography-semantics.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Naming and terminology

This skill holds the house rules for the names and terms in an interface, and for how consistently each name is used. The house rules are opinions, not neutral best practices. Treat the house rules as constraints.

The rules assume **complex enterprise web applications, designed for desktop first**, built for personas who come back every day and know their field. The designer chooses the words. This skill does not decide how the words are capitalized and styled.

## The three governing principles

1. **The persona's words win.** The persona's words win over the business's term, over the data model's field name, and over a word that sounds more precise to a designer. The people who use the product are the people who have to recognize the name.
2. **A short, accurate label is better than the same label everywhere.** A label may grow as the persona goes deeper, but only while the extra words make the label more accurate. A recognizable name matters more than a consistent name, and recognition is the highest value in naming.
3. **An object must stay traceable.** A persona should be able to follow the same object from a navigation item, to a page, to a column header. The object should not disappear or change to a different term along the way.

## Whose vocabulary

**Use the personas' vocabulary.** When the business and the personas call one object by different names, the personas' name wins. Aim to get the business and the personas to agree first. When the business and the personas do not agree, the people who use the product get the final say.

**Use the data model's vocabulary only when the persona does not already know the term from everyday use.** When a persona meets a concept without understanding the concept, teaching the persona the system's term can be the right choice. Everywhere else, keep the data model's field names out of the interface.

**When a client insists on a term the designer believes is wrong, use the client's term, and then test the term with usability testing.** The designer can do little else. The test turns the disagreement into evidence instead of opinion.

**When two roles use different words for the same object, first ask whether the two roles share a screen.**

- **Different screens.** Each role can keep the role's own word.
- **The same screen.** Choose one term, and teach the other role the more common name. Two roles that share a screen and use different words for one object are rare. When two roles on one screen do use different words, treat the conflict as a real finding, not as a routine trade-off.

## Consistency across navigation, titles, and headers

**A navigation label, a page title, and a table header for the same object do not have to match exactly.**

**A label may get longer as the persona goes deeper.** A persona on a deeper page has clicked through the shorter labels to get there. The persona understood the higher navigation levels well enough to go further. A deeper page can use the extra words that make the full idea clear.

**Stop lengthening a label when extra words no longer add accuracy or keep the label concise.** Concision matters most, and accuracy comes a close second. Leave out a word that adds neither accuracy nor concision.

**NEVER let an object lose its name as the persona moves through the application.** Watch for a navigation item that names an object with one term when the screen the navigation item leads to never mentions the object. A lost object name is the first naming defect that shows up in a review. A lost name almost always means nobody agrees on what the object is called.

## Singular or plural

**Match the plurality (the number of items) of the destination the persona arrives at.** A name describes the destination, not the link.

- **Plural.** Use a plural name when the destination holds many items. A navigation item reads People, because the destination shows a list of persons.
- **Singular.** Use a singular name when the destination is one item. Profile is an example, because the persona edits one profile.

## Labels as nouns

**A label is a noun. A label is never a verb.** The rule covers a field label, a filter label, a column header, a navigation item, and a KPI tile alike. A button is the one exception, because a button label names an action.

**Write `Name`, not `Search`.** The persona does not fill in a search. The persona enters a name. A verb in a label describes the persona's action, and the persona knows that action. A noun in a label names the object the persona acts on.

**A label needs a noun.** `Overdue` is an adjective and names nothing. `Overdue requests` names the requests. An adjective alone is an incomplete label. Add the noun the adjective describes.

**Cut words that add nothing.** `Total pending requests` says exactly what `Pending requests` says. On a screen a persona reads every day, the word _total_ adds length and no meaning. Concision comes first. Keep a word only if the word makes the label more accurate.

**A label is a noun phrase, not a sentence about the noun.** Use two or three words, with one qualifier at most. Write the label as an adjective plus a noun.

| Instead of                   | Write                   | What was cut                                                                 |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `Lines you have corrected`   | `Corrected lines`       | a relative clause (a "that" or "which" phrase) used in place of an adjective |
| `Corrections needing review` | `Corrections to review` | an "-ing" form where a "to" form is shorter                                  |
| `Your corrections`           | `Corrections`           | a possessive that repeats what the screen already makes clear                |

**NEVER speak to the reader in a label.** `Your`, `you`, `my`, and `I` are the most common filler words in a label. A screen belongs to the person looking at the screen. A possessive points to a difference that exists only when the same screen also shows another party's items. When the same screen does show another party's items, make the difference the qualifier, and name the other party in the qualifier. Write `Corrections` beside `Team corrections`, not `Your corrections` beside `All corrections`.

**A label that cannot be made shorter is usually two labels, or two columns that should be one column.** A `Lines` column next to an `Untagged lines` column shows two facts and makes the reader subtract. One `Tagged lines` column that shows `11 / 34` has one heading and does the math for the reader. Combine two columns this way before writing a longer column header.

**Label wording matters most for table headers.** Table headers are read more often than any other label on the screen, and table headers have the least room. This skill and `recursica-skill-tables` jointly own label wording for table headers.

**NEVER define a term right next to the term.** A label followed by an explanation of the label, as in `Overdue — past the start date`, shows that the label is unclear. Fix the label. When an idea needs more explanation than a good name gives, put the explanation in a tooltip or in help content. Never put the explanation in a subtitle under the term the subtitle defines.

**The rule against defining a term next to the term covers every name on the screen, not only field labels.** The rule covers a page title, a section heading, a column header, and a navigation item. The most common breach is not a label. The most common breach is text directly below a page heading or a section heading that repeats the heading. The page scaffolding has a setting that adds a space below a heading for exactly that kind of text. `recursica-skill-screen-scaffolding` owns what may go in the space below a heading. Because of the rule against defining a term next to the term, the space below a heading is usually empty.

## Object labels in navigation

**Primary navigation uses object labels.** Write Forms, not View forms. Opening a list is moving to a place, not an action the persona takes.

**An action acts on an object, and an action label uses the verb-plus-object pattern**, as in Save form. A verb-plus-object action is a button, not a navigation item. `recursica-skill-buttons-links` owns button label wording and the verb-plus-object pattern.

**When a noun is ambiguous, add a qualifier, and try an adjective before a verb.** In an application for authors, a navigation item reading Pages could mean the pages of a book or the pages of a website. The fix is a qualifier that says which pages. A verb can sometimes make the noun clear, but an adjective usually makes the noun clearer.

**Adding a qualifier is a judgment call, and no rule says when a qualifier is needed.** A qualifier's only purpose is to make the noun clear. Do not add qualifiers as a habit.

## Shortening and acronyms

**A term may be shortened when the persona already knows the short form and the short form cannot be misread.** Shortening Administrator to Admin is fine. Shortening Administrator to Add is not, because a persona can no longer recognize Add as the same term.

**If the short form could be misread in the context where the term appears, do not shorten the term.** Whether a persona knows a short form depends on the context. The test is whether the persona recognizes the short form, not how many characters the short form saves.

**A well-known acronym is fine.** When it is unclear whether an acronym is well known, ask. `recursica-skill-design-router` says how to ask. When an acronym is not well known, write the term out the first time, with the acronym in parentheses. The rule to write the term out comes from `recursica-skill-typography-semantics`.

## Names from external integrations

**A name from a third-party integration must be mapped to the application's own name for the same concept, so the persona sees one name for each concept.** Keep a dictionary that translates each integration name into the internal name. Do not show both sets of names and leave the persona to work out which names match.

**Each application has to build the integration mapping, one case at a time.** Recursica provides no integration mapping. Plan for the work, and do not assume a shared tool exists.

## Set by the theme or the component

- **Sentence case versus title case.** Sentence case capitalizes only the first word. Title case capitalizes every major word. The typography token (a named design value, such as a color or a size, set by the design system) sets the case. The brand decides the case, and the case must not be changed. The type style of a heading decides in advance whether the heading is in title case or sentence case. See `recursica-skill-typography-semantics`.
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

- **Capitalization in the type token.** Nobody has confirmed whether the type token carries the capitalization. The rule stays the same: the token controls capitalization, and capitalization must not be changed. If a type style does not include capitalization, raise the missing capitalization as a gap. A missing capitalization is not permission to choose a case.
- **Naming with no personas.** Nobody has said who owns the naming decision when there is no persona to ask. A greenfield product (a brand-new product that nobody uses yet) has only the business term available.
- **Renames after launch.** When a term changes after launch, nothing says whether the old term is kept as an alias, redirected, or replaced.
- **The integration dictionary's form.** Nothing says whether the integration mapping dictionary has a standard house form: where the dictionary lives, and whether one dictionary is shared across features or a separate dictionary is built for each feature.
- **Label length limits.** Concision is the stated priority, but no number is given for the length of a label in a particular position. Nobody owns what happens to cut-off text outside a table cell.
- **Empty and unnamed objects.** Nothing says what a record with no name is called in a list.

## Pre-flight checklist

- [ ] Every label is a noun, with the noun present. There are no verbs outside buttons, and no adjectives standing alone.
- [ ] No label holds a filler word. Every word in a label makes the label more accurate.
- [ ] Every label and table header is a noun phrase of two or three words, with one qualifier at most. No label or table header holds a relative clause or a sentence. No label or table header holds `Your`, `you` or `my`, unless the same screen shows another party's items and names the other party.
- [ ] Where the reader would otherwise subtract one column from another, the two columns are combined into one column with the math done, not left as two columns with longer headings.
- [ ] No label, heading, or page title has a definition next to the name, including in the line under a page title or a section heading.
- [ ] Every object is named in the personas' vocabulary, not the business's or the data model's.
- [ ] The data model's term appears only where the persona does not already know the concept from everyday use.
- [ ] Any term the client insisted on is used as the client asked and flagged for usability testing, not corrected without notice.
- [ ] Where two roles share a screen, one term is chosen. Where two roles do not share a screen, each role keeps its own term.
- [ ] The navigation label, the page title, and the column header can be recognized as the same object. A label gets longer on deeper pages only while the extra words add accuracy.
- [ ] No object loses its name on the screen that the object's label leads to.
- [ ] Singular or plural matches what the destination holds.
- [ ] Primary navigation labels are objects, never actions. The verb-plus-object pattern is kept for buttons.
- [ ] Any qualifier on a navigation label is there to make an ambiguous noun clear, not out of habit.
- [ ] Every shortened term is known to the persona and cannot be misread in context. Terms that could be misread are written out.
- [ ] Acronyms are well known, checked with the user, or written out the first time.
- [ ] Names from an integration are mapped to a single internal name, and the mapping is built in this application, not assumed to exist.
- [ ] No capitalization is set or changed by hand.
- [ ] Open questions were asked about, not decided: capitalization in the type token, naming with no personas, renames after launch, the integration dictionary's form, label length limits, and unnamed records.
