---
title: "Timeline"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "timeline"
specs:
  - section: "Alignment"
    items:
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-alignment-left.svg"
      - label: "Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-alignment-right.svg"
  - section: "Variants"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-default.svg"
      - label: "Avatar"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-avatar.png"
      - label: "Icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-icon.svg"
      - label: "Theme icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-theme-icon.svg"
anatomy:
  image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-anatomy.svg"
  items:
    - num: 1
      label: "Node / Marker"
      text: "A visual indicator of the event's status. It is customizable with variants for a default point, an avatar, a standard icon, or a theme icon to represent the type of event or its status visually."
    - num: 2
      label: "Connecting line"
      text: "Visually links sequential events to establish the chronological flow of the timeline. The highlighted state indicates the flow between completed events, while the default state connects to pending or future events."
    - num: 3
      label: "Title"
      text: "The head of the event."
    - num: 4
      label: "Value"
      text: "The descriptive body text of the event."
    - num: 5
      label: "Timestamp"
      text: "Text displaying the time of the event."
skill:
  name: recursica-skill-timeline
  path: skills/components/recursica-skill-timeline
  repository: https://github.com/borderux/recursica-knowledge
---

# Timeline

**A timeline is a component that visualizes a series of events in a clear, sequential order. It uses a vertical line with nodes or markers to represent specific points in time.**

## When to use

- **Chronological storytelling**: Communicate a sequence of events (project milestones, product history, user journey) in a clear, time-ordered flow.
- **Milestone tracking**: Show progress across defined checkpoints with statuses (upcoming, current, completed) at a glance.
- **Process education**: Explain how something unfolds step-by-step (onboarding, compliance steps, research phases).
- **Release notes & changelogs**: Present dated updates where the date/order matters more than dense detail.
- **Incident or case timeline**: Document what happened and when (alerts, actions taken, resolution) for transparency and review.
- **Comparative streams**: Lay out parallel tracks (e.g., left/right columns) to compare two related timelines side-by-side.
- **Accessibility & Best Practices**: Order events chronologically and group events that happen closely together.

## When to avoid

- **Unordered or categorical lists**: If order doesn’t matter, use a list, cards, or grid instead of implying chronology.
- **High-frequency feeds**: Real-time, rapidly updating content (chat, logs) overwhelms the timeline; use an activity feed/table.
- **Deep, complex content**: If each item needs long text, media, or interactions, prefer expandable lists, accordions, or pages.
- **Too many items**: Very long histories become hard to scan. Switch to pagination, grouping (by month/quarter), or summaries.
- **Ambiguous dates**: When exact ordering is unknown or approximate, a grouped list or board may communicate better.
- **Decision flows**: For branching logic or dependencies, use a flowchart/graph rather than a linear timeline.
- **Anti-patterns**: Don't use timelines for non-sequential data.

## Specifications

### Alignment

### Variants

### Anatomy
