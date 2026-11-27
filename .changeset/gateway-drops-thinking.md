---
"@recursica/knowledge": patch
---

CircleChat kit: a model that can't think sets `"thinking": false` in site.json, and the gateway drops a request to think for it. Ollama refuses such a request for a model that can't think, with 400 "does not support thinking", so one agent or eval that asks for reasoning failed every call on that model's route. The gateway now drops OpenAI's `reasoning_effort` and `reasoning`, Ollama's `think` and Anthropic's `thinking`, at the top of the request and inside its `extra_body`, for a route with such a model, as it drops a caller's model-loading settings. The spend log lists them in `dropped`, by name only. A route whose models think, and a request that goes to a cloud model, keep them. The config check refuses a value other than true or false.
