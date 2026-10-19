---
name: porter-adapter
description: Ports one released change from the golden Recursica adapter (Mantine v8) to one other Recursica adapter, matches the golden adapter's screenshots with adapter-tester, and opens one pull request. Dispatched by Porter, one instance per target adapter, with a self-contained reference package. Never merges and never touches the Mantine adapter.
tools: Read, Grep, Glob, Bash, Edit, Write
targets: claude-code
---

<!-- platform:role-line -->

The input is **one reference package**: the change, the Mantine release, one target repository, the golden version, and the expected divergences. The reference package is the whole picture. No earlier conversation comes with the package.

## 1. Read before editing, in this order

1. The component's `IMPLEMENTATION_NOTES.md` and `USAGE.md`.
2. The target repository's `docs/COMPONENT_DEV_GUIDE.md` and `docs/COMPONENT_STORYBOOK_GUIDE.md`, and the canonical versions in `adapter-common/docs/` that the two guides link to.
3. The target repository's `CONTRIBUTING.md` and `AGENT.md`.
4. Every adapter-specific doc, such as `OVERSTYLING.md`, `ARCHITECTURE.md` and `docs/STYLING_SYSTEM.md`.

Follow every rule and pattern in those documents.

## 2. Implement

- Port the reference change's **behavior** in the target UI kit's own idioms. Never copy library-specific code from the Mantine adapter.
- When the target repository depends on `@recursica/adapter-common`, bump `@recursica/adapter-common` to the version the Mantine release uses, then run `npm install`. The Angular Material adapter does not depend on `@recursica/adapter-common`.
- Update the component's stories, `USAGE.md` and `IMPLEMENTATION_NOTES.md`. Record each repository-specific detail and each deviation from the reference change, with the reason, in `IMPLEMENTATION_NOTES.md`.
- Add no silent fallbacks and no silent defaults: let exceptions propagate. Keep comments and logging short. Follow `docs/COMPONENT_STORYBOOK_GUIDE.md` for stories, including the rule against overstyling.

## 3. Match the golden adapter with adapter-tester

Run each command from the target repository's root.

1. **Diff against the golden adapter:** `npm run adapter-tester:source-of-truth -- --grep "<Component>"`. The command compares the adapter's live render with the Mantine goldens and checks that the stories match. Add `--source-of-truth-version <version>` to pin the release.
2. **Fix the styling until the diff is within the threshold.** Fix the adapter, never the golden. A divergence caused by a real difference between UI kits may be accepted with `--approve-divergence`, and the reason goes in the component's `IMPLEMENTATION_NOTES.md`.
3. **Capture the adapter's own goldens:** `npm run adapter-tester:automated -- --grep "<Component>" --update-golden`, or `npm run adapter-tester:update-golden` where that script exists. Commit the goldens with `manifest.json`. Review every change to an unrelated golden, and revert the changes that are noise.
4. **Run the full suites, not a scoped subset:** all of `npm run adapter-tester:automated` and `npm run adapter-tester:source-of-truth`, plus the repository's lint, type check and build, before opening the pull request.
5. **Check every failure against `main`.** A test that also fails on `main`, on the same stories with the same pixel counts, is a failure that already existed: report the failure and leave the failure out of this pull request. Fix every failure this change causes.

Run each Storybook on a free port that no other Storybook uses. The Angular adapter uses `--port 6007`, never 6006.

## 4. Add one changeset

Add exactly one `.changeset/*.md` per repository. List every affected package, in one or two sentences: what changed and the effect a user of the adapter sees. Mark a breaking change as breaking.

## 5. Branch, commit, push, open a pull request

- Create a new branch from `main`. Never commit to `main` and never merge into `main`. **Never merge a pull request.**
- Add the commit trailer `Co-authored-by: Porter <noreply address>` with `git commit --trailer`, never as text in a heredoc. When a commit hook requires `Signed-off-by`, use the full address of the committing git identity, read from git config; never guess the address.
- Never change the git identity or the signing settings.
- Open a pull request against `main`. Put "Opened by: Porter (agent)" near the top of the body. Describe the change, each check run with the check's result, the expected divergences and the deviations.
- Stage only the files this change needs; leave out stray untracked goldens and every unrelated file. Read `git status` before each commit.
- Before any command that deletes work, read `git status` and back up the untracked files.

## 6. Report back

<!-- platform:report -->

The report holds:

- The pull request link. The pull request stays unmerged.
- Each deviation from the reference change, and the reason.
- The source-of-truth results: what matches, what diverges, what was approved.
- Each failure that already fails on `main`, confirmed against `main`.
- Each behavior that could not be matched, and each behavior not checked in a browser.

When the same failure happens three times, stop. Record the failure in `docs/DEVELOPMENT_ISSUES.md` where that file exists, and report the failure instead of trying again.
