# kev

Two pieces, two names:

- **Kev-engine**: the local model (jaredpalmer/kev, a System One-compatible server). Setup: [ENGINE.md](ENGINE.md). Results: [evals/](evals/README.md). It answers
  yes/no questions with probabilities and knows nothing about design rules.
- **Kev** (this program): reads a screen and the skills, asks Kev-engine the questions, and
  writes the report. Barb runs Kev; Kev talks to Kev-engine.

Kev-engine's own settings (`KEV_FUSED`, `KEV_CUDA_GRAPHS`, …) belong to the engine. This
program's settings are the other `KEV_*` variables in `src/config.mjs`.

A fast, cheap **first pass** of Barb's review, using Kev-engine (local model). It does not replace Barb.
Use it for the quick fix-and-recheck rounds. Full Barb still has to go quiet twice before the
designer sees a screen.

## How it maps to Barb

| Barb                      | kev                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manifest picks the skills | Same script, same output. Never judged.                                                                                                                                                         |
| One `checker` per skill   | Code splits the screen into line-numbered chunks. Kev-engine answers one yes/no per checklist item per chunk. A second pass asks, over the whole screen, whether something required is missing. |
| `feisty` refutes findings | Not replaced. Anything likely is reported as a **lead**, not a finding. Full Barb confirms.                                                                                                     |
| `file:line`               | A line range (the chunk). Full Barb pins the line.                                                                                                                                              |
| No write tools            | Read-only by construction: Kev-engine has no tools, and this code only reads.                                                                                                                   |
| Ignores caller hints      | The agent ignores extra direction in the message and says so.                                                                                                                                   |

It never hands full Barb a list of skills to check. Barb's own rules reject a narrowed review.

## Steps

1. Manifest picks the skills (unchanged from Barb).
2. Design-rules skills are dropped if no file on the screen builds what they cover
   (`KEV_APPLIES`, lenient). Component skills always stay: an import matched them.
3. Items code can't decide (browser-only, or about process like "the test was applied") are set
   aside (`KEV_CHECKABLE`). Cached per item, so it's asked once ever.
4. Each remaining item is asked per file (whole files up to `KEV_FILE_MAX_LINES`, chunks
   beyond), then once over the whole screen for anything missing.

## Statuses

- **lead**: p ≥ `KEV_FLAG` (0.5). Likely violation.
- **unsure**: between `KEV_PASS` (0.15) and the flag. Not cleared.
- **not-checkable**: needs a running page, or is about process. Reported as not checked.
- **clear**: below `KEV_PASS` everywhere.

"Nothing flagged" means ready for full Barb, not clean.

## Run it

```sh
npm install
export KNOWLEDGE_DIR=/path/to/recursica-knowledge   # engine defaults to http://localhost:8009
node bin/kev.mjs --root /path/to/app /path/to/app/src/routes/Users.jsx
node bin/kev.mjs --json … > kev.json      # for eval
KEV_MOCK=1 node bin/kev.mjs …         # offline dry run, fake numbers, token estimate
```

## CircleChat

Provision an agent with the **socket** runtime (Members → Provision agent), then on the host:

```sh
CC_BOT_TOKEN=cc_… WSS=wss://<host>/agent-socket CC_URL=https://<host> \
KNOWLEDGE_DIR=… APP_ROOT=… TYPESAFE_API_KEY=… node agent.mjs
```

Mention it with screen paths (relative to `APP_ROOT`). It reacts 👀, runs, and posts the report
to the thread via `/api/agent-api/post_message`. A failed run posts the failure; it never goes silent.

## Before trusting it: eval

Run full Barb and kev on the same screens, save Barb's surviving findings as
`[{ skill, checklistItem, file, line }]`, then:

```sh
node eval.mjs --kev kev.json --barb barb.json
```

**MISSED** is the number that matters: real violations Kev called clear. Lower `KEV_PASS`
until it's zero on a handful of screens.

## Cost

Dry run on a sample screen (45 skills, 8 files, ~1,400 lines): about 1,000 engine calls and
~4M input tokens cold. A round after a small edit reuses the cache (`.kev-cache.json`) and
drops to ~90 requests. Most of that repeat cost is the whole-screen "missing" pass, which reruns
whenever any file changes. Knobs: `KEV_BATCH`, `KEV_SKILL_CHARS`, `KEV_CHUNK_LINES`,
`KEV_SCREEN_MAX_LINES`, `KEV_CONCURRENCY`. See `src/config.mjs`.

## Known gaps

- Kev-engine's request limits (questions per call, state size) weren't documented where I could read
  them. `KEV_BATCH=25` and a 1,500-line screen cap are guesses.
- Taking the max over many chunks inflates false leads. The eval shows how much.
- Render-only rules stay unchecked, same as Barb without a running page.
