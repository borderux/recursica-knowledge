# AGENT.md - Guide for Creating & Extending Agent Skills

This document defines the official guidelines and architectural rules for developers creating, extending, or maintaining **Recursica Knowledge** agent skills.

Any agent or developer contributing skills to this repository must follow the conventions outlined below to ensure compatibility, efficiency, and high-quality UI generation.

---

## 📏 1. The Recursica Architecture

All skills generated here should guide AI assistants to respect Recursica's decoupled, adapter-based design system. AI agents must keep component definitions isolated from target libraries:

- **`adapter-common`**: Defines the shared TypeScript interfaces, design tokens, utility functions, and props.
- **Adapters (`mui-adapter`, `mantine-adapter`)**: The concrete implementations mapping Recursica props to Material UI or Mantine.
- **Guideline**: Skills must instruct downstream AI agents to _only_ import abstract components from the appropriate adapter package, rather than raw target library components or raw HTML.

---

## 🎨 2. Skill Styling & Aesthetic Rules

Recursica is designed for **premium visual experiences**. When writing instructions for skills (e.g. how the agent should build components), enforce the following:

1. **Design Tokens**: Do not use ad-hoc pixel overrides. Use theme variables (e.g., `<Card padding="md" radius="lg">` instead of `style={{ padding: '14px' }}`).
2. **Micro-Animations**: Require smooth transitions (`transition: all 0.2s ease-in-out`) and interactive states (hover transformations, active states).
3. **Typography**: Enforce hierarchical headers (`h1` -> `h2` -> `h3`) for SEO and accessibility.

---

## 🧠 3. How to Create a New Agent Skill

A skill consists of procedural instructions that load into an AI agent's context on-demand. To add a new skill to the marketplace:

### Step 1: Create the Skill Directory

Under the `skills/` folder, create a new subdirectory named with a lowercase, hyphen-separated identifier:

```bash
mkdir skills/my-new-skill
```

### Step 2: Create the `SKILL.md`

Inside that folder, create a `SKILL.md` file. It must follow this exact format:

```markdown
---
name: my-new-skill
description: A concise 1-2 sentence description explaining when Claude should trigger this skill.
version: 1.0.0
---

# My New Skill Title

Detailed guidelines, step-by-step instructions, and output examples explaining what the AI agent should do when this skill is activated.
```

### Step 3: Design the Trigger Description (Crucial)

The `description` field in the YAML frontmatter controls **Progressive Disclosure**. At startup, Claude only loads this description. Write it carefully so Claude knows exactly when to load the full skill:

- **Good**: `"Trigger this when the developer asks to design, write, or refactor a UI layout containing forms or text input fields."`
- **Bad**: `"Instructions for form components."` (too vague, won't trigger reliably).

### Step 4: Register in the Marketplace Manifest

Open [.claude-plugin/marketplace.json](file:///Users/mattmassey/work/recursica-knowledge/.claude-plugin/marketplace.json) and add your skill path to the `skills` array under the `recursica-knowledge` plugin list:

```json
{
  "name": "recursica-knowledge",
  "plugins": [
    {
      "name": "recursica-knowledge",
      ...
      "skills": [
        "./skills/recursica-component-selector",
        "./skills/my-new-skill"
      ]
    }
  ]
}
```

---

## ⚠️ 4. Common Anti-Patterns to Avoid in Skills

- ❌ **Over-stuffing the Context**: Avoid putting static component specs directly inside the `SKILL.md` file. Instead, instruct the agent to read the matching Markdown file inside the [components/](file:///Users/mattmassey/work/recursica-knowledge/components/) folder.
- ❌ **Ambiguous YAML name**: Using capital letters or spaces in the YAML frontmatter `name` key. Keep it kebab-case (e.g. `recursica-component-selector`).
- ❌ **Unregistered Skills**: Creating a skill folder under `skills/` but forgetting to add its path to `marketplace.json`, which makes it undiscoverable by the plugin loader.
