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

The rules assume **complex enterprise web applications, designed for desktop first**, built for users who come back every day and know their own field. The designer chooses the words. This skill does not decide how the words are capitalized and styled.

## The three governing principles

1. **The user's words win.** The user's words win over the business's term, over the data model's field name, and over a word that sounds more precise to a designer. The people using the product are the ones who have to recognize the name.
2. **A short, accurate label is better than the same label everywhere.** A label may grow as the user goes deeper, but only while the extra words make the label more accurate. Being recognizable, not consistency, is the highest value in naming.
3. **An object must stay traceable.** A user should be able to follow the same object from a navigation item, to a page, to a column header. The object should not disappear or be renamed into a different term along the way.

## Whose vocabulary

**Use the users' vocabulary.** When the business and the users call one object by different names, the users' name wins. Aim to get the business and the users to agree first. When the business and the users do not agree, the people using the product get the final say.

**Use the data model's vocabulary only when the user does not already know the term from everyday use.** When a user comes to a concept without understanding the concept, teaching the user the system's term can be the right move. Everywhere else, keep the data model's field names out of the interface.

**When a client insists on a term the designer believes is wrong, use the client's term, and then test the term.** Put in the word the client insists on, and check the word with usability testing. The designer can do little else. The test turns the disagreement into evidence instead of opinion.

**When two personas use different words for the same object, first ask whether the two personas share a screen.**

- **Different screens.** Each group of users can keep its own word.
- **The same screen.** Choose one term, and teach the other group the more common name. A conflict this sharp is unlikely. When a shared-screen conflict happens, treat the conflict as a real finding, not as a routine trade-off.

## Consistency across navigation, titles, and headers

**A navigation label, a page title, and a table header for the same object do not have to match exactly.** The rule does not require identical text.

**A label may get longer as the user goes deeper.** A user who reaches a nested page has clicked through the shorter labels on the way. The user understood the higher level well enough to go further. A deeper page can use the extra words that make the full idea clear.

**Stop lengthening a label when extra words no longer add accuracy or keep the label concise.** Being concise matters most, with accuracy right beside concision. Leave out a word that adds neither accuracy nor concision.

**NEVER let an object lose its name as the user moves around.** Watch for an object that the navigation names with one term, when the screen the navigation item leads to never mentions the object at all. An object that loses its name is the first naming defect that shows up in a review. The lost name almost always means nobody agrees on what the object is called.

## Singular or plural

**Match the plurality (the number of items) of the destination the user arrives at.** A name describes the destination, not the link.

- **Plural** when the destination holds many items. A navigation item reads People, because the destination shows a list of persons.
- **Singular** when the destination is one item. An example is Profile, because the user edits one profile.

## Labels as nouns

**A label is a noun. A label is never a verb.** The rule covers a field label, a filter label, a column header, a navigation item, and a KPI tile alike. A button is the one exception, because a button label names an action.

**Write `Name`, not `Search`.** The user does not fill in a search. The user enters a name. A verb in a label describes what the user is doing, which the user knows. A noun in a label names the object the user acts on.

**A label needs a noun.** `Overdue` is an adjective and names nothing. `Overdue requests` names the requests. An adjective alone is an incomplete label. Add the noun the adjective describes.

**Cut words that add nothing.** `Total pending requests` says exactly what `Pending requests` says. On a screen a user reads every day, the word _total_ adds length and no meaning. Being concise comes first. Keep a word only if the word makes the label more accurate.

**A label is a noun phrase, not a sentence about the noun.** Use two or three words, with one qualifier at most. Write the label as an adjective plus a noun.

| Instead of                   | Write                   | What was cut                                                                 |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `Lines you have corrected`   | `Corrected lines`       | a relative clause (a "that" or "which" phrase) used in place of an adjective |
| `Corrections needing review` | `Corrections to review` | an "-ing" form where a "to" form is shorter                                  |
| `Your corrections`           | `Corrections`           | a possessive that repeats what the screen already makes clear                |

**NEVER speak to the reader in a label.** `Your`, `you`, `my`, and `I` are the most common padding of all. A screen belongs to the person looking at the screen. A possessive claims a difference that exists only when the same screen also shows another party's items. When the same screen does show another party's items, make the difference the qualifier, and name the other party in the qualifier. Write `Corrections` beside `Team corrections`, not `Your corrections` beside `All corrections`.

**A label that cannot be made shorter is usually two labels, or two columns that should be one column.** A `Lines` column next to an `Untagged lines` column shows two facts and makes the reader subtract. One `Tagged lines` column that shows `11 / 34` has one heading, and the math is done. Combine two columns this way before writing a longer column header.

**Label wording matters most for table headers.** Table headers are read more often than any other label on the screen, and table headers have the least room. This skill and `recursica-skill-tables` jointly own label wording for table headers.

**NEVER define a term right next to the term.** A label followed by an explanation of the label, as in `Overdue — past the start date`, admits that the label failed. Fix the label. When an idea needs more explanation than a good name gives, put the explanation in a tooltip or in help content. Never put the explanation in a subtitle under the term the subtitle defines.

**The rule against defining a term next to the term covers every name on the screen, not only field labels.** The rule covers a page title, a section heading, a column header, and a navigation item. The most common breach is not a label at all. The most common breach is a page heading or a section heading repeated as text directly below the heading. The page scaffolding has a setting that offers a space for text below the heading for exactly that purpose. `recursica-skill-screen-scaffolding` owns what may go in that space. The rule against defining a term next to the term is why that space is usually empty.

## Object labels in navigation

**Primary navigation uses object labels.** Write Forms, not View forms. Going to a list is not an action the user takes. Going to a list is moving to a place.

**An action acts on an object, and an action label uses the verb-plus-object pattern**, as in Save form. A verb-plus-object action is a button, not a navigation item. `recursica-skill-buttons-links` owns button label wording and the verb-plus-object pattern.

**When a noun is ambiguous, add a qualifier, and try an adjective before a verb.** In an application for authors, a navigation item reading Pages could mean the pages of the book or the pages of the website. The fix is a qualifier that says which pages. A verb can sometimes make the noun clear, but an adjective usually makes the noun clearer.

**No rule says when a qualifier is needed.** Adding a qualifier is a judgment call. A qualifier's only purpose is to make the noun clear. Do not add qualifiers as a habit.

## Shortening and acronyms

**A term may be shortened when the user already knows the short form and the short form cannot be misread.** Shortening Administrator to Admin is fine. Shortening Administrator to Add is not, because a user can no longer recognize Add as the same term.

**If the short form could be misread in the context where the term appears, do not shorten the term.** Whether a user knows a short form depends on the context. The test is whether the user recognizes the short form, not how many characters the short form saves.

**A well-known acronym is fine.** When it is unclear whether an acronym is well known, ask. See `recursica-skill-design-router` for how to ask. When an acronym is not well known, write the term out the first time, with the acronym in parentheses. That rule comes from `recursica-skill-typography-semantics`.

## Names from external integrations

**A name from a third-party integration must be mapped to the application's own name for the same concept, so the user sees one name for each concept.** Keep a dictionary that translates each outside name into the internal name. Do not show both sets of words and leave the user to work out which names match.

**The Recursica system has no integration mapping.** Each application has to build the mapping, one case at a time. Plan for the work, and do not assume a shared tool exists.

## Set by the theme or the component

- **Sentence case versus title case.** Sentence case capitalizes only the first word. Title case capitalizes every major word. The typography token (a named design value, such as a color or a size, set by the design system) sets the case. The brand decides the case, and the case must not be changed. The type style of a heading decides in advance whether the heading is in title case or sentence case. See `recursica-skill-typography-semantics`.
- **Other type styling, such as size, weight, and letter spacing.** Tokens own all other type styling.
- **The AP style guide** (the Associated Press rules for writing style). The AP style guide applies to copy in general. `recursica-skill-typography-semantics` records the AP style rule.

## Out of scope

- **Case, capitalization, and type styling.** Tokens and `recursica-skill-typography-semantics` own case, capitalization, and type styling.
- **Button label wording and the verb-plus-object pattern.** See `recursica-skill-buttons-links`.
- **Where navigation items sit, how many navigation items there are, and how navigation items nest.** See `recursica-skill-navigation`.
- **Field label wording inside a form, and labels that stand alone without context.** See `recursica-skill-forms`.
- **The wording of error messages.** See `recursica-skill-assistive-element` and `recursica-skill-feedback-messaging`.
- **Designing the data model and naming fields in the backend.** The data model and backend field names are not a UI concern.

## Open questions

- **Capitalization in the type token.** Nobody has confirmed whether the type token carries the capitalization. The rule is that the token controls capitalization, and capitalization is not to be changed. If a type style does not include capitalization, raise the missing capitalization as a gap. A missing capitalization is not permission to choose a case.
- **Naming with no users.** Nobody has said who owns the naming decision when there is no user to ask. A greenfield product (a brand-new product with no users yet) has only the business term available.
- **Renames after launch.** When a term changes after launch, nothing says whether the old term is kept as an alias, redirected, or replaced.
- **The integration dictionary's form.** Nothing says whether the integration mapping dictionary has a standard house form: where the dictionary lives, and whether the dictionary is a shared module or built separately for each feature.
- **Label length limits.** Being concise is the stated priority, but no number is given for the length of a label in a particular position. Nobody owns what happens to cut-off text outside a table cell.
- **Empty and unnamed objects.** Nothing says what a record with no name is called in a list.

## Pre-flight checklist

- [ ] Every label is a noun, with the noun present. There are no verbs outside buttons, and no adjectives standing alone.
- [ ] No label holds a filler word. Every word in a label makes the label more accurate.
- [ ] Every label and table header is a noun phrase of two or three words, with one qualifier at most. No label or table header holds a relative clause or a sentence. No label or table header holds `Your`, `you` or `my`, unless the same screen shows another party's items and names the other party.
- [ ] Where the reader would otherwise subtract one column from another, the two columns are combined into one column with the math done, not left as two columns with longer headings.
- [ ] No label, heading, or page title has a definition beside the label, heading, or page title, including the line under a page title or a section heading.
- [ ] Every object is named in the users' vocabulary, not the business's or the data model's.
- [ ] The data model's term appears only where the user does not already know the concept from everyday use.
- [ ] Any term the client insisted on is used as the client asked and flagged for usability testing, not corrected without notice.
- [ ] Where two personas share a screen, one term is chosen. Where two personas do not share a screen, each persona keeps its own term.
- [ ] The navigation label, the page title, and the column header can be recognized as the same object. A label gets longer on deeper pages only while the extra words add accuracy.
- [ ] No object loses its name on the screen that the object's label leads to.
- [ ] Singular or plural matches what the destination holds.
- [ ] Primary navigation labels are objects, never actions. The verb-plus-object pattern is kept for buttons.
- [ ] Any qualifier on a navigation label is there to make an ambiguous noun clear, not out of habit.
- [ ] Every shortened term is known to the user and cannot be misread in context. Terms that could be misread are written out.
- [ ] Acronyms are well known, checked with the user, or written out the first time.
- [ ] Names from an integration are mapped to a single internal name, and the mapping is built in this application, not assumed to exist.
- [ ] No capitalization is set or changed by hand.
- [ ] Open questions were asked about, not decided: capitalization in the type token, naming with no users, renames after launch, the integration dictionary's form, label length limits, and unnamed records.
