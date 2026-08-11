---
name: recursica-skill-naming-terminology
description: House rules for what things are called in enterprise web applications — whose vocabulary wins when the users, the business, and the data model disagree, why a navigation label, page title, and table header need not match exactly and how far a label may expand as the user goes deeper, when a name is singular and when plural, why primary navigation uses object labels rather than actions, how far a term may be shortened before it stops being the same term, acronyms, reconciling terms between personas, and mapping an integration's names onto yours. Use when naming an object, a navigation item, a page title, a column header, or a button, or when the same thing is called different things in different places. Trigger on "what should we call", "label", "naming", "terminology", "singular or plural", "acronym", "abbreviate", "rename", or a term that differs between screens. Do NOT use for case, capitalization, or any type treatment — that is token-owned, see recursica-skill-typography-semantics.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Naming and terminology

House rules for what things are called, and how consistently. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built for users who return daily and already know their own domain. The words are your decision. How they are cased and set is not.

## The three governing principles

1. **The user's words win.** Over the business's term, over the data model's field name, over what reads more precisely to a designer. The people using the product are the ones who have to recognise the thing.
2. **Concise and accurate beats identical everywhere.** A label may grow as the user goes deeper, but only while the extra words buy accuracy. Consistency is not the highest value here — recognisability is.
3. **The object must stay traceable.** A user should be able to follow the same thing from a navigation item to a page to a column header without it vanishing or being renamed into something else.

## Whose vocabulary

**Use the vocabulary of the users.** Where the business and the users call something different things, **the users win.** Aim for alignment first, but the tie goes to the people operating the product.

**Use the data model's vocabulary only when the term is not conversationally known to the user.** If a user arrives without a native understanding of the concept, teaching them the system's term can be the right move. Everywhere else, the model's field names stay out of the interface.

**When a client insists on a term you believe is wrong, use their term — then test it.** Put in the word they insist on and validate it with usability testing. There is not much else to be done, and the test is what turns the disagreement into evidence rather than opinion.

**When two personas use different words for the same thing, first ask whether they share a screen.**

- **Different screens** — each audience can keep its own word.
- **The same screen** — one term has to be chosen, and the other group gets educated toward the more common name. A conflict this sharp is unlikely; treat it as a real finding when it happens rather than a routine trade-off.

## Consistency across navigation, titles, and headers

**A navigation label, a page title, and a table header for the same object do not have to match exactly.** Requiring identical strings is not the rule.

**A label may expand as the user goes deeper.** By the time someone is on a nested page they have already clicked through the shorter labels, which means they understood the high level well enough to dig in — so the deeper surface can afford the extra words that make the full concept unambiguous.

**Where the expansion stops: when additional words stop buying accuracy or conciseness.** Concision matters more than anything, and accuracy alongside it. Once another word adds neither, it does not belong.

**NEVER let an object lose its name as the user navigates.** The failure to watch for is a thing called one term in the navigation and then, on the destination screen, not referred to at all. That is the naming defect that shows up first on review, and it almost always means there is no agreement about what the thing is called.

## Singular or plural

**Follow the plurality of what the user arrives at.** The name describes the destination, not the link.

- **Plural** when the destination holds many — a navigation item reading **People**, because arriving there produces a list of persons.
- **Singular** when the destination is one thing — **Profile**, because there is one profile being edited.

## Every label is a noun

**A label names a thing. It is never a verb.** This holds for a field label, a filter label, a column header, a navigation item, and a summary figure alike — everywhere except a button, which names an action.

**`Name`, not `Search`.** The user is not filling in a thing called _search_; they are entering a name. A verb in a label describes what the user is doing, which they already know, instead of naming the thing they are doing it to.

**A label needs its noun.** `Overdue` is an adjective and names nothing; `Overdue requests` names a thing. A bare adjective as a label is a label that stopped halfway.

**Cut words that add nothing.** `Total pending requests` says exactly what `Pending requests` says, so _total_ is noise on a screen someone reads every day. Concision is the priority; a word earns its place by adding accuracy.

**A label is a noun phrase, not a sentence about the noun.** Two or three words, one qualifier at most. The shape to reach for is **adjective + noun**:

| Instead of | Write | What was cut |
| --- | --- | --- |
| `Lines you have corrected` | `Corrected lines` | a relative clause standing in for an adjective |
| `Corrections needing review` | `Corrections to review` | a participle where an infinitive is shorter |
| `Your corrections` | `Corrections` | a possessive that repeats the screen's context |

**NEVER address the reader in a label.** `Your`, `you`, `my` and `I` are the most common padding of all: a screen already belongs to whoever is looking at it, and the possessive claims a distinction that only exists if the same screen also shows somebody else's. Where it genuinely does, the distinction is the qualifier and it names the other party — `Corrections` beside `Team corrections`, not `Your corrections` beside `All corrections`.

**A label that will not compress is usually two labels, or a column that should be one.** `Lines` next to `Untagged lines` reads as two facts and forces the reader to subtract; `Tagged lines` showing `11 / 34` is one column, one heading, and the arithmetic already done. Reach for that before reaching for a longer heading.

**This applies hardest to table headers**, which are read more often than any other label on the screen and have the least room. Owned jointly with `recursica-skill-tables`.

**NEVER define a term next to itself.** A label followed by a gloss explaining what it means — `Overdue — past the start date` — is an admission that the label failed. **Fix the label.** If the concept genuinely needs explaining beyond a good name, that is a tooltip or help content, never a subtitle sitting under the thing it defines.

**This covers every named thing on the screen, not only a field label** — a page title, a section heading, a column header, a navigation item. The most common breach is not a label at all: it is a page or section whose heading is restated as prose directly beneath it, in the slot a scaffold prop offers for exactly that purpose. `recursica-skill-screen-scaffolding` owns what may go in that slot; the rule against defining a term next to itself is why it is usually empty.

## Navigation labels name objects, not actions

**Primary navigation uses object labels.** **Forms**, not **View forms** — going to a list is not an action the user is taking, it is a movement to a place.

**Actions are for acting on an object**, and they take the verb-plus-object shape — **Save form**. That is a button, not a navigation item. Owned by `recursica-skill-buttons-links`.

**Where a noun is genuinely ambiguous, disambiguate it — and reach for an adjective before a verb.** In an application for authors, a navigation item reading **Pages** could mean the pages of the book or the pages of the site; the fix is a qualifier that says which. A verb can occasionally do that work, but an adjective usually does it better.

**There is no rule for when a qualifier is needed.** It is judgment, and its only purpose is to disambiguate the noun. Do not add qualifiers systematically.

## Shortening and acronyms

**A term may be shortened when the short form is already known to the user and carries no ambiguity.** Administrator to **Admin** is fine. Administrator to **Add** is not — it stops being recognisable as the same term.

**If the shortened form is ambiguous in this context, do not shorten it.** Whether a short form is known is context-specific, and the test is the user's recognition rather than the number of characters saved.

**An acronym is fine when it is well known.** When you are not sure whether it is, **ask** — see `recursica-skill-design-router`. Where an acronym is not well known, `recursica-skill-typography-semantics` governs: write the term out on first use with the acronym in parentheses.

## Names from external integrations

**A third-party integration's names must be mapped to yours, so the user sees one name for one thing.** Maintain a dictionary that translates the external name to the internal one rather than surfacing both vocabularies and letting the user reconcile them.

**That mapping does not exist in the Recursica system.** It has to be built into each application case by case — so plan for it rather than assuming a shared facility.

## Not your decision

- **Sentence case versus title case.** This is set by the typography token, determined by the brand, and **must not be modified.** Whether a heading is title case or sentence case is predetermined by the type style it uses — see `recursica-skill-typography-semantics`.
- **Any other type treatment** — size, weight, letter spacing. Tokens own all of it.
- **The AP style guide** applies to copy generally and is recorded in `recursica-skill-typography-semantics`.

## Out of scope

- **Case, capitalization, and type treatment** — token-owned, `recursica-skill-typography-semantics`.
- **Button label copy and the verb-plus-object shape** — `recursica-skill-buttons-links`.
- **Where navigation items sit, how many there are, and how they nest** — `recursica-skill-navigation`.
- **Field label copy inside a form, and labels standing alone without context** — `recursica-skill-forms`.
- **Error message wording** — `recursica-skill-assistive-element` and `recursica-skill-feedback-messaging`.
- **Data model design and field naming in the backend.** Not a UI concern.

## Uncovered — ask, do not invent

- **Whether the type token actually carries the case treatment.** The rule is that case is token-controlled and not to be modified; if a given type style does not encode it, that is a gap to raise rather than a licence to choose.
- **Who owns the terminology decision when there is no user to ask** — a greenfield product with no users yet, where the business term is the only term available.
- **How a rename propagates.** When a term changes after launch, nothing states whether the old term is kept as an alias, redirected, or simply replaced.
- **Whether the integration mapping dictionary has a house shape** — where it lives, and whether it is a shared module or per-feature.
- **Length limits for a label in a specific position.** Concision is the stated priority but no count is given, and truncation behaviour outside a table cell is unowned.
- **Empty and unnamed objects** — what a record with no name is called in a list.

## Pre-flight checklist

- [ ] Every label is a noun with its noun present — no verbs outside buttons, no bare adjectives.
- [ ] No filler words; every word in a label adds accuracy.
- [ ] Every label and table header is a noun phrase of two or three words with at most one qualifier — no relative clause, no sentence, and no `Your`/`you`/`my` unless the same screen shows another party's and names them.
- [ ] Two columns the reader would have to subtract were combined into one with the arithmetic done, rather than given longer headings.
- [ ] No label, heading or page title is glossed by a definition beside it — including the line beneath a page title or section heading.
- [ ] Every object is named in the users' vocabulary, not the business's or the data model's.
- [ ] The data model's term appears only where the concept is not conversationally known to the user.
- [ ] A client-imposed term was used as insisted and flagged for usability testing rather than quietly corrected.
- [ ] Where two personas share a screen, one term was chosen; where they do not, each keeps its own.
- [ ] Navigation label, page title, and column header are recognisably the same object, expanding deeper only while the extra words add accuracy.
- [ ] No object loses its name on the destination screen.
- [ ] Singular or plural follows what the destination actually holds.
- [ ] Primary navigation labels are objects, never actions; verb-plus-object is reserved for buttons.
- [ ] Any qualifier on a navigation label exists to disambiguate a genuinely ambiguous noun, not as a pattern.
- [ ] Every shortened term is both known to the user and unambiguous in context; ambiguous terms are written out.
- [ ] Acronyms are well known, or were checked with the user, or are expanded on first use.
- [ ] Names from an integration are mapped to a single internal name; the mapping was built rather than assumed to exist.
- [ ] No case or capitalization was set or changed by hand.
- [ ] Nothing in the uncovered list was invented.
