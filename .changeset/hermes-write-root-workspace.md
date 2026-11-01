---
"@recursica/knowledge": patch
---

CircleChat host kit: each agent's file tools can write to the shared workspace. The pinned Hermes image lets `write_file` and `patch` write only under `HERMES_WRITE_SAFE_ROOT`, which it sets to the agent's home, `/opt/data`. The agent's terminal could already write to `/workspace`, but its file tools could not. Asked to build a page in the shared workspace, an agent's `write_file` calls were refused four times; it wrote the page inside its own home, reported it done, and the preview stayed blank. `setup-agent.sh` now writes `HERMES_WRITE_SAFE_ROOT=/opt/data:/workspace` to the agent's `.env` through the safe-files route, when the stack has a shared workspace. Hermes loads the `.env` over the image's setting, and a path outside both folders is still refused. A test checks the line is written once on reruns, the rest of the `.env` is kept, and a stack with no workspace gets no line.
