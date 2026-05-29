# Recursica Knowledge & Design System

Welcome to the central knowledge, documentation, and skill store for the **Recursica Design System**. This repository contains premium, structured markdown documentation detailing all UI components, adapter-level mapping guidelines (e.g. Mantine and Material UI), and agentic instruction files.

These resources are designed to be ingested by developers and dynamically served to AI coding assistants via the `recursica-mcp` Model Context Protocol (MCP) server.

## 📝 Documenting a New Component

When adding a new component to the design system, follow these steps to keep the documentation consistent:

1.  **Create a Folder**: Inside `components/`, create a new folder named after the component (e.g., `components/Badge/`).
2.  **Add Markdown File**: Inside that folder, create `<ComponentName>.md` (e.g., `Badge.md`).
3.  **Use the Component Template**: Structure the markdown document using the following template:

```markdown
# Component Name

Short 1-2 sentence description of the component and its primary use case.

## Alternate Names

Other names developers or design systems commonly use for this component (e.g., Collapse, Modal, Dropdown).

## When to Use

Clear guidelines and scenarios where this component is appropriate.

## When Not to Use

Scenarios where an alternative component is more suitable, along with recommendations.

## Types of Data Edited

The types of data, inputs, or states this component is used to manage or display.

## Best Practices

A list of visual, functional, and accessibility guidelines to ensure a premium implementation.
```

4.  **Register the Component**: Add the new component path and description to the root [llms.txt](file:///Users/mattmassey/work/recursica-knowledge/llms.txt) so that LLMs can instantly discover it.
