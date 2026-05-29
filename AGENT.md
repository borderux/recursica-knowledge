# AGENT.md - System Instructions for AI Coding Assistants

This document serves as the official system instruction and handbook for AI coding agents developing, extending, or consuming the **Recursica Design System**.

Any agent writing code within Recursica adapter packages (`mui-adapter`, `mantine-adapter`) or building downstream projects must adhere strictly to the guidelines defined below.

---

## 📐 1. The Recursica Architecture

Recursica utilizes a decoupled, adapter-based architecture. This architecture splits component definitions from concrete library implementations:

```
                      +-------------------+
                      |  adapter-common   |
                      | (Core Interfaces) |
                      +---------+---------+
                                |
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
+-------+-----------+                           +-------+-----------+
|    mui-adapter    |                           |  mantine-adapter  |
|  (MUI Components) |                           | (Mantine Comp.)   |
+-------------------+                           +-------------------+
```

- **`adapter-common`**: Defines the shared TypeScript interfaces, design tokens, utility functions, and prop specifications. All adapter packages must extend and enforce these contracts.
- **Adapters (`mui-adapter`, `mantine-adapter`)**: The concrete implementations that translate Recursica's abstract props into styled components utilizing the underlying target library (MUI or Mantine).

---

## 🎨 2. Aesthetic & Styling Guidelines

Recursica is built to deliver **premium, state-of-the-art visual experiences**. When rendering or modifying UI components, agents must prioritize rich aesthetics:

1.  **Harmonious Color Palettes**:
    - Avoid generic CSS colors (`red`, `blue`, `#00ff00`).
    - Use carefully selected primary, secondary, and neutral palettes defined in the Recursica theme system.
    - Leverage semi-transparent backgrounds and backdrops (`rgba` or `hsla`) to implement glassmorphism when appropriate.
2.  **Typography & Hierarchy**:
    - Ensure distinct differences in weights (e.g., Light 300, Regular 400, Medium 500, Semi-Bold 600, Bold 700).
    - Always structure headers hierarchically (`h1` -> `h2` -> `h3`) for screen readers and SEO correctness.
3.  **Micro-Animations & Transitions**:
    - All interactive elements (buttons, accordion headers, dropdown options, text inputs) must feature smooth transitions (`transition: all 0.2s ease-in-out`).
    - Use subtle hover transformations (e.g., `transform: translateY(-1px)` or opacity adjustments) to keep the application feeling responsive and alive.
4.  **No Placeholders**:
    - Never render generic grey blocks for images or text. Use generated visual media or realistic contextual dummy text.

---

## 🚀 3. Coding Workflow & Component Selection

When tasked with building or editing a user interface, AI agents must follow this systematic process:

### Step 1: Discover & Map Components

Before writing a component from scratch, search the `recursica-knowledge` base (or use the MCP `list_components` tool) to see if a matching component already exists (e.g. `Accordion`, `TextField`).

- **RULE**: If a Recursica component exists, you **MUST** use it. Do not write raw HTML elements (`<button>`, `<input>`) or pull components directly from MUI/Mantine.

### Step 2: Configure Layouts via Tokens

Align components using Recursica spacing and layout props. Do not use ad-hoc pixel values in your styles.

- **Good**: `<Card padding="md" radius="lg">`
- **Bad**: `<div style={{ padding: '14px', borderRadius: '10px' }}>`

### Step 3: Implement Adapters Correctly

When working inside an adapter package (e.g., `packages/mui-adapter`), ensure you:

1.  Import core types from `@recursica/adapter-common`.
2.  Map Recursica-specific props to the corresponding target library properties.
3.  Ensure the styling conforms to the target library's theme provider system to ensure uniform spacing and color application.

---

## ⚠️ 4. Common Anti-Patterns to Avoid

- ❌ **Bypassing the Adapter**: Importing standard MUI or Mantine components directly into downstream projects without using the Recursica adapter wrappers. This breaks library interchangeability.
- ❌ **Direct Style Overrides**: Overriding component visuals using nested CSS sheets that bypass Recursica's theme variables.
- ❌ **Incomplete Prop-Mapping**: Creating new features in `mui-adapter` without checking if the same props are implemented or stubbed in `mantine-adapter`, leading to cross-adapter drift.
- ❌ **Skipping Accessibility**: Neglecting `aria-*` tags, keyboard focus rings, and proper semantic HTML elements.
