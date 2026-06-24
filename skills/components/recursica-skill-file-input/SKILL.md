---
name: recursica-skill-file-input
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the file-input component.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# FileInput Skill

**A file Input is a form control that allows users to select one or more files from their local device for upload. It displays the selection and provides a way for users to clear it.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `file-input`

---

## When to Use

- **Uploading files**: Use when when you need a user to upload a file from their local system. Common use cases include: Uploading a profile picture, attaching documents to a support ticket or an email, submitting assignments or reports, or uploading photos or videos to a gallery.
  - **Accessibility & Best Practices**: Clearly indicate accepted file types and maximum file sizes.

---

## When Not to Use

- **Bulk file management**: If users need to upload a large number of files or manage a folder structure, a simple file input is inadequate. A more advanced multi-file uploader with progress bars and drag-and-drop support is a better solution.
  - **Cloud based files**: To select a file from a service like Google Drive, Dropbox, or OneDrive, use a specific API integration or a dedicated file picker for that service.
  - **Anti-patterns**: Don't start the upload automatically without clear user intent or visual feedback.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon FileInput Documentation](https://carbondesignsystem.com)
- Material UI: [MUI FileInput Documentation](https://mui.com)
