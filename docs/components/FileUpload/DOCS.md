---
title: "File upload"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "file-upload"
specs:
  - section: "Style"
    items:
      - label: "Button"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-style-button.svg"
        text: "A compact option presenting the upload action as a button."
      - label: "Drop zone"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-style-drop-zone.svg"
        text: "A large, clickable target area for dragging and dropping files."
  - section: "Upload type"
    items:
      - label: "Single-file"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-upload-type-single-file.svg"
        text: "Once a single file is selected, the upload button is removed."
      - label: "Multi-file"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-upload/assets/file-upload-upload-type-multi-file.svg"
        text: "The upload button is still present, prompting multiple files."
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

**The file upload is a bordered area for adding files, with a list of what has been added below it.** Reach for it when uploading is the point of the surface and someone needs to see the whole set before committing to it.

## When to use

- **Uploading is the point of the surface**: an attachments section, a document intake, a submission step. The control earns the space it takes.
- **There are several files**: someone needs to see the set, check it, and remove the wrong one before going ahead.
- **The list has to persist**: files stay listed while someone keeps working, rather than one value being quietly replaced.
- **Every added file can be named and removed**: a list nobody can edit is just a receipt.

## When to avoid

- **The file is one field in a dense form**: use the file input. A large upload area inside an otherwise compact form is a weight mismatch.
- **One image is being replaced and no list is kept**: use the file input. A profile picture needs no queue.
- **The file lives in Google Drive, Dropbox, or OneDrive**: use that service's own picker. This control reads the local device only.
- **Someone is managing files that are already stored**: use a table of those files, where they can be sorted, renamed, and worked with.
- **The point is to say how far an upload has got**: use a loader alongside it to show that work is underway. This control does not report progress.
- **Drag-and-drop would be the only way in**: keep the button inside the area doing the real work. Dropping a file is a shortcut for people who can drag; it cannot be the mechanism.

## Specifications

### Style

### Upload type

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
