---
"@recursica/knowledge": minor
---

CircleChat host kit: the Slack notifier posts each agent turn container that CircleChat stopped because it ran past its deadline. Every 5 minutes, CircleChat's bridge stops any turn container still running past its deadline plus the stop grace, and records it in the `turn_container_stops` table (the CircleChat fork). The bridge holds no Slack token, so the notifier posts the record to the stack's channel as the new `container_stopped` event: the agent, the container and how many minutes past its deadline, and no task or conversation.

`container_stopped` is in the quiet default. A stack whose `notify.events` lists its events gets it only when the list names it. The notifier's database role, `cc_notify`, gets read access to the table's four columns. A CircleChat without the table, from before the sweep, posts nothing.
