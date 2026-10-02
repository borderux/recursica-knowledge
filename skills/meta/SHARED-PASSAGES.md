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
- **Required when** — optional. A pattern tested against the skill's inventory section, the one right before `## Rules for …`; a
  component skill that matches must contain the passage.
- **Passage** — the wording. `{a|b}` means either `a` or `b`, and `{a|}` means `a` or nothing.
  Those are the only permitted differences, and each one is here because the skills differ for a
  real reason — "this field's" and "this group's".

**When a skill needs different wording**, do not add another `{…|…}` to fit it. If its situation
is different, write its own paragraph with an opening that is not listed here — as the
label, panel, and stepper skills do for label placement. If it is not, use the passage.

**When the wording should change**, change it here and in every copy in the same pull request.
The check lists every copy.

## adapter-names

Starts with:

```text
**Look up each variant's name in code before using the variant.**
```

Passage:

```text
**Look up each variant's name in code before using the variant.** The names in this skill are the names in Figma and the UI kit. The code can use a different name for the same variant. A wrong name in code has no effect and shows no error. The Recursica MCP server's `recursica_get_component_doc` tool gives the name to use in code.
```

## layouts-axis

Starts with:

```text
**`layouts` is the label-placement variant
```

Passage:

```text
**`layouts` is the label-placement variant{|}.** `side-by-side` — the label beside the {field|control} — is the house default. `stacked` is the fallback when the container is too narrow to fit both. What decides this is the container's width, not the viewport's. See `recursica-skill-forms`.
```

## layouts-axis-group

Starts with:

```text
**`layouts` is the label-placement variant
```

Passage:

```text
**`layouts` is the label-placement variant, the same variant every field has.** `side-by-side` puts the group's label beside the {stack of items|stack of options|switches}; `stacked` puts it above.
```

## label-placement-default

Starts with:

```text
**Set label placement explicitly on every field.**
```

Passage:

```text
**Set label placement explicitly on every field.** An adapter's default may be `stacked`, which puts the label above the input at any container width and breaks the house rule. Set `layouts` to `side-by-side` to put the label beside the input, under the names the code uses for both.
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
UI kit
```

Passage:

```text
This component also follows the accessibility baseline in `recursica-skill-system-conventions`{, including the focus ring|}. Only the rules specific to this component are listed here.
```
