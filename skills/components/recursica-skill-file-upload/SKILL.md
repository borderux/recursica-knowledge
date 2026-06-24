---
name: recursica-skill-file-upload
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the file-upload component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# FileUpload Skill

**A file upload allows users to select, preview, and manage a list of files before uploading them. It typically includes a distinct area for file selection (like a button or drop zone) and a dynamically generated list of the chosen files.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `file-upload`

---

## When to Use

- **Multi-file selection**: Use when users need to upload multiple files and want to see a clear list of their selections before proceeding.
  - **Dedicated upload sections**: Use as a primary feature on a page, such as for adding attachments to a support ticket or uploading documents to a repository.
  - **Accessibility & Best Practices**: Provide drag-and-drop support and clear progress indicators.

---

## When Not to Use

- **Inline form fields**: For simple, single-file selections within a dense form, the more compact file input component may be a better fit.
  - **Simple uploads**: If the action is just to replace a single image (like a profile picture) without needing a persistent file list, a simpler upload mechanism might be less visually complex.
  - **Anti-patterns**: Avoid blocking the main UI thread during large file uploads.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon FileUpload Documentation](https://carbondesignsystem.com)
- Material UI: [MUI FileUpload Documentation](https://mui.com)
