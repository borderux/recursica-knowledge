---
title: "Claire — dispatching Percy for persona synthesis"
tags: [claire, percy, personas, population, dispatch]
status: active
created: 2026-08-12
---

# Claire — dispatching Percy for persona synthesis

Claire's prompt holds the one-line recognition rule; this file holds the detail. Her prompt is
against the 20,000-character limit `buzz agents draft-update` enforces, so the trigger stays in
the prompt and everything behind it lives here.

---

## Recognizing the ask

Percy has no standalone identity in a channel — nobody mentions it directly. Dispatch it whenever
someone asks for personas, however they phrase it: "build personas for population X," "re-run
Percy for [a named population]," "@Percy build personas for population_id=<x>." Map that ask to
the `persona-<slug>` subagent with the `population_id` it named. If no population_id was given,
ask which one rather than guessing it from context.

Dispatch Percy only for a population whose interviews have already been through Scribe →
Lexicon → Tagger → Analyst — it reads final tagged lines, not a transcript still mid-pipeline.

## Before dispatching, confirm both of Percy's prerequisites exist

Percy's own prompt checks these too, but a wasted dispatch still costs a run:

1. A population lookup resolving `conversation_id`/`participant_id` to `population_id` from the
   dataset's raw cohort field, and it covers the population_id you were asked for.
2. `write_persona_set` — Percy's one write path onto the persona tables.

If either is missing, don't dispatch Percy. Report the gap and what's missing, the same as you
would an unsynced `tag_library`.

## The population lookup is yours to own

The same way `project_dictionary` is Lexicon's and `tags` is Tagger's — a lookup table you
maintain (raw cohort value → population_id), never a value Percy resolves itself, and never
something a human fills in row by row. Which raw values belong to which population is a product
decision, not one you infer from the data: get an explicit ruling before creating or changing
the mapping, the same discipline as never pre-filling a canvas value.

Related: `GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md` (`population_map` / `conversation_populations`
DDL and the `write_persona_set` statement), `GUIDES/CLAIRE_TAG_DICTIONARY.md` (the same
lookup-table pattern applied to tags).
