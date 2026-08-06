# Claire — zero to running, for a brand new client

Everything needed to take a new client from nothing to a working Claire, in order.
Twelve steps, roughly 20 minutes. Steps 1–6 are Google Cloud console; Steps 7–12 are local.
**Step 0 is once ever, not once per client** — do it the first time and never again.

**The rule the whole design hangs on: one channel = one client = one Drive folder + one
BigQuery dataset + one service account.** No *client data* is shared between channels, ever.
Every step below exists to make that true at the Google IAM layer, where it cannot be undone
by a bad config file or a confused agent.

The single exception is **Step 0**, the tag dictionary: a research taxonomy with no client
content in it, deliberately shared by every project, and handled so that no channel account
can read it anyway.

Worked example throughout: slug `acme-health`, which is live today.

---

## Step 0 — The shared tag dictionary (once ever, not per client)

Skip this if you have already done it. It is not part of onboarding a client; it is the one
piece of setup the clients share.

The **Tag Dictionary** sheet — `{{TAG_SHEET_ID}}` — sits one
folder up from the client folders, at the shared-drive root, so that all projects tag against
the same taxonomy. That position is also *outside* every client fence, which is deliberate: a
channel account that could read a file sitting next to the other clients' folders is a channel
account pointed at the wrong thing. Widening a fence to reach it would expose the siblings too.

So the sheet is never read at deploy time by a client account. One identity reads it:

1. IAM & Admin → Service Accounts → Create → `claire-tag-dictionary-reader`.
   **Grant it no project roles at all.** It needs none — it only reads one Drive file.
2. Keys → Add key → JSON, then:
   ```bash
   mv ~/Downloads/{{BQ_PROJECT}}-*.json ~/.buzz/.secrets/claire-tag-dictionary-reader.json
   chmod 600 ~/.buzz/.secrets/claire-tag-dictionary-reader.json
   ```
3. Open the Tag Dictionary sheet → Share → paste
   `claire-tag-dictionary-reader@{{BQ_PROJECT}}.iam.gserviceaccount.com` → **Viewer** → Send.

Step 8 then seeds every new client's `tag_library` from it automatically.

**When you edit the dictionary later, nothing propagates on its own.** The sheet is a source,
not a live mirror. Re-sync each live dataset:

```bash
~/.buzz/bin/sync-tag-dictionary.mjs \
  --dataset research_<slug> \
  --bq-key    ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --sheet-key ~/.buzz/.secrets/claire-tag-dictionary-reader.json
```

Add `--dry-run` to see the diff first. It validates the whole sheet before writing anything,
`MERGE`s on `tag` so re-running is a no-op, and a tag you delete from the sheet is marked
`active = FALSE` rather than deleted — transcripts already tagged with it keep resolving.

---

## The two service accounts, and the mixup that looks like a permissions bug

Step 0 just created the **second** of two Google identities this setup uses. They are easy to
confuse, they fail in a way that points at the wrong culprit, and that has now cost an installer
an hour. Read this once.

| | Channel account | Dictionary reader |
|---|---|---|
| Name | `claire-<slug>-service-user` | `claire-tag-dictionary-reader` |
| Drive | the client folder, **Contributor** | the Tag Dictionary **file only** |
| BigQuery | `research_<slug>` and nothing else | nothing |
| Runs when | **every agent turn** — all three MCP servers | **deploy only**, then never again |
| Created in | Steps 2–6, once per client | Step 0, once ever |

The thing to hold onto: **one account does Drive *and* both BigQuery servers.** There is no
split. If you are looking for a separate identity behind `bq-<slug>`, there isn't one:

```bash
# what each registered server actually authenticates as
python3 - <<'PY'
import json, os
d = json.load(open(os.path.expanduser("~/.claude.json")))
for name, cfg in (d.get("mcpServers") or {}).items():
    key = (cfg.get("env") or {}).get("GOOGLE_APPLICATION_CREDENTIALS", "(none)")
    print(f"{name:14s} {key}")
PY
```

All three of `bq-<slug>`, `bq-<slug>-ro` and `drive-<slug>` must print the **channel** key.

### The symptom, when they get crossed

Point `drive-<slug>` at the dictionary reader by mistake and Drive answers truthfully but
misleadingly — the folder *is* reachable, just not writable:

```
folder "…" reachable; can write: false
WARNING: read-only access. Share as Contributor if agents must write artifacts.
```

Which reads exactly like Step 4 was never done. It was. The fix is repointing one MCP
registration, **not** granting anything in the console and **not** deleting a key. Before you
touch IAM, confirm which account is actually being used:

```bash
for f in ~/.buzz/.secrets/*.json; do
  printf '%-52s ' "$(basename "$f")"
  python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['client_email'])" "$f"
done
```

The filename proves nothing about what is inside it — `bin/stu:112` builds the path from the
slug alone, and a key downloaded from the console arrives named after the *project*, not the
account. `client_email` is the only answer.

Expect one honest surprise here: on an installation that predates this guide, the
`claire-tag-dictionary-reader.json` slot can hold a key for a differently-named account —
the role is defined by the filename the deploy script looks for, not by the account inside.
That is only a problem if the account is broader than the role needs; see below.

### Two traps that follow from this

**A person's Drive access grants a service account nothing.** Service accounts are not members
of the Workspace domain and inherit none of its sharing (`mcp/drive-fence/preflight.mjs:3-5`).
"I can open the folder" and "the agent can read the folder" are unrelated facts. This is the
single most common install failure here, and Step 4 is the only thing that fixes it.

**The dictionary reader is the more dangerous key, not the channel one.** Backwards from most
people's intuition, so worth stating plainly. The channel account's entire reach is one folder
and one dataset — that is the whole design, and it is why handing it to a collaborator working
on *that* client is a hygiene question rather than a breach. The dictionary reader is the one to
keep on one machine.

That is only true if Step 0.1 was honoured — **no project roles at all**. If that account
picked one up, or if the key in that slot belongs to an older, broader account, it can enumerate
every dataset in the project. Check it directly, and note that the checker judges any non-channel
account harshly by design, so read the dataset list rather than the verdict:

```bash
~/.buzz/bin/verify-channel-isolation.py \
  --slug <slug> --key ~/.buzz/.secrets/claire-tag-dictionary-reader.json
```

`datasets this SA can enumerate:` should be empty or a single entry. A list of every research
dataset in the project means that key needs its roles stripped in IAM, or replacing.

---

## Before you start

Pick a **slug** for the client: lowercase, hyphens, no spaces. `acme`, `acme-health`.
It names everything downstream:

| Thing | Pattern | Example |
|---|---|---|
| BigQuery dataset | `research_<slug>` (hyphens → underscores) | `research_acme` |
| Service account | `claire-<slug>-service-user` | `claire-acme-service-user` |
| Key file | `~/.buzz/.secrets/claire-<slug>-service-user.json` | |
| MCP servers | `bq-<slug>`, `drive-<slug>` | `bq-acme`, `drive-acme` |
| Subagents | `scribe-<slug>`, `lexicon-<slug>`, `tagger-<slug>`, `analyst-<slug>` | |

Project is `{{BQ_PROJECT}}` throughout.

**Pick the slug before Step 2, and keep it.** A service account cannot be renamed once
created, so shortening the slug afterwards leaves the account named for the old one forever.
That is survivable — set `sa_slug` on the channel canvas to the account's real name, and pass
`--sa-slug` to `bin/stu`, which is where the key path is derived. The dataset, the MCP servers
and the subagents all keep following `slug`. But it is a permanent wart, and picking once
avoids it.

---

## Step 1 — Create the Drive folder

Google Drive → your **shared drive** → New folder → name it for the client.

Put transcripts in it (a `Transcripts` subfolder is fine — Claire searches recursively).
**Google Docs, Word (`.doc`, `.docx`) and plain text (`.txt`, `.md`) all work** — anything that
is not already a Doc is converted automatically on first read, leaving a
`_CONVERTED_TO_GOOGLE_…` copy beside the original that you can delete whenever you like. If the
same interview is in there twice in two formats, it is converted and ingested **once**; no need
to tidy that up first. CSV, JSON and HTML still cannot be read — see "Known limits" for why.

**Copy the folder ID** from the URL — the part after `/folders/`:

```
https://drive.google.com/drive/folders/{{DRIVE_FOLDER}}
                                        └──────── this ────────┘
```

---

## Step 2 — Create the service account

Cloud console → **IAM & Admin → Service Accounts → Create service account**

- Name: `claire-<slug>-service-user`
- **Grant this service account access to project:** pick **BigQuery Job User**. Nothing else.
- Skip "grant users access". Create.

> **This is the step that decides whether isolation is real.** `BigQuery Job User` lets the
> account run a query but grants access to zero data. Any other BigQuery role here —
> Data Editor, Data Viewer, Admin — or a basic role like Editor or Owner reaches **every
> dataset in the project** and silently cancels Step 5. Step 11 exists to catch it.

---

## Step 3 — Create and install the key

Still in Service Accounts → click the new account → **Keys → Add key → Create new key → JSON**.
It downloads with a random name like `{{BQ_PROJECT}}-abc123def456.json`.

```bash
mv ~/Downloads/{{BQ_PROJECT}}-*.json ~/.buzz/.secrets/claire-<slug>-service-user.json
chmod 600 ~/.buzz/.secrets/claire-<slug>-service-user.json
```

`chmod 600` is not optional — the deploy script refuses to run on a key any other user can read.

---

## Step 4 — Share the Drive folder with that service account

Back in Drive → right-click the client folder → **Share** → paste the service account email
(`claire-<slug>-service-user@{{BQ_PROJECT}}.iam.gserviceaccount.com`) → role **Contributor** → Send.

Share **only this folder**. The folder is the entire world this service account can see in Drive.

Contributor deliberately does not include delete. Claire can add artifacts to a client folder
and is structurally incapable of destroying client data — verified, not assumed.

---

## Step 5 — Create the BigQuery dataset

BigQuery → Explorer → **⋮** next to `{{BQ_PROJECT}}` → **Create dataset**

- Dataset ID: `research_<slug>`
- Location type: **Multi-region → US**

The location must be US. The tools are pinned to it, and a dataset in another region fails
later with an error that does not mention regions.

---

## Step 6 — Grant the service account on that dataset

Click the dataset → **Sharing → Permissions → Add principal**

- Principal: `claire-<slug>-service-user@{{BQ_PROJECT}}.iam.gserviceaccount.com`
- Role: **BigQuery Data Editor**
- Save.

This is the grant that reaches exactly one dataset. Combined with Job User from Step 2, the
account can run queries, and the only bytes it can touch are this client's.

---

## Step 7 — Create the Buzz channel and add Claire

In Buzz: create a channel named for the client. Copy its **UUID** (in the channel URL / header).

Add Claire to the channel. She defaults to owner-only access.

---

## Step 8 — Run the deploy script

```bash
~/.buzz/bin/deploy-claire-channel.sh \
  --slug <slug> \
  --channel-uuid <channel-uuid-from-step-7> \
  --drive-folder <folder-id-from-step-1> \
  --sa-key   ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --admin-key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

Add `--dry-run` first if you want it to validate everything and change nothing.

Both keys are the same file when you created the dataset by hand, which is the path above.
`--admin-key` only differs if you want the script to create the dataset for you, which needs
an identity holding `bigquery.datasets.create` — deliberately not something a channel account has.

What it does, in order:

1. **Preflight** — keys exist and are mode 600; the service account can actually reach the
   Drive folder and reports `can write: true`. Fails loudly here rather than halfway through.
2. **Applies the 8-table schema** from `GUIDES/RESEARCH_CHANNEL_DATASET_SCHEMA.md`, which is
   the single source of truth for the DDL. Idempotent — safe to re-run.
3. **Verifies the dataset grant** from Step 6, or makes it if the admin key can.
4. **Offers the lockdown** (see below) — prompts before anything destructive.
5. **Seeds `tag_library`** from the shared tag dictionary (Step 0), reading the sheet with
   `claire-tag-dictionary-reader` and writing with the channel's own key. If that reader key
   is missing it warns and moves on — the deploy still succeeds, but Tagger will refuse to
   tag until you sync, which is the intended failure: no dictionary, no invented tags.
6. **Renders** the fenced BigQuery config and the four agent definitions, named for the slug.
7. **Registers** `bq-<slug>` and `drive-<slug>` as MCP servers.

### The lockdown prompt — read this before answering

BigQuery seeds **every** dataset at creation with three grants the console does not display:

```
roles/bigquery.dataEditor   projectEditor:{{BQ_PROJECT}}
roles/bigquery.dataViewer   projectViewer:{{BQ_PROJECT}}
roles/bigquery.dataOwner    projectOwner:{{BQ_PROJECT}}
```

They mean anyone holding a project-level Editor or Viewer role reads this client's data,
forever, no matter what Step 6 says. A dataset that looks exclusively shared in the UI is not.

Answering **y** revokes the Editor and Viewer entries (Owner stays — that is the admin path
back in). Say y for a real client. Say n only if people currently reach this data through a
project-level role and you have not yet given them explicit grants.

To grant a human explicitly, before locking down:

```sql
GRANT `roles/bigquery.dataViewer` ON SCHEMA `{{BQ_PROJECT}}`.research_<slug>
  TO "user:someone@example.com";
```

---

## Step 9 — Restart Buzz Desktop

MCP servers are read once at startup. Until you restart, Claire has no tools for this channel.

```bash
~/.local/bin/claude mcp list      # bq-<slug> and drive-<slug> should both say Connected
```

---

## Step 10 — Point the channel at its folder

Set this channel's canvas so Claire knows what she is working on. Paste this and replace the
three placeholders with the values you chose in the steps above:

```markdown
## Claire config
- bq_project: {{BQ_PROJECT}}
- slug: <your-slug>
- drive_folder: <your-folder-id>
- bq_dataset: research_<your-slug>
```

The key names are exact — `bq_project` and `bq_dataset` carry the `bq_` prefix, `slug` and
`drive_folder` do not. Claire matches on these literally; `project:` or `dataset:` will not be
read.

> **Placeholders, not blanks — on purpose.** Claire treats a config block whose values are
> empty as an *unconfigured* channel. Leaving them blank here means a canvas that has this
> runbook pasted into it (which is documentation, not config) can't be mistaken for a
> configured channel. Replace the `<...>` values; never just delete them.

`bq_project` is the only line that is the same in every channel. The other three are per-client
and **Claire will never fill them in for you** — she has no way to know them, and a value
guessed from another channel would point her at the wrong client's data.

- `slug` — what you picked in "Before you start", and what you passed to `--slug` in Step 8.
- `drive_folder` — the id from Step 1, the part of the URL after `/folders/`.
- `bq_dataset` — the dataset name from Step 5, e.g. `research_<slug>`.

---

## Step 11 — Verify isolation before putting client data in

Do not skip this. It is the only step that tests the Google layer rather than our config —
it runs the **unfenced** BigQuery toolbox as the channel account on purpose and tries to
reach other clients' data. Every probe is a dry run; nothing is written.

```bash
~/.buzz/bin/verify-channel-isolation.py \
  --slug <slug> \
  --key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

A healthy result:

```
  ✓ own dataset READ                   ALLOWED
  ✓ own dataset WRITE                  ALLOWED
  ✓ CREATE new dataset                 DENIED

Isolation holds. This SA reaches research_<slug> and nothing else.
```

`ISOLATION BROKEN` is almost always a project-level BigQuery role left on the service account
in Step 2. Fix it in IAM & Admin → IAM, leave only **BigQuery Job User**, re-run.

The script also warns if the dataset still carries the invisible default grants, in which case
re-run Step 8 with `--lock-down`.

---

## Step 12 — Smoke test

In the channel: `@Claire ingest the transcript in the Drive folder`

Expected: Claire lists the folder, Scribe parses the Doc into `transcript_lines`, Lexicon
bootstraps `project_dictionary`, Tagger writes `tags`, Analyst writes a summary Doc back
to the client folder. Then:

```sql
SELECT COUNT(*) FROM `{{BQ_PROJECT}}.research_<slug>.transcript_lines`;
SELECT COUNT(*) FROM `{{BQ_PROJECT}}.research_<slug>.tag_library` WHERE active;  -- 18 today
SELECT tag_id, COUNT(*) FROM `{{BQ_PROJECT}}.research_<slug>.tags` GROUP BY 1 ORDER BY 2 DESC;
```

`tag_library` at 0 means Step 0 was never done, and Tagger will have stopped rather than
invented tags.

---

## Known limits, all verified rather than assumed

**A transcript is never read whole — `read_file` returns a window.** At most 120 lines or 12,000
characters per call, cut on line boundaries so a speaker turn is never split. `complete: false`
means the document continues and `next_start_line` is where to resume; `content_sha256`,
`character_count` and `total_lines` describe the whole document on every call, so change detection
still works from one read.

The ceiling lives in the tool rather than in a prompt on purpose. A prompt can forget a parameter;
a tool cannot forget its own limit. The acme transcripts run 16k–37k characters, and the cost that
actually bites is not the read alone — it is the read plus the `MERGE` built from it, which
inlines every line a second time. So Scribe ingests one interview as a sequence of chunks, each
read, parsed and written before the next is fetched, with `conversations.ingest_cursor_line` and
`ingest_cursor_seq` recording how far it got. A run that dies mid-transcript resumes at the right
chunk instead of starting over, which is what makes a long transcript finish at all. Tagger tags
in line-range batches and Analyst surveys before it writes, for the same reason.

The sharp edge, documented in full in `RESEARCH_CHANNEL_DATASET_SCHEMA.md`: a per-chunk `MERGE`
must scope its `NOT MATCHED BY SOURCE ... DELETE` to that chunk's `line_sequence_number` range.
Unscoped, chunk 2 deletes everything chunk 1 wrote, and the conversation ends up holding only its
last chunk at a plausible-looking row count.

**Nothing can be downloaded, so everything is read through the Docs and Sheets APIs.** Your
Workspace blocks download and copy org-wide, which also blocks `files.export` and raw
`alt=media` reads — for the service account too, even as a writer. A structural read through
the Docs API is not a download, so that still works. A `.txt` file Claire writes can never be
read back; that is why `write_file` defaults to creating a native Doc.

**Word files and plain text are both handled, by conversion.** A `.doc`/`.docx` cannot be read
directly and cannot be downloaded; a `.txt` could be read in principle but only by downloading
it, which is blocked. Both are solved the same way: a server-side `files.copy` with a target
mimeType of `application/vnd.google-apps.document` converts the file without any download, so
`read_file` does that on first read and reads the resulting Doc. Verified live for `.docx` and
`text/plain`; `.doc` and `.md` take the identical path. The copy lands in the same folder as the
original, named `_CONVERTED_TO_GOOGLE_<original name>` (Drive drops the extension on
conversion), and `list_files` hides those by default (`include_converted: true` shows them,
`converted_copies_hidden` counts them). The transcript's identity stays the **original** file's
Drive id, so conversion never creates a second conversation. Delete the copies whenever you
like — the next read just makes a new one.

**The same transcript saved twice, in two formats, is converted once.** These folders routinely
hold `Interview - X.docx` beside `Interview - X.txt`. Files in the same folder whose names match
once the extension is stripped are treated as one transcript: `list_files` shows it once
(`duplicate_sources_hidden` counts what was set aside, `duplicate_groups` names it), and
`read_file` on either id serves the same single conversion, with `duplicate_of` pointing at the
canonical file.

Two details worth knowing, both from measuring the acme folder:

- **The pairing is a name match, not a content hash, on purpose.** Of the two real pairs in that
  folder, one is byte-identical across formats and the other differs by 2 characters in 57,779
  (the `.docx` reads `pictur fes` where the `.txt` reads `pictures`). A hash comparison calls the
  second pair two different documents and converts both, which is the bug this exists to prevent.
- **The name match is checked against content length, which costs nothing.** A `text/plain`
  file's Drive `size` *is* its text length — measured across four transcripts, `size` minus
  normalised text length was a constant 2–3 characters. So the Word file is converted and the
  `.txt`'s size is compared against the resulting text. Both real pairs agree within 2. If the
  check fails, the name match was wrong: both files are read separately and the response says so
  under `duplicate_check`, rather than serving one transcript as another.

That is also why Word ranks above `.txt` as the canonical source — converting the `.txt` instead
would spend the only independent measurement available to verify the pair.

**Claire cannot delete anything in Drive.** Contributor on a shared drive grants create and
edit, not delete — confirmed on the file's own `capabilities`: `canDelete: false`,
`canTrash: false`, `canRename: true`. Keep it that way. It is why deduplication has to happen
*before* a copy is made: a redundant converted copy is permanent until a human removes it.
Rename working does mean a stray copy can be folded into the `_CONVERTED_TO_GOOGLE_` prefix so
one search rounds all of them up.

**The dataset fence is dataset-level, not table-level.** "Lexicon owns the dictionary, Tagger
owns tags" is enforced by prompt, not by tool. That is fine inside one client's dataset, and it
is exactly why the cross-client fence lives in IAM instead.

**MCP servers are user-scoped, so every channel's tools are visible in every session.** The IAM
fence still means a `bq-acme` tool can only reach `research_acme` — but the tool is *listed*
everywhere. Retire a channel's servers when the engagement ends:

```bash
~/.local/bin/claude mcp remove bq-<slug>
~/.local/bin/claude mcp remove drive-<slug>
rm ~/.buzz/.claude/agents/{scribe,lexicon,tagger,analyst}-<slug>.md
```

**`research_building_claire` is scaffolding.** Eight empty tables, the reference schema, no
client data. Never point a channel at it.

---

## If something breaks

| Symptom | Cause | Fix |
|---|---|---|
| `Permission bigquery.datasets.create denied` | dataset doesn't exist and the admin key can't make one | Create it by hand (Step 5) |
| `Permission bigquery.datasets.update denied` on the grant step | channel account can't grant to itself | Do Step 6 in the console |
| `Access Denied` on the client's own dataset | Step 6 missing, or dataset in the wrong region | Check both |
| Claire has no tools | Buzz not restarted since deploy | Step 9 |
| `403 cannotExportFile` | file isn't a Google Doc or Word file | Convert it to a Doc by hand |
| `403 cannotDownloadFile` | a raw read of a format with no conversion path (CSV, JSON, HTML) | Re-save it as a Doc or Sheet. `.doc/.docx/.txt/.md` convert automatically and should not hit this |
| The same interview appears twice in a report | two formats of it in one folder whose names differ by more than the extension | Check `duplicate_groups`; rename them to match, or delete one |
| Tagger says `tag_library` is empty | Step 0 not done, or sync never run for this slug | Step 0, then `sync-tag-dictionary.mjs` |
| `cannot read the tag dictionary sheet ... caller does not have permission` | sheet not shared with the reader SA | Step 0.3 — share as Viewer |
| `can write: false` on the client folder, but Step 4 *was* done | `drive-<slug>` is authenticating as the dictionary reader, not the channel account | Print `client_email` for the key each server uses; repoint the registration. See "The two service accounts" |
| Something tells you an account "isn't provisioned" and asks you to grant `writer` | same crossed-keys mixup, diagnosed from the symptom | Confirm the identity **before** changing any IAM. Nothing needs granting |
| `404 File not found` on the Tag Dictionary sheet | the *channel* account was used to read it — it cannot see that file, by design | Use `--sheet-key` with the dictionary reader key |
| The dictionary reader can enumerate every research dataset | it picked up a project role, or that slot holds an older broader account | Strip its roles in IAM (Step 0.1: none at all), or replace the key |
| A tag you added to the sheet never fires | the sheet is a source, not a live mirror | Re-run `sync-tag-dictionary.mjs` for that dataset |
| `ISOLATION BROKEN` | project-level BigQuery role on the SA | Step 2, leave only Job User |
| A conversation sits at `status = 'ingesting'` | a chunked ingest stopped partway | Re-mention it — Scribe resumes from `ingest_cursor_line`. Not an error state to clear by hand |
| `line_count` is lower than the transcript really is | the chunk loop ended before `complete: true` | Re-run; check the report says `ingested`, not `partial` |
| Lines exist but `line_sequence_number` has gaps at chunk seams | a chunk restarted its numbering instead of continuing from `ingest_cursor_seq` | Re-ingest that conversation; the `MERGE` makes it safe |
