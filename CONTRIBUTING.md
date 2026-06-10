# Contributing to Recursica Knowledge

Thank you for contributing to the Recursica Design System Agent Skills and Knowledge base!

---

## 🛠️ Adding New Components

The [components/](file:///Users/mattmassey/work/recursica-knowledge/components/) folder serves as our specification database. To add a new component specification:

1. Create a folder named after the component (e.g., `components/Badge/`).
2. Add `<ComponentName>.md` (e.g., `Badge.md`) in that directory.
3. Define the component using standard headers:
   - **Component Name**
   - **Alternate Names**
   - **When to Use**
   - **When Not to Use**
   - **Types of Data Edited**
   - **Best Practices**
4. Update the root [llms.txt](file:///Users/mattmassey/work/recursica-knowledge/llms.txt) index to reference the new component path.

---

## 🧠 Creating & Extending Skills

To write new skills or modify existing behavior, see [AGENT.md](file:///Users/mattmassey/work/recursica-knowledge/AGENT.md) for detailed guidelines on writing, testing, and registering Agent Skills in the marketplace.
