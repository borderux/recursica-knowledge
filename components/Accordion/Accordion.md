# Accordion

An Accordion is a vertically stacked set of interactive headers that users can expand or collapse to reveal or hide associated content sections. It is a fundamental pattern for progressive disclosure, helping users manage dense information layouts without experiencing cognitive overload.

---

## Alternate Names
*   Collapse
*   Expansion Panel
*   Disclosure
*   Details / Summary

---

## When to Use
*   **Progressive Disclosure**: When presenting complex or dense informational structures (e.g., FAQs, detailed product specs, or terms of service) where most users only need to read one section at a time.
*   **Grouped Configuration Options**: When organizing long forms or settings panels into logical sub-categories (e.g., "Advanced Settings," "Notification Preferences").
*   **Compact Space Optimization**: When working with limited screen real estate, such as mobile layouts or dashboard sidebars, to prevent excessive page scrolling.

---

## When Not to Use
*   **Comparison Layouts**: Avoid using an Accordion if the user needs to view, compare, or correlate information across multiple sections simultaneously.
*   **Short Pages**: Do not use an Accordion if the page content is already concise; hiding small blocks of text behind clicks creates unnecessary interaction cost.
*   **Critical Linear Processes**: For multi-step forms where the user must complete steps in a specific sequential order, use a **Stepper** or multi-page wizard instead.

---

## Types of Data Edited or Displayed
*   **Nested Hierarchical Text**: Structured reference documents, system logs, or frequently asked questions.
*   **Configurable Form Fields**: Grouped form inputs, sliders, and checkboxes representing secondary or advanced system configurations.
*   **Row-Level Details**: Expandable supplementary data associated with individual items in a list or data table.

---

## Best Practices
*   **Descriptive Headers**: Header labels must be concise, explicit, and self-explanatory so users can confidently predict the content inside before expanding.
*   **Expansion Indicators**: Always include a clear visual cue—such as a chevron icon—that rotates dynamically to signify the expanded or collapsed state of each panel.
*   **Default Expansion States**: Leave all panels collapsed by default unless one section is highly likely to be the primary target for the vast majority of users.
*   **Micro-interactions**: Incorporate a smooth, natural transition animation (between 150ms and 250ms) for the panel sliding action. Avoid abrupt transitions.
*   **Focus & Accessibility**: Ensure headers are fully focusable via standard keyboard navigation (`Tab`), and can be toggled using the `Space` or `Enter` keys.
