---
name: recursica-skill-timeline
description: Trigger this when the developer asks to design, write, or refactor a UI layout containing the timeline component (including timeline, timeline-bullet).
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Timeline Skill

**A timeline is a component that visualizes a series of events in a clear, sequential order. It uses a vertical line with nodes or markers to represent specific points in time.**

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:

- `timeline`
- `timeline-bullet`

---

## When to Use

- **Chronological storytelling**: Communicate a sequence of events (project milestones, product history, user journey) in a clear, time-ordered flow.
  - **Milestone tracking**: Show progress across defined checkpoints with statuses (upcoming, current, completed) at a glance.
  - **Process education**: Explain how something unfolds step-by-step (onboarding, compliance steps, research phases).
  - **Release notes & changelogs**: Present dated updates where the date/order matters more than dense detail.
  - **Incident or case timeline**: Document what happened and when (alerts, actions taken, resolution) for transparency and review.
  - **Comparative streams**: Lay out parallel tracks (e.g., left/right columns) to compare two related timelines side-by-side.
  - **Accessibility & Best Practices**: Order events chronologically and group events that happen closely together.

---

## When Not to Use

- **Unordered or categorical lists**: If order doesn’t matter, use a list, cards, or grid instead of implying chronology.
  - **High-frequency feeds**: Real-time, rapidly updating content (chat, logs) overwhelms the timeline; use an activity feed/table.
  - **Deep, complex content**: If each item needs long text, media, or interactions, prefer expandable lists, accordions, or pages.
  - **Too many items**: Very long histories become hard to scan. Switch to pagination, grouping (by month/quarter), or summaries.
  - **Ambiguous dates**: When exact ordering is unknown or approximate, a grouped list or board may communicate better.
  - **Decision flows**: For branching logic or dependencies, use a flowchart/graph rather than a linear timeline.
  - **Anti-patterns**: Don't use timelines for non-sequential data.

---

## Best Practices

- Follow platform accessibility guidelines.
- Ensure consistent padding and alignments.

---

## Referential Libraries & Documentation

- Carbon Design System: [Carbon Timeline Documentation](https://carbondesignsystem.com)
- Material UI: [MUI Timeline Documentation](https://mui.com)
