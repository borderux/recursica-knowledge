# Button

A Button is an interactive element that triggers an immediate action or workflow when clicked or tapped. It is the primary vehicle for user intent and decision-making across forms, toolbars, and transactional interfaces.

---

## Alternate Names

- Action Trigger
- Call to Action (CTA)
- Key Action

---

## When to Use

- **Transactional Actions**: To submit forms, confirm settings, save changes, or execute operations (e.g., "Add to Cart," "Publish Document").
- **Workflow Navigation**: To open secondary overlay states, such as dialogs, drawers, or dropdown menus.
- **Primary System Controls**: To initiate interactive behaviors like searching, filtering, or downloading data.

---

## When Not to Use

- **Text Navigation**: Do not use a Button for standard text links that navigate the user to another page or external site. Use an anchor **Link** instead.
- **Exclusive Choice Selection**: Avoid using a cluster of buttons if the user needs to select a single option from a predefined list. Use a **Segmented Control**, **Radio Group**, or **Select** dropdown instead.
- **Inline Contextual Actions**: For minor or inline actions inside a dense text passage, use a text link or a subtle icon button rather than a prominent button block.

---

## Types of Data Edited or Displayed

- **Form Submission & Validation States**: Acts as the physical trigger to submit input data, often reflecting validation states (e.g., disabled until the form is valid).
- **Process & Loading States**: Displays temporary asynchronous states, such as changing the label or showing a spinner during API transactions.

---

## Best Practices

- **Action-Oriented Labels**: Use clear, concise action verbs (e.g., "Save Changes," "Delete Folder," "Create Account") rather than generic words like "Submit," "OK," or "Yes."
- **Visual Hierarchy**: Establish a clear distinction between primary actions (high-contrast, filled buttons), secondary actions (outlined buttons), and tertiary/cancel actions (text buttons).
- **Interactive Micro-feedback**: Ensure buttons respond instantly to hover, active (clicked), and focus states using subtle scale changes, opacity shifts, or color transitions.
- **Touch Targets**: Maintain a minimum interactive area of 44x44 pixels on touch-screen devices to ensure ease of tap navigation.
- **Destructive Safeguards**: Style destructive actions (like "Delete" or "Deactivate") with error colors (e.g., red) and pair them with a confirmation step to prevent accidental loss of data.
