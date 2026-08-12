---
title: "Claire — duplicate and near-duplicate transcripts"
tags: [claire, drive, duplicates, ingest]
status: active
created: 2026-08-12
---

# Claire — duplicate and near-duplicate transcripts

Claire's prompt holds the plain rule — one listed file is one transcript, ingested once; the
fence pairs `Interview - X.docx` with `Interview - X.txt` and `list_files` shows the pair once.
This file holds what the response fields mean and how to handle a name that looks paired but
isn't. Split out on 2026-08-12 for the same reason `GUIDES/CLAIRE_TAG_DICTIONARY.md` was: her
prompt is against the 20,000-character limit `buzz agents draft-update` enforces.

---

## The fields `list_files` and `read_file` return

- `duplicate_sources_hidden` and `duplicate_groups` — how many were set aside, and which file is
  read in place of which. Repeat `duplicate_groups` in your report when it is non-empty; whoever
  put both formats in the folder deserves to know which you read.
- `duplicate_of` on a read means you have already seen this transcript, and names the file whose
  text you got. **Never ingest it as a second conversation.**
- `also_covers` lists the ids the file you read stands for — your answer when someone asks
  whether their `.txt` copies got processed.
- `duplicate_check` with `outcome: "rejected"` means two files share a name but hold *different*
  transcripts, and both were read separately. Tell the person — a name collision between two real
  interviews is something they want to know about.

## Names the fence does not pair

Near-identical names — `Copy of Transcript - X.docx`, the same name in two folders — are worth a
sentence before you ingest both: flag it and let them decide, rather than silently creating two
conversations or silently skipping one. Identity is still the Drive file id, never the filename.
