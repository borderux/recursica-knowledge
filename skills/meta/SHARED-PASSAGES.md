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
- **Required when** — optional. A pattern tested against the skill's `## Variants` section; a
  component skill that matches must contain the passage.
- **Passage** — the wording. `{a|b}` means either `a` or `b`, and `{a|}` means `a` or nothing.
  Those are the only permitted differences, and each one is here because the skills differ for a
  real reason — "this field's" and "this group's".

**When a skill needs different wording**, do not add another `{…|…}` to fit it. If its situation
is different, write its own paragraph with an opening that is not listed here — as the
label, panel, and stepper skills do for label placement. If it is not, use the passage.

**When the wording should change**, change it here and in every copy in the same pull request.
The check lists every copy.

## layouts-axis

Starts with:

```text
**Label placement is a variant
```

Passage:

```text
**Label placement is a variant.** A {field|control}'s label sits beside the {field|control} or above the {field|control}. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the {field|control} is the house default. The label above the {field|control} is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.
```

## layouts-axis-group

Starts with:

```text
**Label placement is a variant
```

Passage:

```text
**Label placement is a variant, the same variant every field has.** A group's label sits beside the {stack of items|stack of options|switches} or above the {stack of items|stack of options|switches}. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`.
```

## label-placement-default

Starts with:

```text
**Set label placement explicitly on every field.**
```

Passage:

```text
**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field. Use the names the code uses for the variant and the option.
```

## one-placement-per-form

Starts with:

```text
**Label placement is one decision per form, not per field.**
```

Passage:

```text
**Label placement is one decision per form, not per field.** This {field|group} uses the same label placement as every other field in the form{, editable or not|}. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields {like this one |}that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.
```

## one-placement-checklist

Starts with:

```text
- [ ] Label placement matches every other field
```

Passage:

```text
- [ ] Label placement matches every other field in the same form. Each form has one placement at each breakpoint, with no mixing between fields or form sections
```

## focus-and-placeholder

Starts with:

```text
**Never build a focus state or a placeholder state.**
```

Passage:

```text
**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.
```

## accessibility-baseline-pointer

Starts with:

```text
The rules below add to the accessibility baseline
```

Required when:

```text
UI kit
```

Passage:

```text
The rules below add to the accessibility baseline in `recursica-skill-system-conventions`{, including the focus ring|}, which every Recursica component follows.
```
