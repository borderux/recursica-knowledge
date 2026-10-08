---
name: recursica-skill-typography-semantics
description: House rules for type and semantic markup — real elements instead of styled divs, one H1 per page, type styles from tokens only, loading the brand typefaces, hidden headings, emphasis with em and strong, abbreviations, and AP style. Use for headings, body copy, emphasis, and the markup under a visual hierarchy. Not for naming — see recursica-skill-naming-terminology.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Typography and semantics

The house rules below cover type and the HTML markup that holds the text. The house rules are opinions, not neutral best practices. Treat the house rules as constraints.

**The rules assume complex enterprise web applications, designed for desktop first.** The applications use a design system that delivers typography as tokens (named design values, such as colors or sizes, set by the design system). The person or agent who builds the screen chooses the HTML element for each part of the screen, by the part's meaning. The design system's tokens set how each element looks.

## The three governing principles

1. **The semantic structure is the design itself, not a separate step.** Use semantic HTML (HTML elements chosen by role, such as a button element for a button). Choose each element for the element's meaning, not for the element's look. The markup matches what is on the screen. Never get a visual effect by using the wrong element.
2. **Type styles always come from tokens.** The design system defines the type styles, and the code applies the type styles. A custom typographic value is a defect, unless no type style exists for the text being styled.
3. **Being understood comes before being brief.** When text cannot be both short and easy to understand, make the text easy to understand. The persona should not have to hover over an item on the screen to find out what the item means.

## Real HTML elements

**A button is a `button` element.** An `onclick` handler on a `div` is semantically wrong. A `role="button"` on a `div` only imitates the `button` element that the web platform provides. Use the `button` element even when another element would look the same.

**Emphasis is `em` or `strong`, never a visual style in place of one of those tags.** Add the `em` or `strong` tag in the markup, and let styles decide how the tag looks. A font weight or an italic style used to suggest emphasis makes the text look emphasized on screen. Everywhere other than the screen, the text is plain.

**A data table is a semantic table, structured to match what is on the screen.** See `recursica-skill-table`.

**When the web platform has an element for a purpose, use that element.** Styling the element is a separate decision.

## Headings

**A page MUST have exactly one H1.** No case in the applications this design system serves needs a second H1.

**The H1 must be in the markup, even when the H1 is not visible.** Where the design has no place for the H1, the H1 may be hidden with styles. The H1 says what the page is, even when the layout does not show the H1.

**Choose a heading level by meaning, not by size.** Choose the level by where the content sits in the structure of the document. To make a heading look smaller, use a smaller type style. Do not lower the heading level, such as to H4.

## Type styles from tokens

**Always use the design system's typography tokens.** An H1 gets the H1 type style because the code applies the H1 typography tokens. On this team, design system work means applying the tokens in code.

**Never define a custom font size, line height, or letter spacing** to fit a particular case.

**The one exception is a case that no type style covers.** A case with no type style should be very rare. When no type style covers a case, report the missing type style instead of inventing a value without telling anyone. The missing type style belongs in the design system, not in the component.

### Brand typefaces and the base font family

**The brand names more than one typeface, such as a primary, a secondary and a tertiary typeface.** The theme uses every typeface the brand names. Different components use different brand typefaces.

**MUST load every typeface the brand names.** A screen that loads only the primary typeface has a bigger problem than "one web font missing". The browser quietly swaps in a default typeface for each typeface that is not loaded. A component then shows up in a typeface the theme never asked for, and nobody sees an error. The screen looks like two design systems. People report the problem in these exact words, "the fonts are not the ones in the theme," and not as a missing font file.

**MUST set the document's base font family from the brand's primary typeface token.** Every element the design system does not style inherits the base font family. Examples are plain text in a table cell, a navigation link whose type style is set to inherit, and a list item with no style. With no base font family, the unstyled elements fall back to the browser's default font. On most machines, the browser's default font is the operating system's interface font or a serif. The navigation then shows a different typeface from the page title beside the navigation.

**Reading the token to set the base font family is not writing a value, and is not an override.** The elements that inherit the base font family belong to the application, not to the design system. Do not hardcode the font name in place of the token.

**Check the font family with the computed value, not by looking at the screen.** Compare the computed font family on the document body, on a navigation link, and inside a component. All three should name the same brand typeface. A different typeface in any of the three places is the defect the base font family rule above describes.

## Vertical spacing around headings

**Do not apply one vertical gap token to every heading.** The right spacing above and below a heading depends on the heading's level _and_ on the elements before and after the heading. An H2 followed directly by an H3 needs different spacing from an H2 followed by body text.

**Of the team's pet peeves, one gap token on every heading is the most reliable sign of generated work.** A single gap size everywhere makes a page look basic and undesigned, even when every token on the page is correct.

**Spacing that changes with context still allows no custom spacing values.** The tokens are still the source of every spacing value. The decision is which spacing token each pair of elements calls for.

## Visually hidden text

**Hide a heading from sight only when both of the following conditions are true:**

1. Showing the heading breaks up the layout, **and**
2. The heading adds nothing to what the persona understands from the screen.

**When both conditions are true, hide the heading visually and keep the heading available to screen readers.** The heading stays in the page structure. Only the visible text goes away.

**When the heading adds to what the persona understands, show the heading.** Hiding meaningful content from sighted personas to keep a layout tidy is the wrong choice.

## Eyebrow text

Eyebrow text is a small label that sits above a heading.

**The markup for eyebrow text must match what the eyebrow text is.** Eyebrow text with markup that does not match the eyebrow text's meaning is a known mistake. When the eyebrow text is a category, the eyebrow text is not a heading. When the eyebrow text is part of the title, the eyebrow text belongs in the heading. Using a heading level to get the eyebrow text's size is exactly the mistake the typography rules exist to prevent. That mistake is using the wrong element to get a visual effect.

## Abbreviations

**Write out the full term at the term's first use.** Later uses may be abbreviated.

**Put the abbreviation in parentheses after the first full use.** The reader then learns what the short form will look like.

**A tooltip or an `aria-label` alone is not enough.** Not every persona knows to hover over an abbreviation to find out what the abbreviation means.

**Exception: abbreviate at first use when the term is common knowledge and the context cannot be misread.** The exception applies only where everyone understands the term and the context allows no other meaning. MPG on a fuel-economy dashboard is fine. Spelling out MPG on a fuel-economy dashboard would look strange.

## Line length

**Run the line-length check on every text block set in an `h3` through `h6` style, a body style, or a caption style.** The `h3` through `h6`, body and caption styles hold running text, and running text can wrap. The check produces a maximum width for the text block.

The check leaves out `h1` and `h2`. An `h1` or `h2` is a short title, set on purpose, and is not expected to wrap. **When an `h1` or `h2` is long enough to wrap, report the wording as a problem, and do not compute a measure** (the length of a line of text).

**The line-length check produces a layout limit, not a type style.** Every input to the check comes from the tokens. The check produces only a width. The check gives no permission to change a font size, a line height, or a letter-spacing value.

### Step 1 — average character width

```
w_avg = (S × c_font × k_weight) + LS
```

| Term       | Meaning                                                          |
| ---------- | ---------------------------------------------------------------- |
| `S`        | Font size from the type token, in px                             |
| `c_font`   | Font width ratio — the typeface's average character aspect ratio |
| `k_weight` | Weight multiplier — bold text has wider characters               |
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

**`LS` may be negative.** Display styles often have tight tracking (letter spacing). Tight tracking makes the average character narrower, not wider.

### Step 2 — optimal measure

The comfortable number of characters per line goes up with the line height. With taller leading (the space between lines), the eye can travel further along a line and still find the start of the next line. The formula works out the measure from the line-height ratio, compared against a reference ratio of 1.5.

```
R      = LH / S                                  (line-height ratio, unitless)
N_opt  = clamp( N_min ,  N_base × (R / 1.5) ,  N_max )
```

| Role      | `N_base` | `N_min` | `N_max` |
| --------- | -------- | ------- | ------- |
| `h3`–`h6` | 50       | 35      | 60      |
| Body      | 66       | 45      | 75      |
| Caption   | 52       | 40      | 60      |

Headings get a shorter measure than body text because people scan headings rather than read headings. A subheading running the full width of a wide container is harder to take in than the paragraph beneath the subheading. Captions get a shorter measure because, in small text, the eye has a harder time finding the start of the next line.

### Step 3 — maximum width

```
W_max = N_opt × w_avg
```

**Set the text block's maximum width to `W_max`.** When the container is wider than `W_max`, the text does not fill the container. The leftover space stays empty. A wide container never justifies a longer measure. The measure comes from the type style's tokens, not from the width of the container. In the same way, a wide form never justifies a second column.

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

### Limits of the ratios

**`c_font` and `k_weight` are estimates. The line-length check gives a rough limit, not a precise measurement.** The check stops text from running to 140 characters across a wide screen. The check does not aim to hit an exact character count. When the real width of the text on screen can be measured, prefer the measured width. The formula exists because a real measurement usually is not available.

**Do not apply the check to text that cannot wrap**, such as a label, a button, a badge, or a single-line table cell. The component that holds the text limits the text.

## Copy standard

**Follow the AP style guide** (the Associated Press rules for writing style). Checks of typography and of copy conventions both follow AP standards.

**The typography token sets sentence case or title case, and the case must not be changed.** Sentence case capitalizes only the first word. Title case capitalizes every major word. The brand decides which case a heading uses, and the heading's type style includes that case. The case is settled before an agent ever sees the heading. Do not change the capitalization of a heading or a label to suit a layout or a preference. When a type style does not seem to include a case, report the missing case, and do not choose a case. `recursica-skill-naming-terminology` governs naming.

## Reading order

**The semantic structure should match what is on the screen.** The markup order is the order the content appears in on screen. When the visual arrangement and the document order disagree, change the visual arrangement.

## Screen reader verbosity is not a concern

**Keep markup correct, even when the correct markup makes a screen reader read more.** Use correct structure, correct elements, and content that matches the screen. Correct markup comes ahead of a shorter readout. Correct markup also comes ahead of a confusion about meaning that exists only in theory. A correct structure with a long readout is better than a clever structure with a short readout.

## Set by the theme or the component

- **The values behind every type style.** Tokens deliver the font size, line height, letter spacing and weight of every type style.
- **Capitalization.** The typography token sets sentence case or title case. The brand decides which case.
- **The look of `em` and `strong`.** Styles set the look on the `em` and `strong` tags.
- **Typography inside a component.** The component owns the typography inside the component.
- **Spacing token values.** Choose the existing spacing token that each pair of elements calls for. Do not write new spacing token values.

## Out of scope

- **Announcing content that updates on the page to assistive technology.** The team explicitly moved the topic out of typography and semantics. `recursica-skill-feedback-messaging` records that no skill owns the topic yet.
- **The wording of labels, and labels that stand alone without surrounding context** — `recursica-skill-forms`.
- **The details of table markup, how sorting is announced, and rules for cell content** — `recursica-skill-table` and `recursica-skill-tables`.
- **Each component's accessible name (the name a screen reader reads out for a control), focus order, and keyboard behavior.** Each component skill sets the component's accessible name, focus order, and keyboard behavior.
- **Formatting numbers, dates, and currency** — `recursica-skill-dates-and-currency`.

## Open questions

- **The `c_font` value for a specific typeface.** The typeface classes above cover the common cases. A typeface with unusual proportions needs a ratio measured for that typeface, not an estimated ratio.
- **Text wrapping and truncation.** The team explicitly set the topic aside when the team recorded the typography rules. `recursica-skill-tables` covers truncation inside a table cell. Every other part of text wrapping and truncation is open.
- **Live regions and `aria-live`.** This skill set the topic aside, and no other skill covers the topic. Each component skill states what the component must announce to assistive technology, but no policy covers every region that holds content, such as a page, panel, or modal.
- **Which heading level a page's sections start at**, given that the single H1 may be hidden.
- **Whether `abbr` markup is used** for the later, abbreviated uses, or whether plain text is enough once the term has been written out.
- **Whether every type style includes a capitalization setting.** The rule is that the typography token controls capitalization. When a type style seems not to include capitalization, report the missing capitalization.

## Pre-flight checklist

- [ ] Every typeface the brand names is loaded, not only the primary typeface.
- [ ] The document's base font family is set from the brand's primary typeface token, and the computed font family on the body, on a navigation link, and inside a component all name the same typeface.
- [ ] Every interactive element is the web platform element made for that purpose. No `div` carries an `onclick` or a `role="button"`.
- [ ] Emphasis uses `em` or `strong`, never a visual style in place of one of those tags.
- [ ] Exactly one H1 exists on the page, and the H1 is in the markup even if the H1 is hidden with styles.
- [ ] Heading levels follow the structure of the document, not the visual size.
- [ ] Every type style comes from a typography token. There is no custom font size, line height, or letter spacing.
- [ ] Where no type style existed, the missing style is reported, and no custom value fills the gap.
- [ ] Vertical spacing around each heading matches the elements before and after the heading, and no single gap token is applied to every heading.
- [ ] Every visually hidden heading passes both tests: showing the heading broke the layout, and the heading added no understanding. Every visually hidden heading stays available to screen readers.
- [ ] No eyebrow text uses a heading level to get the heading level's size.
- [ ] Every abbreviation is written out in full the first time, with the short form in parentheses, unless the term is common knowledge in a context that cannot be misread.
- [ ] Copy follows AP style, and no capitalization was set or changed by hand.
- [ ] The document order matches the visual order.
- [ ] The markup is correct, even where a screen reader reads more because of the correct markup.
- [ ] Every `h3`–`h6`, body, and caption text block has a maximum width worked out by the line-length check, and no text block fills a wide container to the container's edge.
- [ ] The line-length check produced only a width, and changed no font size, line height, or letter-spacing value.
- [ ] Any `h1` or `h2` long enough to wrap is reported as a wording problem, with no measure computed for the `h1` or `h2`.
- [ ] Open questions were asked about, not decided: text wrapping and truncation.
