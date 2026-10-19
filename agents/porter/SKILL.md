---
name: porter
description: Ports a change released in the golden Recursica adapter (Mantine v8) to the other Recursica adapters (MUI v7, Beam, Angular Material). Reads the Mantine release, builds one self-contained reference package per target adapter, dispatches one porter-adapter subagent per target in parallel, and publishes one summary with a pull request link per adapter. Never modifies the Mantine adapter and never merges. Use when a new Mantine adapter release is published.
targets: claude-code, circlechat
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
  portability: portable
---

<!-- platform:identity --> Port each change released in the golden Recursica adapter to every other Recursica adapter, and report one pull request per adapter for a person to review.

Recursica adapts one JSON style system to many UI kits and enforces the system's rules and behavior. The adapters stay as alike as possible across UI kits and languages. **The Mantine v8 adapter is the source of truth, called the golden adapter.** Every other adapter is built to match the golden adapter and is checked against the golden adapter's published screenshots, called goldens.

## The repositories

| Role | Repository | Notes |
| --- | --- | --- |
| Source of truth | `borderux/recursica-adapter-mantine-v8` | React and Mantine v8. The trigger source. **Porter never changes this repository.** |
| Target | `borderux/recursica-adapter-mui-v7` | React and MUI v7. |
| Target | `borderux/recursica-adapter-beam` | React and Beam. |
| Target | `borderux/recursica-adapter-angular-material` | **Angular, not React.** Has the repository's own `docs/COMPONENT_DEV_GUIDE.md`, `docs/COMPONENT_STORYBOOK_GUIDE.md`, `USAGE.md`, `OVERSTYLING.md`, `ARCHITECTURE.md` and `AGENT.md`. Does not depend on `@recursica/adapter-common`. |
| Shared tooling | `borderux/recursica` | The monorepo holding `adapter-common` (the canonical docs, including `docs/ADAPTER_AGENT_INSTRUCTIONS.md` and `docs/PIPELINE.md`), `adapter-tester` and `storybook-template`. Published to npm as `@recursica/*`. |

The canonical behavior and process live in the `adapter-common` docs. Each adapter extends the canonical docs with the adapter's own details, recorded in each component's `IMPLEMENTATION_NOTES.md`.

## When a fan-out starts

A **new release of the Mantine adapter** starts a fan-out. A release is the point where the Mantine change and the change's updated goldens are both published: `adapter-tester` fetches goldens from the Mantine repository's release tags.

<!-- platform:trigger -->

## How to run a fan-out

### 1. Read the release

Read the release notes, the changesets and the merged pull requests for the release. List what changed: components, props, behavior, tokens, and any `adapter-common` version bump.

**Stop when the release has no adapter-facing change,** such as a docs-only or CI-only release, and say so in the summary.

**Stop when a golden is missing or stale.** Every story the change affects needs a golden in the release. A missing or stale golden stops the fan-out, and the summary names the story.

### 2. Build one reference package per target adapter

A porter-adapter subagent starts with no memory and no earlier conversation, so the reference package is the subagent's whole picture. Each package holds:

- The goal, in plain language: what changed and why.
- The Mantine release tag, the links to the pull requests that carry the change, and the affected components and stories.
- The target repository's name and clone URL.
- The golden version to test against (`--source-of-truth-version <tag>`), when `latest` may not yet be the new release.
- The instruction to read and follow `docs/ADAPTER_AGENT_INSTRUCTIONS.md` in `adapter-common` (https://github.com/borderux/recursica/blob/main/packages/adapter-common/docs/ADAPTER_AGENT_INSTRUCTIONS.md).
- Every expected divergence already known, such as a UI kit that cannot match a Mantine behavior.

**Never tell a subagent how another adapter solved the change.** Each adapter matches the golden adapter's behavior in the adapter's own UI kit idioms, and code from one library does not carry over to another library.

### 3. Dispatch one porter-adapter per target adapter, in parallel

<!-- platform:dispatch -->

One subagent per target adapter, with no state shared between the subagents. **Building a new component means building the component in all four adapters** unless the user says otherwise; the Mantine release is the signal for the other three adapters.

### 4. Collect the reports

<!-- platform:collect -->

Each subagent reports a pull request link (never merged), the deviations from the reference change and the reason for each deviation, the source-of-truth results (what matches, what diverges, what was approved), the failures that already fail on `main`, and every behavior the subagent could not match or did not check in a browser.

### 5. Publish one summary

Publish one summary: the Mantine release tag, one pull request link per adapter, the deviations, and the blockers. Mention the owner only when the summary holds a result or a blocker to act on.

<!-- platform:publish -->

## Rules

- **Never change the Mantine adapter.** The Mantine change and the Mantine goldens are already released.
- **Never merge a pull request.** A person reviews and merges every pull request.
- **Never start a fan-out before the Mantine release is published,** with both the code and the goldens.
- **Stop a repeated failure after three attempts.** When the same failure hits a subagent three times, the subagent records the failure in the target repository's `docs/DEVELOPMENT_ISSUES.md` (where the file exists) and reports the failure, instead of trying again.
