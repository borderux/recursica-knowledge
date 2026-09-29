---
name: recursica-skill-typography-semantics
description: House rules for typography and semantic markup in enterprise web applications — always using the real element rather than styling a div into one, one H1 per page even when hidden, type styles from tokens and never custom values, loading every typeface the brand names and setting the base family from a token, when a heading is hidden but kept for screen readers, why vertical spacing between headings is contextual, em and strong over visual emphasis, abbreviations written out on first use, and AP style. Use when adding, reviewing, or refactoring headings, body copy, emphasis, abbreviations, or the markup beneath a visual hierarchy. Trigger on "typography", "type style", "heading", "H1", "semantic HTML", "visually hidden", "em", "strong", "abbreviation", "line length", "measure", "font family", "typeface", "webfont", or "AP style". Do NOT use for announcing dynamic updates — that is recursica-skill-feedback-messaging. Do NOT use for what things are called — that is recursica-skill-naming-terminology.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Typography and semantics

These are the house rules for type, and for the markup underneath it. They are opinions, not neutral best practices — treat them as constraints.

These rules assume **complex enterprise web applications, designed for desktop first**, built on a design system that delivers typography as tokens (named design values, such as colors or sizes, set by the design system). Which element carries which meaning is your decision. What that element looks like is not.

## The three governing principles

1. **The semantic structure is the design, not a layer under it.** Semantic HTML means using each element for what it means, not for how it looks. The markup mirrors what is on the screen. A visual effect is never produced by reaching for the wrong element.
2. **Type styles always come from tokens.** The system defines them, and the codebase applies them. A custom typographic value is a defect, unless no style exists for the case.
3. **Being understood beats being brief.** When you can choose between being short and being understood without extra effort, choose being understood — the user should not have to hover to find out what something means.

## Use the real element

**A button is a `button` element.** An `onclick` handler on a `div` is semantically wrong, and a `role="button"` on a `div` is only an imitation of something the platform already provides. This holds even when the visual result would be identical.

**Emphasis is `em` or `strong`, never a visual style standing in for one.** Add the semantic tag in the markup, and let the CSS decide what it looks like. Reaching for a font weight or an italic style to suggest emphasis produces text that is emphasized on screen and flat everywhere else.

**A data table is a semantic table**, structured to match what is actually on the screen. See `recursica-skill-table`.

**The general rule:** if the platform has an element for the thing, that element is the answer, and the styling is a separate question.

## Headings

**MUST: exactly one H1 per page.** No case in the applications this system serves needs a second one.

**The H1 is required to exist even when it is not visible.** It may be hidden with CSS where the design has no place for it, but it must be in the markup — the page's identity is not optional just because the layout does not show it.

**The heading outline follows meaning, not size.** A heading level is chosen for where the content sits in the structure of the document. If a heading needs to look smaller, that is a type style, not a demotion to H4.

## Type styles are tokens

**Always use the design system's typography tokens.** An H1 carries the H1 typography styles because the tokens are applied in the codebase — that is how design system work is done here.

**Never define a custom font size, line height, or letter spacing** to fit a particular case.

**The one exception: no type style exists for what is needed.** This should be very rare. When it happens, say so, instead of quietly inventing a value — the gap belongs in the design system, not in the component.

### Load every typeface the brand names, and set the base family from a token

**The brand names more than one typeface** — a primary, a secondary, a tertiary — **and the theme uses all of them.** Different components use different ones.

**MUST load all of them.** Loading only the primary is not "one web font missing". The browser quietly swaps in a default for the others, so a component shows up in a typeface the theme never asked for, and nobody sees an error. The result is a screen that looks like two design systems — which is exactly how it gets reported: "the fonts are not the ones in the theme," rather than as a missing file.

**MUST set the document's base font family from the brand's primary token.** Anything the design system does not style itself inherits it: a plain string in a table cell, a navigation link written to inherit its type, a bare list item. With no base family, those fall back to the browser default, which on most machines is the operating system's interface font or a serif. So the navigation ends up in a different typeface from the page title beside it.

**Reading the token to set the base is not writing a value**, and it is not an override: the elements it reaches belong to the application, not to the system. Hardcoding the font name instead is the thing to avoid.

**Check it by computing, not by looking.** Compare the font family that is actually used on the document body, on a navigation link, and inside a component. All three should name the same brand typeface, and any mismatch is the defect above.

## Vertical spacing between headings is contextual

**Do not apply one vertical gap token to every heading.** The right spacing above and below a heading depends on its level _and_ on what comes before and after it. An H2 immediately followed by an H3 needs different spacing from an H2 followed by body text.

**This is the pet peeve that most reliably marks generated work.** Using a single gap size everywhere produces a page that looks basic and undesigned, even when every individual token is correct.

**It does not allow custom spacing values.** The tokens are still the source; the decision is which token the pairing of elements calls for.

## Visually hidden text

**Hide a heading from sight only when both of these are true:**

1. Showing it breaks up the layout, **and**
2. It does not add anything to what the user understands from the screen.

**When both are true, hide it visually and keep it available to screen readers** (software that reads the screen aloud). The structure stays; only the pixels go.

**When the heading does add understanding, show it.** Hiding meaningful content from sighted users to keep a layout tidy is the wrong trade.

## Eyebrow text

Eyebrow text is a small label that sits above a heading.

**Eyebrow text that is semantically out of place is an anti-pattern.** A small label sitting above a heading must be whatever it actually is. If it is a category, it is not a heading; if it is part of the title, it belongs in the heading. Reaching for a heading level to get the eyebrow's size is exactly the swap these rules exist to prevent.

## Abbreviations

**Write out the full term the first time it is used.** Later uses may be abbreviated.

**Put the abbreviation in parentheses after the first full use**, so the reader learns what the short form will look like.

**The reason:** not everyone knows to hover over an abbreviation to find out what it means, so a tooltip or an `aria-label` on its own is not enough.

**Exception — common knowledge in a context that cannot be misread.** Where the term is understood by everyone and the context allows no other reading, abbreviate on first use. MPG on a fuel-economy dashboard is fine; spelling it out would read strangely.

## Line length: compute it, do not guess

**Run this check whenever you place text in an `h3` through `h6`, a body style, or a caption style.** Those are the roles that carry running text, and they can wrap. The check produces a `max-width` for the text block.

`h1` and `h2` are left out of the check — they are short titles, set on purpose, and not expected to wrap. **If an `h1` or `h2` is long enough to wrap, that is a wording problem to raise, not a measure to compute.** (In typography, the measure is the length of a line of text.)

**This check produces a layout limit, not a type style.** Every input comes from the tokens, and the only thing it produces is a width. It is not permission to change a font size, a line height, or a letter-spacing value.

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

**`LS` may be negative.** Display styles often have tight tracking (letter spacing), which makes the average character narrower rather than wider.

### Step 2 — optimal measure

The comfortable number of characters per line goes up with the line height. The taller the leading (the space between lines), the further the eye can travel and still find the start of the next line. So the measure is worked out from the line-height ratio, compared against a reference of 1.5.

```
R      = LH / S                                  (line-height ratio, unitless)
N_opt  = clamp( N_min ,  N_base × (R / 1.5) ,  N_max )
```

| Role      | `N_base` | `N_min` | `N_max` |
| --------- | -------- | ------- | ------- |
| `h3`–`h6` | 50       | 35      | 60      |
| Body      | 66       | 45      | 75      |
| Caption   | 52       | 40      | 60      |

Headings get a shorter measure than body text because they are scanned rather than read, and a subheading running the full width of a wide container is harder to take in than the paragraph beneath it. Captions get a shorter measure because it is harder to follow small text back to the start of the next line.

### Step 3 — the constraint

```
W_max = N_opt × w_avg
```

**Set the text block's `max-width` to `W_max`.** Where the container is wider than `W_max`, the text does not fill it — the leftover space stays empty. A wide container never earns a longer measure, for the same reason a wide form never earns a second column.

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

**`c_font` and `k_weight` are estimates, and the check is a safety rail rather than a precise measurement.** Its job is to stop text running to 140 characters across a wide screen, not to hit a character count exactly. Where a real measurement of the width of the drawn characters is available, prefer it — the formula exists because that measurement usually is not.

**Do not apply the check to text that cannot wrap** — a label, a button, a badge, a single-line table cell. Their component limits them.

## Copy standard

**Follow the AP style guide** (the Associated Press rules for writing style). Checking typography and copy conventions both follow AP standards.

**Sentence case versus title case is set by the token, and must not be changed.** Sentence case capitalizes only the first word; title case capitalizes every major word. Which one a heading uses is decided by the brand and built into the type style it carries, so it is settled before an agent ever sees it. **Do not change the capitalization of a heading or a label to suit a layout or a preference.** If a type style does not seem to include its capitalization, that is a gap to raise — not a decision to make. What things are _called_ is governed by `recursica-skill-naming-terminology`.

## Reading order

**The semantic structure should match what is on the screen.** The order the markup reads in is the order the content appears in. Where the visual arrangement and the document order disagree, the arrangement is what changes.

## Screen reader verbosity is not a concern

**Do not twist markup to reduce how much a screen reader says.** Accessibility must be handled — correct structure, correct elements, and content that matches the screen. But how wordy a screen reader is, is not something to optimize against, and neither is semantic confusion that exists only in theory. A correct structure that reads long is better than a clever one that reads short.

## Not your decision

- **The values behind every type style** — font size, line height, letter spacing, weight. Delivered as tokens.
- **Capitalization.** Sentence case or title case belongs to the token, and is decided by the brand.
- **What `em` and `strong` look like.** Defined in CSS against the semantic tag.
- **Typography inside a component.** Owned by the component.
- **Spacing token values.** You choose which token a pairing of elements calls for; you do not write new ones.

## Out of scope

- **Announcing content that updates on the page to assistive technology** (tools such as screen readers that help people with disabilities use a computer). This was openly moved out of this topic — see `recursica-skill-feedback-messaging`, where it is recorded as still having no owner.
- **The wording of labels, and labels that stand alone without surrounding context** — `recursica-skill-forms`.
- **The details of table markup, how sorting is announced, and rules for cell content** — `recursica-skill-table` and `recursica-skill-tables`.
- **Each component's accessible name, focus order, and keyboard behavior.** Each component skill has its own.
- **Formatting numbers, dates, and currency** — `recursica-skill-dates-and-currency`.

## Uncovered — ask, do not invent

- **The `c_font` value for a specific typeface.** The classes above cover the common cases. A typeface with unusual proportions needs its own ratio measured, not estimated.
- **Text wrapping and truncation.** Openly set aside in the session. Truncation inside a table cell is covered by `recursica-skill-tables`; everywhere else is open.
- **Live regions and `aria-live`.** Put off here, and not taken up anywhere else. Component skills state their own announcement requirements, but there is no policy across all surfaces.
- **Which heading level a page's sections start at**, given that the single H1 may be hidden.
- **Whether `abbr` markup is used** for the later, abbreviated uses, or whether plain text is enough once the term has been written out.
- **Whether every type style really includes its capitalization.** The rule is that capitalization is controlled by the token. Where a style seems not to carry it, raise it.

## Pre-flight checklist

- [ ] Every typeface the brand names is actually loaded, not only the primary.
- [ ] The document's base font family is set from the brand's primary token, and the font family actually used on the body, on a navigation link, and inside a component all name the same typeface.
- [ ] Every interactive element is the real platform element. No `div` carries an `onclick` or a `role="button"`.
- [ ] Emphasis uses `em` or `strong`, never a visual style standing in for one.
- [ ] Exactly one H1 exists on the page, and it is in the markup even if hidden with CSS.
- [ ] Heading levels follow the structure of the document, not the size you want.
- [ ] Every type style comes from a typography token. There is no custom font size, line height, or letter spacing.
- [ ] Where no type style existed, you stated that gap instead of filling it with a custom value.
- [ ] Vertical spacing between headings matches the actual pairing of elements, and you did not apply one gap token everywhere.
- [ ] Any visually hidden heading passes both tests — showing it broke the layout, and it added no understanding — and it stays available to screen readers.
- [ ] No eyebrow text uses a heading level to get its size.
- [ ] Every abbreviation is written out in full the first time, with the short form in parentheses — unless it is common knowledge in a context that cannot be misread.
- [ ] Copy follows AP style, and no capitalization was set or changed by hand.
- [ ] The document order matches the visual order.
- [ ] You did not twist any markup to reduce how much a screen reader says.
- [ ] Every `h3`–`h6`, body, and caption text block has a `max-width` worked out by the line-length check, and no wide container was filled to its edge.
- [ ] The check produced only a width. It changed no font size, line height, or letter-spacing value.
- [ ] You raised any `h1` or `h2` long enough to wrap as a wording problem, instead of measuring it.
- [ ] You invented no wrapping or truncation rule beyond the measure the check works out.
