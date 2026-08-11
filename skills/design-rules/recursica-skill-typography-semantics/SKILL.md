---
name: recursica-skill-typography-semantics
description: House rules for typography and semantic markup in enterprise web applications — always using the real element rather than styling a div into one, one H1 per page even when hidden, type styles from tokens and never custom values, loading every typeface the brand names and setting the base family from a token, when a heading is hidden but kept for screen readers, why vertical spacing between headings is contextual, em and strong over visual emphasis, abbreviations written out on first use, and AP style. Use when adding, reviewing, or refactoring headings, body copy, emphasis, abbreviations, or the markup beneath a visual hierarchy. Trigger on "typography", "type style", "heading", "H1", "semantic HTML", "visually hidden", "em", "strong", "abbreviation", "line length", "measure", "font family", "typeface", "webfont", or "AP style". Do NOT use for announcing dynamic updates — that is recursica-skill-feedback-messaging. Do NOT use for what things are called — that is recursica-skill-naming-terminology.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Typography and semantics

House rules for type and for the markup underneath it. These are opinions, not neutral best practices — apply them as constraints.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on a design system that delivers typography as tokens. Which element carries which meaning is your decision. What that element looks like is not.

## The three governing principles

1. **The semantic structure is the design, not a layer under it.** The markup mirrors what is on the screen. A visual effect is never achieved by reaching for the wrong element.
2. **Type styles come from tokens, always.** The system defines them; the codebase applies them. A custom typographic value is a defect unless no style exists for the case.
3. **Comprehension beats brevity.** Where a choice exists between being short and being understood without extra effort, choose understood — the user should not have to hover to find out what something means.

## Use the real element

**A button is a `button` element.** An `onclick` handler on a `div` is semantically incorrect, and a `role="button"` on a `div` is an approximation of something the platform already provides. This holds even when the visual result would be identical.

**Emphasis is `em` or `strong`, never a visual style standing in for one.** Add the semantic tag in the markup and let the CSS define what it looks like. Reaching for a font weight or an italic style to imply emphasis produces text that is emphasized on screen and flat everywhere else.

**A data table is a semantic table**, structured to match what is actually on the screen. See `recursica-skill-table`.

**The general rule:** if the platform has an element for the thing, that element is the answer, and the styling is a separate question.

## Headings

**MUST: exactly one H1 per page.** There is no case in the applications this system serves that needs a second one.

**The H1 is required to exist even when it is not visible.** It may be hidden by CSS where the design has no place for it, but it must be in the markup — the page's identity is not optional just because the layout does not show it.

**The heading outline follows meaning, not size.** A heading level is chosen for where the content sits in the document's structure. If a heading needs to look smaller, that is a type style, not a demotion to H4.

## Type styles are tokens

**Always use the design system's typography tokens.** An H1 carries the H1 typography styles because the tokens are applied in the codebase — that is how design system work is done here.

**Never define a custom font size, line height, or letter spacing** to fit a particular case.

**The one exception: no type style exists for what is needed.** This should be very rare. When it happens, say so rather than quietly inventing a value — the gap belongs in the design system, not in the component.

### Load every typeface the brand names, and set the base family from a token

**The brand names more than one typeface** — a primary, a secondary, a tertiary — **and the theme uses all of them.** Different components resolve to different ones.

**MUST load all of them.** Loading only the primary is not "one webfont missing": the browser silently substitutes a default for the others, so a component renders in a face the theme never asked for and nobody sees an error. The result is a screen that looks like two design systems, which is exactly how it gets reported — "the fonts are not the ones in the theme" — rather than as a missing asset.

**MUST set the document's base font family from the brand's primary token.** Anything the design system does not paint itself inherits it: a plain string in a table cell, a navigation link written to inherit its type, a bare list item. With no base family those fall through to the browser default, which on most machines is the operating system's UI font or a serif — so the navigation ends up in a different typeface from the page title beside it.

**Reading the token to set the base is not authoring a value**, and it is not an override: the elements it reaches are the application's own, not the system's. Hardcoding the font name instead is the thing to avoid.

**Check it by computing, not by looking.** Compare the resolved font family on the document body, on a navigation link, and inside a component. All three should name the same brand face, and a mismatch is the defect above.

## Vertical spacing between headings is contextual

**Do not blanket-apply one vertical gap token to every heading.** The correct spacing above and below a heading depends on its level _and_ on what precedes and follows it — an H2 immediately followed by an H3 needs different spacing than an H2 followed by body copy.

**This is the pet peeve that most reliably marks generated work.** Applying a single gap size everywhere produces a page that looks basic and undesigned even when every individual token is correct.

**It does not license custom spacing values.** The tokens are still the source; the decision is which token the adjacency calls for.

## Visually hidden text

**Hide a heading from sight only when both of these hold:**

1. Including it visibly disrupts the layout, **and**
2. It does not add value to what the user understands from the screen.

**When both hold, hide it visually and keep it available to screen readers.** The structure stays; only the pixels go.

**When the heading does add understanding, show it.** Hiding meaningful content from sighted users to keep a layout tidy is the wrong trade.

## Eyebrow text

**Eyebrow text that is semantically out of place is an anti-pattern.** A small label sitting above a heading must be whatever it actually is — if it is a category, it is not a heading; if it is part of the title, it belongs in the heading. Reaching for a heading level to get the eyebrow's size is exactly the substitution these rules exist to prevent.

## Abbreviations

**Write the full term on first use.** Follow-on instances may be abbreviated.

**Put the abbreviation in parentheses after the first full instance** so the reader learns what the short form will look like.

**Reason:** not everyone knows to hover over an abbreviation to find out what it means, so a tooltip or an `aria-label` on its own is not sufficient.

**Exception — common knowledge in an unambiguous context.** Where the term is universally understood and the context leaves no other reading, abbreviate on first use. MPG on a fuel-economy dashboard is fine; spelling it out would read strangely.

## Line length: compute it, do not guess

**Run this check whenever you place text in an `h3` through `h6`, a body style, or a caption style.** Those are the roles that carry running text and can wrap. It produces a `max-width` for the text block.

`h1` and `h2` are outside the check — they are short titles, set deliberately, and not expected to wrap. **If an `h1` or `h2` is long enough to wrap, that is a copy problem to raise, not a measure to compute.**

**This check outputs a layout constraint, not a type style.** Every input comes from the tokens; the only thing produced is a width. It is not licence to alter a font size, a line height, or a letter-spacing value.

### Step 1 — average character width

```
w_avg = (S × c_font × k_weight) + LS
```

| Term       | Meaning                                                          |
| ---------- | ---------------------------------------------------------------- |
| `S`        | Font size from the type token, in px                             |
| `c_font`   | Font width ratio — the typeface's average character aspect ratio |
| `k_weight` | Weight multiplier — bold text expands character geometry         |
| `LS`       | Letter spacing from the token, per character, in absolute units  |

**`c_font` by typeface class:**

| Class                                                    | `c_font`    |
| -------------------------------------------------------- | ----------- |
| Standard sans-serif or serif (Inter, Helvetica, Georgia) | ≈ 0.50      |
| Wide or extended                                         | ≈ 0.55–0.60 |
| Monospaced                                               | ≈ 0.60      |
| Condensed                                                | ≈ 0.40–0.45 |

**`k_weight` by weight:**

| Weight                       | `k_weight` |
| ---------------------------- | ---------- |
| Regular (400)                | 1.00       |
| Medium / semi-bold (500–600) | 1.03–1.05  |
| Bold (700+)                  | 1.08–1.12  |

**`LS` may be negative.** Display styles often carry tight tracking, which narrows the average character rather than widening it.

### Step 2 — optimal measure

The comfortable number of characters per line rises with line height: the taller the leading, the further the eye can travel and still find the start of the next line. So the measure is derived from the line-height ratio, against a reference of 1.5.

```
R      = LH / S                                  (line-height ratio, unitless)
N_opt  = clamp( N_min ,  N_base × (R / 1.5) ,  N_max )
```

| Role      | `N_base` | `N_min` | `N_max` |
| --------- | -------- | ------- | ------- |
| `h3`–`h6` | 50       | 35      | 60      |
| Body      | 66       | 45      | 75      |
| Caption   | 52       | 40      | 60      |

Headings take a shorter measure than body because they are scanned rather than read, and a subhead running the full width of a wide container is harder to parse than the paragraph beneath it. Captions take a shorter measure because small text is harder to track back to the next line.

### Step 3 — the constraint

```
W_max = N_opt × w_avg
```

**Set the text block's `max-width` to `W_max`.** Where the available container is wider than `W_max`, the text does not fill it — the leftover space stays empty. A wide container never earns a longer measure, for the same reason a wide form never earns a second column.

### Worked example

Body copy, Inter Regular, `S` = 16px, `LH` = 24px, `LS` = 0:

```
w_avg = (16 × 0.50 × 1.00) + 0   = 8px
R     = 24 / 16                  = 1.5
N_opt = clamp(45, 66 × 1.0, 75)  = 66 characters
W_max = 66 × 8                   = 528px
```

An `h3` at `S` = 24px, `LH` = 32px, semi-bold, `LS` = 0:

```
w_avg = (24 × 0.50 × 1.04) + 0     = 12.48px
R     = 32 / 24                    = 1.333
N_opt = clamp(35, 50 × 0.889, 60)  = 44 characters
W_max = 44 × 12.48                 = 555px
```

### What the ratios are and are not

**`c_font` and `k_weight` are estimates, and the check is a guard rail rather than a measurement.** Its job is to stop text running to 140 characters across a wide screen, not to hit a character count exactly. Where a real measurement of the rendered glyph widths is available, prefer it — the formula exists because that measurement usually is not.

**Do not apply the check to text that cannot wrap** — a label, a button, a badge, a single-line table cell. Those are constrained by their component.

## Copy standard

**Follow the AP style guide.** Typography checking and copy conventions follow AP standards.

**Sentence case versus title case is set by the token, and must not be modified.** Which one a heading uses is determined by the brand and encoded in the type style it carries, so it is predetermined before an agent sees it. **Do not change the case of a heading or a label to suit a layout or a preference.** If a type style does not appear to encode its case, that is a gap to raise — not a decision to make. What things are _called_ is governed by `recursica-skill-naming-terminology`.

## Reading order

**The semantic structure should match what is on the screen.** The order the markup reads in is the order the content appears in. Where visual arrangement and document order disagree, the arrangement is what changes.

## Screen reader verbosity is not a concern

**Do not contort markup to reduce how much a screen reader says.** Accessibility must be addressed — correct structure, correct elements, content that matches the screen — but verbosity is not something to optimize against, and neither is theoretical semantic confusion. A correct structure that reads long is preferable to a clever one that reads short.

## Not your decision

- **The values behind every type style** — font size, line height, letter spacing, weight. Delivered as tokens.
- **Case.** Sentence case or title case is the token's, determined by the brand.
- **What `em` and `strong` look like.** Defined in CSS against the semantic tag.
- **Component-internal typography.** Owned by the component.
- **Spacing token values.** You choose which token an adjacency calls for; you do not author new ones.

## Out of scope

- **Announcing dynamic content updates to assistive technology.** Explicitly deferred out of this topic — see `recursica-skill-feedback-messaging`, where it is recorded as still unowned.
- **Label copy, and labels standing alone without surrounding context** — `recursica-skill-forms`.
- **Table markup specifics, sort announcement, and cell content rules** — `recursica-skill-table` and `recursica-skill-tables`.
- **Per-component accessible names, focus order, and keyboard behavior.** Each component skill carries its own.
- **Number, date, and currency formatting** — `recursica-skill-dates-and-currency`.

## Uncovered — ask, do not invent

- **The `c_font` value for a specific typeface.** The classes above cover the common cases; a typeface with unusual proportions needs its own ratio measured rather than estimated.
- **Text wrapping and truncation.** Explicitly set aside in the session. Truncation inside a table cell is covered by `recursica-skill-tables`; everywhere else is open.
- **Live regions and `aria-live`.** Deferred here and not picked up elsewhere. Component skills state their own announcement requirements; there is no cross-surface policy.
- **Which heading level a page's sections start at**, given that the single H1 may be hidden.
- **Whether `abbr` markup is used** for the abbreviated follow-on instances, or whether plain text is enough once the term has been written out.
- **Whether every type style actually encodes its case treatment.** The rule is that case is token-controlled; where a style seems not to carry it, raise it.

## Pre-flight checklist

- [ ] Every typeface the brand names is actually loaded, not only the primary.
- [ ] The document's base font family is set from the brand's primary token, and the resolved family on the body,
      on a navigation link, and inside a component all name the same face.
- [ ] Every interactive element is the real platform element; no `div` carries an `onclick` or a `role="button"`.
- [ ] Emphasis uses `em` or `strong`, never a visual style substituting for one.
- [ ] Exactly one H1 exists on the page, present in the markup even if hidden by CSS.
- [ ] Heading levels follow document structure, not desired size.
- [ ] Every type treatment comes from a typography token; no custom font size, line height, or letter spacing.
- [ ] Where no type style existed, that gap was stated rather than filled with a custom value.
- [ ] Vertical spacing between headings reflects the actual adjacency; no single gap token was applied blanket-fashion.
- [ ] Any visually hidden heading passes both tests — it disrupted the layout and added no understanding — and remains available to screen readers.
- [ ] No eyebrow text uses a heading level to obtain its size.
- [ ] Every abbreviation is written out in full on first use with the short form in parentheses, unless it is common knowledge in an unambiguous context.
- [ ] Copy follows AP style, and no case or capitalization was set or changed by hand.
- [ ] Document order matches visual order.
- [ ] No markup was contorted to reduce screen reader verbosity.
- [ ] Every `h3`–`h6`, body, and caption text block has a `max-width` computed by the line-length check, and no wide container was filled to its edge.
- [ ] The check produced only a width; no font size, line height, or letter-spacing value was altered by it.
- [ ] Any `h1` or `h2` long enough to wrap was raised as a copy problem rather than measured.
- [ ] No wrapping or truncation rule was invented beyond the computed measure.
