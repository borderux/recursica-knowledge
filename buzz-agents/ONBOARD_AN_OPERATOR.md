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

Someone who only wants to _ask Claire a question_ needs no install at all — add them to the
channel. Note that this is a client-data access decision: everyone in a channel reaches the same Claire pointed at
the same dataset, on the host's budget.

Do not run this checklist for someone who wanted the smaller thing.

---

## What you are handing over — one secret, and a list of identifiers

The distinction matters, because it decides the channel you send each thing through.

### The identifiers — not secret, but not public either

These are the same for everyone in the community. They are already `{{TOKEN}}`s in a public
repo precisely so they do not have to be published, but a leaked project id is an
inconvenience, not a breach. A DM or a channel message is fine.

| Value                                                          | Where you get it                                    |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `BQ_PROJECT`                                                   | Cloud console → project picker → project **id**     |
| `sa_slug`                                                      | Only when the account is not named after the slug   |
| `DRIVE_FOLDER`                                                 | The client Drive folder URL, after `/folders/`      |
| `TAG_SHEET_ID`                                                 | Tag Dictionary sheet URL, between `/d/` and `/edit` |
| `CLAIRE_CHANNEL` `STU_CHANNEL` `ALAN_CHANNEL` `JANICE_CHANNEL` | `buzz channels list`                                |
| `JANICE_PUBKEY`                                                | `buzz channels members --channel <janice-uuid>`     |
| `BUILDER_REPO` `BUILDER_REPO_NAME` `KNOWLEDGE_REPO_NAME`       | Only if they want ALAN                              |

Their Fizz can find the channel UUIDs herself, so in practice you are sending the first
three — and better than sending them is **putting them in the channel canvas.**

### Put the configuration in the channel canvas before you hand anything over

The deploy is meant to be run _in_ the channel the agents are for, and their Fizz reads that
channel's canvas for its `## Claire config` block — the same block Claire herself reads at
runtime. Anything in there is a value nobody has to send, transcribe or mistype, for this
operator and every one after them.

Include `TAG_SHEET_ID`. It is the value most often missing from a canvas, it cannot be
derived from anything else, and it is what a deploy stalls on.

Include `sa_slug` **whenever the service account is not named after the slug** — see the
section below for how to tell. It is the second value a deploy stalls on, and unlike a
missing `TAG_SHEET_ID` the stall looks like a key belonging to the wrong client.

`JANICE_PUBKEY` is the exception: it cannot be known in advance. Each operator gets their own
Janice, whose pubkey does not exist until they save her draft — so it is filled in on a
second bootstrap run afterwards. Tell them to expect that rather than treating it as a
failure.

### The service-account identity is usually derivable — check before you rely on it

Both the account and the filename normally follow a fixed shape, so their Fizz can work out
what to expect and check the file she is given against it:

```
claire-<slug>-service-user@<BQ_PROJECT>.iam.gserviceaccount.com
```

**Confirm that is actually your account's name before you send nothing but the slug.** A
Google service account cannot be renamed, so any client whose slug was shortened or changed
after the account existed still answers to the original name — and then the derivation is
wrong. Read the real name once:

```bash
node -e 'console.log(require(process.argv[1]).client_email)' \
  ~/.buzz/.secrets/claire-<whatever-it-is>-service-user.json
```

If it does not match the derivation, **put `sa_slug` on the canvas** — the account's own name
minus the `claire-` prefix and `-service-user` suffix. An account called
`claire-acme-health-service-user` serving a channel on slug `acme` is `sa_slug: acme-health`.

Leaving it off is not a small omission. The installer derives the expected address, compares
it to the key you sent, sees a mismatch, and stops — which is the check doing its job, on a
difference that is entirely legitimate. The operator cannot tell that from the real failure
it is there to catch, which is a key belonging to another client. So the stall lands on them
looking like a security problem.

A symlink at the slug-named path makes it work on *your* machine and hides the problem from
you specifically. That is worth knowing before you conclude the derivation is fine.

The **key file** is still a secret and still travels out of band — see below.

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
  `roles/bigquery.dataEditor` at project level, it can read _every_ client. Fix the roles
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

It lives in **[NEW_OPERATOR_MESSAGE.md](NEW_OPERATOR_MESSAGE.md)** — copy everything below the
line in that file, fill in the three placeholders it names, and send.

It used to be a blockquote here, which was wrong in the way two copies of anything is wrong:
the version people actually send drifted from the version in the repo, and every fix had to be
made twice or made once and lost. One file, edited in place.

Three things it deliberately does that a shorter note does not, all of them from watching
people get stuck:

- **Checks for `node` and `claude` before installing anything.** Most Macs that get this
  message already have both.
- **Explains the 👀 reaction.** It is the only signal that Fizz received the message, and the
  work takes minutes — so anyone waiting for a *reply* concludes it is broken and gives up.
  Without a mention there is no reaction at all, which is how you tell the two apart.
- **Gives one pasteable line for the key**, rather than describing a folder that is invisible
  in Finder.

If the client's service account is not named after its slug, the placeholder table in that file
is where you say so — and `sa_slug` belongs on the canvas too, per the section above.

Everything else in that message is either public or theirs. The **key** is the one thing that
travels out of band, separately, and never in the message.

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
