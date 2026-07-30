# Contributing Component Documentation

The [components/](components/) folder holds the design-system **website's** component pages, one folder per component containing a `DOCS.md`.

> **These pages are not the agent knowledge base.** Build agents read only the `SKILL.md` files under [../skills/](../skills/). A `DOCS.md` is human-facing website content — do not treat it as guidance, and do not symlink one into a skill folder. See [AGENT.md](../AGENT.md) for the boundary.

## Adding a component page

1. Create a folder named after the component in PascalCase — `docs/components/Badge/`.
2. Add a `DOCS.md` inside it.
3. Write the **frontmatter**, which is what the website actually renders:
   - `title` — the display name, sentence case (`Read-only field`, `Text area`).
   - `description` — the standard site description.
   - `previewName` — the component's kebab-case key.
   - `specs` — a list of sections, each with a `section` name and `items` carrying a `label` and an `image`.
   - `anatomy` — an `image` plus numbered `items`.
   - `license`, `metadata.author`, `metadata.version`.
4. Write the **body**, which follows a fixed contract so every page renders identically:
   - `# <title>`, then a bold one-line definition and a sentence or two on when to reach for it.
   - Exactly three `##` sections, in this order: `When to use`, `When to avoid`, `Specifications`.
   - Under `Specifications`, one `###` heading per `specs[].section` in the same order, plus `### Anatomy` if anatomy exists. **Leave these headings empty** — the site fills them from the frontmatter.
   - Every `When to avoid` bullet names the alternative component, which is what makes the section useful.
5. Keep the voice human: plain, warm, no token names, no prop names, no accessibility implementation detail, no open questions.
6. If the page is replacing earlier content, retain the old body verbatim inside a single HTML comment marked `LEGACY` at the end of the file, so nothing from the earlier site is lost.
7. Update the root [llms.txt](../llms.txt) index if the component is new.

## When the page and the skill disagree

The skill wins. Record the discrepancy in [open-questions.md](open-questions.md) rather than changing a skill to match the site — the token inventory and the recorded design rules are the authorities, in that order.

---

## 🤖 Testing with Local Agents

If you want to use local AI agents (such as Antigravity or Claude) to test, analyze, or generate documentation in this workspace, make sure that any custom/helper skills you need are properly registered.

To register a skill so that local agents in this repository can load it, you must symlink the skill directory into both the `.agent/skills/` and `.claude/skills/` folders.

For the step-by-step commands to register skills locally, please refer to the **[Local Agent Registration Guide](CONTRIBUTING_SKILL.md#5-local-agent-registration-for-testing)**.
