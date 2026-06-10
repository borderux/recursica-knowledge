# Contributing Component Documentation

The [components/](../components/) folder serves as our specification database. To add a new component specification:

1. Create a folder named after the component (e.g., `components/Badge/`).
2. Add `<ComponentName>.md` (e.g., `Badge.md`) in that directory.
3. Define the component using standard headers:
   - **Component Name**
   - **Alternate Names**
   - **When to Use**
   - **When Not to Use**
   - **Types of Data Edited**
   - **Best Practices**
4. Update the root [llms.txt](../llms.txt) index to reference the new component path.

---

## 🤖 Testing with Local Agents

If you want to use local AI agents (such as Antigravity or Claude) to test, analyze, or generate component documentation in this workspace, make sure that any custom/helper skills you need are properly registered.

To register a skill so that local agents in this repository can load it, you must symlink the skill directory into both the `.agent/skills/` and `.claude/skills/` folders.

For the step-by-step commands to register skills locally, please refer to the **[Local Agent Registration Guide](CONTRIBUTING_SKILL.md#5-local-agent-registration-for-testing)**.
