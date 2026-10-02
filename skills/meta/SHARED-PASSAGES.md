# Shared passages

Paragraphs that several skills repeat word for word, and the one place their wording is set.

**This file is not a skill, and agents are not sent here.** A skill is served on its own, so a rule
it depends on has to be written in it — a link to a passage here would be a rule the agent never
reads. The cost is the same paragraph in a dozen files, and before this file existed the
label-placement rule had drifted into seven wordings across sixteen skills. A drifted definition
confuses a reader; a drifted rule changes what gets built.

`npm run skills:passages:check` holds the copies to the wording here, and `npm test` runs it too.

## How the check reads this file

Each passage below has three parts:

- **Starts with** — the opening that identifies it. Any paragraph in any skill that begins with an
  opening listed here must then match one of the passages sharing that opening, from its first
  word. A skill may add its own sentences **after** the passage in the same paragraph, never inside
  it.
- **Required when** — optional. A pattern tested against the skill's `## What exists` section; a
  component skill that matches must contain the passage.
- **Passage** — the wording. `{a|b}` means either `a` or `b`, and `{a|}` means `a` or nothing.
  Those are the only permitted differences, and each one is here because the skills differ for a
  real reason — "this field's" and "this group's", or a component that has no `formLayout` prop.

**When a skill needs different wording**, do not add another `{…|…}` to fit it. If its situation
is different, write its own paragraph with an opening that is not listed here — as the
label, panel, and stepper skills do for label placement. If it is not, use the passage.

**When the wording should change**, change it here and in every copy in the same pull request.
The check lists every copy.

## react-prop-column

Starts with:

```text
**The third column is the React prop
```

Required when:

```text
React prop
```

Passage:

```text
**The third column is the React prop that sets each axis.** An axis (a property a component varies on, such as size or style; Figma calls it a variant property) is named in the UI kit. Its name is not a prop, and React ignores it without an error if it is passed as one. A blank cell means no single prop sets that axis — it is set by CSS state or by separate props, and the rules below say which.
```

## layouts-axis

Starts with:

```text
**`layouts` is the label-placement axis
```

Passage:

```text
**`layouts` is the label-placement axis{ (a property a component varies on, such as size or style; Figma calls it a variant property)|}{, set by the `formLayout` prop|}.** `side-by-side` — the label beside the {field|control} — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.
```

## layouts-axis-group

Starts with:

```text
**`layouts` is the label-placement axis
```

Passage:

```text
**`layouts` is the label-placement axis, the same axis every field has.** `side-by-side` puts the group's label beside the {stack of items|stack of options|switches}; `stacked` puts it above.
```

## formlayout-default

Starts with:

```text
**`formLayout` defaults to
```

Required when:

```text
`formLayout`
```

Passage:

```text
**`formLayout` defaults to `stacked`, which puts the label above the input.** A field without the prop shows its label above the input at any container width, which breaks the house rule. `layouts` is the UI kit's name for this variant, not a prop: React ignores `layouts="side-by-side"` without an error and leaves the label above the input. Set `formLayout="side-by-side"`{ on every field|} to put the label beside the input.
```

## one-placement-per-form

Starts with:

```text
**Label placement is one decision per form, not per field.**
```

Passage:

```text
**Label placement is one decision per form, not per field.** This {field's|group's} `layouts` value is not a separate choice — it matches every other field in the same form{, whether they can be edited or not|}. The container-width test is applied once, to the whole form, and its answer governs every field in it, including short ones {like this one |}that would have fitted side by side. A whole form may switch placement between breakpoints, but it never mixes the two at one breakpoint, and a section never gets its own placement. Owned by `recursica-skill-forms`.
```

## one-placement-checklist

Starts with:

```text
- [ ] `layouts` matches every other field
```

Passage:

```text
- [ ] `layouts` matches every other field in the same form — one placement per form at any given breakpoint, with no mixing between fields or sections
```

## focus-and-placeholder

Starts with:

```text
**Focus and placeholder are not variants.**
```

Passage:

```text
**Focus and placeholder are not variants.** The component handles them: `placeholder-opacity` here, and the focused border through `globals.form.field.colors.border-selected`. Do not build them as states.
```

## accessibility-baseline-pointer

Starts with:

```text
This component also follows the accessibility baseline
```

Required when:

```text
Taken from
```

Passage:

```text
This component also follows the accessibility baseline in `recursica-skill-system-conventions`{, including the focus ring|}. Only what is specific to it is listed here.
```
