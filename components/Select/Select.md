# Select

A Select component is an input control that opens a collapsible menu, allowing users to choose a single option from a list of predefined values. It is a key tool for saving vertical layout space while offering users standardized choices.

---

## Alternate Names
*   Dropdown
*   Combo Box
*   Option Picker
*   Selection List

---

## When to Use
*   **Space-Efficient Choice Selection**: When users need to select one option from a medium-sized list (typically between 5 and 50 options) without cluttering the screen.
*   **Standardized Option Control**: To enforce strict option entries (e.g., choosing a country, system role, state/province, or status category) where free-form text input is prone to errors.
*   **Searchable Value Lookups**: When paired with auto-complete search filtering to help users quickly pinpoint options within a longer dataset.

---

## When Not to Use
*   **Extremely Short Lists**: Do not use a Select for lists with 4 or fewer items. To reduce clicks and improve scanning speed, use a **Radio Group** or **Segmented Control** instead.
*   **Binary Settings**: For toggling single on/off preferences (e.g., "Allow cookies"), use a **Switch** or **Checkbox** instead.
*   **Massive Unsorted Datasets**: For open-ended list sets exceeding 100+ items (e.g., searching millions of customer database records), use an **Auto-complete Search Input** or a **Dialog Picker** with advanced search filters.

---

## Types of Data Edited or Displayed
*   **Categorical Enums**: Closed lists of pre-defined system constants (e.g., `["active", "pending", "suspended"]`).
*   **Entity Mappings**: Selecting related database models by choosing a key associated with user-friendly names (e.g., mapping a company department ID via its text label).

---

## Best Practices
*   **Clear Prompts**: Always display an explicit placeholder or default prompt (e.g., "Choose a category...") inside the field before a selection is made.
*   **Live Search Filtering**: Enable live text filtering as the user types if the options list exceeds 8-10 entries, allowing them to bypass scroll fatigue.
*   **Logical Option Sorting**: Arrange dropdown items in a logical order that mirrors user expectations, such as alphabetically, chronologically, or by frequency of use.
*   **Clipping & Overlays**: Ensure the dropdown menu is rendered on a high z-index overlay layer or within a portal, preventing the option panel from being clipped by scrollable parent containers.
*   **Keyboard Navigation**: Full support for standard focus, arrow keys to navigate options, and `Enter`/`Space` keys to select is essential for keyboard accessibility.
