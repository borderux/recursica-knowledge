---
"@recursica/knowledge": minor
---

CircleChat host kit: Porter's port jobs ask for the `coder` route, never a model. The job's Claude Code passes `--model coder`, and every model name Claude Code would choose by itself (for subagents and its small background requests) is the same route, so no model name reaches the gateway. site.json maps the route to a model. The gateway keeps the request local unless the task's setting and the stack allow the cloud.

- The job runner passes no model setting to a job: `PORTER_MODEL` is gone, and `JOBD_PASS_ENV` is empty by default.
- The config check needs a `coder` route in a stack with `porter`. When `agents.porter.routes` is set, the list must include `coder`, since the gateway would otherwise send port jobs to the agent's first route.
- A local-only client or demo stack may now run Porter, on its local `coder` model. The check that refused Porter there is gone.
- `site.example.json` has a `coder` route and `agents.porter`, and the README states the rule: an agent asks for a route by its role (`coder`, `judge`, `general`, `fast`, `reasoning`, `vision`) and never names a model.
