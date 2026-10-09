---
name: recursica-skill-typography-semantics
description: House rules for type and semantic markup — real elements instead of styled divs, one H1 per page, type styles from tokens only, loading the brand typefaces, hidden headings, emphasis with em and strong, abbreviations, and AP style. Use for headings, body copy, emphasis, and the markup under a visual hierarchy. Not for naming — see recursica-skill-naming-terminology.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Typography and semantics

Follow each house rule below for type, and for the HTML markup that holds the text. The house rules are the team's opinions, not neutral best practices.

**The rules are written for complex enterprise web applications, designed for desktop first.** The design system delivers typography as tokens (named design values, such as colors or sizes, set by the design system). Whoever builds the screen picks each HTML element by what the content means. The design system's tokens set how each element looks.

## The three governing principles

1. **Treat the semantic structure as the design itself, not as a separate step.** Use semantic HTML (HTML elements chosen by role, such as a button element for a button).
   - Pick each element for what the content means, not for how the element looks.
   - Make the markup match what is on the screen.
   - Never use the wrong element to get a visual effect. For example, never pick an H4 only for the H4's small size.
2. **Always take type styles from tokens.** The design system defines the type styles, and the code applies the type styles. A custom type value, such as a custom font size, is a defect. The one exception is text that has no type style.
3. **Choose easy to understand over short.** When text cannot be both short and easy to understand, make the text easy to understand. The persona should not have to hover over an item on the screen to learn what the item means. An abbreviation is one example of such an item.

## Real HTML elements

**Use a `button` element for every button, even when another element would look the same.**

- A `div` with an `onclick` handler is the wrong element.
- A `div` with `role="button"` only imitates the `button` element that the web platform provides.

**Mark emphasis with an `em` or `strong` tag, never with a visual style in place of the tag.** Add the `em` or `strong` tag in the markup, and let styles decide how the tag looks. A font weight or an italic style used to suggest emphasis makes the text look emphasized on screen. Everywhere other than the screen, such as in a screen reader, the text is plain.

**Mark up a data table as a semantic table, with the same structure the screen shows.** See `recursica-skill-table`.

**When the web platform has an element for a purpose, use that element.** For example, use a `nav` element for navigation and a `ul` element for a list. How the element looks is a separate decision.

## Headings

**A page MUST have exactly one H1.** No page in the applications this design system serves needs a second H1.

**The H1 must be in the markup, even when the H1 is not visible.** When the design has no place for the H1, the H1 may be hidden with styles. For example, a dashboard with no visible title still has an H1 in the markup. The H1 says what the page is, even when the layout does not show the H1.

**Choose a heading level by meaning, not by size.** The heading level comes from where the content sits in the structure of the page. To make a heading look smaller, use a smaller type style. Do not lower the heading level, such as to H4. For example, give an H2 a smaller type style instead of changing the H2 to an H4.

## Type styles from tokens

**Always use the design system's typography tokens.** For example, an H1 looks like an H1 because the code applies the H1 typography tokens. On this team, design system work means applying the tokens in code.

**Never set a custom font size, line height or letter spacing** to fit one particular case.

**The one exception is a case that no type style covers.** A case with no type style should be very rare.

- When no type style covers a case, report the missing type style.
- Do not invent a value without telling anyone.
- The missing type style belongs in the design system, not in the component.

### Brand typefaces and the base font family

**The brand names more than one typeface, such as a primary, a secondary and a tertiary typeface.** The theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes) uses every typeface the brand names. Different components use different brand typefaces.

**The code MUST load every typeface the brand names, not only the primary typeface.** A screen that loads only the primary typeface has a bigger problem than one missing web font.

- The browser quietly swaps in a default typeface for each typeface the code did not load.
- A component then shows in a typeface the theme never asked for, and no error appears.
- The screen looks like two design systems.

People report the problem in these exact words: "the fonts are not the ones in the theme." People do not report a missing font file.

**The code MUST set the page's base font family from the brand's primary typeface token.** Every element the design system does not style inherits the base font family. Examples of unstyled elements:

- plain text in a table cell
- a navigation link whose type style is set to inherit
- a list item with no style

Without a base font family, the unstyled elements use the browser's default font. On most machines, the browser's default font is the operating system's interface font or a serif. The navigation then shows a different typeface from the page title beside the navigation.

**Setting the base font family from the token is not writing a custom value, and is not an override.** The elements that inherit the base font family belong to the application, not to the design system. Do not hardcode the font name in place of the token.

**Check the font family by the computed value (the font the browser applies), not by looking at the screen.** Compare the computed font family in three places:

- the page's `body` element
- a navigation link
- text inside a component

All three should name the same brand typeface. A different typeface in any of the three places is the defect the base font family rule above describes.

## Vertical spacing around headings

**Do not apply one vertical gap token to every heading.** The right spacing above and below a heading depends on two factors:

- the heading's level
- the elements before and after the heading

For example, an H2 followed directly by an H3 needs different spacing from an H2 followed by body text.

**Of the team's pet peeves, one gap token on every heading is the surest sign of generated work.** The same gap everywhere makes a page look basic and undesigned, even when every token is correct.

**Take every spacing value from a token, even when the spacing changes from place to place.** Use no custom spacing values. For each pair of elements, such as an H2 followed by body text, decide which spacing token the pair needs.

## Visually hidden text

**Hide a heading from sight only when both of the following conditions are true:**

1. Showing the heading breaks up the layout, **and**
2. The heading adds nothing to what the persona understands from the screen.

**When both conditions are true, hide the heading from sight and keep the heading available to screen readers.** The heading stays in the page structure. Only the visible text goes away.

**If the heading adds to what the persona understands, show the heading.** Do not hide meaningful content from sighted personas to keep a layout tidy.

## Eyebrow text

Eyebrow text is a small label that sits above a heading, such as "Billing" above the heading "Payment methods".

**The markup for eyebrow text must match what the eyebrow text is.** Wrong markup on eyebrow text is a known mistake.

- If the eyebrow text is a category, do not mark up the eyebrow text as a heading.
- If the eyebrow text is part of the title, put the eyebrow text in the heading.

**Do not use a heading level to get the eyebrow text's size.** For example, do not mark up eyebrow text as an H6 because the H6 style is the right size. A heading level used for size is the wrong element used for a visual effect. The typography rules exist to prevent exactly that mistake.

## Abbreviations

**Write out the full term the first time the term appears, with the abbreviation in parentheses after the full term.** For example, write "annual percentage rate (APR)" the first time. Later uses may say "APR". Every later use of a term may be abbreviated. The persona then learns what the short form looks like.

**Do not rely on a tooltip or an `aria-label` alone.** Not every persona knows to hover over an abbreviation to learn what the abbreviation means.

**One exception: abbreviate at first use when the term is common knowledge and the context cannot be misread.** The exception applies only where everyone understands the term and the context allows no other meaning. For example, "MPG" on a fuel-economy dashboard is fine at first use. Spelling out "miles per gallon" on a fuel-economy dashboard would look strange.

## Line length

**Run the line-length check on every text block set in an `h3` through `h6` style, a body style or a caption style.** The line-length check is the formula in steps 1 to 3 below. The check gives the text block a maximum width. The `h3` through `h6`, body and caption styles hold running text, and running text can wrap.

**Leave `h1` and `h2` out of the line-length check.** An `h1` or `h2` is a short title, set on purpose, and is not expected to wrap.

**If an `h1` or `h2` is long enough to wrap, report the wording as a problem.** Do not compute a measure (the length of a line of text) for that `h1` or `h2`.

**The line-length check produces a layout limit, not a type style.** Every input to the check comes from the tokens. The check produces only a width. The check gives no permission to change a font size, a line height or a letter-spacing value.

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

A taller line height allows more characters per line. With more space between lines, the eye can follow a longer line and still find the next line. The formula works out the measure from the line-height ratio, compared against a reference ratio of 1.5.

```
R      = LH / S                                  (line-height ratio, unitless)
N_opt  = clamp( N_min ,  N_base × (R / 1.5) ,  N_max )
```

| Role      | `N_base` | `N_min` | `N_max` |
| --------- | -------- | ------- | ------- |
| `h3`–`h6` | 50       | 35      | 60      |
| Body      | 66       | 45      | 75      |
| Caption   | 52       | 40      | 60      |

Headings get a shorter measure than body text because people scan headings rather than read headings. A full-width subheading in a wide container is harder to take in than the paragraph beneath the subheading. Captions get a shorter measure because small text makes the start of the next line harder to find.

### Step 3 — maximum width

```
W_max = N_opt × w_avg
```

**Set the text block's maximum width to `W_max`.** If the container is wider than `W_max`, the text does not fill the container. The leftover space stays empty. For example, help text in a wide panel stops at `W_max`, and the panel space beside the text stays empty.

- A wide container never justifies a longer measure.
- The measure comes from the type style's tokens, not from the width of the container.
- In the same way, a wide form never justifies a second column.

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

**`c_font` and `k_weight` are estimates. The line-length check gives a rough limit, not a precise measurement.** The check stops text from running to 140 characters across a wide screen. The check does not aim to hit an exact character count. If the real width of the text on screen can be measured, prefer the measured width. The formula exists because a real measurement usually is not available.

**Do not apply the check to text that cannot wrap.** Examples are a label, a button, a badge and a single-line table cell. The component that holds the text limits the text.

## Copy standard

**Follow the AP style guide** (the Associated Press rules for writing style). Checks of typography and checks of copy both follow AP standards.

**The typography token sets sentence case or title case, and the case must not be changed.** Sentence case capitalizes only the first word, as in "Order history". Title case capitalizes every major word, as in "Order History". The brand decides which case a heading uses, and the heading's type style includes that case. The case is settled before an agent ever sees the heading.

- Do not change the capitalization of a heading or a label to suit a layout or a preference.
- If a type style does not seem to include a case, report the missing case. Do not choose a case.

For naming, see `recursica-skill-naming-terminology`.

## Reading order

**The semantic structure should match what is on the screen.** The markup order is the order the content appears in on screen. For example, a filter bar shown above a table comes before the table in the markup. If the visual arrangement and the markup order disagree, change the visual arrangement.

## Screen reader verbosity is not a concern

**Keep markup correct, even when the correct markup makes a screen reader read more.** Correct markup means correct structure, correct elements, and content that matches the screen. Correct markup comes ahead of:

- a shorter readout
- a confusion about meaning that exists only in theory

A correct structure with a long readout is better than a clever structure with a short readout.

## Set by the theme or the component

- **The values behind every type style.** Tokens deliver the font size, line height, letter spacing and weight of every type style.
- **Capitalization.** The typography token sets sentence case or title case. The brand decides which case.
- **The look of `em` and `strong`.** Styles set the look on the `em` and `strong` tags.
- **Typography inside a component.** The component sets the typography inside the component.
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
- **Live regions and `aria-live`.** This skill set the topic aside, and no other skill covers the topic. Each component skill states what the component must announce to assistive technology. No policy covers every region that holds content, such as a page, panel, or modal.
- **Which heading level a page's sections start at**, given that the single H1 may be hidden.
- **Whether `abbr` markup is used** for the later, abbreviated uses. Plain text may be enough once the term has been written out.
- **Whether every type style includes a capitalization setting.** The typography token controls capitalization. If a type style seems not to include capitalization, report the missing capitalization.

## Pre-flight checklist

- [ ] Every typeface the brand names is loaded, not only the primary typeface.
- [ ] The page's base font family is set from the brand's primary typeface token.
- [ ] The computed font family is the same typeface on the body, on a navigation link, and inside a component.
- [ ] Every interactive element is the web platform element made for that purpose. No `div` carries an `onclick` or a `role="button"`.
- [ ] Emphasis uses `em` or `strong`, never a visual style in place of one of those tags.
- [ ] Exactly one H1 exists on the page.
- [ ] The H1 is in the markup, even if the H1 is hidden with styles.
- [ ] Heading levels follow the structure of the page, not the visual size.
- [ ] Every type style comes from a typography token. No text has a custom font size, line height, or letter spacing.
- [ ] Where no type style existed, the missing style is reported, and no custom value fills the gap.
- [ ] Vertical spacing around each heading matches the elements before and after the heading.
- [ ] No single gap token is applied to every heading.
- [ ] Every visually hidden heading passes both tests: showing the heading broke the layout, and the heading added no understanding. Every visually hidden heading stays available to screen readers.
- [ ] No eyebrow text uses a heading level to get the heading level's size.
- [ ] Every abbreviation is written out in full the first time, with the short form in parentheses. A term that is common knowledge, in a context that cannot be misread, is exempt.
- [ ] Copy follows AP style, and no capitalization was set or changed by hand.
- [ ] The document order matches the visual order.
- [ ] The markup is correct, even where a screen reader reads more because of the correct markup.
- [ ] Every `h3`–`h6`, body, and caption text block has a maximum width worked out by the line-length check.
- [ ] No text block fills a wide container to the container's edge.
- [ ] The line-length check produced only a width, and changed no font size, line height, or letter-spacing value.
- [ ] Any `h1` or `h2` long enough to wrap is reported as a wording problem, with no measure computed for the `h1` or `h2`.
- [ ] Open questions were asked about, not decided: text wrapping and truncation.
