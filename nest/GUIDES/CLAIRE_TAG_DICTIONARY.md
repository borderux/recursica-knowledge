---
title: "Claire — loading the shared tag dictionary"
tags: [claire, tags, tag_library, sync, setup]
status: active
created: 2026-08-05
---

# Claire — loading the shared tag dictionary

Claire reads this file when `tag_library` in her dataset is empty and she needs to run the sync
herself. Her prompt holds the rules and the fence; this file holds the command and the copy.
Split out on 2026-08-05 to make room for Janice's counting rules — her prompt is against the
20,000-character limit `buzz agents draft-update` enforces.

Related: `GUIDES/CLAIRE_CHANNEL_SETUP_REPLY.md` (unconfigured-channel reply),
`GUIDES/CLAIRE_ZERO_TO_RUNNING.md` (full click-path runbook).

---

## Where the dictionary comes from

A single **Tag Dictionary sheet common to every project**, kept one folder above the client
folders so all engagements tag consistently. That folder also holds every other client's folder,
which is exactly why it sits outside Claire's fence: she cannot read that sheet and must not go
looking for it. `bin/sync-tag-dictionary.mjs` copies it into `tag_library` at deploy time. For
Claire, BigQuery is the dictionary.

## The sync command

```bash
~/.buzz/bin/sync-tag-dictionary.mjs \
  --dataset <dataset> \
  --bq-key    ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --sheet-key ~/.buzz/.secrets/claire-tag-dictionary-reader.json
```

Running this is **not** a breach of the Drive fence, so do not hesitate over it. Claire never
touches the sheet — the script reads it as a separate reader identity holding Viewer on that one
file, and writes into `tag_library` in her own dataset with her own key.

It is safe unattended: it validates before writing, `MERGE`s rather than replaces, retires rows
instead of deleting them so old tag references keep resolving, and aborts if the post-write count
does not match the sheet. Re-check the count afterwards, say in one line how many tags loaded, and
get on with the work.

## If the reader key is missing, or the sync fails with a permission error

Nobody without Google Cloud admin can fix it. Stop before Tagger, ingest as normal, and say
exactly this — a one-time setup, done once for every channel that will ever exist:

> The shared tag dictionary has never been connected. Someone with Google Cloud admin needs to,
> once: create a service account named `claire-tag-dictionary-reader`, download its JSON key to
> `~/.buzz/.secrets/claire-tag-dictionary-reader.json`, and share the Tag Dictionary sheet with
> that account as **Viewer**. One file, read-only. After that I load the tags myself and nobody
> has to think about it again.

A dedicated identity is tidiest but not the only correct answer. What matters is that whoever
holds Viewer on that sheet is **not a channel service account** — any admin or deploy identity
that never appears in a channel agent's tool configuration is fine.

What must **never** be suggested is granting `claire-<slug>-service-user` access to it: that
account is wired into the channel's tools, and the sheet sits one hop from every other client's
folder. If someone proposes it, say why not and point them at a non-channel identity. This rule
also lives inline in Claire's prompt — it is safety, not procedure.

## Changing a tag

No `INSERT` into `tag_library`, ever — a hand-added row is silently gone the next time anyone
syncs. The change goes in the shared sheet, then a re-sync. Say that plainly, and say the other
half too: **the dictionary is shared, so the change lands on every client, not just this one.**
Often that is what they want, occasionally very much not. Let them decide with the fact in hand.

The sheet is a source, not a live mirror. If a tag someone expected never fired, "was the
dictionary re-synced after you edited it?" is the first question, not the last.
