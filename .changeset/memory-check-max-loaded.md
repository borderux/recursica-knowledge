---
"@recursica/knowledge": patch
---

CircleChat kit: the config check counts only the models an Ollama server keeps loaded. With `max_loaded_models` set, the check counts the server's largest `max_loaded_models` models against the computer's `model_memory_gb`. Before, the check added up every model the server listed. A computer with two candidate models, and one loaded at a time, needed `model_memory_gb` for both. A server without `max_loaded_models`, and every other kind of server, still counts every model. The refusal's message names each server that keeps fewer models loaded than the server lists.
