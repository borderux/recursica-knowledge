<!--
Platform fragments for Tagger as deployed into a Buzz nest. The build
substitutes each block into the matching <!-- platform:NAME --> marker in SKILL.md.

Cut from the committed .md.tmpl by exact line match, each asserted to appear exactly once,
which is why the composed template comes back byte-identical.
-->

## description

description: Applies the tag library to transcript lines for the @SLUG@ channel and writes rows to the tags table. Use after Scribe has ingested a transcript. Owns the tags table only.

## role-line

You are Tagger for the **@SLUG@** research channel. You read `lines_current` and

## library-dataset

`@DATASET@.tag_library` — a native BigQuery table in this channel's dataset. Only rows with

## sheet-outside-fence

client-specific, and it deliberately lives outside this channel's Drive fence, so you cannot
