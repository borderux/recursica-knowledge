# Onboarding an operator

For the **community owner**. What you hand a new teammate so they can run their own Claire,
Stu, Janice and ALAN, and what you must not hand them.

They do the installing — see [INSTALL.md](INSTALL.md), or they just ask their Fizz. Your job
is this handoff, and it is the only part that cannot be automated, because it is the part
that requires you to decide someone should have access.

---

## First: most people do not need this

An operator install is for someone who needs agents **running on their own machine**, awake
when they are, spending their own API budget.

Someone who only wants to *ask Claire a question* needs no install at all — add them to the
channel. Read the Tier 0 section of `PLANS/AGENT_DISTRIBUTION.md` before you do, because it
is a client-data access decision: everyone in a channel reaches the same Claire pointed at
the same dataset, on the host's budget.

Do not run this checklist for someone who wanted the smaller thing.

---

## What you are handing over — one secret, and a list of identifiers

The distinction matters, because it decides the channel you send each thing through.

### The identifiers — not secret, but not public either

These are the same for everyone in the community. They are already `{{TOKEN}}`s in a public
repo precisely so they do not have to be published, but a leaked project id is an
inconvenience, not a breach. A DM or a channel message is fine.

| Value | Where you get it |
|---|---|
| `BQ_PROJECT` | Cloud console → project picker → project **id** |
| `DRIVE_FOLDER` | The client Drive folder URL, after `/folders/` |
| `TAG_SHEET_ID` | Tag Dictionary sheet URL, between `/d/` and `/edit` |
| `CLAIRE_CHANNEL` `STU_CHANNEL` `ALAN_CHANNEL` `JANICE_CHANNEL` | `buzz channels list` |
| `JANICE_PUBKEY` | `buzz channels members --channel <janice-uuid>` |
| `BUILDER_REPO` `BUILDER_REPO_NAME` `KNOWLEDGE_REPO_NAME` | Only if they want ALAN |

Their Fizz can find the channel UUIDs and Janice's pubkey herself, so in practice you are
sending the first three.

### The secret — the service-account key, and only that

One file:

```
claire-<slug>-service-user.json
```

It is a **client-data credential**. Handing it over is granting access to that client's
transcripts, so treat it as the access decision it is.

- Send it **out of band** — a password manager, an encrypted file share, or in person.
  **Not** in a Buzz message, not in a channel, not in a DM, not in email, not pasted into a
  chat with an agent. Relay events cannot be unsent.
- One service account **per client**, shared by the operators on that client. The IAM fence
  is per client, not per person, and `edit_log` already attributes human actions by pubkey,
  so a per-person key multiplies key management for no added fence.
- Tell them where it goes: `~/.buzz/.secrets/claire-<slug>-service-user.json`, mode `0600`,
  in a directory at `0700`, outside every git checkout.
- Before you send it, confirm the fence actually holds for that key — see below.

### What you never send

- **Your `ANTHROPIC_API_KEY`.** Every operator brings their own and spends their own
  budget. Sharing one makes your spend their spend and defeats per-operator isolation.
- **Any project-level BigQuery credential.** If the key you are about to send has
  `roles/bigquery.dataEditor` at project level, it can read *every* client. Fix the roles
  before sending: `jobUser` on the project, `dataEditor` on that one dataset.
- **Your `local-values.json`.** It is a filled-in form, and it is gitignored for a reason.
  Send the values, not the file — it is quicker for them to fill in than for you to redact.

---

## Verify the fence before you hand out the key

Do this yourself, once per client, before anyone else holds the credential. It tests
Google's IAM layer, not our config:

```bash
~/.buzz/bin/verify-channel-isolation.py --slug <slug> \
  --key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

Must end with `Isolation holds.` If it says `ISOLATION BROKEN`, the key reaches other
clients' data — **do not send it.** Almost always a project-level BigQuery role; leave only
`jobUser` on the project.

---

## The message to send them

Fill in the blanks and send. Keep the key out of it.

> You are set up to run your own agents. You need a Mac — there is no Linux or container
> build.
>
> 1. Install Buzz Desktop, and have `claude` and `node` on your PATH.
> 2. Clone `https://github.com/borderux/recursica-knowledge` into `~/.buzz/REPOS/` and
>    check out the `feature/buzz-agent-definitions` branch.
> 3. Ask your Fizz: **"deploy the agents"** — she will walk you through it. If she has not
>    picked up the skill yet, point her at
>    `nest/.claude/skills/deploy-agents/SKILL.md` in that checkout.
>    Prefer doing it by hand? `buzz-agents/INSTALL.md`.
>
> Your values:
>
> ```
> BQ_PROJECT     = ____________
> DRIVE_FOLDER   = ____________
> TAG_SHEET_ID   = ____________
> slug           = ____________
> ```
>
> Channel UUIDs and Janice's pubkey your Fizz can look up herself.
>
> The service-account key comes separately, via ____________. Put it at
> `~/.buzz/.secrets/claire-<slug>-service-user.json` and `chmod 600` it. Never let it into a
> git checkout or a chat message.
>
> You will need your own `ANTHROPIC_API_KEY` — you spend your own budget, not mine.
>
> Two things nobody can do for you: **saving each of the four agent drafts** in Buzz
> Desktop, and **restarting Buzz Desktop** afterwards so the MCP servers load. Until you
> restart, your agents will look broken because they have no tools.

---

## After they are running

- **They get their own Janice**, reviewing their own sessions — the wake hook reads the
  local machine's transcripts. Your Janice never sees their work and cannot.
- **Their agents ship `owner-only`.** Leave it. Flipping to `anyone` is a separate access
  decision, not a setup step.
- **Agent memory does not travel.** Each agent's `core` lives on the relay, readable only by
  that agent. Their Claire starts empty and builds her own; she will not know what yours
  learned.
- **Two operators on one client dataset is defended but untested at the time of writing** —
  deterministic keys plus `MERGE`, and `ingest_runs` claiming. Worth one deliberate test
  before two people ingest the same client simultaneously.
- **Updates are pull-based.** `git pull && node scripts/bootstrap-nest.mjs` picks up script
  and guide changes. Prompt changes need a `draft-update` they approve; agents never rewrite
  themselves.

## Revoking access

Deleting the channel membership is not enough — they still hold the key.

1. Delete or disable that service-account key in the Cloud console. If other operators share
   it, rotate it and redistribute to the ones who stay.
2. Remove them from the channels: `buzz channels remove-member`.
3. Their local nest and any already-ingested data stay on their machine. Plan for that
   before granting, because you cannot undo it afterwards.
