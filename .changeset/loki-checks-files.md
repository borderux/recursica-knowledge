---
"@recursica/knowledge": patch
---

Loki: on CircleChat, each file is written with the `write_file` tool, checked with `ls -l` or `read_file` on the exact path, and attached to the study's task with a `share_to_task` action whose path is that `/workspace/loki/...` path. The chat gets one or two sentences, never the transcript. With no task for the request, Loki creates one with `create_task` first. Loki never says a file is created or attached unless the check passed in that turn. On every surface, Loki writes each document with a real tool call, never a tool call printed as text, and reports only documents he checked.
