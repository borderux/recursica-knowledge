---
"@recursica/knowledge": minor
---

The model gateway passes a program's Kev-engine requests to the engines, for a program whose gateway block lists Kev's computers.

- **`gateway.kev` in a `recursicachat.services` entry** names the computers whose Kev-engine the program's key may reach, best first, such as `"kev": ["machine-2"]`. The config check refuses a computer that isn't a node, runs no Kev-engine, or has an engine listening on a loopback address only, which the gateway in Docker can't reach. `gateway.json` gets each engine's URL, from the `--host` in its kev-engine service's command, or the computer's address.
- **`POST /v1/systemone`** on the gateway takes the program's gateway key and sends the request to the first engine, with the engines' own key in place of the program's. An engine that can't be reached, or answers 429 or 5xx, passes the request to the next. With none answering, the program gets 502, naming each engine's failure. An agent's key, and a program's key with no `gateway.kev`, get 403. The program's caps count these requests, and the spend log names the route `kev` and the engine, never a question or an answer.
- **The engines' key** is the gateway's copy of `KEV_ENGINE_KEY`, `kev-engine.key` in its state folder. `setup-host.sh` writes it from `.env`, and the secrets helper writes it whenever the deployed key differs. The gateway reads the file at each request, so a rotated key applies with no restart, and a changed `KEV_ENGINE_KEY` still recreates no gateway.

A program now reaches Kev-engine without holding the engines' key, under the same caps as its model requests.
