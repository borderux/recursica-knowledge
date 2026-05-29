# Card

A Card is a visual container that groups related information, options, or interactive actions together. By establishing clear boundaries, cards partition page layouts into digestible chunks, making dashboards, feeds, and directories easier to scan and organize.

---

## Alternate Names
*   Container
*   Panel
*   Tile
*   Board

---

## When to Use
*   **Grouping Composite Records**: When presenting associated details about a single entity, such as a user profile (avatar, name, email, action buttons), a product summary, or an article preview.
*   **Grid and Dashboard Layouts**: To establish distinct, repeatable modules within dashboard layouts, analytical dashboards, or content feeds.
*   **Section Separation**: When a page layout contains multiple unrelated widgets or forms that require clear visual isolation to prevent confusion.

---

## When Not to Use
*   **High-Density Clutter**: Avoid nesting cards within other cards or stacking too many cards on a single page, as this creates excessive visual noise and compromises scanability.
*   **Unstructured General Text**: Do not use a card simply to display consecutive paragraphs of standard reading text; let the typography rely on general white space instead.
*   **Tabular Data Comparison**: When users need to compare simple, matching fields across 10 or more items, use a **Data Table** instead of repeating cards.

---

## Types of Data Edited or Displayed
*   **Composite Records**: Complex data objects containing combinations of text, metrics, images, and action states.
*   **Dashboard Metrics**: Single-value data aggregates (e.g., "Total Active Users: 12,450") paired with simple trends or chart elements.
*   **Self-Contained Form Blocks**: Independent settings sections or configuration widgets.

---

## Best Practices
*   **Consistent Padding & Spacing**: Maintain consistent inner paddings (e.g., 16px or 24px) across all card layouts to establish a predictable reading rhythm.
*   **Subtle Visual Enclosures**: Define card boundaries using very soft drop shadows or thin, high-contrast borders rather than heavy, dark gridlines.
*   **Interactive Elevation**: If the entire Card is clickable, apply a subtle hover micro-animation, such as a slight upward translation (`translateY(-2px)`) or elevated shadow, to signify interactivity.
*   **Responsive Scaling**: Design cards to wrap cleanly in flexible grid layouts, ensuring they adjust size naturally across desktop, tablet, and mobile displays.
