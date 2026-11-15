---
"@recursica/knowledge": minor
---

CircleChat host kit: site.json's `notify.events` chooses the CircleChat events the Slack notifier posts. A mention of a person goes only as a DM.

- **A quiet default.** Without `notify.events`, the notifier posts 5 events:
  - A task comment that mentions a person.
  - An approval that waits for a person.
  - A task in review.
  - 2 warnings about an agent reply that never reached a person.

  `"all"` sends every event, and `[]` sends none.
- **A mention goes as a DM.** A task comment that mentions a person goes as a DM from the Slack app, never to the stack's channel. Each mentioned person on `notify.people` gets the DM. A mentioned person not on the list gets nothing. The log names the person's handle, never the text.
- **`notify.people`** maps each person's CircleChat email to the person's Slack user ID.
- **2 new events.** `approval_pending` posts each agent action that waits for approval in CircleChat. `chat_mention` sends a DM for a mention in a channel's message, and stays off by default.
- **With `notify.details` off,** a mention DM names no task, author or text, and an approval note names no agent or action.
- The cluster's own alerts, approvals and buttons stay as before.

### Upgrading

1. **Add the `im:write` scope** to the bot in the Slack app's settings, under "OAuth & Permissions", then reinstall the app to the workspace. The notifier needs the scope to send a DM.
2. **Check the stack's channel.** Without `notify.events`, the notifier now posts the quiet default, not every task change and comment. Set `"events": "all"` in site.json's `notify` to keep every event.
3. **Add `notify.people`** with each person who should get a DM for a mention: the person's CircleChat email and Slack user ID.
4. **Rerun `setup-host.sh`.**
