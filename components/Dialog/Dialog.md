# Dialog

A Dialog is a prominent overlay panel that sits on top of the main application view. It temporarily interrupts the user's workflow to focus their full attention on critical alerts, confirmations, or sub-tasks, demanding explicit action before they can return to the main interface.

---

## Alternate Names

- Modal
- Overlay Window
- Popup Box
- Lightbox

---

## When to Use

- **High-Risk Confirmations**: To verify destructive, irreversible, or high-risk actions (e.g., permanent file deletions, database resets).
- **Focused Sub-Tasks**: For completing short, localized data inputs without navigating the user away from their current page context (e.g., adding a new contact, changing a password).
- **Critical System Alerts**: To display urgent warnings or information that requires immediate attention or acknowledgment before continuing (e.g., expired sessions, connection losses).

---

## When Not to Use

- **Complex Multi-Step Workflows**: Avoid loading complex, multi-page forms, dashboards, or heavy wizards into a dialog window. If the workflow requires extensive data entry, dedicate a **full page** to it.
- **Contextual Reference Requirements**: Do not use a dialog if the user needs to refer back to or compare information visible on the main page background while completing the task. Use a **Drawer** (slide-out side panel) or inline section instead.
- **Frequent Non-Critical Prompts**: Avoid using intrusive modals for low-importance notifications, promotions, or generic messages, as this breaks user flow and leads to "modal fatigue."

---

## Types of Data Edited or Displayed

- **Action Confirmations**: Simple confirm/cancel binary decisions.
- **Self-Contained Sub-Forms**: Compact structures of forms, inputs, and selections.
- **Focal Information Overviews**: Media previews, detailed item views, or localized logs.

---

## Best Practices

- **Intuitive Escape Vectors**: Always provide multiple, effortless methods to dismiss the dialog: a highly visible "X" close button in the top corner, backdrop clicks, and standard `Escape` key capture.
- **Background Scroll Lock**: Always lock the main application viewport's scrollbar when the dialog is open to prevent confusing double-scroll behaviors.
- **Explicit Action Headers**: The dialog title must state the core action or decision clearly (e.g., "Delete 4 Files" rather than generic titles like "Confirm").
- **Keyboard Trapping**: Implement focus-trapping inside the modal container when active. Tabbing must loop through the dialog's interactive elements and never bleed into the hidden page underneath.
- **Visual Dominance & Dimming**: Use a dark, blurred, or semi-transparent backdrop overlay to visually push the main page content into the background, focusing attention on the dialog.
