# Kev-engine

Kev-engine is the model Kev asks its questions of: [jaredpalmer/kev](https://github.com/jaredpalmer/kev),
an open-source model and server that speaks TypeSafe's System One API. Kev (this program) is
the reviewer; it works with any System One-compatible server, including TypeSafe's hosted Jev.

## Which model

| Model | Fits | Notes |
|---|---|---|
| kev-0.8b | ~3 GB | Proves the setup; too weak to trust. |
| kev-4b | ~9 GB | What the evals ran on. |
| kev-9b | ~18 GB | Too big for a 16 GB card. Runs on a Mac via MLX. |
| kev-27b | ~66 GB | Needs an 80 GB NVIDIA card. No Mac path. |

The card has to be free. On a shared GPU, another model server (FreeToken, Ollama with a model
loaded) is the usual reason Kev-engine fails with "CUDA error: out of memory".

## Install (Linux / WSL, NVIDIA)

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/jaredpalmer/kev kev-engine && cd kev-engine
uv sync --extra serve
uv pip install flash-linear-attention==0.5.2   # faster; optional
```

## Run it as a service

```ini
# /etc/systemd/system/kev-engine.service
[Unit]
Description=Kev-engine (local model server)
After=network.target

[Service]
User=<you>
WorkingDirectory=/path/to/kev-engine
Environment=KEV_FUSED=0
Environment=KEV_CUDA_GRAPHS=0
Environment=KEV_API_KEY=<openssl rand -hex 16>
ExecStart=/home/<you>/.local/bin/uv run --no-sync --extra serve python -m kev.serve --run jaredpalmer/kev-4b --port 8009 --host 0.0.0.0
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload && sudo systemctl enable --now kev-engine
```

Why each line is there:

- **`KEV_FUSED=0`.** With flash-linear-attention installed, the fused kernels made extra weight
  copies while loading and ran a 16 GB card out of memory.
- **`KEV_CUDA_GRAPHS=0`.** CUDA graphs are captured per request shape, and Kev's varied request
  sizes piled them up until the server ran out of memory mid-run and hung.
- **`--no-sync`.** Stops uv from removing packages installed with `uv pip`.
- **`--host 0.0.0.0` and `KEV_API_KEY`.** Containers (an agent's sandbox) often cannot reach the
  host's `localhost`. Under Docker Desktop / WSL, `host.docker.internal:8009` works once the
  engine listens beyond loopback. Listening beyond loopback without a key would expose it to the
  network. Keep the key out of the repository and out of prompts; pass it as `KEV_ENGINE_KEY`.

## Check it

```sh
curl -s localhost:8009/v1/systemone -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d '{"state":"I was charged twice.","questions":{"billing":{"type":"noul","instructions":"Is this about billing?"}}}'
```

Expect a `noul` around 0.8. The first call after a start takes a few seconds; repeats are fast.
From a container: `docker run --rm --network=host curlimages/curl ... http://host.docker.internal:8009/...`.
