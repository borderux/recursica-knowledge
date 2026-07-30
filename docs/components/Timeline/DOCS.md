---
title: "Timeline"
description: "Recursica helps agencies build client digital products faster and more consistently. Our system streamlines design, ensures brand consistency, and improves team collaboration."
previewName: "timeline"
specs:
  - section: "Alignment"
    items:
      - label: "Left"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-alignment-left.svg"
        text: "The timeline access and notes are on the left, with all content appearing to the right."
      - label: "Right"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-alignment-right.svg"
        text: "The timeline access and notes are on the right, with all content appearing to the left."
  - section: "Variants"
    items:
      - label: "Default"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-default.svg"
        text: "The standard style, using a simple dot for the marker."
      - label: "Avatar"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-avatar.png"
        text: "Replace the marker with an avatar component. Use this for activity feeds to show who performed an action."
      - label: "Icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-icon.svg"
        text: "Replace the marker with an icon. Use this to represent the type of event (e.g., a comment icon, a file icon)."
      - label: "Theme icon"
        image: "https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/timeline/assets/timeline-variants-theme-icon.svg"
        text: "Replaces the marker with a high-emphasis icon that has a solid background color."
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
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline

**A timeline lists events that already happened, in order, each with a timestamp.** Reach for it when the reader's question is what happened and when.

## When to use

- **A chronological record read as a sequence**: an audit trail, an incident log, activity on one object, a release history.
- **Order and date matter more than dense detail**: each entry is a short title, a line of description, and a time.
- **Milestones already reached**: a timeline reports what has happened rather than guiding what comes next.
- **Events that happened close together can be grouped**: one entry reads better than three near-identical ones a second apart. The point is a legible sequence, not a complete log.

## When to avoid

- **Guiding someone through a process they are doing now**: use a stepper. A timeline reports; a stepper leads.
- **Order does not matter**: use a list. Implying chronology where there is none misleads the reader.
- **Many records, or records the reader will sort, filter, and compare**: use a table, which is built for volume and comparison.
- **Each entry needs long text, media, or its own controls**: use an accordion, or give each entry its own page.
- **Comparing two parallel tracks side by side**: use two separate views or a table. A timeline asserts one sequence, and two facing columns of events do not read as one.
- **A very long history**: group it by month or quarter, or page through it. A timeline that scrolls without end stops being scannable, which was the reason to use one.

## Specifications

### Alignment

### Variants

### Anatomy

<!--
LEGACY — original content exported from the Recursica website, superseded by the body above.
Retained verbatim so nothing from the old site is lost. Do not render.

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
-->
