# Checkbox

A Checkbox is an input element that allows users to toggle a single binary setting (e.g., true/false) or select one or more independent options from a predefined list.

---

## Alternate Names
*   Tick Box
*   Selection Square
*   Toggle Input

---

## When to Use
*   **Binary Agreements & Acknowledgments**: To confirm consent, terms, or agreements (e.g., "I accept the Terms and Conditions").
*   **Multi-Select Lists**: When users can select multiple, non-mutually-exclusive options from a category (e.g., selecting multiple hobbies, filters, or user permissions).
*   **Hierarchical Category Control**: For nested option structures, where a parent checkbox controls the activation of multiple child options (utilizing the indeterminate state).

---

## When Not to Use
*   **Single Mutual Exclusion**: If the user must choose exactly one option from a list, use a **Radio Group**, **Select** dropdown, or **Segmented Control** instead.
*   **Instant Action Triggers**: For settings that take effect instantly without a validation or form submission step (e.g., toggling dark mode or activating Wi-Fi), use a **Switch** instead.
*   **Transactional Action Triggers**: Do not use a checkbox to initiate immediate operations (like deleting or saving); use a **Button** instead.

---

## Types of Data Edited or Displayed
*   **Boolean Values**: Single yes/no or true/false flags in databases.
*   **Array Lists**: Collections of active identifiers chosen from a larger available set (e.g., `["admin", "moderator"]`).

---

## Best Practices
*   **Interactive Label Targets**: Ensure the checkbox label is fully clickable, expanding the interactive hit area beyond the tiny check box icon itself.
*   **Vertical Alignment**: Stack checklists vertically to facilitate fast visual scanning and easy keyboard traversal.
*   **Positive Phrasing**: Phrase labels in a positive, active voice (e.g., "Enable daily reports") rather than negative wording (e.g., "Do not disable daily reports"), to avoid double-negative confusion.
*   **Indeterminate Feedback**: Use the indeterminate line icon when a parent checkbox controls multiple children, and only a portion of those children are currently selected.
*   **Clear Validation Styling**: If checking is mandatory, display a clear, accessible error description nearby rather than simply coloring the box red.
