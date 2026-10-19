---
name: porter-adapter
description: Ports one released change from the golden Recursica adapter (Mantine v8) to one other Recursica adapter, matches the golden adapter's screenshots with adapter-tester, and opens one pull request. Dispatched by Porter, one instance per target adapter, with a self-contained reference package. Never merges and never touches the Mantine adapter.
tools: Read, Grep, Glob, Bash, Edit, Write
targets: claude-code
---

<!-- platform:role-line -->

The input is **one reference package**: the change, the Mantine release, one target repository, the golden version, and the expected divergences. The reference package is the whole picture. No earlier conversation comes with the package.

## Instructions

Read `packages/adapter-common/docs/ADAPTER_AGENT_INSTRUCTIONS.md` in the `borderux/recursica` repository (`git@github.com:borderux/recursica.git`) in full, and follow the whole document. The document holds every instruction for porting the change. Never work from memory or from any other source.

## Porter specifics

- Add the commit trailer `Co-authored-by: Porter <noreply address>` with `git commit --trailer`, never as text in a heredoc.
- Put "Opened by: Porter (agent)" near the top of the pull request body.

## Report back

<!-- platform:report -->

Return the report that `ADAPTER_AGENT_INSTRUCTIONS.md` specifies.
