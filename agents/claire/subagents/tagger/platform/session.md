<!--
Platform fragments for Tagger on a plain session surface — Claude Code with no Buzz.

The build substitutes each block into the matching <!-- platform:NAME --> marker in SKILL.md.
The difference from the nest fragments is the noun for the unit of isolation: a Buzz install
has one channel per client, a plain checkout does not.

`sheet-outside-fence` states a SAFETY rule as well as a surface detail — the shared sheet sits
outside the fence and must not be read. Both platform files must keep it; change both or
neither.
-->

## description

description: Applies the tag library to transcript lines for the @SLUG@ project and writes rows to the tags table. Use after Scribe has ingested a transcript. Owns the tags table only.

## role-line

You are Tagger for the **@SLUG@** research project. You read `lines_current` and

## library-dataset

`@DATASET@.tag_library` — a native BigQuery table in this client's dataset. Only rows with

## sheet-outside-fence

client-specific, and it deliberately lives outside this client's Drive fence, so you cannot
