---
title: "File upload"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "file-upload"
specs:
  - section: "Style"
    items:
      - label: "Button"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-style-button.svg"
      - label: "Drop zone"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-style-drop-zone.svg"
  - section: "Upload type"
    items:
      - label: "Single-file"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-upload-type-single-file.svg"
      - label: "Multi-file"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-upload-type-multi-file.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Button / Drop zone"
      text: "The primary call-to-action button opens the file browser on click and doubles as a drop zone for dragging and dropping files."
    - num: 3
      label: "File list item"
      text: "Each uploaded file appears as a distinct list item, displaying its name and providing a control to remove them from the queue."
    - num: 4
      label: "Assistive text"
      text: "Can communicate essential constraints, such as maximum file size and supported file formats."
skill:
  name: recursica-skill-file-upload
  path: skills/components/recursica-skill-file-upload
  repository: https://github.com/borderux/recursica-knowledge
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# File upload

**A file upload allows users to select, preview, and manage a list of files before uploading them. It typically includes a distinct area for file selection (like a button or drop zone) and a dynamically generated list of the chosen files.**

## When to use

- **Multi-file selection**: Use when users need to upload multiple files and want to see a clear list of their selections before proceeding.
- **Dedicated upload sections**: Use as a primary feature on a page, such as for adding attachments to a support ticket or uploading documents to a repository.
- **Accessibility & Best Practices**: Provide drag-and-drop support and clear progress indicators.

## When to avoid

- **Inline form fields**: For simple, single-file selections within a dense form, the more compact file input component may be a better fit.
- **Simple uploads**: If the action is just to replace a single image (like a profile picture) without needing a persistent file list, a simpler upload mechanism might be less visually complex.
- **Anti-patterns**: Avoid blocking the main UI thread during large file uploads.

## Specifications

### Style

### Upload type

### Anatomy
