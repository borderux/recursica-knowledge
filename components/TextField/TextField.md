# TextField

A TextField (or Input) is a core form control that allows users to type, edit, and submit single-line free-form text or structured alphanumeric data.

---

## Alternate Names
*   Input Field
*   Text Box
*   TextInput
*   Entry Field

---

## When to Use
*   **Free-Form Input Collection**: For gathering unique, single-line text values such as user names, search queries, or email addresses.
*   **Structured String Entries**: To enter formatted identifiers, including phone numbers, URLs, or postal codes.
*   **Secure Value Masking**: When capturing sensitive data, such as passwords or PIN numbers, requiring a visual mask toggled by a visibility control.

---

## When Not to Use
*   **Multi-Line / Paragraph Entries**: For long-form text inputs, descriptions, or comment blocks, use a **Textarea** component to allow scrolling and line breaks.
*   **Strict Predefined Choices**: Do not use a TextField if the user can only enter values from a fixed, set category. Use a **Select**, **Radio Group**, or **Checkbox** to prevent spelling errors and streamline input.
*   **Numeric Range Selection**: Avoid using a plain text input if the user is adjusting values within a strict range (e.g., setting volume levels or budget bounds). Use a **Slider** instead.

---

## Types of Data Edited or Displayed
*   **Free-Form Strings**: User names, custom descriptions, or text queries.
*   **Formatted Inputs**: Structured data validated by pattern filters (e.g., email strings, telephone inputs).
*   **Masked Secure Strings**: Encrypted password entries or sensitive token keys.
*   **Raw Numeric Values**: Clean integer or decimal counts.

---

## Best Practices
*   **Persistent Visual Labels**: Always associate the input field with a clear, persistent text label located outside the input box, ensuring that screen readers and users can identify the field after a value is entered.
*   **Contextual Placeholder Hints**: Utilize placeholder text within the field to present brief examples of the expected input format (e.g., "name@example.com").
*   **Iconography & Utility Slots**: Embed functional icons or small action triggers inside the field limits (such as a search magnifying glass inside the left margin or a password view toggle on the right).
*   **Real-Time Inline Validation**: Provide immediate, non-intrusive feedback if the typed input fails validation (e.g., email format errors). Ensure error messages are displayed below the input box rather than in popovers.
*   **Accessible Focus Indicators**: Ensure the field changes styling dynamically upon focus, applying a clear border color transition or subtle glow ring to guide keyboard-only users.
