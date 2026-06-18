---
title: "File input"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "file-input"
specs:
  - section: "Label placement"
    items:
      - label: "Top"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-label-placement-top.svg"
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-label-placement-left.svg"
  - section: "Content"
    items:
      - label: "Placeholder"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-content-placeholder.svg"
      - label: "Single file"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-content-single-file.svg"
      - label: "Multiple files"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-content-multiple-files.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/file-input/assets/file-input-anatomy.svg"
  items:
    - num: 1
      label: "Label"
      text: 'Should indicate some kind of instruction for selection. If majority of fields are required in a single form, the "Option" label can be toggled on. If majority of fields are optional, the "Required asterisks" should instead be toggled on.'
    - num: 2
      label: "Upload icon"
      text: "Helps to indicate items can be uploaded to this field."
    - num: 3
      label: "Assistive text"
      text: "Can communicate essential constraints, such as maximum file size and supported file formats."
    - num: 4
      label: "File chip"
      text: "Each uploaded file is represented by a dismissible chip that displays the truncated file name."
    - num: 5
      label: "Clear icon (Optional)"
      text: "Allows the user to remove all added files at once."
skill:
  name: recursica-skill-file-input
  path: skills/components/recursica-skill-file-input
  repository: https://github.com/borderux/recursica-knowledge
---

# File input

**A file Input is a form control that allows users to select one or more files from their local device for upload. It displays the selection and provides a way for users to clear it.**

## When to use

- **Uploading files**: Use when when you need a user to upload a file from their local system. Common use cases include: Uploading a profile picture, attaching documents to a support ticket or an email, submitting assignments or reports, or uploading photos or videos to a gallery.
- **Accessibility & Best Practices**: Clearly indicate accepted file types and maximum file sizes.

## When to avoid

- **Bulk file management**: If users need to upload a large number of files or manage a folder structure, a simple file input is inadequate. A more advanced multi-file uploader with progress bars and drag-and-drop support is a better solution.
- **Cloud based files**: To select a file from a service like Google Drive, Dropbox, or OneDrive, use a specific API integration or a dedicated file picker for that service.
- **Anti-patterns**: Don't start the upload automatically without clear user intent or visual feedback.

## Specifications

### Label placement

### Content

### Anatomy
