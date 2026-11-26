---
"@recursica/knowledge": minor
---

CircleChat host kit: the gateway's spend log shows where each model request's time went. Each line gets `gateway_wait_ms` (the request's arrival to the send of the try that answered, with the retries and back-offs while the cluster is busy), `upstream_ms` (that send to the answer's end), `tries`, and for a cluster model `server_wait_ms`, the estimated wait for a free slot at the model server, with `ahead`, the request's place in that queue.

LiteLLM drops Ollama's own timings, so the gateway estimates the server's wait from the requests it sends: each cluster model has its server's `parallel` slots from site.json (an mlx-lm server has one), and a request sent while every slot is busy waits until the oldest request ahead of it ends. A server with no `parallel` in site.json logs no server wait. `gateway.json` now names each route's cluster models in order and each cluster model's `parallel`. Nothing changes for a request's routing.
