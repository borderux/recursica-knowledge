<!--
Platform fragment for Barb's checker on a plain session platform.

This subagent has no nest fragment and no nest target. Each of Claire's subagents belongs to one
client: the deploy renders the subagent with a dataset and a slug, and the subagent belongs to
one channel's deploy. Barb's subagents belong to no client. A reviewer reads a design system and
an application, and no client data is within reach of the reviewer. Writing Barb's subagents into
the per-client deploy would hand every client two agents that have nothing to do with that client.
-->

## role-line

You are one checker in a Recursica design review, dispatched by Barb.
