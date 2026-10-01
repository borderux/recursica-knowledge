---
name: recursica-skill-naming-terminology
description: House rules for what things are called — whose vocabulary wins, how navigation labels, page titles, and column headers relate, singular or plural, object labels in navigation, shortening and acronyms, and matching an integration's names. Use when naming anything, or when one thing has different names in different places. Not for capitalization — see recursica-skill-typography-semantics.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Naming and terminology

These are the house rules for what things are called, and how consistently. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built for users who come back every day and already know their own field. The designer chooses the words. How they are capitalized and styled is decided elsewhere.

## The three governing principles

1. **The user's words win.** They win over the business's term, over the data model's field name, and over whatever sounds more precise to a designer. The people using the product are the ones who have to recognize the name.
2. **Short and accurate beats identical everywhere.** A label may grow as the user goes deeper, but only while the extra words make it more accurate. Consistency is not the highest value here — being recognizable is.
3. **The object must stay traceable.** A user should be able to follow the same thing from a navigation item, to a page, to a column header, without it disappearing or being renamed into something else.

## Whose vocabulary

**Use the users' vocabulary.** Where the business and the users call something by different names, the users win. Aim to get them to agree first, but when they do not, the people using the product get the final say.

**Use the data model's vocabulary only when the user does not already know the term from everyday use.** If a user comes to a concept without already understanding it, teaching them the system's term can be the right move. Everywhere else, the data model's field names stay out of the interface.

**When a client insists on a term the designer believes is wrong, use the client's term — then test it.** Put in the word they insist on, and check it with usability testing. There is little else to do. The test turns the disagreement into evidence instead of opinion.

**When two personas use different words for the same thing, first ask whether they share a screen.**

- **Different screens** — each group can keep its own word.
- **The same screen** — one term has to be chosen, and the other group is taught the more common name. A conflict this sharp is unlikely. Treat it as a real finding when it happens, not as a routine trade-off.

## Consistency across navigation, titles, and headers

**A navigation label, a page title, and a table header for the same object do not have to match exactly.** The rule does not require identical text.

**A label may get longer as the user goes deeper.** By the time someone reaches a nested page, they have already clicked through the shorter labels. That means they understood the high level well enough to dig in, so the deeper screen can afford the extra words that make the full idea clear.

**Where the lengthening stops: when extra words no longer add accuracy or keep it concise.** Being concise matters more than anything, with accuracy right beside it. Once another word adds neither, it does not belong.

**NEVER let an object lose its name as the user moves around.** The mistake to watch for is something called by one term in the navigation that is then not mentioned at all on the screen it leads to. That is the first naming defect that shows up in a review, and it almost always means nobody agrees on what the object is called.

## Singular or plural

**Match the plurality (the number of items) of what the user arrives at.** The name describes the destination, not the link.

- **Plural** when the destination holds many — a navigation item reading People, because going there shows a list of persons.
- **Singular** when the destination is one thing — Profile, because there is one profile being edited.

## Every label is a noun

**A label names a thing. It is never a verb.** This is true of a field label, a filter label, a column header, a navigation item, and a KPI tile alike — everywhere except a button, which names an action.

**`Name`, not `Search`.** The user is not filling in a thing called _search_; they are entering a name. A verb in a label describes what the user is doing — which they already know — instead of naming the object they are doing it to.

**A label needs its noun.** `Overdue` is an adjective, and it names nothing; `Overdue requests` names a thing. An adjective on its own is an incomplete label. Add the noun it describes.

**Cut words that add nothing.** `Total pending requests` says exactly what `Pending requests` says, so _total_ is noise on a screen someone reads every day. Being concise comes first. Keep a word only if it makes the label more accurate.

**A label is a noun phrase, not a sentence about the noun.** Use two or three words, with one qualifier at most. Write it as adjective + noun:

| Instead of                   | Write                   | What was cut                                                            |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `Lines you have corrected`   | `Corrected lines`       | a relative clause (a "that" or "which" phrase) doing an adjective's job |
| `Corrections needing review` | `Corrections to review` | an "-ing" form where a "to" form is shorter                             |
| `Your corrections`           | `Corrections`           | a possessive that repeats what the screen already makes clear           |

**NEVER speak to the reader in a label.** `Your`, `you`, `my`, and `I` are the most common padding of all. A screen already belongs to whoever is looking at it, and the possessive claims a difference that only exists if the same screen also shows someone else's. Where it does, the difference is the qualifier, and it names the other party — `Corrections` beside `Team corrections`, not `Your corrections` beside `All corrections`.

**A label that cannot be made shorter is usually two labels, or two columns that should be one.** `Lines` next to `Untagged lines` shows two facts and makes the reader subtract. `Tagged lines` showing `11 / 34` is one column and one heading, with the math already done. Combine the columns this way before writing a longer heading.

**This matters most for table headers**, which are read more often than any other label on the screen and have the least room. Owned jointly with `recursica-skill-tables`.

**NEVER define a term right next to itself.** A label followed by an explanation of what it means — `Overdue — past the start date` — admits that the label failed. Fix the label. If the idea needs explaining beyond a good name, that belongs in a tooltip or in help content — never in a subtitle sitting under the term it defines.

**This covers every named thing on the screen, not only field labels** — a page title, a section heading, a column header, a navigation item. The most common breach is not a label at all. It is a page or section whose heading is repeated as prose directly beneath it, in the slot that a scaffold prop offers for exactly that purpose. `recursica-skill-screen-scaffolding` owns what may go in that slot; the rule against defining a term next to itself is why that slot is usually empty.

## Navigation labels name objects, not actions

**Primary navigation uses object labels.** Forms, not View forms — going to a list is not an action the user is taking; it is moving to a place.

**Actions are for acting on an object**, and they take the verb-plus-object pattern — Save form. That is a button, not a navigation item. Owned by `recursica-skill-buttons-links`.

**Where a noun is ambiguous, add a qualifier — and try an adjective before a verb.** In an application for authors, a navigation item reading Pages could mean the pages of the book or the pages of the website. The fix is a qualifier that says which. A verb can sometimes do that job, but an adjective usually does it better.

**There is no rule for when a qualifier is needed.** It is a judgment call, and its only purpose is to make the noun clear. Do not add qualifiers as a habit.

## Shortening and acronyms

**A term may be shortened when the user already knows the short form and it cannot be misread.** Administrator to Admin is fine. Administrator to Add is not — it can no longer be recognized as the same term.

**If the shortened form could be misread in this context, do not shorten it.** Whether a short form is known depends on the context, and the test is whether the user recognizes it, not how many characters it saves.

**An acronym is fine when it is well known.** When it is unclear whether an acronym is well known, ask — see `recursica-skill-design-router`. Where an acronym is not well known, `recursica-skill-typography-semantics` applies: write the term out the first time, with the acronym in parentheses.

## Names from external integrations

**A third-party integration's names must be mapped to the application's own names, so the user sees one name for one thing.** Keep a dictionary that translates the outside name into the internal one. Do not show both sets of words and leave the user to sort them out.

**That mapping does not exist in the Recursica system.** It has to be built into each application, one case at a time — so plan for it, instead of assuming there is a shared tool for it.

## Decided elsewhere

- **Sentence case versus title case.** Sentence case capitalizes only the first word; title case capitalizes every major word. This is set by the typography token (a named design value, such as a color or a size, set by the design system), decided by the brand, and must not be changed. Whether a heading is in title case or sentence case is decided in advance by the type style it uses — see `recursica-skill-typography-semantics`.
- **Any other type styling** — size, weight, letter spacing. Tokens own all of it.
- **The AP style guide** (the Associated Press rules for writing style) applies to copy in general, and is recorded in `recursica-skill-typography-semantics`.

## Out of scope

- **Case, capitalization, and type styling** — owned by tokens, `recursica-skill-typography-semantics`.
- **Button label wording and the verb-plus-object pattern** — `recursica-skill-buttons-links`.
- **Where navigation items sit, how many there are, and how they nest** — `recursica-skill-navigation`.
- **Field label wording inside a form, and labels that stand alone without context** — `recursica-skill-forms`.
- **The wording of error messages** — `recursica-skill-assistive-element` and `recursica-skill-feedback-messaging`.
- **Designing the data model and naming fields in the backend.** Not a UI concern.

## Uncovered — ask, do not invent

- **Whether the type token carries the capitalization.** The rule is that capitalization is controlled by the token and is not to be changed. If a given type style does not include it, that is a gap to raise, not permission to choose.
- **Who owns the naming decision when there is no user to ask** — a greenfield product (a brand-new product with no users yet), where the business term is the only term available.
- **How a rename spreads.** When a term changes after launch, nothing says whether the old term is kept as an alias, redirected, or replaced.
- **Whether the integration mapping dictionary has a standard house form** — where it lives, and whether it is a shared module or built separately for each feature.
- **Length limits for a label in a particular position.** Being concise is the stated priority, but no number is given, and what happens to cut-off text outside a table cell has no owner.
- **Empty and unnamed objects** — what a record with no name is called in a list.

## Pre-flight checklist

- [ ] Every label is a noun, with its noun present — no verbs outside buttons, and no adjectives standing alone.
- [ ] There are no filler words; every word in a label makes it more accurate.
- [ ] Every label and table header is a noun phrase of two or three words, with one qualifier at most. There is no relative clause, no sentence, and no `Your`/`you`/`my` — unless the same screen shows another party's and names them.
- [ ] Where the reader would otherwise subtract one column from another, the two are combined into one column with the math already done, not left as two columns with longer headings.
- [ ] No label, heading, or page title has a definition sitting beside it — including the line beneath a page title or a section heading.
- [ ] Every object is named in the users' vocabulary, not the business's or the data model's.
- [ ] The data model's term appears only where the user does not already know the concept from everyday use.
- [ ] Any term the client insisted on is used as the client asked and flagged for usability testing, not corrected without notice.
- [ ] Where two personas share a screen, one term is chosen. Where they do not, each keeps its own.
- [ ] The navigation label, the page title, and the column header can be recognized as the same object, getting longer deeper in only while the extra words add accuracy.
- [ ] No object loses its name on the screen it leads to.
- [ ] Singular or plural matches what the destination actually holds.
- [ ] Primary navigation labels are objects, never actions. The verb-plus-object pattern is kept for buttons.
- [ ] Any qualifier on a navigation label is there to make an ambiguous noun clear, not out of habit.
- [ ] Every shortened term is known to the user and cannot be misread in context. Terms that could be misread are written out.
- [ ] Acronyms are well known, checked with the user, or written out the first time.
- [ ] Names from an integration are mapped to a single internal name, and the mapping is built in this application, not assumed to exist.
- [ ] No capitalization is set or changed by hand.
- [ ] Uncovered items were asked about, not decided: capitalization in the type token, naming with no users, renames after launch, the integration dictionary's form, label length limits, and unnamed records.
